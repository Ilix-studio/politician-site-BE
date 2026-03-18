// src/routes/press.ts
import express from "express";
import {
  getPress,
  getPressById,
  uploadPress,
  uploadMultiplePress,
  createPress,
  updatePress,
  deletePress,
  getPressByCategory,
  searchPress,
} from "../controllers/pressController";
import { protect } from "../middleware/authMiddleware";
import { apiLimiter } from "../middleware/rateLimitMiddleware";
import { pressUploadConfig, handleMulterError } from "../config/multerConfig";

const router = express.Router();

// Public routes
router.get("/", apiLimiter, getPress);
router.get("/search", apiLimiter, searchPress);
router.get("/category/:category", apiLimiter, getPressByCategory);
router.get("/:id", apiLimiter, getPressById);

// Protected routes (Admin only)
router.use(protect); // All routes below require authentication

// Press article management
router.post("/", createPress);

// Single image upload (backward compatibility)
router.post(
  "/upload",
  pressUploadConfig.single("image"),
  handleMulterError,
  uploadPress
);

// Multiple images upload
router.post(
  "/upload-multiple",
  pressUploadConfig.array("images", 5), // Max 5 images for press
  handleMulterError,
  uploadMultiplePress
);

router.put("/:id", updatePress);
router.delete("/:id", deletePress);

export default router;
