import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Secret, SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Make sure JWT_SECRET has a default value
const JWT_SECRET: Secret = process.env.JWT_SECRET || "";

export interface IAdmin extends Document {
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  matchPassword: (enteredPassword: string) => Promise<boolean>;
  getSignedJwtToken: () => string;
}

const adminSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
      trim: true,
      maxlength: [50, "Name cannot be more than 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't return password in queries
    },
  },
  {
    timestamps: true,
  }
);

adminSchema.pre<IAdmin>("save", async function (next) {
  if (!this.isModified("password")) {
    next();
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    if (error instanceof Error) {
      next(error);
    } else {
      next(new Error("Error hashing password"));
    }
  }
});

// Match user entered password to hashed password in database
adminSchema.methods.matchPassword = async function (
  enteredPassword: string
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Sign JWT and return
adminSchema.methods.getSignedJwtToken = function (): string {
  const options: SignOptions = {
    expiresIn: "30d",
  };

  return jwt.sign({ id: this._id }, JWT_SECRET, options);
};

const AdminModel = mongoose.model<IAdmin>("Admin", adminSchema);
export default AdminModel;
