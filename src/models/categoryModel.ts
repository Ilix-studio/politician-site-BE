import mongoose, { Document, Schema } from "mongoose";

export interface ICategory extends Document {
  _id: string;
  name: string;
  type: "photo" | "video" | "press";
  createdAt: Date;
}

const categorySchema: Schema<ICategory> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [100, "Category name cannot exceed 100 characters"],
    },
    type: {
      type: String,
      required: [true, "Category type is required"],
      enum: {
        values: ["photo", "video", "press"],
        message: "Type must be one of: photo, video, press",
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only track createdAt
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.updatedAt;
        return ret;
      },
    },
  }
);

// Compound index to prevent duplicate names within same type
categorySchema.index({ name: 1, type: 1 }, { unique: true });

const CategoryModel = mongoose.model<ICategory>("Category", categorySchema);
export default CategoryModel;
