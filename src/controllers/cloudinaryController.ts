// src/controllers/cloudinaryController.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import cloudinary from "../config/cloudinaryConfig";
import logger from "../utils/logger";

/**
 * Generate a signature for authenticated Cloudinary uploads
 * @route POST /api/cloudinary/signature
 * @access Private (Admin only)
 */
export const generateSignature = asyncHandler(
  async (req: Request, res: Response) => {
    const { folder = "dynamic-images-for-politician" } = req.body;

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      res.status(500).json({
        success: false,
        message: "Cloudinary configuration is missing on the server",
      });
      return;
    }

    const timestamp = Math.round(new Date().getTime() / 1000);

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      apiSecret
    );

    res.status(200).json({
      timestamp,
      signature,
      cloudName,
      apiKey,
      folder,
    });
  }
);

/**
 * Upload multiple images to Cloudinary
 * @route POST /api/cloudinary/upload-multiple
 * @access Private (Admin only)
 */
export const uploadMultipleImages = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400);
      throw new Error("No files uploaded");
    }

    const files = req.files as Express.Multer.File[];
    const { folder = "dynamic-images-for-politician", altTexts } = req.body;

    // Parse altTexts if provided
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
              folder,
              resource_type: "image",
              transformation: [
                { width: 1200, height: 800, crop: "limit" },
                { quality: "auto" },
                { format: "auto" },
              ],
            },
            (error, result) => {
              if (error) {
                logger.error(
                  `Cloudinary upload error for file ${index}:`,
                  error
                );
                reject(error);
              } else {
                resolve({
                  src: result!.secure_url,
                  alt: altTextsArray[index] || `Image ${index + 1}`,
                  cloudinaryPublicId: result!.public_id,
                  width: result!.width,
                  height: result!.height,
                  format: result!.format,
                  bytes: result!.bytes,
                });
              }
            }
          )
          .end(file.buffer);
      });
    });

    const uploadedImages = await Promise.all(uploadPromises);

    logger.info(
      `Successfully uploaded ${uploadedImages.length} images to Cloudinary`
    );

    res.status(200).json({
      success: true,
      message: `${uploadedImages.length} images uploaded successfully`,
      data: {
        images: uploadedImages,
        count: uploadedImages.length,
      },
    });
  }
);

/**
 * Upload single image to Cloudinary
 * @route POST /api/cloudinary/upload-single
 * @access Private (Admin only)
 */
export const uploadSingleImage = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400);
      throw new Error("No file uploaded");
    }

    const { folder = "dynamic-images-for-politician", alt } = req.body;

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: "image",
            transformation: [
              { width: 1200, height: 800, crop: "limit" },
              { quality: "auto" },
              { format: "auto" },
            ],
          },
          (error, result) => {
            if (error) {
              logger.error("Cloudinary upload error:", error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        )
        .end(req.file!.buffer);
    });

    const result = uploadResult as any;

    res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        src: result.secure_url,
        alt: alt || "Uploaded image",
        cloudinaryPublicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      },
    });
  }
);

/**
 * Delete multiple images from Cloudinary
 * @route DELETE /api/cloudinary/delete-multiple
 * @access Private (Admin only)
 */
export const deleteMultipleImages = asyncHandler(
  async (req: Request, res: Response) => {
    const { publicIds } = req.body;

    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      res.status(400);
      throw new Error("Public IDs array is required");
    }

    // Delete all images from Cloudinary
    const deletePromises = publicIds.map(async (publicId: string) => {
      const result = await cloudinary.uploader.destroy(publicId);
      return {
        publicId,
        result: result.result,
        success: result.result === "ok",
      };
    });

    const deleteResults = await Promise.allSettled(deletePromises);

    const successful = deleteResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => (result as PromiseFulfilledResult<any>).value)
      .filter((item) => item.success);

    const failed = deleteResults
      .filter(
        (result) =>
          result.status === "rejected" ||
          (result.status === "fulfilled" &&
            !(result as PromiseFulfilledResult<any>).value.success)
      )
      .map((result, index) => ({
        publicId: publicIds[index],
        error: result.status === "rejected" ? result.reason : "Deletion failed",
      }));

    logger.info(`Deleted ${successful.length} images, ${failed.length} failed`);

    res.status(200).json({
      success: true,
      message: `Deleted ${successful.length} of ${publicIds.length} images`,
      data: {
        successful,
        failed,
        totalRequested: publicIds.length,
        successCount: successful.length,
        failedCount: failed.length,
      },
    });
  }
);

/**
 * Delete single image from Cloudinary
 * @route DELETE /api/cloudinary/:publicId
 * @access Private (Admin only)
 */
export const deleteCloudinaryImage = asyncHandler(
  async (req: Request, res: Response) => {
    const { publicId } = req.params;

    if (!publicId) {
      res.status(400);
      throw new Error("Public ID is required");
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== "ok") {
      res.status(400);
      throw new Error(`Failed to delete image: ${result.result}`);
    }

    res.status(200).json({
      success: true,
      message: "Image deleted successfully",
      data: {
        publicId,
        result: result.result,
      },
    });
  }
);

/**
 * Get image details from Cloudinary
 * @route GET /api/cloudinary/details/:publicId
 * @access Private (Admin only)
 */
export const getImageDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const { publicId } = req.params;

    if (!publicId) {
      res.status(400);
      throw new Error("Public ID is required");
    }

    const details = await cloudinary.api.resource(publicId);

    res.status(200).json({
      success: true,
      data: {
        publicId: details.public_id,
        url: details.secure_url,
        width: details.width,
        height: details.height,
        format: details.format,
        bytes: details.bytes,
        createdAt: details.created_at,
        folder: details.folder,
      },
    });
  }
);

/**
 * List images in a folder
 * @route GET /api/cloudinary/folder/:folderName
 * @access Private (Admin only)
 */
export const listImagesInFolder = asyncHandler(
  async (req: Request, res: Response) => {
    const { folderName } = req.params;
    const { maxResults = 50 } = req.query;

    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: folderName,
      max_results: parseInt(maxResults as string),
    });

    const images = result.resources.map((resource: any) => ({
      publicId: resource.public_id,
      url: resource.secure_url,
      width: resource.width,
      height: resource.height,
      format: resource.format,
      bytes: resource.bytes,
      createdAt: resource.created_at,
    }));

    res.status(200).json({
      success: true,
      data: {
        folder: folderName,
        images,
        count: images.length,
        totalCount: result.total_count,
      },
    });
  }
);
