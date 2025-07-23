import { Request, Response, NextFunction } from "express";
import { body, param, validationResult } from "express-validator";

// Generic validation error handler
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// Video categories enum
const VIDEO_CATEGORIES = ["speech", "event", "interview", "initiative"];

// Duration format validation regex (MM:SS or HH:MM:SS)
const DURATION_REGEX = /^\d{1,2}:\d{2}(:\d{2})?$/;

// Base video validation rules
const baseVideoValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3, max: 200 })
    .withMessage("Title must be between 3 and 200 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters"),

  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isIn(VIDEO_CATEGORIES)
    .withMessage(`Category must be one of: ${VIDEO_CATEGORIES.join(", ")}`),

  body("date")
    .notEmpty()
    .withMessage("Date is required")
    .isISO8601({ strict: true })
    .toDate()
    .withMessage("Date must be in ISO 8601 format (YYYY-MM-DD)"),

  body("duration")
    .notEmpty()
    .withMessage("Duration is required")
    .matches(DURATION_REGEX)
    .withMessage(
      "Duration must be in format MM:SS or HH:MM:SS (e.g., '2:30' or '1:45:30')"
    ),
];

// Video upload validation (with file upload)
export const validateVideoUpload = [
  ...baseVideoValidation,
  // File validation is handled in the controller since express-validator doesn't handle files well
  handleValidationErrors,
];

// Video create validation (with existing URLs)
export const validateVideoCreate = [
  ...baseVideoValidation,

  body("thumbnail")
    .notEmpty()
    .withMessage("Thumbnail URL is required")
    .isURL({ protocols: ["http", "https"] })
    .withMessage("Thumbnail must be a valid URL"),

  body("videoUrl")
    .notEmpty()
    .withMessage("Video URL is required")
    .isURL({ protocols: ["http", "https"] })
    .withMessage("Video URL must be a valid URL"),

  body("publicId")
    .notEmpty()
    .withMessage("Cloudinary public ID is required")
    .isString()
    .withMessage("Public ID must be a string"),

  body("thumbnailPublicId")
    .optional()
    .isString()
    .withMessage("Thumbnail public ID must be a string"),

  handleValidationErrors,
];

// Video update validation (all fields optional)
export const validateVideoUpdate = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ min: 3, max: 200 })
    .withMessage("Title must be between 3 and 200 characters"),

  body("description")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Description cannot be empty")
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters"),

  body("category")
    .optional()
    .isIn(VIDEO_CATEGORIES)
    .withMessage(`Category must be one of: ${VIDEO_CATEGORIES.join(", ")}`),

  body("date")
    .optional()
    .isISO8601({ strict: true })
    .toDate()
    .withMessage("Date must be in ISO 8601 format (YYYY-MM-DD)"),

  body("duration")
    .optional()
    .matches(DURATION_REGEX)
    .withMessage(
      "Duration must be in format MM:SS or HH:MM:SS (e.g., '2:30' or '1:45:30')"
    ),

  body("thumbnail")
    .optional()
    .isURL({ protocols: ["http", "https"] })
    .withMessage("Thumbnail must be a valid URL"),

  body("videoUrl")
    .optional()
    .isURL({ protocols: ["http", "https"] })
    .withMessage("Video URL must be a valid URL"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value"),

  handleValidationErrors,
];

// ID parameter validation
export const validateVideoId = [
  param("id").isMongoId().withMessage("Invalid video ID format"),

  handleValidationErrors,
];

// Query parameter validation for video listing
export const validateVideoQuery = [
  body("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  body("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),

  body("category")
    .optional()
    .custom((value) => {
      if (value !== "all" && !VIDEO_CATEGORIES.includes(value)) {
        throw new Error(
          `Category must be 'all' or one of: ${VIDEO_CATEGORIES.join(", ")}`
        );
      }
      return true;
    }),

  body("sortBy")
    .optional()
    .isIn(["date", "title", "views", "createdAt", "updatedAt"])
    .withMessage(
      "sortBy must be one of: date, title, views, createdAt, updatedAt"
    ),

  body("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be 'asc' or 'desc'"),

  handleValidationErrors,
];
