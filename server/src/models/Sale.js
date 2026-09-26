import mongoose from "mongoose";

export const PAYMENT_METHODS = ["cash", "upi", "card", "other"];

const saleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    nameEn: { type: String, default: "" },
    nameTa: { type: String, default: "" },
    sku: { type: String, default: "" },
    unit: { type: String, default: "piece" },
    image: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 0.001 },
    sellingPrice: { type: Number, required: true, min: 0 },
    purchasePrice: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    profit: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    billNumber: { type: String, required: true, unique: true, index: true },
    items: { type: [saleItemSchema], default: [] },
    itemsCount: { type: Number, default: 0 },
    unitsCount: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: "cash", index: true },
    customerName: { type: String, trim: true, default: "", maxlength: 120 },
    customerPhone: { type: String, trim: true, default: "", maxlength: 20 },
    notes: { type: String, trim: true, default: "", maxlength: 300 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

saleSchema.index({ createdAt: -1 });
saleSchema.index({ customerPhone: 1 });

export const Sale = mongoose.model("Sale", saleSchema);
