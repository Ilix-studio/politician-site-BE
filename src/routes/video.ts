// src/routes/video.ts
import express from "express";
import {
  getVideos,
  getVideoById,
  uploadVideo,
  createVideo,
  updateVideo,
  deleteVideo,
  getVideoCategories,
  getVideoCategoriesWithCounts,
  createVideoCategory,
  updateVideoCategory,
  deleteVideoCategory,
} from "../controllers/videoController";
import { protect } from "../middleware/authMiddleware";
import { apiLimiter } from "../middleware/rateLimitMiddleware";
import { videoUploadConfig, handleMulterError } from "../config/multerConfig";

const router = express.Router();

// Public routes
router.get("/", apiLimiter, getVideos);
router.get("/:id", apiLimiter, getVideoById);

// Category routes (public)
router.get("/categories", apiLimiter, getVideoCategories);
router.get("/categories/counts", apiLimiter, getVideoCategoriesWithCounts);

// Protected routes (Admin only)
router.use(protect); // All routes below require authentication

// Video management
router.post(
  "/upload",
  videoUploadConfig.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  handleMulterError,
  uploadVideo
);
router.post("/", createVideo);
router.put("/:id", updateVideo);
router.delete("/:id", deleteVideo);

// Category management (protected)
router.post("/categories", createVideoCategory);
router.put("/categories/:id", updateVideoCategory);
router.delete("/categories/:id", deleteVideoCategory);

export default router;
