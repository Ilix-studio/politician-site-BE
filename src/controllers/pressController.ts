// src/controllers/pressController.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import PressModel from "../models/pressModel";
import CategoryModel from "../models/categoryModel";
import cloudinary from "../config/cloudinaryConfig";
import logger from "../utils/logger";
import { Types } from "mongoose";

/**
 * Helper function to validate and resolve category
 */
const validateAndResolveCategory = async (category: string) => {
  // Debug logging
  console.log("Received category value:", category, typeof category);

  // Validate category exists and is type "press"
  if (!category || typeof category !== "string") {
    throw new Error("Category is required and must be a string");
  }

  // Try to find by ObjectId first, if that fails, try by name
  let categoryDoc;
  let categoryId = category; // Use a separate variable for the actual ID

  try {
    // First attempt: find by ObjectId
    categoryDoc = await CategoryModel.findOne({
      _id: category,
      type: "press",
    });
  } catch (error) {
    // If ObjectId cast fails, category might be a name instead of ID
    console.log("ObjectId cast failed, trying to find by name:", category);
  }

  // If not found by ID, try to find by name
  if (!categoryDoc) {
    categoryDoc = await CategoryModel.findOne({
      name: category,
      type: "press",
    });

    if (categoryDoc) {
      console.log("Found category by name, using ID:", categoryDoc._id);
      // Update the categoryId variable to use the correct ObjectId
      categoryId = categoryDoc._id.toString();
    }
  }

  if (!categoryDoc) {
    throw new Error(
      `Invalid press category: ${category}. Please ensure the category exists and is of type 'press'.`
    );
  }

  return { categoryDoc, categoryId };
};

/**
 * @desc    Upload press article with multiple images
 * @route   POST /api/press/upload-multiple
 * @access  Private/Admin
 */
export const uploadMultiplePress = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400);
      throw new Error("No files uploaded");
    }

    const files = req.files as Express.Multer.File[];
    const {
      title,
      source,
      date,
      category,
      author,
      readTime,
      content,

      altTexts,
    } = req.body;

    // Validate and resolve category
    const { categoryId } = await validateAndResolveCategory(category);

    // Parse altTexts
    let altTextsArray: string[] = [];
    if (typeof altTexts === "string") {
      try {
        altTextsArray = JSON.parse(altTexts);
      } catch (error) {
        altTextsArray = [altTexts];
      }
    } else if (Array.isArray(altTexts)) {
      altTextsArray = altTexts;
    }

    // Upload all images to Cloudinary
    const uploadPromises = files.map((file, index) => {
      return new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "politician-press-articles",
              resource_type: "image",
              quality: "auto",
              format: "jpg",
              transformation: [
                { width: 800, height: 600, crop: "fill" },
                { quality: "auto" },
              ],
            },
            (error, result) => {
              if (error) reject(error);
              else
                resolve({
                  src: result!.secure_url,
                  alt: altTextsArray[index] || `${title} - Image ${index + 1}`,
                  cloudinaryPublicId: result!.public_id,
                });
            }
          )
          .end(file.buffer);
      });
    });

    const uploadedImages = await Promise.all(uploadPromises);

    // Create press document
    const press = await PressModel.create({
      title,
      source,
      date: date ? new Date(date) : new Date(),
      images: uploadedImages,
      category: categoryId, // Use the resolved category ID
      author,
      readTime,
      content,
    });

    await press.populate("category", "name type");

    logger.info(
      `New press article created with ${uploadedImages.length} images: ${press.title}`
    );

    res.status(201).json({
      success: true,
      message: "Press article uploaded successfully",
      data: {
        press,
        imagesCount: uploadedImages.length,
      },
    });
  }
);

/**
 * @desc    Upload press article with single image (backward compatibility)
 * @route   POST /api/press/upload
 * @access  Private/Admin
 */
export const uploadPress = asyncHandler(async (req: Request, res: Response) => {
  const imageFile = req.file;

  if (!imageFile) {
    res.status(400);
    throw new Error("Image file is required");
  }

  const {
    title,
    source,
    date,
    category,
    author,
    readTime,
    content,

    alt,
  } = req.body;

  // Validate and resolve category
  const { categoryId } = await validateAndResolveCategory(category);

  // Upload image to Cloudinary
  const imageUploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: "politician-press-articles",
        quality: "auto",
        format: "jpg",
        transformation: [
          { width: 800, height: 600, crop: "fill" },
          { quality: "auto" },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(imageFile.buffer);
  });

  const imageResult = imageUploadResult as any;

  // Create press document with single image
  const press = await PressModel.create({
    title,
    source,
    date: date ? new Date(date) : new Date(),
    images: [
      {
        src: imageResult.secure_url,
        alt: alt || title,
        cloudinaryPublicId: imageResult.public_id,
      },
    ],
    category: categoryId, // Use the resolved category ID
    author,
    readTime,
    content,
  });

  await press.populate("category", "name type");

  logger.info(`New press article created: ${press.title}`);

  res.status(201).json({
    success: true,
    message: "Press article uploaded successfully",
    data: { press },
  });
});

/**
 * @desc    Get all press articles with pagination and filtering
 * @route   GET /api/press
 * @access  Public
 */
export const getPress = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 10,
    category,
    search,
    sortBy = "date",
    sortOrder = "desc",
  } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  // Build filter object
  const filter: any = { isActive: true };

  if (category && category !== "all") {
    // Try to resolve category name to ObjectId
    const categoryDoc = await CategoryModel.findOne({
      name: category,
      type: "press",
    });

    if (!categoryDoc) {
      res.status(400);
      throw new Error(`Invalid category: ${category}`);
    }

    filter.category = categoryDoc._id;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { content: { $regex: search, $options: "i" } },
      { author: { $regex: search, $options: "i" } },
      { source: { $regex: search, $options: "i" } },
    ];
  }

  // Build sort object
  const sort: any = {};
  sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

  const [press, total] = await Promise.all([
    PressModel.find(filter)
      .populate("category", "name type")
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    PressModel.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limitNum);

  res.status(200).json({
    success: true,
    data: {
      press,
      pagination: {
        current: pageNum,
        pages: totalPages,
        total,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    },
  });
});

/**
 * @desc    Get single press article by ID
 * @route   GET /api/press/:id
 * @access  Public
 */
export const getPressById = asyncHandler(
  async (req: Request, res: Response) => {
    const press = await PressModel.findById(req.params.id).populate(
      "category",
      "name type"
    );

    if (!press || !press.isActive) {
      res.status(404);
      throw new Error("Press article not found");
    }

    res.status(200).json({
      success: true,
      data: press,
    });
  }
);

/**
 * @desc    Create press article with existing image URLs
 * @route   POST /api/press
 * @access  Private/Admin
 */
export const createPress = asyncHandler(async (req: Request, res: Response) => {
  const { title, source, date, images, category, author, readTime, content } =
    req.body;

  if (!images || !Array.isArray(images) || images.length === 0) {
    res.status(400);
    throw new Error("At least one image is required");
  }

  // Validate and resolve category
  const { categoryId } = await validateAndResolveCategory(category);

  const press = await PressModel.create({
    title,
    source,
    date: date ? new Date(date) : new Date(),
    images,
    category: categoryId, // Use the resolved category ID
    author,
    readTime,
    content,
  });

  await press.populate("category", "name type");

  logger.info(`New press article created: ${press.title}`);

  res.status(201).json({
    success: true,
    message: "Press article created successfully",
    data: press,
  });
});

/**
 * @desc    Update press article
 * @route   PUT /api/press/:id
 * @access  Private/Admin
 */
export const updatePress = asyncHandler(async (req: Request, res: Response) => {
  const press = await PressModel.findById(req.params.id);

  if (!press) {
    res.status(404);
    throw new Error("Press article not found");
  }

  if (!req.body) {
    res.status(400);
    throw new Error("Request body is required");
  }

  const {
    title,
    source,
    date,
    images,
    category,
    author,
    readTime,
    content,

    isActive,
  } = req.body;

  // Validate and resolve category if it's being updated
  if (category !== undefined) {
    const { categoryDoc } = await validateAndResolveCategory(category);
    press.category = new Types.ObjectId(categoryDoc._id);
  }

  // Update other fields
  if (title !== undefined) press.title = title;
  if (source !== undefined) press.source = source;
  if (date !== undefined) press.date = new Date(date);
  if (images !== undefined) press.images = images;
  if (author !== undefined) press.author = author;
  if (readTime !== undefined) press.readTime = readTime;
  if (content !== undefined) press.content = content;

  if (isActive !== undefined) press.isActive = isActive;

  const updatedPress = await press.save();
  await updatedPress.populate("category", "name type");

  logger.info(`Press article updated: ${updatedPress.title}`);

  res.status(200).json({
    success: true,
    message: "Press article updated successfully",
    data: updatedPress,
  });
});

/**
 * @desc    Delete press article
 * @route   DELETE /api/press/:id
 * @access  Private/Admin
 */
export const deletePress = asyncHandler(async (req: Request, res: Response) => {
  const press = await PressModel.findById(req.params.id);

  if (!press) {
    res.status(404);
    throw new Error("Press article not found");
  }

  // Delete all images from Cloudinary
  const deletePromises = press.images.map((image) =>
    cloudinary.uploader.destroy(image.cloudinaryPublicId)
  );

  await Promise.allSettled(deletePromises);

  // Delete press article from database
  await PressModel.findByIdAndDelete(req.params.id);

  logger.info(`Press article deleted: ${press.title}`);

  res.status(200).json({
    success: true,
    message: "Press article deleted successfully",
  });
});

/**
 * @desc    Get press articles by category (Public)
 * @route   GET /api/press/category/:category
 * @access  Public
 */
export const getPressByCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { category } = req.params;
    const { limit = 10 } = req.query;

    const limitNum = parseInt(limit as string, 10);

    const press = await PressModel.find({
      category,
      isActive: true,
    })
      .populate("category", "name type")
      .sort({ date: -1 })
      .limit(limitNum)
      .lean();

    const total = await PressModel.countDocuments({
      category,
      isActive: true,
    });

    res.status(200).json({
      success: true,
      data: {
        press,
        pagination: {
          current: 1,
          pages: Math.ceil(total / limitNum),
          total,
          hasNext: total > limitNum,
          hasPrev: false,
        },
      },
    });
  }
);

/**
 * @desc    Search press articles (Public)
 * @route   GET /api/press/search
 * @access  Public
 */
export const searchPress = asyncHandler(async (req: Request, res: Response) => {
  const { search, limit = 10 } = req.query;

  if (!search) {
    res.status(400);
    throw new Error("Search query is required");
  }

  const limitNum = parseInt(limit as string, 10);

  const filter = {
    isActive: true,
    $or: [
      { title: { $regex: search, $options: "i" } },
      { content: { $regex: search, $options: "i" } },
      { author: { $regex: search, $options: "i" } },
      { source: { $regex: search, $options: "i" } },
    ],
  };

  const press = await PressModel.find(filter)
    .populate("category", "name type")
    .sort({ date: -1 })
    .limit(limitNum)
    .lean();

  const total = await PressModel.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: {
      press,
      pagination: {
        current: 1,
        pages: Math.ceil(total / limitNum),
        total,
        hasNext: total > limitNum,
        hasPrev: false,
      },
    },
  });
});
