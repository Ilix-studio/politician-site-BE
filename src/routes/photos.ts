import express from "express";
import {
  createPhoto,
  uploadPhoto,
  uploadMultiplePhotos,
  getPhotos,
  getPhoto,
  updatePhoto,
  deletePhoto,
  updatePhotoWithFile,
} from "../controllers/photoController";
import { protect, authorize } from "../middleware/authMiddleware";

import { photoUploadConfig, handleMulterError } from "../config/multerConfig";
import { ROLES } from "../constants/roles";

const router = express.Router();

// Public routes
router.get("/", getPhotos);
router.get("/:id", getPhoto);

// Protected routes (Super-Admin + Editor)
router.post(
  "/",
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.EDITOR),
  createPhoto,
);

// Single photo upload
router.post(
  "/upload",
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.EDITOR),
  photoUploadConfig.single("photo"),
  handleMulterError,
  uploadPhoto,
);

// Multiple photos upload
router.post(
  "/upload-multiple",
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.EDITOR),
  photoUploadConfig.array("photos", 10), // Max 10 photos
  handleMulterError,
  uploadMultiplePhotos,
);

router.patch(
  "/:id",
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.EDITOR),
  updatePhoto,
);

// Update photo with file upload (form-data)
router.patch(
  "/:id/upload",
  protect,
  authorize(ROLES.SUPER_ADMIN, ROLES.EDITOR),
  photoUploadConfig.single("photo"),
  handleMulterError,
  updatePhotoWithFile,
);

// Delete restricted to Super-Admin
router.delete("/:id", protect, authorize(ROLES.SUPER_ADMIN), deletePhoto);

export default router;
