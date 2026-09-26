import { asyncHandler } from "../utils/asyncHandler.js";
import { asText, asNumber } from "../utils/parse.js";
import { resolveRange, round2 } from "../utils/dateRange.js";
import { Sale } from "../models/Sale.js";
import { Expense } from "../models/Expense.js";
import { Product } from "../models/Product.js";
import { Purchase } from "../models/Purchase.js";

function rangeFilters(query, fallback = "month") {
  const range = asText(query.range, fallback) || fallback;
  const bounds = resolveRange({
    range,
    from: asText(query.from),
    to: asText(query.to),
  });
  return {
    range,
    saleFilter: bounds ? { createdAt: bounds } : {},
    dateFilter: bounds ? { date: bounds } : {},
  };
}

/**
 * Sales Revenue − Purchase Cost − Expenses = Estimated Profit
 */
export const profitReport = asyncHandler(async (req, res) => {
  const { range, saleFilter, dateFilter } = rangeFilters(req.query);

  const [sales, expenses, purchases] = await Promise.all([
    Sale.aggregate([
      { $match: saleFilter },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$total" },
          cost: { $sum: "$cost" },
          grossProfit: { $sum: "$profit" },
          discount: { $sum: "$discount" },
          bills: { $sum: 1 },
          units: { $sum: "$unitsCount" },
        },
      },
    ]),
    Expense.aggregate([{ $match: dateFilter }, { $group: { _id: null, amount: { $sum: "$amount" } } }]),
    Purchase.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, amount: { $sum: "$totalCost" } } },
    ]),
  ]);

  const revenue = round2(sales[0]?.revenue || 0);
  const soldCost = round2(sales[0]?.cost || 0);
  const grossProfit = round2(sales[0]?.grossProfit || 0);
  const expenseTotal = round2(expenses[0]?.amount || 0);

  res.json({
    range,
    revenue,
    soldCost,
    grossProfit,
    expenses: expenseTotal,
    estimatedProfit: round2(grossProfit - expenseTotal),
    stockPurchased: round2(purchases[0]?.amount || 0),
    discount: round2(sales[0]?.discount || 0),
    bills: sales[0]?.bills || 0,
    units: round2(sales[0]?.units || 0),
  });
});

export const salesReport = asyncHandler(async (req, res) => {
  const { range, saleFilter } = rangeFilters(req.query);
  const days = Math.min(asNumber(req.query.days, 14) || 14, 90);

  const [daily, byPayment, totals, hourly] = await Promise.all([
    Sale.aggregate([
      { $match: saleFilter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$total" },
          profit: { $sum: "$profit" },
          bills: { $sum: 1 },
          units: { $sum: "$unitsCount" },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 365 },
    ]),
    Sale.aggregate([
      { $match: saleFilter },
      { $group: { _id: "$paymentMethod", revenue: { $sum: "$total" }, bills: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
    ]),
    Sale.aggregate([
      { $match: saleFilter },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$total" },
          profit: { $sum: "$profit" },
          bills: { $sum: 1 },
          units: { $sum: "$unitsCount" },
        },
      },
    ]),
    Sale.aggregate([
      { $match: saleFilter },
      { $group: { _id: { $hour: "$createdAt" }, revenue: { $sum: "$total" }, bills: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  res.json({
    range,
    daily: daily.slice(-days).map((row) => ({
      date: row._id,
      revenue: round2(row.revenue),
      profit: round2(row.profit),
      bills: row.bills,
      units: round2(row.units),
    })),
    byPayment: byPayment.map((row) => ({
      method: row._id,
      revenue: round2(row.revenue),
      bills: row.bills,
    })),
    hourly: hourly.map((row) => ({ hour: row._id, revenue: round2(row.revenue), bills: row.bills })),
    totals: {
      revenue: round2(totals[0]?.revenue || 0),
      profit: round2(totals[0]?.profit || 0),
      bills: totals[0]?.bills || 0,
      units: round2(totals[0]?.units || 0),
    },
  });
});

export const productReport = asyncHandler(async (req, res) => {
  const { range, saleFilter } = rangeFilters(req.query, "all");

  const ranked = await Sale.aggregate([
    { $match: saleFilter },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        nameEn: { $last: "$items.nameEn" },
        nameTa: { $last: "$items.nameTa" },
        sku: { $last: "$items.sku" },
        unit: { $last: "$items.unit" },
        image: { $last: "$items.image" },
        units: { $sum: "$items.quantity" },
        revenue: { $sum: "$items.total" },
        profit: { $sum: "$items.profit" },
        lines: { $sum: 1 },
      },
    },
    { $sort: { units: -1 } },
  ]);

  const shape = (row) => ({
    productId: row._id,
    nameEn: row.nameEn,
    nameTa: row.nameTa,
    sku: row.sku,
    unit: row.unit,
    image: row.image,
    units: round2(row.units),
    revenue: round2(row.revenue),
    profit: round2(row.profit),
    lines: row.lines,
  });

  const soldIds = ranked.map((row) => row._id).filter(Boolean);
  const neverSold = await Product.find({ _id: { $nin: soldIds } })
    .select("nameEn nameTa sku unit image stock")
    .sort({ createdAt: 1 })
    .limit(15)
    .lean();

  const [stockValue] = await Product.aggregate([
    {
      $group: {
        _id: null,
        atCost: { $sum: { $multiply: ["$stock", "$purchasePrice"] } },
        atRetail: { $sum: { $multiply: ["$stock", "$sellingPrice"] } },
        units: { $sum: "$stock" },
      },
    },
  ]);

  res.json({
    range,
    best: ranked.slice(0, 12).map(shape),
    slow: [...ranked].reverse().slice(0, 12).map(shape),
    neverSold: neverSold.map((product) => ({
      productId: product._id,
      nameEn: product.nameEn,
      nameTa: product.nameTa,
      sku: product.sku,
      unit: product.unit,
      image: product.image,
      units: 0,
      revenue: 0,
      profit: 0,
      stock: product.stock,
    })),
    inventory: {
      atCost: round2(stockValue?.atCost || 0),
      atRetail: round2(stockValue?.atRetail || 0),
      units: round2(stockValue?.units || 0),
      potentialProfit: round2((stockValue?.atRetail || 0) - (stockValue?.atCost || 0)),
    },
  });
});
