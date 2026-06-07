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
import { protect, authorize } from "../middleware/authMiddleware";

import { apiLimiter } from "../middleware/rateLimitMiddleware";
import { videoUploadConfig, handleMulterError } from "../config/multerConfig";
import { ROLES } from "../constants/roles";

const router = express.Router();

// Public routes
// NOTE: static "/categories" routes MUST be declared before "/:id",
// otherwise "categories" is captured as the :id param.
router.get("/", apiLimiter, getVideos);
router.get("/categories", apiLimiter, getVideoCategories);
router.get("/categories/counts", apiLimiter, getVideoCategoriesWithCounts);
router.get("/:id", apiLimiter, getVideoById);

// Protected routes
router.use(protect); // All routes below require authentication

const writeRoles = authorize(ROLES.SUPER_ADMIN, ROLES.EDITOR);

// Video management
router.post(
  "/upload",
  writeRoles,
  videoUploadConfig.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  handleMulterError,
  uploadVideo,
);
router.post("/", writeRoles, createVideo);

router.put(
  "/:id",
  writeRoles,
  videoUploadConfig.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  handleMulterError,
  updateVideo,
);
router.delete("/:id", authorize(ROLES.SUPER_ADMIN), deleteVideo);

// Category management
router.post("/categories", writeRoles, createVideoCategory);
router.put("/categories/:id", writeRoles, updateVideoCategory);
router.delete(
  "/categories/:id",
  authorize(ROLES.SUPER_ADMIN),
  deleteVideoCategory,
);

export default router;
