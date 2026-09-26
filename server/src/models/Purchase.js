import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    productNameEn: { type: String, default: "" },
    productNameTa: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 0.001 },
    purchasePrice: { type: Number, required: true, min: 0, default: 0 },
    totalCost: { type: Number, required: true, min: 0, default: 0 },
    supplier: { type: String, trim: true, default: "", maxlength: 120 },
    date: { type: Date, default: Date.now, index: true },
    notes: { type: String, trim: true, default: "", maxlength: 300 },
    stockBefore: { type: Number, default: 0 },
    stockAfter: { type: Number, default: 0 },
    invoiceImage: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const Purchase = mongoose.model("Purchase", purchaseSchema);
