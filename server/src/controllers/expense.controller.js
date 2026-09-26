import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { asText, asNumber, asDate, asEnum, asBool } from "../utils/parse.js";
import { resolveRange, round2, startOfToday, startOfMonth } from "../utils/dateRange.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { Expense, EXPENSE_CATEGORIES } from "../models/Expense.js";
import { removeUploadedImage } from "../middleware/upload.js";

export const listExpenses = asyncHandler(async (req, res) => {
  const filter = {};

  const dateFilter = resolveRange({
    range: asText(req.query.range, "all"),
    from: asText(req.query.from),
    to: asText(req.query.to),
  });
  if (dateFilter) filter.date = dateFilter;

  const category = asText(req.query.category);
  if (EXPENSE_CATEGORIES.includes(category)) filter.category = category;

  const search = asText(req.query.q);
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: pattern }, { notes: pattern }];
  }

  const limit = Math.min(asNumber(req.query.limit, 300) || 300, 500);

  const [expenses, filtered, todayTotal, monthTotal, byCategory] = await Promise.all([
    Expense.find(filter)
      .populate("createdBy", "name username")
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .lean(),
    Expense.aggregate([{ $match: filter }, { $group: { _id: null, amount: { $sum: "$amount" } } }]),
    Expense.aggregate([
      { $match: { date: { $gte: startOfToday() } } },
      { $group: { _id: null, amount: { $sum: "$amount" } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: startOfMonth() } } },
      { $group: { _id: null, amount: { $sum: "$amount" } } },
    ]),
    Expense.aggregate([
      { $match: filter },
      { $group: { _id: "$category", amount: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { amount: -1 } },
    ]),
  ]);

  res.json({
    expenses,
    summary: {
      filtered: round2(filtered[0]?.amount || 0),
      today: round2(todayTotal[0]?.amount || 0),
      month: round2(monthTotal[0]?.amount || 0),
      byCategory: byCategory.map((row) => ({
        category: row._id,
        amount: round2(row.amount),
        count: row.count,
      })),
    },
  });
});

export const createExpense = asyncHandler(async (req, res) => {
  const name = asText(req.body.name);
  const amount = asNumber(req.body.amount, 0);

  if (!name || !amount || amount <= 0) {
    removeUploadedImage(req.uploadedImage);
    throw ApiError.badRequest("invalidForm");
  }

  const expense = await Expense.create({
    name,
    amount: round2(amount),
    category: asEnum(req.body.category, EXPENSE_CATEGORIES, "other"),
    date: asDate(req.body.date, new Date()),
    notes: asText(req.body.notes),
    receiptImage: req.uploadedImage || "",
    createdBy: req.user._id,
  });

  res.status(201).json({ expense });
});

export const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) {
    removeUploadedImage(req.uploadedImage);
    throw ApiError.notFound("expenseNotFound");
  }

  const previousImage = expense.receiptImage;

  if (req.body.name !== undefined) expense.name = asText(req.body.name, expense.name);
  if (req.body.amount !== undefined) {
    expense.amount = round2(asNumber(req.body.amount, expense.amount));
  }
  if (req.body.category !== undefined) {
    expense.category = asEnum(req.body.category, EXPENSE_CATEGORIES, expense.category);
  }
  if (req.body.date !== undefined) expense.date = asDate(req.body.date, expense.date);
  if (req.body.notes !== undefined) expense.notes = asText(req.body.notes);

  if (req.uploadedImage) expense.receiptImage = req.uploadedImage;
  else if (asBool(req.body.removeImage)) expense.receiptImage = "";

  if (!expense.name || expense.amount <= 0) {
    removeUploadedImage(req.uploadedImage);
    throw ApiError.badRequest("invalidForm");
  }

  await expense.save();
  if (previousImage && previousImage !== expense.receiptImage) removeUploadedImage(previousImage);

  res.json({ expense });
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw ApiError.notFound("expenseNotFound");

  await expense.deleteOne();
  removeUploadedImage(expense.receiptImage);

  res.json({ ok: true });
});
