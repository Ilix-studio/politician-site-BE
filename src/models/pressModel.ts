// src/models/pressModel.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IPress extends Document {
  _id: string;
  title: string;
  source: string;
  date: Date;
  image: string;
  link: string;
  category: string;
  author: string;
  readTime: string;
  content: string;
  excerpt: string;
  imagePublicId?: string; // Cloudinary public ID for easy deletion
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pressSchema: Schema<IPress> = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
      index: true, // For search optimization
    },
    source: {
      type: String,
      required: [true, "Source is required"],
      trim: true,
      maxlength: [100, "Source cannot exceed 100 characters"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    image: {
      type: String,
      required: [true, "Image URL is required"],
      validate: {
        validator: function (v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: "Image must be a valid URL",
      },
    },
    link: {
      type: String,
      required: [true, "Article link is required"],
      validate: {
        validator: function (v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: "Link must be a valid URL",
      },
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "politics",
        "economy",
        "development",
        "social",
        "environment",
        "education",
        "healthcare",
        "infrastructure",
        "other",
      ],
      default: "politics",
    },
    author: {
      type: String,
      required: [true, "Author is required"],
      trim: true,
      maxlength: [100, "Author name cannot exceed 100 characters"],
    },
    readTime: {
      type: String,
      required: [true, "Read time is required"],
      match: [
        /^\d+\s?(min|mins|minute|minutes)$/i,
        "Read time format should be like '5 min'",
      ],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
      maxlength: [10000, "Content cannot exceed 10000 characters"],
    },
    excerpt: {
      type: String,
      required: [true, "Excerpt is required"],
      trim: true,
      maxlength: [500, "Excerpt cannot exceed 500 characters"],
    },
    imagePublicId: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search functionality
pressSchema.index({ title: "text", content: "text", excerpt: "text" });
pressSchema.index({ category: 1 });
pressSchema.index({ date: -1 });
pressSchema.index({ isActive: 1 });

const PressModel = mongoose.model<IPress>("Press", pressSchema);
export default PressModel;
