// src/routes/cloudinary.ts
import express from "express";
import {
  deleteCloudinaryImage,
  deleteMultipleImages,
  generateSignature,
  uploadSingleImage,
  uploadMultipleImages,
  getImageDetails,
  listImagesInFolder,
} from "../controllers/cloudinaryController";
import { protect } from "../middleware/authMiddleware";
import multer from "multer";

const router = express.Router();

// Configure multer for cloudinary uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10, // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Protect all routes
router.use(protect);

// Signature generation
router.post("/signature", generateSignature);

// Single image upload
router.post("/upload-single", upload.single("image"), uploadSingleImage);

// Multiple images upload
router.post(
  "/upload-multiple",
  upload.array("images", 10),
  uploadMultipleImages
);

// Image management
router.get("/details/:publicId", getImageDetails);
router.get("/folder/:folderName", listImagesInFolder);

// Deletion
router.delete("/delete-multiple", deleteMultipleImages);
router.delete("/:publicId", deleteCloudinaryImage);

export default router;
