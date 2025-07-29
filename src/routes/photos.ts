import express from "express";
import {
  createPhoto,
  uploadPhoto,
  uploadMultiplePhotos,
  getPhotos,
  getPhoto,
  updatePhoto,
  deletePhoto,
} from "../controllers/photoController";
import { protect } from "../middleware/authMiddleware";
import { photoUploadConfig, handleMulterError } from "../config/multerConfig";

const router = express.Router();

// Public routes
router.get("/", getPhotos);
router.get("/:id", getPhoto);

// Protected routes (Admin only)
router.post("/", protect, createPhoto);

// Single photo upload
router.post(
  "/upload",
  protect,
  photoUploadConfig.single("photo"),
  handleMulterError,
  uploadPhoto
);

// Multiple photos upload
router.post(
  "/upload-multiple",
  protect,
  photoUploadConfig.array("photos", 10), // Max 10 photos
  handleMulterError,
  uploadMultiplePhotos
);

router.put("/:id", protect, updatePhoto);
router.delete("/:id", protect, deletePhoto);

export default router;
