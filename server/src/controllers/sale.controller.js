import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { asText, asNumber, asObjectId, asEnum } from "../utils/parse.js";
import { resolveRange, round2 } from "../utils/dateRange.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { Sale, PAYMENT_METHODS } from "../models/Sale.js";
import { Product } from "../models/Product.js";
import { nextBillNumber } from "../models/Counter.js";

function buildSaleFilter(query) {
  const filter = {};

  const dateFilter = resolveRange({
    range: asText(query.range, "all"),
    from: asText(query.from),
    to: asText(query.to),
  });
  if (dateFilter) filter.createdAt = dateFilter;

  const payment = asText(query.payment);
  if (PAYMENT_METHODS.includes(payment)) filter.paymentMethod = payment;

  const search = asText(query.q);
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ billNumber: pattern }, { customerName: pattern }, { customerPhone: pattern }];
  }

  return filter;
}

export const listSales = asyncHandler(async (req, res) => {
  const filter = buildSaleFilter(req.query);
  const limit = Math.min(asNumber(req.query.limit, 200) || 200, 500);

  const [sales, totals, total] = await Promise.all([
    Sale.find(filter)
      .select("-items")
      .populate("createdBy", "name username")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Sale.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$total" },
          profit: { $sum: "$profit" },
          cost: { $sum: "$cost" },
          units: { $sum: "$unitsCount" },
        },
      },
    ]),
    Sale.countDocuments(filter),
  ]);

  res.json({
    sales,
    total,
    summary: {
      revenue: round2(totals[0]?.revenue || 0),
      profit: round2(totals[0]?.profit || 0),
      cost: round2(totals[0]?.cost || 0),
      units: round2(totals[0]?.units || 0),
      bills: total,
    },
  });
});

export const getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id).populate("createdBy", "name username").lean();
  if (!sale) throw ApiError.notFound("billNotFound");

  res.json({ sale });
});

/**
 * Records a sale and reduces stock.
 *
 * Stock is decremented with guarded atomic `$inc` operations (one per line) so
 * two tills can never oversell the same unit. If any line fails, or the bill
 * itself cannot be written, every applied decrement is compensated — this keeps
 * the flow correct on standalone MongoDB where transactions are unavailable.
 */
export const createSale = asyncHandler(async (req, res) => {
  const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
  if (rawItems.length === 0) throw ApiError.badRequest("emptyCart");

  const paymentMethod = asEnum(req.body.paymentMethod, PAYMENT_METHODS, "cash");
  const discount = Math.max(asNumber(req.body.discount, 0) || 0, 0);

  // Merge duplicate lines so a product is only decremented once. Keep the last
  // explicit sellingPrice so vegetables / market rates can change per bill.
  const requested = new Map();
  for (const item of rawItems) {
    const id = asObjectId(item.product ?? item.productId ?? item._id);
    const quantity = asNumber(item.quantity, 0);
    if (!id || !quantity || quantity <= 0) throw ApiError.badRequest("invalidQty");

    const key = id.toString();
    const existing = requested.get(key) || { quantity: 0, sellingPrice: null };

    existing.quantity = round2(existing.quantity + quantity);

    if (item.sellingPrice !== undefined && item.sellingPrice !== null && item.sellingPrice !== "") {
      const override = asNumber(item.sellingPrice, NaN);
      if (!Number.isFinite(override) || override < 0) throw ApiError.badRequest("positive");
      existing.sellingPrice = round2(override);
    }

    requested.set(key, existing);
  }

  const products = await Product.find({ _id: { $in: [...requested.keys()] } }).lean();
  if (products.length !== requested.size) throw ApiError.notFound();

  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  // Pre-flight check so the cashier gets a precise message before anything changes.
  for (const [id, entry] of requested) {
    const product = productMap.get(id);
    if (product.stock < entry.quantity) {
      throw ApiError.conflict("insufficient", {
        productId: id,
        nameEn: product.nameEn,
        nameTa: product.nameTa,
        available: product.stock,
        requested: entry.quantity,
      });
    }
  }

  const applied = [];
  const rollback = async () => {
    await Promise.all(
      applied.map((entry) =>
        Product.findByIdAndUpdate(entry.id, { $inc: { stock: entry.quantity } }).catch(() => {})
      )
    );
  };

  try {
    const lines = [];
    let subtotal = 0;
    let cost = 0;
    let unitsCount = 0;
    const catalogUpdates = [];

    for (const [id, entry] of requested) {
      const quantity = entry.quantity;
      const guarded = await Product.findOneAndUpdate(
        { _id: id, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      ).lean();

      if (!guarded) {
        const current = await Product.findById(id).lean();
        await rollback();
        throw ApiError.conflict("insufficient", {
          productId: id,
          nameEn: current?.nameEn || "",
          nameTa: current?.nameTa || "",
          available: current?.stock ?? 0,
          requested: quantity,
        });
      }

      applied.push({ id, quantity });

      // Bill locks the rate charged today. Catalog cost stays the latest purchase price.
      const unitPrice =
        entry.sellingPrice != null && Number.isFinite(entry.sellingPrice)
          ? entry.sellingPrice
          : guarded.sellingPrice;
      const lineTotal = round2(unitPrice * quantity);
      const lineCost = round2(guarded.purchasePrice * quantity);
      subtotal = round2(subtotal + lineTotal);
      cost = round2(cost + lineCost);
      unitsCount = round2(unitsCount + quantity);

      lines.push({
        product: guarded._id,
        nameEn: guarded.nameEn,
        nameTa: guarded.nameTa,
        sku: guarded.sku,
        unit: guarded.unit,
        image: guarded.image,
        quantity,
        sellingPrice: unitPrice,
        purchasePrice: guarded.purchasePrice,
        total: lineTotal,
        profit: round2(lineTotal - lineCost),
      });

      // Keep the product card on today's market rate after an override (vegetables).
      if (entry.sellingPrice != null && entry.sellingPrice !== guarded.sellingPrice) {
        catalogUpdates.push(
          Product.findByIdAndUpdate(id, { sellingPrice: entry.sellingPrice }).catch(() => {})
        );
      }
    }

    const cappedDiscount = Math.min(discount, subtotal);
    const total = round2(subtotal - cappedDiscount);

    const sale = await Sale.create({
      billNumber: await nextBillNumber(),
      items: lines,
      itemsCount: lines.length,
      unitsCount,
      subtotal,
      discount: cappedDiscount,
      total,
      cost,
      profit: round2(total - cost),
      paymentMethod,
      customerName: asText(req.body.customerName),
      customerPhone: asText(req.body.customerPhone),
      notes: asText(req.body.notes),
      createdBy: req.user._id,
    });

    if (catalogUpdates.length) await Promise.all(catalogUpdates);

    await sale.populate("createdBy", "name username");
    res.status(201).json({ sale });
  } catch (error) {
    if (!(error instanceof ApiError && error.code === "insufficient")) await rollback();
    throw error;
  }
});

/**
 * Voids a bill and returns its units to stock. Used to correct mistakes.
 */
export const deleteSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) throw ApiError.notFound("billNotFound");

  await Promise.all(
    sale.items
      .filter((item) => item.product)
      .map((item) =>
        Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } }).catch(() => {})
      )
  );

  await sale.deleteOne();
  res.json({ ok: true, restored: sale.items.length });
});
