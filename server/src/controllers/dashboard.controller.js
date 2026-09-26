import { asyncHandler } from "../utils/asyncHandler.js";
import { round2, startOfToday, startOfWeek, startOfMonth } from "../utils/dateRange.js";
import { Sale } from "../models/Sale.js";
import { Expense } from "../models/Expense.js";
import { Product } from "../models/Product.js";

const EMPTY = { revenue: 0, cost: 0, grossProfit: 0, bills: 0, units: 0 };

async function salesTotals(since) {
  const [row] = await Sale.aggregate([
    ...(since ? [{ $match: { createdAt: { $gte: since } } }] : []),
    {
      $group: {
        _id: null,
        revenue: { $sum: "$total" },
        cost: { $sum: "$cost" },
        grossProfit: { $sum: "$profit" },
        bills: { $sum: 1 },
        units: { $sum: "$unitsCount" },
      },
    },
  ]);
  return row || EMPTY;
}

async function expenseTotal(since) {
  const [row] = await Expense.aggregate([
    ...(since ? [{ $match: { date: { $gte: since } } }] : []),
    { $group: { _id: null, amount: { $sum: "$amount" } } },
  ]);
  return row?.amount || 0;
}

function bucket(sales, expenses) {
  return {
    revenue: round2(sales.revenue),
    cost: round2(sales.cost),
    grossProfit: round2(sales.grossProfit),
    expenses: round2(expenses),
    netProfit: round2(sales.grossProfit - expenses),
    bills: sales.bills || 0,
    units: round2(sales.units || 0),
  };
}

export const getDashboard = asyncHandler(async (_req, res) => {
  const today = startOfToday();
  const week = startOfWeek();
  const month = startOfMonth();

  const [
    todaySales,
    weekSales,
    monthSales,
    allSales,
    todayExpenses,
    weekExpenses,
    monthExpenses,
    allExpenses,
    lowStock,
    outOfStock,
    productCount,
    recentSales,
    dailyTrend,
  ] = await Promise.all([
    salesTotals(today),
    salesTotals(week),
    salesTotals(month),
    salesTotals(null),
    expenseTotal(today),
    expenseTotal(week),
    expenseTotal(month),
    expenseTotal(null),
    Product.find({ $expr: { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$minimumStock"] }] } })
      .sort({ stock: 1 })
      .limit(8)
      .lean(),
    Product.find({ stock: { $lte: 0 } }).sort({ nameEn: 1 }).limit(8).lean(),
    Product.countDocuments(),
    Sale.find().select("-items").sort({ createdAt: -1 }).limit(6).lean(),
    Sale.aggregate([
      { $match: { createdAt: { $gte: week } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$total" },
          profit: { $sum: "$profit" },
          bills: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const [lowCount, outCount] = await Promise.all([
    Product.countDocuments({
      $expr: { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$minimumStock"] }] },
    }),
    Product.countDocuments({ stock: { $lte: 0 } }),
  ]);

  res.json({
    today: bucket(todaySales, todayExpenses),
    week: bucket(weekSales, weekExpenses),
    month: bucket(monthSales, monthExpenses),
    allTime: { ...bucket(allSales, allExpenses), products: productCount },
    alerts: { low: lowStock, out: outOfStock, lowCount, outCount },
    recentSales,
    trend: dailyTrend.map((row) => ({
      date: row._id,
      revenue: round2(row.revenue),
      profit: round2(row.profit),
      bills: row.bills,
    })),
  });
});
