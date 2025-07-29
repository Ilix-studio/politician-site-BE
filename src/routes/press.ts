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
} from "../controllers/pressController";
import { protect } from "../middleware/authMiddleware";
import { apiLimiter } from "../middleware/rateLimitMiddleware";
import { pressUploadConfig, handleMulterError } from "../config/multerConfig";

const router = express.Router();

// Public routes
router.get("/", apiLimiter, getPress);
router.get("/:id", apiLimiter, getPressById);

// Protected routes (Admin only)
router.use(protect); // All routes below require authentication

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

router.post("/", createPress);
router.put("/:id", updatePress);
router.delete("/:id", deletePress);

export default router;
