import express from "express";
import multer from "multer";
import {
  createPhoto,
  uploadPhoto,
  getPhotos,
  getPhoto,
  updatePhoto,
  deletePhoto,
  getCategories,
} from "../controllers/photoController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Public routes
router.get("/", getPhotos);
router.get("/categories", getCategories);
router.get("/:id", getPhoto);

// Protected routes (Admin only)
router.post("/", protect, createPhoto);
router.post("/upload", protect, upload.single("photo"), uploadPhoto);
router.put("/:id", protect, updatePhoto);
router.delete("/:id", protect, deletePhoto);

export default router;
