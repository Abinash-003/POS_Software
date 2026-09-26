import mongoose from "mongoose";

export const EXPENSE_CATEGORIES = [
  "electricity",
  "rent",
  "transport",
  "staff",
  "maintenance",
  "other",
];

const expenseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 140 },
    amount: { type: Number, required: true, min: 0.01 },
    category: { type: String, enum: EXPENSE_CATEGORIES, default: "other", index: true },
    date: { type: Date, default: Date.now, index: true },
    notes: { type: String, trim: true, default: "", maxlength: 300 },
    receiptImage: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const Expense = mongoose.model("Expense", expenseSchema);
