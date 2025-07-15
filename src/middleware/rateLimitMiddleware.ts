import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

// Basic rate limiting for general API routes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests, please try again later.",
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later.",
    });
  },
});

// More strict rate limiting for authentication routes
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 login attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many login attempts, please try again later.",
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: "Too many login attempts, please try again later.",
    });
  },
});

// Rate limiting for form submissions
export const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 form submissions per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many form submissions, please try again later.",
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: "Too many form submissions, please try again later.",
    });
  },
});
