// auth.controller.ts
import asyncHandler from "express-async-handler";
import { Request, Response, NextFunction } from "express";
import AdminModel from "../models/adminModel";
import logger from "../utils/logger";

import dotenv from "dotenv";

dotenv.config();

/**
 * @desc    Login admin user and generate token
 * @route   POST /api/admin/login
 * @access  Public
 */
export const loginAdmin = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Please provide both email and password",
      });
      return;
    }

    // Find admin by email
    const admin = await AdminModel.findOne({ email }).select("+password");

    // Check if admin exists and password matches
    if (!admin || !(await admin.matchPassword(password))) {
      logger.info(`Failed login attempt for email: ${email}`);
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
      return;
    }

    // Generate token
    const token = admin.getSignedJwtToken();

    // Log successful login
    logger.info(`Admin logged in: ${admin.email}`);

    // Return success with token
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        token,
      },
    });
  }
);

/**
 * @desc    Logout admin user
 * @route   POST /api/admin/logout
 * @access  Private
 */
export const logoutAdmin = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const admin = req.user;

    if (admin) {
      logger.info(`Admin logged out: ${admin.email}`);
    }

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  }
);
