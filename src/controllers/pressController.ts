// src/controllers/pressController.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import PressModel from "../models/pressModel";
import cloudinary from "../config/cloudinaryConfig";
import logger from "../utils/logger";

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
      link,
      category,
      author,
      readTime,
      content,
      excerpt,
      altTexts,
    } = req.body;

    // Parse altTexts
    let altTextsArray: string[] = [];
    if (typeof altTexts === "string") {
      altTextsArray = JSON.parse(altTexts);
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
      date: new Date(date),
      images: uploadedImages,
      link,
      category,
      author,
      readTime,
      content,
      excerpt,
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
    link,
    category,
    author,
    readTime,
    content,
    excerpt,
  } = req.body;

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
    date: new Date(date),
    images: [
      {
        src: imageResult.secure_url,
        alt: title,
        cloudinaryPublicId: imageResult.public_id,
      },
    ],
    link,
    category,
    author,
    readTime,
    content,
    excerpt,
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
  } = req.query;

  const pageNumber = parseInt(page as string);
  const limitNumber = parseInt(limit as string);
  const skip = (pageNumber - 1) * limitNumber;

  let filter: any = {};

  if (isActive !== "all") {
    filter.isActive = isActive === "true";
  }

  if (category !== "all") {
    filter.category = category;
  }

  if (search) {
    filter.$text = { $search: search as string };
  }

  const sort: any = {};
  sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

  const press = await PressModel.find(filter)
    .populate("category", "name type")
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
});

/**
 * @desc    Get single press article by ID
 * @route   GET /api/press/:id
 * @access  Public
 */
export const getPressById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const press = await PressModel.findById(id).populate(
      "category",
      "name type"
    );

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
 * @desc    Create press article with existing image URLs
 * @route   POST /api/press
 * @access  Private/Admin
 */
export const createPress = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    source,
    date,
    images,
    link,
    category,
    author,
    readTime,
    content,
    excerpt,
  } = req.body;

  if (!images || !Array.isArray(images) || images.length === 0) {
    res.status(400);
    throw new Error("At least one image is required");
  }

  const press = await PressModel.create({
    title,
    source,
    date: new Date(date),
    images,
    link,
    category,
    author,
    readTime,
    content,
    excerpt,
  });

  await press.populate("category", "name type");

  logger.info(`New press article created: ${press.title}`);

  res.status(201).json({
    success: true,
    message: "Press article created successfully",
    data: { press },
  });
});

/**
 * @desc    Update press article
 * @route   PUT /api/press/:id
 * @access  Private/Admin
 */
export const updatePress = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  const press = await PressModel.findById(id);

  if (!press) {
    res.status(404);
    throw new Error("Press article not found");
  }

  if (updateData.date) {
    updateData.date = new Date(updateData.date);
  }

  const updatedPress = await PressModel.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).populate("category", "name type");

  logger.info(`Press article updated: ${updatedPress?.title}`);

  res.status(200).json({
    success: true,
    message: "Press article updated successfully",
    data: { press: updatedPress },
  });
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

  // Delete all images from Cloudinary
  const deletePromises = press.images.map((image) =>
    cloudinary.uploader.destroy(image.cloudinaryPublicId)
  );

  await Promise.allSettled(deletePromises);

  // Delete press article from database
  await PressModel.findByIdAndDelete(id);

  logger.info(`Press article deleted: ${press.title}`);

  res.status(200).json({
    success: true,
    message: "Press article deleted successfully",
  });
});
