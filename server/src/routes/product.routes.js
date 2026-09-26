import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { imageUpload } from "../middleware/upload.js";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  lowStockProducts,
} from "../controllers/product.controller.js";

const router = Router();
const upload = imageUpload("products");

router.use(requireAuth);

router.get("/", listProducts);
router.get("/alerts/low-stock", lowStockProducts);
router.get("/:id", getProduct);

router.post("/", requireAdmin, upload, createProduct);
router.put("/:id", requireAdmin, upload, updateProduct);
router.delete("/:id", requireAdmin, deleteProduct);

export default router;
