// src/routes/category.ts
import express from "express";
import {
  getCategoriesByType,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController";
import { protect } from "../middleware/authMiddleware";
import { apiLimiter } from "../middleware/rateLimitMiddleware";

const router = express.Router();

// Public routes
router.get("/:type", apiLimiter, getCategoriesByType);

// Protected routes (Admin only)
router.use(protect);
router.get("/", getAllCategories);
router.post("/", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;
