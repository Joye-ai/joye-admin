import { API_BASE_URL, MASTER_API_BASE_URL } from "@/constants";

import { authHelpers } from "./auth";

/**
 * Generic API request function
 */
const makeApiRequest = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const authHeaders = authHelpers.getAuthHeader();

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  if (!response.ok) {
    throw new Error(
      `API ${config.method || "GET"} ${url} failed: ${response.status} ${response.statusText}`,
    );
  }
  try {
    return (await response.json()) as T;
  } catch (e) {
    console.log(e);
    throw new Error(`Invalid JSON response from ${url}`);
  }
};

/**
 * Generic GET function
 * @param endpoint - API endpoint (without base URL)
 * @param params - Query parameters (optional)
 * @returns Promise with response data
 */
export const get = <T = unknown>(
  endpoint: string,
  params?: Record<string, unknown>,
): Promise<T> => {
  const url = params
    ? `${endpoint}?${new URLSearchParams(
        Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
          acc[k] = String(v as unknown as string);
          return acc;
        }, {}),
      )}`
    : endpoint;
  return makeApiRequest<T>(url, { method: "GET" });
};

/**
 * Generic POST function
 * @param endpoint - API endpoint (without base URL)
 * @param payload - Request body data (optional)
 * @returns Promise with response data
 */
export const post = <T = unknown>(endpoint: string, payload?: unknown): Promise<T> => {
  return makeApiRequest<T>(endpoint, {
    method: "POST",
    body: payload ? JSON.stringify(payload) : undefined,
  });
};

/**
 * Generic PUT function
 * @param endpoint - API endpoint (without base URL)
 * @param payload - Request body data (optional)
 * @returns Promise with response data
 */
export const put = <T = unknown>(endpoint: string, payload?: unknown): Promise<T> => {
  return makeApiRequest<T>(endpoint, {
    method: "PUT",
    body: payload ? JSON.stringify(payload) : undefined,
  });
};

/**
 * Generic PATCH function
 * @param endpoint - API endpoint (without base URL)
 * @param payload - Request body data (optional)
 * @returns Promise with response data
 */
export const patch = <T = unknown>(endpoint: string, payload?: unknown): Promise<T> => {
  return makeApiRequest<T>(endpoint, {
    method: "PATCH",
    body: payload ? JSON.stringify(payload) : undefined,
  });
};

/**
 * Generic DELETE function
 * @param endpoint - API endpoint (without base URL)
 * @returns Promise with response data
 */
export const del = <T = unknown>(endpoint: string): Promise<T> => {
  return makeApiRequest<T>(endpoint, { method: "DELETE" });
};

/**
 * Upload file function
 * @param endpoint - API endpoint (without base URL)
 * @param file - File to upload
 * @param onProgress - Progress callback (optional)
 * @returns Promise with response data
 */
export const upload = async <T = unknown>(
  endpoint: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<T> => {
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          console.log(e);
          reject(new Error("Invalid JSON response"));
        }
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed"));
    });

    xhr.open("POST", `${API_BASE_URL}${endpoint}`);

    // Set auth header
    const token = authHelpers.getToken();
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.send(formData);
  });
};

/**
 * Handle API errors
 * @param error - Error object
 * @returns Formatted error message
 */
export const handleApiError = (error: unknown): string => {
  const err = error as
    | { response?: { data?: { message?: string } }; request?: unknown; message?: string }
    | undefined;
  if (err?.response) {
    // Server responded with error status
    return err.response.data?.message || "Server error occurred";
  } else if (err?.request) {
    // Request was made but no response received
    return "Network error - please check your connection";
  } else {
    // Something else happened
    return err?.message || "An unexpected error occurred";
  }
};

/**
 * Legacy API helpers object for backward compatibility
 * @deprecated Use individual functions (get, post, put, patch, del) instead
 */
export const apiHelpers = {
  request: makeApiRequest,
  get,
  post,
  put,
  patch,
  delete: del,
  upload,
  handleError: handleApiError,
};

/**
 * Create a simple API client with a fixed base URL and default headers
 * @param baseUrl - Base URL for the API client
 * @param defaultHeaders - Default headers to include in requests
 * @returns API client with get, post, put, patch, delete methods
 */
export function createApiClient(baseUrl: string, defaultHeaders?: HeadersInit) {
  const request = async <T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const url = `${baseUrl}${endpoint}`;
    const authHeaders = authHelpers.getAuthHeader();
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...(defaultHeaders || {}),
        ...options.headers,
      },
      ...options,
    };
    const res = await fetch(url, config);
    if (!res.ok)
      throw new Error(
        `API ${config.method || "GET"} ${url} failed: ${res.status} ${res.statusText}`,
      );
    try {
      return (await res.json()) as T;
    } catch (e) {
      console.log(e);
      // Some endpoints may not return JSON
      return undefined as unknown as T;
    }
  };

  return {
    get: <T = unknown>(endpoint: string, params?: Record<string, unknown>) => {
      const url = params
        ? `${endpoint}?${new URLSearchParams(
            Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
              acc[k] = String(v as unknown as string);
              return acc;
            }, {}),
          )}`
        : endpoint;
      return request<T>(url, { method: "GET" });
    },
    post: <T = unknown>(endpoint: string, data?: unknown) =>
      request<T>(endpoint, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
    put: <T = unknown>(endpoint: string, data?: unknown) =>
      request<T>(endpoint, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
    patch: <T = unknown>(endpoint: string, data?: unknown) =>
      request<T>(endpoint, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
    delete: <T = unknown>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
  };
}

/**
 * Mock data for development/testing
 */
const getMockMasterData = (model: string, category: string) => {
  return [
    {
      id: "1",
      model,
      category,
      tokens: 1250,
      content: `You are a helpful assistant for ${category} tasks. Please provide clear and concise responses that are relevant to the user's needs. Focus on being practical and actionable in your guidance.`,
    },
    {
      id: "2",
      model,
      category,
      tokens: 980,
      content: `When working with ${category}, it's important to consider the context and user requirements. Always ask clarifying questions if needed and provide step-by-step guidance.`,
    },
    {
      id: "3",
      model,
      category,
      tokens: 2100,
      content: `For ${category} scenarios, follow these best practices: 1) Understand the problem clearly, 2) Break down complex tasks into smaller steps, 3) Provide examples when helpful, 4) Always validate your understanding before proceeding.`,
    },
    {
      id: "4",
      model,
      category,
      tokens: 750,
      content: `Remember to be patient and thorough when handling ${category} requests. Quality over speed is always preferred.`,
    },
    {
      id: "5",
      model,
      category,
      tokens: 1650,
      content: `In ${category} contexts, maintain a professional tone while being approachable. Use clear language and avoid jargon unless necessary. Always end with a summary of key points.`,
    },
  ];
};

/**
 * Enhanced master API client with mock data support
 * @returns Master API client with enhanced functionality
 */
const createMasterApiClient = () => {
  const baseClient = createApiClient(MASTER_API_BASE_URL, {
    "Ocp-Apim-Subscription-Key":
      process.env.NEXT_PUBLIC_APIM_SUBSCRIPTION_KEY || "{{apim-subscription-key}}",
    "X-Azure-FDID": process.env.NEXT_PUBLIC_FRONTDOOR_ID || "{{frontdoor-id-jy-test}}",
  });

  return {
    ...baseClient,
    get: async <T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<T> => {
      // Check if we should use mock data
      const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" || true; // Default to true for now

      if (USE_MOCK_DATA && endpoint === "/master/data") {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Extract model and category from params if provided
        const model = (params?.model as string) || "claude-sonnet-4-20250514";
        const category = (params?.category as string) || "brew";

        return getMockMasterData(model, category) as T;
      }

      // Use real API
      return baseClient.get<T>(endpoint, params);
    },
  };
};

/**
 * Pre-configured client for the master server
 */
export const masterApi = createMasterApiClient();
