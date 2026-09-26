import mongoose from "mongoose";

export const PRODUCT_UNITS = ["piece", "packet", "box", "kg", "gram", "litre", "bottle", "other"];

const productSchema = new mongoose.Schema(
  {
    nameEn: { type: String, required: true, trim: true, maxlength: 120 },
    nameTa: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    brand: { type: String, trim: true, default: "", maxlength: 80 },
    sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
    // Left unset rather than null when absent — see the partial index below.
    barcode: { type: String, trim: true, maxlength: 60 },
    purchasePrice: { type: Number, required: true, min: 0, default: 0 },
    sellingPrice: { type: Number, required: true, min: 0, default: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    minimumStock: { type: Number, required: true, min: 0, default: 5 },
    unit: { type: String, enum: PRODUCT_UNITS, default: "piece" },
    image: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

productSchema.index({ sku: 1 }, { unique: true });

/**
 * Barcodes are optional and must be unique when present.
 *
 * A `sparse` index is not enough here: it only skips documents where the field
 * is *missing*, so two products stored with `barcode: null` would collide. The
 * partial filter restricts the index to actual strings instead.
 */
productSchema.index(
  { barcode: 1 },
  { unique: true, partialFilterExpression: { barcode: { $type: "string" } } }
);

productSchema.index({ nameEn: "text", nameTa: "text", brand: "text" });

productSchema.virtual("stockStatus").get(function stockStatus() {
  if (this.stock <= 0) return "out";
  if (this.stock <= this.minimumStock) return "low";
  return "in";
});

productSchema.virtual("marginPerUnit").get(function marginPerUnit() {
  return Math.round((this.sellingPrice - this.purchasePrice) * 100) / 100;
});

export const Product = mongoose.model("Product", productSchema);
