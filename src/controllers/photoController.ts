// src/controllers/photoController.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import PhotoModel, { IPhoto } from "../models/photoModel";
import cloudinary from "../config/cloudinaryConfig";

/**
 * Upload multiple photos to Cloudinary and save to database
 * @route POST /api/photos/upload-multiple
 * @access Private (Admin only)
 */
export const uploadMultiplePhotos = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400);
      throw new Error("No files uploaded");
    }

    const files = req.files as Express.Multer.File[];
    const { title, category, date, location, description, altTexts } = req.body;

    // Parse altTexts if it's a string
    let altTextsArray: string[] = [];
    if (typeof altTexts === "string") {
      altTextsArray = JSON.parse(altTexts);
    } else if (Array.isArray(altTexts)) {
      altTextsArray = altTexts;
    }

    // Upload all files to Cloudinary
    const uploadPromises = files.map((file, index) => {
      return new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "dynamic-images-for-politician",
              resource_type: "image",
              transformation: [
                { width: 1200, height: 800, crop: "limit" },
                { quality: "auto" },
                { format: "auto" },
              ],
            },
            (error, result) => {
              if (error) reject(error);
              else
                resolve({
                  src: result!.secure_url,
                  alt: altTextsArray[index] || title,
                  cloudinaryPublicId: result!.public_id,
                });
            }
          )
          .end(file.buffer);
      });
    });

    const uploadedImages = await Promise.all(uploadPromises);

    // Create photo record with multiple images
    const photo = await PhotoModel.create({
      images: uploadedImages,
      title,
      category,
      date: date ? new Date(date) : new Date(),
      location,
      description,
    });

    await photo.populate("category", "name type");

    res.status(201).json({
      success: true,
      message: "Photos uploaded successfully",
      data: {
        photo,
        imagesCount: uploadedImages.length,
      },
    });
  }
);

/**
 * Upload single photo
 * @route POST /api/photos/upload
 * @access Private (Admin only)
 */
export const uploadPhoto = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  const { alt, title, category, date, location, description } = req.body;

  // Upload to Cloudinary
  const cloudinaryResult = await new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "dynamic-images-for-politician",
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

  // Create photo record with single image
  const photo = await PhotoModel.create({
    images: [
      {
        src: uploadResult.secure_url,
        alt: alt || title,
        cloudinaryPublicId: uploadResult.public_id,
      },
    ],
    title,
    category,
    date: date ? new Date(date) : new Date(),
    location,
    description,
  });

  await photo.populate("category", "name type");

  res.status(201).json({
    success: true,
    message: "Photo uploaded successfully",
    data: { photo },
  });
});

/**
 * Create photo with existing image URLs
 * @route POST /api/photos
 * @access Private (Admin only)
 */
export const createPhoto = asyncHandler(async (req: Request, res: Response) => {
  const { images, title, category, date, location, description } = req.body;

  if (!images || !Array.isArray(images) || images.length === 0) {
    res.status(400);
    throw new Error("At least one image is required");
  }

  const photo = await PhotoModel.create({
    images,
    title,
    category,
    date: date ? new Date(date) : new Date(),
    location,
    description,
  });

  await photo.populate("category", "name type");

  res.status(201).json({
    success: true,
    message: "Photo created successfully",
    data: photo,
  });
});

/**
 * Get all photos with pagination and filtering
 * @route GET /api/photos
 * @access Public
 */
export const getPhotos = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 12,
    category,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const filter: any = { isActive: true };

  if (category && category !== "all") {
    filter.category = category;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
      { "images.alt": { $regex: search, $options: "i" } },
    ];
  }

  const sort: any = {};
  sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

  const [photos, total] = await Promise.all([
    PhotoModel.find(filter)
      .populate("category", "name type")
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
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
});

/**
 * Get single photo by ID
 * @route GET /api/photos/:id
 * @access Public
 */
export const getPhoto = asyncHandler(async (req: Request, res: Response) => {
  const photo = await PhotoModel.findById(req.params.id).populate(
    "category",
    "name type"
  );

  if (!photo || !photo.isActive) {
    res.status(404);
    throw new Error("Photo not found");
  }

  res.status(200).json({
    success: true,
    data: photo,
  });
});

/**
 * Update photo
 * @route PUT /api/photos/:id
 * @access Private (Admin only)
 */
export const updatePhoto = asyncHandler(async (req: Request, res: Response) => {
  const photo = await PhotoModel.findById(req.params.id);

  if (!photo) {
    res.status(404);
    throw new Error("Photo not found");
  }

  const { images, title, category, date, location, description, isActive } =
    req.body;

  // Update fields
  if (images !== undefined) photo.images = images;
  if (title !== undefined) photo.title = title;
  if (category !== undefined) photo.category = category;
  if (date !== undefined) photo.date = new Date(date);
  if (location !== undefined) photo.location = location;
  if (description !== undefined) photo.description = description;
  if (isActive !== undefined) photo.isActive = isActive;

  const updatedPhoto = await photo.save();
  await updatedPhoto.populate("category", "name type");

  res.status(200).json({
    success: true,
    message: "Photo updated successfully",
    data: updatedPhoto,
  });
});

/**
 * Delete photo
 * @route DELETE /api/photos/:id
 * @access Private (Admin only)
 */
export const deletePhoto = asyncHandler(async (req: Request, res: Response) => {
  const photo = await PhotoModel.findById(req.params.id);

  if (!photo) {
    res.status(404);
    throw new Error("Photo not found");
  }

  // Delete all images from Cloudinary
  const deletePromises = photo.images.map((image) =>
    cloudinary.uploader.destroy(image.cloudinaryPublicId)
  );

  await Promise.allSettled(deletePromises);

  // Delete from database
  await PhotoModel.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Photo deleted successfully",
  });
});
