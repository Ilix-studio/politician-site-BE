// src/routes/press.ts
import express from "express";
import {
  getPress,
  getPressById,
  uploadPress,
  createPress,
  updatePress,
  deletePress,
  getCategories,
} from "../controllers/pressController";
import { protect } from "../middleware/authMiddleware";
import { apiLimiter } from "../middleware/rateLimitMiddleware";
import { pressUploadConfig, handleMulterError } from "../config/multerConfig";

const router = express.Router();

// Public routes
router.get("/", apiLimiter, getPress);
router.get("/categories", getCategories);
router.get("/:id", apiLimiter, getPressById);

// Protected routes (Admin only)
router.use(protect); // All routes below require authentication

// Press management
router.post(
  "/upload",
  pressUploadConfig.single("image"),
  handleMulterError,
  uploadPress
);
router.post("/", createPress);
router.put("/:id", updatePress);
router.delete("/:id", deletePress);

export default router;
