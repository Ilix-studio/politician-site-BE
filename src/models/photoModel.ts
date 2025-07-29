import mongoose, { Document, Schema } from "mongoose";

// Interface for individual image
interface IImage {
  src: string;
  alt: string;
  cloudinaryPublicId: string;
}

export interface IPhoto extends Document {
  images: IImage[];
  title: string;
  category: mongoose.Types.ObjectId;
  date: Date;
  location: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Image schema
const imageSchema = new Schema<IImage>({
  src: {
    type: String,
    required: [true, "Image URL is required"],
    trim: true,
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

const photoSchema: Schema = new Schema(
  {
    images: {
      type: [imageSchema],
      required: [true, "At least one image is required"],
      validate: {
        validator: function (images: IImage[]) {
          return images && images.length > 0 && images.length <= 10; // Max 10 images
        },
        message: "Must have between 1 and 10 images",
      },
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
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
            type: "photo",
          });
          return !!category;
        },
        message: "Invalid photo category",
      },
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
