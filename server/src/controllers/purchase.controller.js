import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { asText, asNumber, asObjectId, asDate } from "../utils/parse.js";
import { resolveRange, round2 } from "../utils/dateRange.js";
import { Purchase } from "../models/Purchase.js";
import { Product } from "../models/Product.js";
import { removeUploadedImage } from "../middleware/upload.js";

export const listPurchases = asyncHandler(async (req, res) => {
  const filter = {};

  const dateFilter = resolveRange({
    range: asText(req.query.range, "all"),
    from: asText(req.query.from),
    to: asText(req.query.to),
  });
  if (dateFilter) filter.date = dateFilter;

  const productId = asObjectId(req.query.productId);
  if (productId) filter.product = productId;

  const limit = Math.min(asNumber(req.query.limit, 200) || 200, 500);

  const [purchases, totals] = await Promise.all([
    Purchase.find(filter)
      .populate("product", "nameEn nameTa sku unit image")
      .populate("createdBy", "name username")
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .lean(),
    Purchase.aggregate([
      { $match: filter },
      { $group: { _id: null, cost: { $sum: "$totalCost" }, units: { $sum: "$quantity" }, count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    purchases,
    summary: {
      cost: round2(totals[0]?.cost || 0),
      units: round2(totals[0]?.units || 0),
      count: totals[0]?.count || 0,
    },
  });
});

export const createPurchase = asyncHandler(async (req, res) => {
  const productId = asObjectId(req.body.product ?? req.body.productId);
  const quantity = asNumber(req.body.quantity, 0);
  const purchasePrice = asNumber(req.body.purchasePrice, null);

  if (!productId || !quantity || quantity <= 0) {
    removeUploadedImage(req.uploadedImage);
    throw ApiError.badRequest("invalidQty");
  }

  const product = await Product.findById(productId);
  if (!product) {
    removeUploadedImage(req.uploadedImage);
    throw ApiError.notFound();
  }

  const unitPrice = purchasePrice !== null && purchasePrice > 0 ? purchasePrice : product.purchasePrice;
  const stockBefore = product.stock;

  // Atomic increment keeps the stock correct even with concurrent stock-in entries.
  const updated = await Product.findByIdAndUpdate(
    product._id,
    {
      $inc: { stock: quantity },
      ...(purchasePrice !== null && purchasePrice > 0 ? { $set: { purchasePrice } } : {}),
    },
    { new: true }
  );

  try {
    const purchase = await Purchase.create({
      product: product._id,
      productNameEn: product.nameEn,
      productNameTa: product.nameTa,
      quantity,
      purchasePrice: unitPrice,
      totalCost: round2(unitPrice * quantity),
      supplier: asText(req.body.supplier),
      date: asDate(req.body.date, new Date()),
      notes: asText(req.body.notes),
      stockBefore,
      stockAfter: updated.stock,
      invoiceImage: req.uploadedImage || "",
      createdBy: req.user._id,
    });

    await purchase.populate("product", "nameEn nameTa sku unit image");
    res.status(201).json({ purchase, newStock: updated.stock, oldStock: stockBefore });
  } catch (error) {
    // Compensate the stock bump so the ledger and the product never diverge.
    await Product.findByIdAndUpdate(product._id, { $inc: { stock: -quantity } });
    removeUploadedImage(req.uploadedImage);
    throw error;
  }
});

export const getPurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id)
    .populate("product", "nameEn nameTa sku unit image")
    .populate("createdBy", "name username")
    .lean();
  if (!purchase) throw ApiError.notFound();

  res.json({ purchase });
});
