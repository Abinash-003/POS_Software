import mongoose from "mongoose";

/**
 * Single document holding shop identity used on printed bills.
 */
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, default: "shop", unique: true, immutable: true },
    shopNameEn: { type: String, trim: true, default: "Mini Supermarket" },
    shopNameTa: { type: String, trim: true, default: "மினி சூப்பர்மார்க்கெட்" },
    phone: { type: String, trim: true, default: "" },
    addressEn: { type: String, trim: true, default: "" },
    addressTa: { type: String, trim: true, default: "" },
    gstin: { type: String, trim: true, default: "" },
    currency: { type: String, default: "INR" },
    logo: { type: String, default: "" },
    taglineEn: { type: String, trim: true, default: "" },
    taglineTa: { type: String, trim: true, default: "" },
    billFooterEn: { type: String, trim: true, default: "Thank you, visit again" },
    billFooterTa: { type: String, trim: true, default: "நன்றி, மீண்டும் வருக" },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

settingSchema.statics.getShop = async function getShop() {
  const existing = await this.findOne({ key: "shop" });
  if (existing) return existing;
  return this.create({ key: "shop" });
};

export const Setting = mongoose.model("Setting", settingSchema);
