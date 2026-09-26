import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { imageUpload } from "../middleware/upload.js";
import {
  listPurchases,
  createPurchase,
  getPurchase,
} from "../controllers/purchase.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", listPurchases);
router.get("/:id", getPurchase);
router.post("/", requireAdmin, imageUpload("invoices"), createPurchase);

export default router;
