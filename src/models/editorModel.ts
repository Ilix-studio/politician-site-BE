import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";
import { ROLES } from "../constants/roles";

dotenv.config();

const JWT_SECRET: Secret = process.env.JWT_SECRET || "";
const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = "30d";

export interface IEditor extends Document {
  name: string;
  email: string;
  password: string;
  role: typeof ROLES.EDITOR;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  matchPassword: (enteredPassword: string) => Promise<boolean>;
  getSignedJwtToken: () => string;
}

const editorSchema = new Schema<IEditor>(
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
      select: false, // never returned by default
    },
    role: {
      type: String,
      default: ROLES.EDITOR,
      immutable: true, // cannot be escalated after creation
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

editorSchema.pre<IEditor>("save", async function (next) {
  if (!this.isModified("password")) {
    next();
    return;
  }
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error("Error hashing password"));
  }
});

editorSchema.methods.matchPassword = async function (
  enteredPassword: string,
): Promise<boolean> {
  return bcrypt.compare(enteredPassword, this.password);
};

// Embeds role so `protect` resolves the token against EditorModel.
editorSchema.methods.getSignedJwtToken = function (): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  return jwt.sign({ id: this._id, role: ROLES.EDITOR }, JWT_SECRET, options);
};

const EditorModel = mongoose.model<IEditor>("Editor", editorSchema);
export default EditorModel;
