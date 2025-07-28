// src/models/videoModel.ts
import mongoose, { Document, Schema } from "mongoose";

// Video data structure interface
export interface IVideo extends Document {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  date: Date;
  category: mongoose.Types.ObjectId;
  duration: string;
  publicId: string; // Cloudinary public ID for easy deletion
  thumbnailPublicId?: string; // Optional thumbnail public ID
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
      index: true, // For search optimization
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
      index: true, // For sorting by date
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
          // Accept formats like "2:30", "1:45:30", "0:45"
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
videoSchema.index({ category: 1, date: -1 }); // Category + date
videoSchema.index({ isActive: 1, date: -1 }); // Active videos by date
videoSchema.index({ title: "text", description: "text" }); // Text search

// Virtual for formatted duration
videoSchema.virtual("formattedDuration").get(function (this: IVideo) {
  return this.duration;
});

// Static methods
videoSchema.statics.getCategories = function () {
  return ["speech", "event", "interview", "initiative"];
};

const VideoModel = mongoose.model<IVideo>("Video", videoSchema);
export default VideoModel;
