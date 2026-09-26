import mongoose from "mongoose";

/**
 * Multipart form fields always arrive as strings, so every scalar coming from
 * the client goes through these coercions before validation.
 */
export function asText(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

export function asNumber(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function asBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || value === "true" || value === "1" || value === 1;
}

export function asObjectId(value) {
  const text = asText(value);
  if (!text || text === "null" || text === "undefined") return null;
  return mongoose.isValidObjectId(text) ? new mongoose.Types.ObjectId(text) : null;
}

export function asDate(value, fallback = null) {
  const text = asText(value);
  if (!text) return fallback;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function asEnum(value, allowed, fallback) {
  const text = asText(value).toLowerCase();
  return allowed.includes(text) ? text : fallback;
}
