import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import { config } from "./config/env.js";
import routes from "./routes/index.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(compression());
  app.use(
    cors({
      origin(origin, done) {
        if (!origin || config.clientOrigins.includes(origin)) return done(null, true);
        return done(new Error("Origin not allowed by CORS"));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());
  app.use(morgan(config.isProd ? "combined" : "dev"));

  fs.mkdirSync(config.paths.uploads, { recursive: true });
  app.use(
    "/uploads",
    express.static(config.paths.uploads, {
      maxAge: "30d",
      fallthrough: true,
      index: false,
    })
  );

  app.use("/api", routes);

  serveClientBuild(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * In production the API also serves the built React app, so the whole system
 * runs from one process on one port — no reverse proxy or second host needed.
 * Skipped in development, where Vite serves the UI and proxies `/api` here.
 */
function serveClientBuild(app) {
  const dist = config.paths.clientDist;

  if (!config.isProd) return;

  if (!fs.existsSync(path.join(dist, "index.html"))) {
    console.warn(`[boot] no client build at ${dist} — run "npm run build" to serve the UI`);
    return;
  }

  // Hashed filenames can be cached hard; index.html must never be.
  app.use(
    express.static(dist, {
      index: false,
      maxAge: "1y",
      setHeaders(res, filePath) {
        if (filePath.endsWith("index.html")) res.setHeader("Cache-Control", "no-cache");
      },
    })
  );

  // Client-side routing: anything that is not an API or upload path gets the shell.
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res, next) => {
    if (req.method !== "GET") return next();
    res.sendFile(path.join(dist, "index.html"));
  });

  console.log("[boot] serving client build from", dist);
}
