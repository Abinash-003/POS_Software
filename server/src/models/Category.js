import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    nameEn: { type: String, required: true, trim: true, maxlength: 60 },
    nameTa: { type: String, required: true, trim: true, maxlength: 60 },
    image: { type: String, default: "" },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

categorySchema.index({ nameEn: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

export const Category = mongoose.model("Category", categorySchema);
