import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, "..", "..");

dotenv.config({ path: path.join(serverRoot, ".env") });

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[config] Missing required environment variable: ${name}`);
    console.error("[config] Copy .env.example to server/.env and fill it in.");
    process.exit(1);
  }
  return value;
}

function list(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export const config = {
  env: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT || 5000),
  mongoUri: required("MONGODB_URI"),
  jwt: {
    secret: required("JWT_SECRET"),
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    cookieName: process.env.COOKIE_NAME || "sm_token",
    cookieMaxAge: 1000 * 60 * 60 * 24 * 7,
  },
  clientOrigins: list(process.env.CLIENT_ORIGIN || "http://localhost:5173"),
  paths: {
    serverRoot,
    uploads: path.join(serverRoot, "uploads"),
    clientDist: path.resolve(serverRoot, "..", "client", "dist"),
  },
  uploads: {
    maxBytes: Number(process.env.MAX_UPLOAD_MB || 4) * 1024 * 1024,
    allowedMime: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
  },
  seed: {
    username: (process.env.SEED_ADMIN_USERNAME || "admin").toLowerCase(),
    password: process.env.SEED_ADMIN_PASSWORD || "admin123",
    name: process.env.SEED_ADMIN_NAME || "",
  },
};
