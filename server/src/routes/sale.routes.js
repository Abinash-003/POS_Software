import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { listSales, getSale, createSale, deleteSale } from "../controllers/sale.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", listSales);
router.post("/", createSale);
router.get("/:id", getSale);
router.delete("/:id", requireAdmin, deleteSale);

export default router;
