// Updated with Press support
import multer from "multer";
import { Request } from "express";

// File filter for press images
const pressImageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith("image/")) {
    const allowedImageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/bmp",
      "image/tiff",
    ];

    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Image format ${file.mimetype} not supported. 
          Supported formats: JPEG, PNG, WebP, GIF, BMP, TIFF`
        )
      );
    }
  } else {
    cb(new Error("Only image files are allowed for press articles"));
  }
};

// Video file filter for existing video uploads
const videoFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.fieldname === "video") {
    if (file.mimetype.startsWith("video/")) {
      const allowedVideoTypes = [
        "video/mp4",
        "video/mov",
        "video/avi",
        "video/wmv",
        "video/flv",
        "video/webm",
        "video/mkv",
      ];

      if (allowedVideoTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            `Video format ${file.mimetype} not supported. 
            Supported formats: MP4, MOV, AVI, WMV, FLV, WebM, MKV`
          )
        );
      }
    } else {
      cb(new Error("Video file is required for video field"));
    }
  } else if (file.fieldname === "thumbnail") {
    if (file.mimetype.startsWith("image/")) {
      const allowedImageTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/bmp",
        "image/tiff",
      ];

      if (allowedImageTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            `Image format ${file.mimetype} not supported. 
            Supported formats: JPEG, PNG, WebP, GIF, BMP, TIFF`
          )
        );
      }
    } else {
      cb(new Error("Image file is required for thumbnail field"));
    }
  } else {
    cb(new Error("Unexpected field name"));
  }
};

// Multer configuration for press image uploads
export const pressUploadConfig = multer({
  storage: multer.memoryStorage(), // Store in memory for direct Cloudinary upload
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for press images
    files: 1,
  },
  fileFilter: pressImageFileFilter,
});

// Multer configuration for video uploads
export const videoUploadConfig = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for videos
    files: 2, // Maximum 2 files (video + thumbnail)
  },
  fileFilter: videoFileFilter,
});

// Multer configuration for photo uploads
export const photoUploadConfig = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for photos
    files: 1,
  },
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    if (file.mimetype.startsWith("image/")) {
      const allowedImageTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/bmp",
        "image/tiff",
      ];

      if (allowedImageTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Image format ${file.mimetype} not supported`));
      }
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Error handler middleware for multer errors
export const handleMulterError = (
  error: any,
  req: Request,
  res: any,
  next: any
) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          success: false,
          message: "File size too large",
          error: `Maximum file size allowed is ${
            error.field === "video" ? "500MB" : "10MB"
          }`,
        });
      case "LIMIT_FILE_COUNT":
        return res.status(400).json({
          success: false,
          message: "Too many files",
          error: "Maximum files allowed exceeded",
        });
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          success: false,
          message: "Unexpected field",
          error: "Only allowed file fields are accepted",
        });
      default:
        return res.status(400).json({
          success: false,
          message: "File upload error",
          error: error.message,
        });
    }
  }

  // Handle custom file filter errors
  if (
    error.message.includes("not supported") ||
    error.message.includes("required") ||
    error.message.includes("Only")
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid file type",
      error: error.message,
    });
  }

  // Pass other errors to the general error handler
  next(error);
};
