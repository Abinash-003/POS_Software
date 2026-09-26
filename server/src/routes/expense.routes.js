import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { imageUpload } from "../middleware/upload.js";
import {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../controllers/expense.controller.js";

const router = Router();
const upload = imageUpload("receipts");

router.use(requireAuth);

router.get("/", listExpenses);
router.post("/", upload, createExpense);
router.put("/:id", upload, updateExpense);
router.delete("/:id", deleteExpense);

export default router;
