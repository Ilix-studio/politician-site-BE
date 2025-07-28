import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";

import rateLimit from "express-rate-limit";
import corsOptions from "./config/corsOptions";
import { errorHandler, routeNotFound } from "./middleware/errorMiddleware";
import connectDB from "./config/dbConnection";

import auth from "./routes/auth";
import cloudinaryRoutes from "./routes/cloudinary";
import contactRoutes from "./routes/contact";
import photosRoutes from "./routes/photos";
import videosRoutes from "./routes/video";
import pressRoutes from "./routes/press";
import visitorRoutes from "./routes/visitor";
import categoryRoutes from "./routes/category";

// Create Express application
const app: Application = express();
dotenv.config();

const PORT = process.env.PORT || 8080;

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});

//CORS
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoints (no rate limiting)
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Politician Portfolio API is running",
    version: "1.0.0",
  });
});

// Apply rate limiting to API routes except health checks
app.use("/api", apiLimiter);

app.get("/_ah/health", (req: Request, res: Response) => {
  res.status(200).send("OK");
});

app.get("/_ah/start", (req: Request, res: Response) => {
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log(`Listening to http://localhost:${PORT}`);
});

app.use("/api/admin", auth);
app.use("/api/cloudinary", cloudinaryRoutes);
app.use("/api/messages", contactRoutes);
app.use("/api/photos", photosRoutes);
app.use("/api/videos", videosRoutes);
app.use("/api/press", pressRoutes);
app.use("/api/visitor", visitorRoutes);
app.use("/api/categories", categoryRoutes);

// Global error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Global error handler:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  res.status(500).json({
    success: false,
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// Centralized Error Handler
app.use(routeNotFound);
app.use(errorHandler);

// Connect to MongoDB
connectDB();
//Something was wrong
