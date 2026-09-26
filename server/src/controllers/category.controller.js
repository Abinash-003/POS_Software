import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { asText } from "../utils/parse.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";

export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find().sort({ nameEn: 1 }).lean();
  const counts = await Product.aggregate([
    { $match: { category: { $ne: null } } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((row) => [String(row._id), row.count]));

  res.json({
    categories: categories.map((category) => ({
      ...category,
      productCount: countMap.get(String(category._id)) || 0,
    })),
  });
});

export const createCategory = asyncHandler(async (req, res) => {
  const nameEn = asText(req.body.nameEn);
  const nameTa = asText(req.body.nameTa);
  if (!nameEn || !nameTa) throw ApiError.badRequest("invalidForm");

  const category = await Category.create({ nameEn, nameTa });
  res.status(201).json({ category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound("categoryNotFound");

  if (req.body.nameEn !== undefined) category.nameEn = asText(req.body.nameEn, category.nameEn);
  if (req.body.nameTa !== undefined) category.nameTa = asText(req.body.nameTa, category.nameTa);
  if (!category.nameEn || !category.nameTa) throw ApiError.badRequest("invalidForm");

  await category.save();
  res.json({ category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound("categoryNotFound");

  await Product.updateMany({ category: category._id }, { $set: { category: null } });
  await category.deleteOne();

  res.json({ ok: true });
});
