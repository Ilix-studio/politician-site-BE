// src/controllers/pressController.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import PressModel from "../models/pressModel";
import cloudinary from "../config/cloudinaryConfig";
import {
  PressUploadData,
  PressCreateData,
  PressUpdateData,
  PressQueryParams,
} from "../types/press.types";
import logger from "../utils/logger";

/**
 * @desc    Get all press articles
 * @route   GET /api/press
 * @access  Public
 */
export const getPress = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = "1",
    limit = "10",
    category = "all",
    search = "",
    sortBy = "date",
    sortOrder = "desc",
    isActive = "true",
  }: PressQueryParams = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  const skip = (pageNumber - 1) * limitNumber;

  // Build filter query
  let filter: any = {};

  if (isActive !== "all") {
    filter.isActive = isActive === "true";
  }

  if (category !== "all") {
    filter.category = category;
  }

  if (search) {
    filter.$text = { $search: search };
  }

  // Build sort object
  const sort: any = {};
  sort[sortBy] = sortOrder === "asc" ? 1 : -1;

  try {
    const press = await PressModel.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNumber)
      .lean();

    const totalPress = await PressModel.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        press,
        pagination: {
          currentPage: pageNumber,
          totalPages: Math.ceil(totalPress / limitNumber),
          totalPress,
          hasNextPage: pageNumber < Math.ceil(totalPress / limitNumber),
          hasPrevPage: pageNumber > 1,
          limit: limitNumber,
        },
      },
    });
  } catch (error: any) {
    logger.error(`Error fetching press articles: ${error.message}`);
    res.status(500);
    throw new Error("Failed to fetch press articles");
  }
});

/**
 * @desc    Get single press article by ID
 * @route   GET /api/press/:id
 * @access  Public
 */
export const getPressById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const press = await PressModel.findById(id);

    if (!press) {
      res.status(404);
      throw new Error("Press article not found");
    }

    res.status(200).json({
      success: true,
      data: { press },
    });
  }
);

/**
 * @desc    Get press categories
 * @route   GET /api/press/categories
 * @access  Public
 */
export const getCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const categories = [
      "politics",
      "economy",
      "development",
      "social",
      "environment",
      "education",
      "healthcare",
      "infrastructure",
      "other",
    ];

    res.status(200).json({
      success: true,
      data: { categories },
    });
  }
);

/**
 * @desc    Upload press article with image
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
    link,
    category,
    author,
    readTime,
    content,
    excerpt,
  }: PressUploadData = req.body;

  // Validate required fields
  if (
    !title ||
    !source ||
    !date ||
    !link ||
    !category ||
    !author ||
    !readTime ||
    !content ||
    !excerpt
  ) {
    res.status(400);
    throw new Error("All required fields must be provided");
  }

  try {
    // Upload image to Cloudinary
    const imageUploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          folder: "press-images",
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

    // Create press document
    const press = await PressModel.create({
      title,
      source,
      date: new Date(date),
      image: imageResult.secure_url,
      link,
      category,
      author,
      readTime,
      content,
      excerpt,
      imagePublicId: imageResult.public_id,
    });

    logger.info(`New press article created: ${press.title}`);

    res.status(201).json({
      success: true,
      message: "Press article uploaded successfully",
      data: { press },
    });
  } catch (error: any) {
    logger.error(`Error uploading press article: ${error.message}`);
    res.status(500);
    throw new Error("Failed to upload press article");
  }
});

/**
 * @desc    Create press article with existing image URL
 * @route   POST /api/press
 * @access  Private/Admin
 */
export const createPress = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    source,
    date,
    image,
    link,
    category,
    author,
    readTime,
    content,
    excerpt,
    imagePublicId,
  }: PressCreateData = req.body;

  // Validate required fields
  if (
    !title ||
    !source ||
    !date ||
    !image ||
    !link ||
    !category ||
    !author ||
    !readTime ||
    !content ||
    !excerpt
  ) {
    res.status(400);
    throw new Error("All required fields must be provided");
  }

  try {
    const press = await PressModel.create({
      title,
      source,
      date: new Date(date),
      image,
      link,
      category,
      author,
      readTime,
      content,
      excerpt,
      imagePublicId,
    });

    logger.info(`New press article created: ${press.title}`);

    res.status(201).json({
      success: true,
      message: "Press article created successfully",
      data: { press },
    });
  } catch (error: any) {
    logger.error(`Error creating press article: ${error.message}`);
    res.status(500);
    throw new Error("Failed to create press article");
  }
});

/**
 * @desc    Update press article
 * @route   PUT /api/press/:id
 * @access  Private/Admin
 */
export const updatePress = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData: PressUpdateData = req.body;

  const press = await PressModel.findById(id);

  if (!press) {
    res.status(404);
    throw new Error("Press article not found");
  }

  try {
    // If date is being updated, convert to Date object
    if (updateData.date) {
      updateData.date = new Date(updateData.date).toISOString();
    }

    const updatedPress = await PressModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    logger.info(`Press article updated: ${updatedPress?.title}`);

    res.status(200).json({
      success: true,
      message: "Press article updated successfully",
      data: { press: updatedPress },
    });
  } catch (error: any) {
    logger.error(`Error updating press article: ${error.message}`);
    res.status(500);
    throw new Error("Failed to update press article");
  }
});

/**
 * @desc    Delete press article
 * @route   DELETE /api/press/:id
 * @access  Private/Admin
 */
export const deletePress = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const press = await PressModel.findById(id);

  if (!press) {
    res.status(404);
    throw new Error("Press article not found");
  }

  try {
    // Delete image from Cloudinary if exists
    if (press.imagePublicId) {
      await cloudinary.uploader.destroy(press.imagePublicId);
      logger.info(`Deleted image from Cloudinary: ${press.imagePublicId}`);
    }

    // Delete press article from database
    await PressModel.findByIdAndDelete(id);

    logger.info(`Press article deleted: ${press.title}`);

    res.status(200).json({
      success: true,
      message: "Press article deleted successfully",
    });
  } catch (error: any) {
    logger.error(`Error deleting press article: ${error.message}`);
    res.status(500);
    throw new Error("Failed to delete press article");
  }
});
