/**
 * Common types used throughout the application
 */

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface TableColumn<T = any> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  render?: (value: any, record: T) => React.ReactNode;
  width?: string | number;
  align?: "left" | "center" | "right";
}

export interface FilterOption {
  key: string;
  label: string;
  type: "text" | "select" | "date" | "number";
  options?: SelectOption[];
  placeholder?: string;
}

export interface SortOption {
  key: string;
  direction: "asc" | "desc";
}

export interface Theme {
  mode: "light" | "dark" | "system";
  primaryColor: string;
  secondaryColor: string;
}

export interface UserPreferences {
  theme: Theme;
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

export interface BreadcrumbItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  children?: MenuItem[];
  disabled?: boolean;
  badge?: string | number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface FileUpload {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  url?: string;
}

export interface SearchResult<T = any> {
  data: T[];
  total: number;
  query: string;
  filters?: Record<string, any>;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

export interface StatsCard {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
    period: string;
  };
  icon?: React.ReactNode;
  color?: string;
}
