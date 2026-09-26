import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { imageUpload } from "../middleware/upload.js";
import { getDashboard } from "../controllers/dashboard.controller.js";
import { profitReport, salesReport, productReport } from "../controllers/report.controller.js";
import { getSettings, updateSettings } from "../controllers/setting.controller.js";
import { translateText, translateLimiter } from "../controllers/translate.controller.js";
import authRoutes from "./auth.routes.js";
import productRoutes from "./product.routes.js";
import categoryRoutes from "./category.routes.js";
import purchaseRoutes from "./purchase.routes.js";
import saleRoutes from "./sale.routes.js";
import expenseRoutes from "./expense.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    ok: mongoose.connection.readyState === 1,
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/sales", saleRoutes);
router.use("/expenses", expenseRoutes);

router.get("/dashboard", requireAuth, getDashboard);

router.get("/reports/profit", requireAuth, profitReport);
router.get("/reports/sales", requireAuth, salesReport);
router.get("/reports/products", requireAuth, productReport);

router.get("/settings", requireAuth, getSettings);
router.put("/settings", requireAuth, requireAdmin, imageUpload("logo"), updateSettings);

router.post("/translate", requireAuth, translateLimiter, translateText);

export default router;
