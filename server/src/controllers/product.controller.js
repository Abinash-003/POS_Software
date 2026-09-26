import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { asText, asNumber, asObjectId, asEnum, asBool } from "../utils/parse.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { Product, PRODUCT_UNITS } from "../models/Product.js";
import { removeUploadedImage } from "../middleware/upload.js";

function withStatus(product) {
  const stock = Number(product.stock) || 0;
  const minimum = Number(product.minimumStock) || 0;
  return {
    ...product,
    stockStatus: stock <= 0 ? "out" : stock <= minimum ? "low" : "in",
    marginPerUnit: Math.round((product.sellingPrice - product.purchasePrice) * 100) / 100,
  };
}

export const listProducts = asyncHandler(async (req, res) => {
  const search = asText(req.query.q);
  const categoryId = asObjectId(req.query.categoryId);
  const status = asText(req.query.status);
  const limit = Math.min(asNumber(req.query.limit, 500) || 500, 1000);

  const filter = {};

  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      { nameEn: pattern },
      { nameTa: pattern },
      { sku: pattern },
      { barcode: pattern },
      { brand: pattern },
    ];
  }
  if (categoryId) filter.category = categoryId;
  if (status === "out") filter.stock = { $lte: 0 };
  else if (status === "low") filter.$expr = { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$minimumStock"] }] };
  else if (status === "in") filter.$expr = { $gt: ["$stock", "$minimumStock"] };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("category", "nameEn nameTa")
      .sort({ nameEn: 1 })
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  res.json({ products: products.map(withStatus), total });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate("category", "nameEn nameTa")
    .lean();
  if (!product) throw ApiError.notFound();

  res.json({ product: withStatus(product) });
});

async function assertUniqueCodes({ sku, barcode, excludeId = null }) {
  if (sku) {
    const clash = await Product.findOne({
      sku,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).lean();
    if (clash) throw ApiError.conflict("duplicateSku");
  }
  if (barcode) {
    const clash = await Product.findOne({
      barcode,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).lean();
    if (clash) throw ApiError.conflict("duplicateBarcode");
  }
}

export const createProduct = asyncHandler(async (req, res) => {
  const payload = {
    nameEn: asText(req.body.nameEn),
    nameTa: asText(req.body.nameTa),
    sku: asText(req.body.sku).toUpperCase(),
    barcode: asText(req.body.barcode) || undefined,
    brand: asText(req.body.brand),
    category: asObjectId(req.body.category ?? req.body.categoryId),
    purchasePrice: asNumber(req.body.purchasePrice, 0),
    sellingPrice: asNumber(req.body.sellingPrice, 0),
    stock: asNumber(req.body.stock, 0),
    minimumStock: asNumber(req.body.minimumStock, 5),
    unit: asEnum(req.body.unit, PRODUCT_UNITS, "piece"),
    image: req.uploadedImage || asText(req.body.image),
  };

  if (!payload.nameEn || !payload.nameTa || !payload.sku) {
    removeUploadedImage(req.uploadedImage);
    throw ApiError.badRequest("fillAll");
  }
  if (payload.purchasePrice < 0 || payload.sellingPrice < 0 || payload.stock < 0) {
    removeUploadedImage(req.uploadedImage);
    throw ApiError.badRequest("positive");
  }

  try {
    await assertUniqueCodes({ sku: payload.sku, barcode: payload.barcode });
    const product = await Product.create(payload);
    await product.populate("category", "nameEn nameTa");
    res.status(201).json({ product: withStatus(product.toObject()) });
  } catch (error) {
    removeUploadedImage(req.uploadedImage);
    throw error;
  }
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    removeUploadedImage(req.uploadedImage);
    throw ApiError.notFound();
  }

  const previousImage = product.image;

  if (req.body.nameEn !== undefined) product.nameEn = asText(req.body.nameEn, product.nameEn);
  if (req.body.nameTa !== undefined) product.nameTa = asText(req.body.nameTa, product.nameTa);
  if (req.body.brand !== undefined) product.brand = asText(req.body.brand);
  if (req.body.sku !== undefined) product.sku = asText(req.body.sku, product.sku).toUpperCase();
  if (req.body.barcode !== undefined) {
    // Clearing the field must unset it, not store null, so the unique partial
    // index on `barcode` keeps ignoring products that have no barcode.
    const barcode = asText(req.body.barcode);
    if (barcode) product.barcode = barcode;
    else product.set("barcode", undefined);
  }
  if (req.body.category !== undefined || req.body.categoryId !== undefined) {
    product.category = asObjectId(req.body.category ?? req.body.categoryId);
  }
  if (req.body.purchasePrice !== undefined) {
    product.purchasePrice = asNumber(req.body.purchasePrice, product.purchasePrice);
  }
  if (req.body.sellingPrice !== undefined) {
    product.sellingPrice = asNumber(req.body.sellingPrice, product.sellingPrice);
  }
  if (req.body.stock !== undefined) product.stock = asNumber(req.body.stock, product.stock);
  if (req.body.minimumStock !== undefined) {
    product.minimumStock = asNumber(req.body.minimumStock, product.minimumStock);
  }
  if (req.body.unit !== undefined) product.unit = asEnum(req.body.unit, PRODUCT_UNITS, product.unit);

  if (req.uploadedImage) product.image = req.uploadedImage;
  else if (asBool(req.body.removeImage)) product.image = "";

  if (!product.nameEn || !product.nameTa || !product.sku) {
    removeUploadedImage(req.uploadedImage);
    throw ApiError.badRequest("fillAll");
  }
  if (product.purchasePrice < 0 || product.sellingPrice < 0 || product.stock < 0) {
    removeUploadedImage(req.uploadedImage);
    throw ApiError.badRequest("positive");
  }

  try {
    await assertUniqueCodes({
      sku: product.sku,
      barcode: product.barcode,
      excludeId: product._id,
    });
    await product.save();
  } catch (error) {
    removeUploadedImage(req.uploadedImage);
    throw error;
  }

  if (previousImage && previousImage !== product.image) removeUploadedImage(previousImage);

  await product.populate("category", "nameEn nameTa");
  res.json({ product: withStatus(product.toObject()) });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound();

  await product.deleteOne();
  removeUploadedImage(product.image);

  res.json({ ok: true });
});

export const lowStockProducts = asyncHandler(async (_req, res) => {
  const [low, out] = await Promise.all([
    Product.find({ $expr: { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$minimumStock"] }] } })
      .populate("category", "nameEn nameTa")
      .sort({ stock: 1 })
      .lean(),
    Product.find({ stock: { $lte: 0 } })
      .populate("category", "nameEn nameTa")
      .sort({ nameEn: 1 })
      .lean(),
  ]);

  res.json({
    low: low.map(withStatus),
    out: out.map(withStatus),
    lowCount: low.length,
    outCount: out.length,
  });
});
