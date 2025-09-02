/**
 * API related types
 */

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
}

export interface RequestConfig {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
  errors?: Record<string, string[]>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    filters?: Record<string, any>;
    sort?: {
      field: string;
      order: "asc" | "desc";
    };
  };
}

export interface ApiClient {
  get: <T = any>(url: string, config?: Partial<RequestConfig>) => Promise<ApiResponse<T>>;
  post: <T = any>(
    url: string,
    data?: any,
    config?: Partial<RequestConfig>,
  ) => Promise<ApiResponse<T>>;
  put: <T = any>(
    url: string,
    data?: any,
    config?: Partial<RequestConfig>,
  ) => Promise<ApiResponse<T>>;
  patch: <T = any>(
    url: string,
    data?: any,
    config?: Partial<RequestConfig>,
  ) => Promise<ApiResponse<T>>;
  delete: <T = any>(url: string, config?: Partial<RequestConfig>) => Promise<ApiResponse<T>>;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadResponse {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
}

export interface ApiHookResult<T = any> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

export interface ApiHookOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  filters?: Record<string, any>;
}

export interface MutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
  onSettled?: () => void;
}
