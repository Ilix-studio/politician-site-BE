// src/controllers/photoController.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import PhotoModel, { IPhoto } from "../models/photoModel";
import cloudinary from "../config/cloudinaryConfig";
import logger from "../utils/logger";

/**
 * Create a new photo
 * @route POST /api/photos
 * @access Private (Admin only)
 */
export const createPhoto = asyncHandler(async (req: Request, res: Response) => {
  try {
    const {
      src,
      alt,
      title,
      category,
      date,
      location,
      description,
      tags,
      cloudinaryPublicId,
    } = req.body;

    // Validate required fields
    if (!src || !alt || !title || !category || !cloudinaryPublicId) {
      res.status(400);
      throw new Error("Please provide all required fields");
    }

    const photo = await PhotoModel.create({
      src,
      alt,
      title,
      category,
      date: date ? new Date(date) : new Date(),
      location,
      description,
      tags: Array.isArray(tags) ? tags : [],
      cloudinaryPublicId,
    });

    res.status(201).json({
      success: true,
      message: "Photo created successfully",
      data: photo,
    });
  } catch (error: any) {
    logger.error(`Error creating photo: ${error.message}`);
    res.status(400).json({
      success: false,
      message: error.message || "Error creating photo",
    });
  }
});

/**
 * Upload photo to Cloudinary and save to database
 * @route POST /api/photos/upload
 * @access Private (Admin only)
 */
export const uploadPhoto = asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error("No file uploaded");
    }

    const { alt, title, category, date, location, description, tags } =
      req.body;

    // Upload to Cloudinary
    const cloudinaryResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "photos",
            resource_type: "image",
            transformation: [
              { width: 1200, height: 800, crop: "limit" },
              { quality: "auto" },
              { format: "auto" },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(req.file!.buffer);
    });

    const uploadResult = cloudinaryResult as any;

    // Create photo record in database
    const photo = await PhotoModel.create({
      src: uploadResult.secure_url,
      alt: alt || title,
      title,
      category,
      date: date ? new Date(date) : new Date(),
      location,
      description,
      tags:
        typeof tags === "string"
          ? tags.split(",").map((t: string) => t.trim())
          : tags || [],
      cloudinaryPublicId: uploadResult.public_id,
    });

    res.status(201).json({
      success: true,
      message: "Photo uploaded successfully",
      data: {
        photo,
        cloudinary: {
          publicId: uploadResult.public_id,
          url: uploadResult.secure_url,
        },
      },
    });
  } catch (error: any) {
    logger.error(`Error uploading photo: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || "Error uploading photo",
    });
  }
});

/**
 * Get all photos with pagination and filtering
 * @route GET /api/photos
 * @access Public
 */
export const getPhotos = asyncHandler(async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      tags,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter: any = { isActive: true };

    if (category && category !== "all") {
      filter.category = category;
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      filter.tags = { $in: tagArray };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { alt: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const [photos, total] = await Promise.all([
      PhotoModel.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
      PhotoModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: {
        photos,
        pagination: {
          current: pageNum,
          pages: totalPages,
          total,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      },
    });
  } catch (error: any) {
    logger.error(`Error getting photos: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error fetching photos",
    });
  }
});

/**
 * Get single photo by ID
 * @route GET /api/photos/:id
 * @access Public
 */
export const getPhoto = asyncHandler(async (req: Request, res: Response) => {
  try {
    const photo = await PhotoModel.findById(req.params.id);

    if (!photo || !photo.isActive) {
      res.status(404);
      throw new Error("Photo not found");
    }

    // Increment views
    photo.views += 1;
    await photo.save();

    res.status(200).json({
      success: true,
      data: photo,
    });
  } catch (error: any) {
    logger.error(`Error getting photo: ${error.message}`);
    res.status(404).json({
      success: false,
      message: "Photo not found",
    });
  }
});

/**
 * Update photo
 * @route PUT /api/photos/:id
 * @access Private (Admin only)
 */
export const updatePhoto = asyncHandler(async (req: Request, res: Response) => {
  try {
    const photo = await PhotoModel.findById(req.params.id);

    if (!photo) {
      res.status(404);
      throw new Error("Photo not found");
    }

    const {
      alt,
      title,
      category,
      date,
      location,
      description,
      tags,
      isActive,
    } = req.body;

    // Update fields
    if (alt !== undefined) photo.alt = alt;
    if (title !== undefined) photo.title = title;
    if (category !== undefined) photo.category = category;
    if (date !== undefined) photo.date = new Date(date);
    if (location !== undefined) photo.location = location;
    if (description !== undefined) photo.description = description;
    if (tags !== undefined) photo.tags = Array.isArray(tags) ? tags : [];
    if (isActive !== undefined) photo.isActive = isActive;

    const updatedPhoto = await photo.save();

    res.status(200).json({
      success: true,
      message: "Photo updated successfully",
      data: updatedPhoto,
    });
  } catch (error: any) {
    logger.error(`Error updating photo: ${error.message}`);
    res.status(400).json({
      success: false,
      message: error.message || "Error updating photo",
    });
  }
});

/**
 * Delete photo
 * @route DELETE /api/photos/:id
 * @access Private (Admin only)
 */
export const deletePhoto = asyncHandler(async (req: Request, res: Response) => {
  try {
    const photo = await PhotoModel.findById(req.params.id);

    if (!photo) {
      res.status(404);
      throw new Error("Photo not found");
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(photo.cloudinaryPublicId);
    } catch (cloudinaryError: any) {
      logger.warn(
        `Failed to delete from Cloudinary: ${cloudinaryError.message}`
      );
      // Continue with database deletion even if Cloudinary fails
    }

    // Delete from database
    await PhotoModel.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Photo deleted successfully",
    });
  } catch (error: any) {
    logger.error(`Error deleting photo: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || "Error deleting photo",
    });
  }
});

/**
 * Get photo categories with counts
 * @route GET /api/photos/categories
 * @access Public
 */
export const getCategories = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const categories = await PhotoModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      const formattedCategories = categories.map((cat) => ({
        id: cat._id,
        name: cat._id
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l: string) => l.toUpperCase()),
        count: cat.count,
      }));

      res.status(200).json({
        success: true,
        data: formattedCategories,
      });
    } catch (error: any) {
      logger.error(`Error getting categories: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Error fetching categories",
      });
    }
  }
);
