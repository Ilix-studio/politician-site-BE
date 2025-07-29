// src/models/VideoModel.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IVideo extends Document {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  date: Date;
  category: mongoose.Types.ObjectId;
  duration: string;
  publicId: string;
  thumbnailPublicId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const videoSchema: Schema<IVideo> = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
      index: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    thumbnail: {
      type: String,
      required: [true, "Thumbnail URL is required"],
      validate: {
        validator: function (v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: "Thumbnail must be a valid URL",
      },
    },
    videoUrl: {
      type: String,
      required: [true, "Video URL is required"],
      validate: {
        validator: function (v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: "Video URL must be a valid URL",
      },
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      index: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
      validate: {
        validator: async function (value: mongoose.Types.ObjectId) {
          const CategoryModel = mongoose.model("Category");
          const category = await CategoryModel.findOne({
            _id: value,
            type: "video",
          });
          return !!category;
        },
        message: "Invalid video category",
      },
    },
    duration: {
      type: String,
      required: [true, "Duration is required"],
      validate: {
        validator: function (v: string) {
          return /^\d{1,2}:\d{2}(:\d{2})?$/.test(v);
        },
        message: "Duration must be in format MM:SS or HH:MM:SS",
      },
    },
    publicId: {
      type: String,
      required: [true, "Cloudinary public ID is required"],
      unique: true,
      index: true,
    },
    thumbnailPublicId: {
      type: String,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for efficient queries
videoSchema.index({ category: 1, date: -1 });
videoSchema.index({ isActive: 1, date: -1 });
videoSchema.index({ title: "text", description: "text" });

const VideoModel = mongoose.model<IVideo>("Video", videoSchema);
export default VideoModel;
