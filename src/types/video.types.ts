// src/types/video.types.ts

// Main Video interface (matches your provided structure)
export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  date: string;
  category: "speech" | "event" | "interview" | "initiative";
  duration: string;
}

// Extended Video interface for database operations
export interface VideoDocument extends Video {
  _id: string;
  publicId: string; // Cloudinary public ID
  thumbnailPublicId?: string;
  featured?: boolean;
  tags?: string[];
  views?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Video upload data interface
export interface VideoUploadData {
  title: string;
  description: string;
  category: "speech" | "event" | "interview" | "initiative";
  date: string;
  duration: string;
  featured?: boolean;
  tags?: string[] | string; // Can be array or comma-separated string
}

// Video create data interface (for existing Cloudinary URLs)
export interface VideoCreateData {
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  date: string;
  category: "speech" | "event" | "interview" | "initiative";
  duration: string;
  publicId: string;
  thumbnailPublicId?: string;
  featured?: boolean;
  tags?: string[] | string;
}

// Video update data interface
export interface VideoUpdateData {
  title?: string;
  description?: string;
  thumbnail?: string;
  videoUrl?: string;
  date?: string;
  category?: "speech" | "event" | "interview" | "initiative";
  duration?: string;
  featured?: boolean;
  tags?: string[] | string;
  isActive?: boolean;
}

// Video query parameters interface
export interface VideoQueryParams {
  page?: string;
  limit?: string;
  category?: string | "all";
  featured?: string;
  search?: string;
  sortBy?: "date" | "title" | "views" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

// Pagination info interface
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalVideos: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

// API Response interfaces
export interface VideoResponse {
  success: boolean;
  message?: string;
  data: {
    video: VideoDocument;
  };
}

export interface VideosResponse {
  success: boolean;
  data: {
    videos: VideoDocument[];
    pagination: PaginationInfo;
  };
}

export interface CategoriesResponse {
  success: boolean;
  data: {
    categories: string[];
  };
}

export interface DeleteVideoResponse {
  success: boolean;
  message: string;
}

// Cloudinary upload response for videos
export interface CloudinaryVideoUploadResponse {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: "video";
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  audio?: {
    codec: string;
    bit_rate: string;
    frequency: number;
    channels: number;
    channel_layout: string;
  };
  video?: {
    pix_format: string;
    codec: string;
    level: number;
    bit_rate: string;
    profile: string;
  };
  duration?: number; // Video duration in seconds
  nb_frames?: string;
}

// File upload interfaces
export interface VideoFileUpload {
  video: Express.Multer.File;
  thumbnail?: Express.Multer.File;
}

// Error interfaces
export interface VideoError {
  success: false;
  message: string;
  error?: string;
  errors?: Array<{
    type: string;
    value: any;
    msg: string;
    path: string;
    location: string;
  }>;
}

// Frontend component props interfaces
export interface VideoCardProps {
  video: Video;
  onEdit?: (video: Video) => void;
  onDelete?: (videoId: string) => void;
  onToggleFeatured?: (videoId: string) => void;
  showActions?: boolean;
}

export interface VideoPlayerProps {
  video: Video;
  autoplay?: boolean;
  controls?: boolean;
  muted?: boolean;
  onViewIncrement?: () => void;
}

export interface VideoFormProps {
  video?: Video;
  onSubmit: (data: VideoUploadData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  mode: "create" | "edit";
}

export interface VideoFilterProps {
  categories: string[];
  onFilterChange: (filters: VideoQueryParams) => void;
  currentFilters: VideoQueryParams;
}

// Constants
export const VIDEO_CATEGORIES = [
  "speech",
  "event",
  "interview",
  "initiative",
] as const;

export const VIDEO_SORT_OPTIONS = [
  { value: "date", label: "Date" },
  { value: "title", label: "Title" },
  { value: "views", label: "Views" },
  { value: "createdAt", label: "Created" },
  { value: "updatedAt", label: "Updated" },
] as const;

export const VIDEO_SORT_ORDERS = [
  { value: "desc", label: "Descending" },
  { value: "asc", label: "Ascending" },
] as const;

// Utility type for video category
export type VideoCategory = (typeof VIDEO_CATEGORIES)[number];

// Utility type for sort options
export type VideoSortBy = (typeof VIDEO_SORT_OPTIONS)[number]["value"];
export type VideoSortOrder = (typeof VIDEO_SORT_ORDERS)[number]["value"];
// File upload interfaces
export interface VideoFileUpload {
  video: Express.Multer.File;
  thumbnail?: Express.Multer.File;
}
