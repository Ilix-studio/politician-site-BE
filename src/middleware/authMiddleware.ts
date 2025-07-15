// middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";

import dotenv from "dotenv";
import AdminModel from "../models/adminModel";

dotenv.config();

// Make sure JWT_SECRET has a default value
const JWT_SECRET = process.env.JWT_SECRET || "your_fallback_secret_key";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const protect = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;

    // Check if token exists in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      try {
        // Get token from header
        token = req.headers.authorization.split(" ")[1];

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

        // Get user from token
        req.user = await AdminModel.findById(decoded.id).select("-password");

        if (!req.user) {
          res.status(401);
          throw new Error("User not found with this token");
        }

        next();
      } catch (error) {
        console.error("Token verification error:", error);
        res.status(401);
        throw new Error("Not authorized, token failed");
      }
    } else {
      res.status(401);
      throw new Error("Not authorized, no token");
    }
  }
);
