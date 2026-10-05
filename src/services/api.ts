import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { safeLocalStorage } from './storage';

// Extend AxiosRequestConfig to support custom retry and auth options
export interface CustomRequestConfig extends AxiosRequestConfig {
  retry?: number;
  retryDelay?: number;
  retryCondition?: (error: AxiosError) => boolean;
  skipAuth?: boolean;
  _retryCount?: number;
}

export interface ApiError {
  message: string;
  status: number;
  data?: unknown;
  code?: string;
  originalError: AxiosError;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 500;

/**
 * Determines whether a failed request should be retried based on status code or error type.
 * Default: Retry on network disconnects, timeouts, and HTTP 5xx server errors.
 */
const defaultRetryCondition = (error: AxiosError): boolean => {
  // 1. Network connectivity / dropped connection errors
  if (!error.response) {
    return true;
  }

  // 2. Request timeouts
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return true;
  }

  const status = error.response.status;

  // 3. Retry on 5xx Server Errors & 429 Too Many Requests
  if (status === 429 || (status >= 500 && status <= 599)) {
    return true;
  }

  // Do not retry 4xx Client Errors (400, 401, 403, 404, etc.)
  return false;
};

/**
 * Creates and configures the Axios API client instance with interceptors and retry engine
 */
const createApiClient = (baseURL: string = import.meta.env.VITE_API_URL || '/api'): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout: DEFAULT_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // Request Interceptor: Attach Auth tokens and debug telemetry
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig & CustomRequestConfig) => {
      if (!config.skipAuth) {
        const token = safeLocalStorage.getItem('token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      if (import.meta.env.DEV) {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
      }

      return config;
    },
    (error: unknown) => Promise.reject(error)
  );

  // Response Interceptor: Handles retries, logging, and formatted error rejections
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      if (import.meta.env.DEV) {
        console.log(`[API Response] ${response.status} ${response.config.url}`);
      }
      return response;
    },
    async (error: AxiosError) => {
      const config = (error.config || {}) as InternalAxiosRequestConfig & CustomRequestConfig;

      const maxRetries = config.retry ?? DEFAULT_MAX_RETRIES;
      const baseDelay = config.retryDelay ?? DEFAULT_BASE_DELAY_MS;
      const isRetryable = config.retryCondition ?? defaultRetryCondition;

      config._retryCount = config._retryCount || 0;

      // Check if we should retry the request
      if (config._retryCount < maxRetries && isRetryable(error)) {
        config._retryCount += 1;

        // Exponential backoff with jitter: delay = baseDelay * (2 ^ attempt) + jitter
        const jitter = Math.random() * 100;
        const delay = baseDelay * Math.pow(2, config._retryCount - 1) + jitter;

        if (import.meta.env.DEV) {
          console.warn(
            `[API Retry] Attempt ${config._retryCount}/${maxRetries} for ${config.url} in ${Math.round(delay)}ms...`
          );
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
        return client(config);
      }

      // Format custom normalized error
      const status = error.response?.status || 500;
      const data = error.response?.data as { message?: string } | undefined;
      const message =
        data?.message ||
        error.message ||
        (status === 404 ? 'Resource not found' : 'An unexpected network error occurred');

      if (status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }

      const apiError: ApiError = {
        message,
        status,
        data: error.response?.data,
        code: error.code,
        originalError: error,
      };

      return Promise.reject(apiError);
    }
  );

  return client;
};

// Export singleton instance
export const api = createApiClient();

// Strongly-typed convenience wrappers
export const http = {
  get: <T = unknown>(url: string, config?: CustomRequestConfig): Promise<T> =>
    api.get<unknown, AxiosResponse<T>>(url, config).then((res: AxiosResponse<T>) => res.data),

  post: <T = unknown>(url: string, data?: unknown, config?: CustomRequestConfig): Promise<T> =>
    api.post<unknown, AxiosResponse<T>>(url, data, config).then((res: AxiosResponse<T>) => res.data),

  put: <T = unknown>(url: string, data?: unknown, config?: CustomRequestConfig): Promise<T> =>
    api.put<unknown, AxiosResponse<T>>(url, data, config).then((res: AxiosResponse<T>) => res.data),

  patch: <T = unknown>(url: string, data?: unknown, config?: CustomRequestConfig): Promise<T> =>
    api.patch<unknown, AxiosResponse<T>>(url, data, config).then((res: AxiosResponse<T>) => res.data),

  delete: <T = unknown>(url: string, config?: CustomRequestConfig): Promise<T> =>
    api.delete<unknown, AxiosResponse<T>>(url, config).then((res: AxiosResponse<T>) => res.data),
};

export default api;
