import mongoose, { Document, Schema } from "mongoose";

export interface IPhoto extends Document {
  src: string;
  alt: string;
  title: string;
  category: string;
  date: Date;
  location: string;
  description: string;
  cloudinaryPublicId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const photoSchema: Schema = new Schema(
  {
    src: {
      type: String,
      required: [true, "Photo URL is required"],
      trim: true,
    },
    alt: {
      type: String,
      required: [true, "Alt text is required"],
      trim: true,
      maxlength: [200, "Alt text cannot exceed 200 characters"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      enum: [
        "political-events",
        "community-service",
        "public-rallies",
        "meetings",
        "awards",
        "personal",
        "campaigns",
        "speeches",
        "other",
      ],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, "Location cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    cloudinaryPublicId: {
      type: String,
      required: [true, "Cloudinary public ID is required"],
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

// Indexes for better query performance
photoSchema.index({ category: 1 });
photoSchema.index({ date: -1 });
photoSchema.index({ isActive: 1 });
photoSchema.index({ createdAt: -1 });

const PhotoModel = mongoose.model<IPhoto>("Photo", photoSchema);
export default PhotoModel;
