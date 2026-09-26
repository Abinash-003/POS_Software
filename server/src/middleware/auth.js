import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/User.js";

export function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), username: user.username, role: user.role, name: user.name },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

export function setAuthCookie(res, token) {
  res.cookie(config.jwt.cookieName, token, {
    httpOnly: true,
    sameSite: config.isProd ? "none" : "lax",
    secure: config.isProd,
    path: "/",
    maxAge: config.jwt.cookieMaxAge,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(config.jwt.cookieName, {
    httpOnly: true,
    sameSite: config.isProd ? "none" : "lax",
    secure: config.isProd,
    path: "/",
  });
}

function readToken(req) {
  const fromCookie = req.cookies?.[config.jwt.cookieName];
  if (fromCookie) return fromCookie;

  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();

  return null;
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch {
    throw ApiError.unauthorized();
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.active) throw ApiError.unauthorized();

  req.user = user;
  next();
});

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    return next();
  };
}

export const requireAdmin = requireRole("admin");
