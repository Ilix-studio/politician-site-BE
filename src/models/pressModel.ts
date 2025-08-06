// src/models/pressModel.ts
import mongoose, { Document, Schema } from "mongoose";

// Interface for individual image
interface IPressImage {
  src: string;
  alt: string;
  cloudinaryPublicId: string;
}

export interface IPress extends Document {
  _id: string;
  title: string;
  source: string;
  date: Date;
  images: IPressImage[];
  link: string;
  category: mongoose.Types.ObjectId;
  author: string;
  readTime: string;
  content: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Press image schema
const pressImageSchema = new Schema<IPressImage>({
  src: {
    type: String,
    required: [true, "Image URL is required"],
    validate: {
      validator: function (v: string) {
        return /^https?:\/\/.+/.test(v);
      },
      message: "Image must be a valid URL",
    },
  },
  alt: {
    type: String,
    required: [true, "Alt text is required"],
    trim: true,
    maxlength: [200, "Alt text cannot exceed 200 characters"],
  },
  cloudinaryPublicId: {
    type: String,
    required: [true, "Cloudinary public ID is required"],
    trim: true,
  },
});

const pressSchema: Schema<IPress> = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
      index: true,
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
    images: {
      type: [pressImageSchema],
      required: [true, "At least one image is required"],
      validate: {
        validator: function (images: IPressImage[]) {
          return images && images.length > 0 && images.length <= 5; // Max 5 images for press
        },
        message: "Must have between 1 and 5 images",
      },
    },
    link: {
      type: String,
      validate: {
        validator: function (v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: "Link must be a valid URL",
      },
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
            type: "press",
          });
          return !!category;
        },
        message: "Invalid press category",
      },
    },
    author: {
      type: String,
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
pressSchema.index({ title: "text", content: "text" });
pressSchema.index({ category: 1 });
pressSchema.index({ date: -1 });
pressSchema.index({ isActive: 1 });

const PressModel = mongoose.model<IPress>("Press", pressSchema);
export default PressModel;
