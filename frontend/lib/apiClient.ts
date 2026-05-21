/**
 * API Client with error handling and request/response interceptors
 */

interface RequestOptions extends RequestInit {
  timeout?: number;
}

interface ApiError {
  status: number;
  message: string;
  data?: any;
}

class ApiClientError extends Error implements ApiError {
  status: number;
  data?: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = "ApiClientError";
  }
}

/**
 * Make API request with error handling
 */
async function request<T>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const { timeout = 30000, ...fetchOptions } = options;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle non-JSON responses
    const contentType = response.headers.get("content-type");
    let data: any;

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Handle error responses
    if (!response.ok) {
      throw new ApiClientError(
        response.status,
        data?.message || data || response.statusText,
        data,
      );
    }

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new ApiClientError(
        0,
        "Network error. Please check your connection.",
      );
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiClientError(408, "Request timeout. Please try again.");
    }

    throw new ApiClientError(
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

/**
 * API Client class
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || "") {
    this.baseUrl = baseUrl;
  }

  private getUrl(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>(this.getUrl(path), {
      ...options,
      method: "GET",
    });
  }

  async post<T>(
    path: string,
    body?: any,
    options?: RequestOptions,
  ): Promise<T> {
    return request<T>(this.getUrl(path), {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return request<T>(this.getUrl(path), {
      ...options,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>(this.getUrl(path), {
      ...options,
      method: "DELETE",
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export error class for error handling
export { ApiClientError };
