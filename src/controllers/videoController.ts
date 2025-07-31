// src/controllers/videoController.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import VideoModel from "../models/VideoModel";
import CategoryModel from "../models/categoryModel";
import cloudinary from "../config/cloudinaryConfig";

// Interface for query parameters
interface VideoQueryParams {
  page?: string;
  limit?: string;
  category?: string;
  featured?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

// Interface for video upload data
interface VideoUploadData {
  title: string;
  description: string;
  category: string;
  date: string;
  duration: string;
}

/**
 * @desc    Get all videos with filtering, pagination, and search
 * @route   GET /api/videos
 * @access  Public
 */
export const getVideos = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = "1",
    limit = "12",
    category,
    featured,
    search,
    sortBy = "date",
    sortOrder = "desc",
  } = req.query as VideoQueryParams;

  // Build query object
  const query: any = { isActive: true };

  // Filter by category
  if (category && category !== "all") {
    query.category = category;
  }

  // Filter by featured status
  if (featured === "true") {
    query.featured = true;
  }

  // Search functionality
  if (search && search.trim()) {
    query.$text = { $search: search.trim() };
  }

  // Pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Sort options
  const sortOptions: any = {};
  sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

  // Execute query with pagination
  const videos = await VideoModel.find(query)
    .populate("category", "name type")
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get total count for pagination
  const total = await VideoModel.countDocuments(query);

  // Calculate pagination info
  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  res.status(200).json({
    success: true,
    data: {
      videos,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalVideos: total,
        hasNextPage,
        hasPrevPage,
        limit: limitNum,
      },
    },
  });
});

/**
 * @desc    Get single video by ID
 * @route   GET /api/videos/:id
 * @access  Public
 */
export const getVideoById = asyncHandler(
  async (req: Request, res: Response) => {
    const video = await VideoModel.findById(req.params.id).populate(
      "category",
      "name type"
    );

    if (!video) {
      res.status(404);
      throw new Error("Video not found");
    }

    if (!video.isActive) {
      res.status(404);
      throw new Error("Video not available");
    }

    res.status(200).json({
      success: true,
      data: { video },
    });
  }
);

/**
 * @desc    Upload video with file to Cloudinary
 * @route   POST /api/videos/upload
 * @access  Private/Admin
 */
export const uploadVideo = asyncHandler(async (req: Request, res: Response) => {
  console.log("Upload request received:", {
    files: req.files,
    body: req.body,
    headers: req.headers["content-type"],
  });

  // Check if video file is uploaded
  if (!req.files) {
    res.status(400);
    throw new Error("No files uploaded");
  }

  // Type assertion for multer files
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  if (!files.video || !files.video[0]) {
    res.status(400);
    throw new Error("Video file is required");
  }

  const videoFile = files.video[0];
  const thumbnailFile = files.thumbnail ? files.thumbnail[0] : null;

  console.log("Processing files:", {
    videoFile: {
      originalname: videoFile.originalname,
      mimetype: videoFile.mimetype,
      size: videoFile.size,
    },
    thumbnailFile: thumbnailFile
      ? {
          originalname: thumbnailFile.originalname,
          mimetype: thumbnailFile.mimetype,
          size: thumbnailFile.size,
        }
      : null,
  });

  const { title, description, category, date, duration }: VideoUploadData =
    req.body;

  // Validate required fields
  if (!title || !description || !category || !date || !duration) {
    res.status(400);
    throw new Error("All required fields must be provided");
  }

  // Try to find by ObjectId first, if that fails, try by name
  let categoryDoc;
  let categoryId = category; // Use a separate variable for the actual ID

  try {
    // First attempt: find by ObjectId
    categoryDoc = await CategoryModel.findOne({
      _id: category,
      type: "video",
    });
  } catch (error) {
    // If ObjectId cast fails, category might be a name instead of ID
    console.log("ObjectId cast failed, trying to find by name:", category);
  }

  // If not found by ID, try to find by name
  if (!categoryDoc) {
    categoryDoc = await CategoryModel.findOne({
      name: category,
      type: "video",
    });

    if (categoryDoc) {
      console.log("Found category by name, using ID:", categoryDoc._id);
      // Use the correct ObjectId for database insertion
      categoryId = categoryDoc._id.toString();
    }
  }

  if (!categoryDoc) {
    res.status(400);
    throw new Error(
      `Invalid video category: ${category}. Please ensure the category exists and is of type 'video'.`
    );
  }

  // Upload video to Cloudinary
  const videoUploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: "dynamic-images-for-politician-videos",
        quality: "auto",
        format: "mp4",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary video upload error:", error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    uploadStream.end(videoFile.buffer);
  });

  const videoResult = videoUploadResult as any;
  console.log("Video uploaded to Cloudinary:", videoResult.public_id);

  // Upload thumbnail if provided, otherwise use video thumbnail
  let thumbnailResult;
  if (thumbnailFile) {
    thumbnailResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          folder: "politician-video-thumbnails",
          quality: "auto",
          format: "jpg",
          transformation: [{ width: 1280, height: 720, crop: "fill" }],
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary thumbnail upload error:", error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      uploadStream.end(thumbnailFile.buffer);
    });
  } else {
    // Generate thumbnail from video
    thumbnailResult = await cloudinary.uploader.upload(videoResult.secure_url, {
      resource_type: "video",
      public_id: `${videoResult.public_id}_thumbnail`,
      format: "jpg",
      transformation: [{ width: 1280, height: 720, crop: "fill" }],
    });
  }

  const thumbnail = thumbnailResult as any;
  console.log("Thumbnail processed:", thumbnail.public_id);

  // Create video document
  const video = await VideoModel.create({
    title,
    description,
    thumbnail: thumbnail.secure_url,
    videoUrl: videoResult.secure_url,
    date: new Date(date),
    category: categoryId, // Use the resolved category ID
    duration,
    publicId: videoResult.public_id,
    thumbnailPublicId: thumbnail.public_id,
  });

  const populatedVideo = await VideoModel.findById(video._id).populate(
    "category",
    "name type"
  );

  console.log("Video saved to database:", video._id);

  res.status(201).json({
    success: true,
    message: "Video uploaded successfully",
    data: { video: populatedVideo },
  });
});

/**
 * @desc    Create video with existing Cloudinary URLs
 * @route   POST /api/videos
 * @access  Private/Admin
 */
export const createVideo = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    description,
    thumbnail,
    videoUrl,
    date,
    category,
    duration,
    publicId,
    thumbnailPublicId,
  } = req.body;

  // Validate required fields
  if (
    !title ||
    !description ||
    !thumbnail ||
    !videoUrl ||
    !date ||
    !category ||
    !duration ||
    !publicId
  ) {
    res.status(400);
    throw new Error("All required fields must be provided");
  }

  // Validate category exists and is of type 'video'
  const categoryDoc = await CategoryModel.findOne({
    _id: category,
    type: "video",
  });

  if (!categoryDoc) {
    res.status(400);
    throw new Error("Invalid video category");
  }

  const video = await VideoModel.create({
    title,
    description,
    thumbnail,
    videoUrl,
    date: new Date(date),
    category,
    duration,
    publicId,
    thumbnailPublicId,
  });

  const populatedVideo = await VideoModel.findById(video._id).populate(
    "category",
    "name type"
  );

  res.status(201).json({
    success: true,
    message: "Video created successfully",
    data: { video: populatedVideo },
  });
});

/**
 * @desc    Update video
 * @route   PUT /api/videos/:id
 * @access  Private/Admin
 */
export const updateVideo = asyncHandler(async (req: Request, res: Response) => {
  const video = await VideoModel.findById(req.params.id);

  if (!video) {
    res.status(404);
    throw new Error("Video not found");
  }

  // Validate category if provided
  if (req.body.category) {
    const categoryDoc = await CategoryModel.findOne({
      _id: req.body.category,
      type: "video",
    });

    if (!categoryDoc) {
      res.status(400);
      throw new Error("Invalid video category");
    }
  }

  // Process tags if provided
  if (req.body.tags) {
    req.body.tags =
      typeof req.body.tags === "string"
        ? req.body.tags.split(",").map((tag: string) => tag.trim())
        : req.body.tags;
  }

  // Convert date string to Date object if provided
  if (req.body.date) {
    req.body.date = new Date(req.body.date);
  }

  // Update video
  const updatedVideo = await VideoModel.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  ).populate("category", "name type");

  res.status(200).json({
    success: true,
    message: "Video updated successfully",
    data: { video: updatedVideo },
  });
});

/**
 * @desc    Delete video
 * @route   DELETE /api/videos/:id
 * @access  Private/Admin
 */
export const deleteVideo = asyncHandler(async (req: Request, res: Response) => {
  const video = await VideoModel.findById(req.params.id);

  if (!video) {
    res.status(404);
    throw new Error("Video not found");
  }

  // Delete from Cloudinary
  if (video.publicId) {
    await cloudinary.uploader.destroy(video.publicId, {
      resource_type: "video",
    });
  }

  // Delete thumbnail if exists
  if (video.thumbnailPublicId) {
    await cloudinary.uploader.destroy(video.thumbnailPublicId, {
      resource_type: "image",
    });
  }

  // Delete from database
  await VideoModel.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Video deleted successfully",
  });
});

// ============ CATEGORY MANAGEMENT FUNCTIONS ============

/**
 * @desc    Get video categories
 * @route   GET /api/videos/categories
 * @access  Public
 */
export const getVideoCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const categories = await CategoryModel.find({ type: "video" }).sort({
      name: 1,
    });

    res.status(200).json({
      success: true,
      data: categories,
    });
  }
);

/**
 * @desc    Get video categories with counts
 * @route   GET /api/videos/categories/counts
 * @access  Public
 */
export const getVideoCategoriesWithCounts = asyncHandler(
  async (req: Request, res: Response) => {
    // Get all video categories
    const categories = await CategoryModel.find({ type: "video" });

    // Get video counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await VideoModel.countDocuments({
          category: category._id,
          isActive: true,
        });

        return {
          id: category._id,
          name: category.name,
          count,
        };
      })
    );

    // Sort by count (descending)
    categoriesWithCounts.sort((a, b) => b.count - a.count);

    res.status(200).json({
      success: true,
      data: categoriesWithCounts,
    });
  }
);

/**
 * @desc    Create video category
 * @route   POST /api/videos/categories
 * @access  Private/Admin
 */
export const createVideoCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { name } = req.body;

    if (!name) {
      res.status(400);
      throw new Error("Category name is required");
    }

    const category = await CategoryModel.create({
      name,
      type: "video",
    });

    res.status(201).json({
      success: true,
      message: "Video category created successfully",
      data: category,
    });
  }
);

/**
 * @desc    Update video category
 * @route   PUT /api/videos/categories/:id
 * @access  Private/Admin
 */
export const updateVideoCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { name } = req.body;

    if (!name) {
      res.status(400);
      throw new Error("Category name is required");
    }

    // Ensure we're only updating video categories
    const category = await CategoryModel.findOne({
      _id: req.params.id,
      type: "video",
    });

    if (!category) {
      res.status(404);
      throw new Error("Video category not found");
    }

    const updatedCategory = await CategoryModel.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Video category updated successfully",
      data: updatedCategory,
    });
  }
);

/**
 * @desc    Delete video category
 * @route   DELETE /api/videos/categories/:id
 * @access  Private/Admin
 */
export const deleteVideoCategory = asyncHandler(
  async (req: Request, res: Response) => {
    // Ensure we're only deleting video categories
    const category = await CategoryModel.findOne({
      _id: req.params.id,
      type: "video",
    });

    if (!category) {
      res.status(404);
      throw new Error("Video category not found");
    }

    // Check if category is being used by any videos
    const isUsed = await VideoModel.findOne({ category: req.params.id });

    if (isUsed) {
      res.status(400);
      throw new Error(
        "Cannot delete category that is currently in use by videos"
      );
    }

    await CategoryModel.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Video category deleted successfully",
    });
  }
);
