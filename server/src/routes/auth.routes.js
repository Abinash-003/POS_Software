import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import {
  login,
  logout,
  me,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/auth.controller.js";

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "tooManyAttempts" },
});

const router = Router();

router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

router.get("/users", requireAuth, requireAdmin, listUsers);
router.post("/users", requireAuth, requireAdmin, createUser);
router.put("/users/:id", requireAuth, requireAdmin, updateUser);
router.delete("/users/:id", requireAuth, requireAdmin, deleteUser);

export default router;
