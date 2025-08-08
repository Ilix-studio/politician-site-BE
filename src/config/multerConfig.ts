import multer from "multer";
import { Request } from "express";

// Enhanced file filter for multiple image types
const imageFileFilter = (
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
      "image/svg+xml",
    ];

    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Image format ${file.mimetype} not supported. 
          Supported formats: JPEG, PNG, WebP, GIF, BMP, TIFF, SVG`
        )
      );
    }
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

// Enhanced multer configuration for photo uploads
export const photoUploadConfig = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per image
    files: 10, // Maximum 10 images for photos
  },
  fileFilter: imageFileFilter,
});

// Enhanced multer configuration for press uploads
export const pressUploadConfig = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per image
    files: 5, // Maximum 5 images for press articles
  },
  fileFilter: imageFileFilter,
});

// Video upload config remains the same
export const videoUploadConfig = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for videos
    files: 2, // Maximum 2 files (video + thumbnail)
  },
  fileFilter: (
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
          cb(new Error(`Video format ${file.mimetype} not supported`));
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
          cb(new Error(`Image format ${file.mimetype} not supported`));
        }
      } else {
        cb(new Error("Image file is required for thumbnail field"));
      }
    } else {
      cb(new Error("Unexpected field name"));
    }
  },
});

// Enhanced error handler for multer errors
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
          error: `Maximum ${
            req.route.path.includes("photo")
              ? "10"
              : req.route.path.includes("press")
              ? "5"
              : "2"
          } files allowed`,
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
