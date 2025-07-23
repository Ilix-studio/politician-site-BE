// src/types/press.types.ts

// Main Press interface (matches your provided structure)
export interface Press {
  id: number;
  title: string;
  source: string;
  date: string;
  image: string;
  link: string;
  category: string;
  author: string;
  readTime: string;
  content: string;
  excerpt: string;
}

// Extended Press interface for database operations
export interface PressDocument extends Omit<Press, "id" | "date"> {
  _id: string;
  date: Date;
  imagePublicId?: string; // Cloudinary public ID
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Press upload data interface
export interface PressUploadData {
  title: string;
  source: string;
  date: string;
  link: string;
  category:
    | "politics"
    | "economy"
    | "development"
    | "social"
    | "environment"
    | "education"
    | "healthcare"
    | "infrastructure"
    | "other";
  author: string;
  readTime: string;
  content: string;
  excerpt: string;
}

// Press create data interface (for existing Cloudinary URLs)
export interface PressCreateData {
  title: string;
  source: string;
  date: string;
  image: string;
  link: string;
  category:
    | "politics"
    | "economy"
    | "development"
    | "social"
    | "environment"
    | "education"
    | "healthcare"
    | "infrastructure"
    | "other";
  author: string;
  readTime: string;
  content: string;
  excerpt: string;
  imagePublicId?: string;
}

// Press update data interface
export interface PressUpdateData {
  title?: string;
  source?: string;
  date?: string;
  image?: string;
  link?: string;
  category?:
    | "politics"
    | "economy"
    | "development"
    | "social"
    | "environment"
    | "education"
    | "healthcare"
    | "infrastructure"
    | "other";
  author?: string;
  readTime?: string;
  content?: string;
  excerpt?: string;
  isActive?: boolean;
}

// Press query parameters interface
export interface PressQueryParams {
  page?: string;
  limit?: string;
  category?: string | "all";
  search?: string;
  sortBy?: "date" | "title" | "author" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
  isActive?: string;
}

// Pagination info interface
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalPress: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

// API Response interfaces
export interface PressResponse {
  success: boolean;
  message?: string;
  data: {
    press: PressDocument;
  };
}

export interface PressListResponse {
  success: boolean;
  data: {
    press: PressDocument[];
    pagination: PaginationInfo;
  };
}

export interface PressCategoriesResponse {
  success: boolean;
  data: {
    categories: string[];
  };
}

export interface DeletePressResponse {
  success: boolean;
  message: string;
}
