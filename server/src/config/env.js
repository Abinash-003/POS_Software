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

const clientOrigins = list(
  process.env.CLIENT_ORIGIN ||
    "http://localhost:5173,http://localhost:5174,http://localhost:4173,https://pos-software-ecru.vercel.app"
);

/** Local Vite (any port) + configured CLIENT_ORIGIN + known live frontend. */
export function isAllowedClientOrigin(origin) {
  if (!origin) return true;
  const normalized = String(origin).trim().replace(/\/$/, "");
  if (!normalized) return true;

  if (clientOrigins.includes(normalized)) return true;

  // Vite often hops to 5174/5175 when 5173 is busy; proxy still sends Origin.
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized)) return true;

  // Live Vercel app + preview deployments for this project.
  if (
    normalized === "https://pos-software-ecru.vercel.app" ||
    /^https:\/\/pos-software[\w-]*\.vercel\.app$/i.test(normalized)
  ) {
    return true;
  }

  return false;
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
  clientOrigins,
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
