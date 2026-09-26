import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import { config } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

function ensureFolder(folder) {
  const target = path.join(config.paths.uploads, folder);
  fs.mkdirSync(target, { recursive: true });
  return target;
}

/**
 * Returns a multer middleware storing a single image under /uploads/<folder>.
 * The public URL is exposed on `req.uploadedImage`.
 */
export function imageUpload(folder, field = "image") {
  const storage = multer.diskStorage({
    destination(_req, _file, done) {
      try {
        done(null, ensureFolder(folder));
      } catch (error) {
        done(error);
      }
    },
    filename(_req, file, done) {
      const extension = EXTENSIONS[file.mimetype] || path.extname(file.originalname) || ".jpg";
      done(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${extension}`);
    },
  });

  const handler = multer({
    storage,
    limits: { fileSize: config.uploads.maxBytes, files: 1 },
    fileFilter(_req, file, done) {
      if (!config.uploads.allowedMime.includes(file.mimetype)) {
        return done(ApiError.badRequest("invalidImage"));
      }
      return done(null, true);
    },
  }).single(field);

  return (req, res, next) => {
    handler(req, res, (error) => {
      if (error) return next(error);
      req.uploadedImage = req.file ? `/uploads/${folder}/${req.file.filename}` : null;
      return next();
    });
  };
}

/**
 * Best-effort cleanup of a previously stored image. A stale file must never
 * break the request that replaced it.
 */
export function removeUploadedImage(publicUrl) {
  if (!publicUrl || !publicUrl.startsWith("/uploads/")) return;
  const relative = publicUrl.replace("/uploads/", "");
  const absolute = path.join(config.paths.uploads, relative);
  if (!absolute.startsWith(config.paths.uploads)) return;
  fs.promises.unlink(absolute).catch(() => {});
}
