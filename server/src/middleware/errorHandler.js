import multer from "multer";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { config } from "../config/env.js";

export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, "routeNotFound", { path: req.originalUrl }));
}

function duplicateKeyCode(error) {
  const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || "";
  if (field === "sku") return "duplicateSku";
  if (field === "barcode") return "duplicateBarcode";
  if (field === "username") return "duplicateUsername";
  if (field === "nameEn") return "duplicateCategory";
  return "duplicate";
}

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
export function errorHandler(error, req, res, next) {
  let statusCode = 500;
  let code = "server";
  let details;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    code = error.code;
    details = error.details;
  } else if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    code = "invalidForm";
    details = Object.fromEntries(
      Object.entries(error.errors).map(([key, value]) => [key, value.kind])
    );
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = "notFound";
  } else if (error?.code === 11000) {
    statusCode = 409;
    code = duplicateKeyCode(error);
  } else if (error instanceof multer.MulterError) {
    statusCode = 400;
    code = error.code === "LIMIT_FILE_SIZE" ? "imageTooLarge" : "invalidImage";
  }

  if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, error);
  }

  res.status(statusCode).json({
    error: code,
    ...(details ? { details } : {}),
    ...(config.isProd ? {} : { message: error.message }),
  });
}
