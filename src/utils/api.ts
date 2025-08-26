import { API_URL } from '../config';

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { requireAuth = true, ...fetchOptions } = options;

  // Get token from storage
  const token = localStorage.getItem('workshub_auth_token') || sessionStorage.getItem('workshub_auth_token');

  // Set up headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  // Add auth header if required and token exists
  if (requireAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (requireAuth && !token) {
    // Redirect to login if auth required but no token
    window.location.href = '/login';
    throw new ApiError('No authentication token', 401);
  }

  // Make the request
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  // Handle errors
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));

    if (response.status === 401) {
      // Clear tokens and redirect to login
      localStorage.removeItem('workshub_auth_token');
      sessionStorage.removeItem('workshub_auth_token');
      window.location.href = '/login';
      throw new ApiError(error.detail || 'Unauthorized', 401);
    }

    throw new ApiError(error.detail || `HTTP ${response.status}`, response.status);
  }

  // Return JSON response
  return response.json();
}

/**
 * GET request helper
 */
export function apiGet<T = unknown>(endpoint: string, options?: ApiOptions): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request helper
 */
export function apiPost<T = unknown>(endpoint: string, data?: unknown, options?: ApiOptions): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...(options || {}),
    method: 'POST',
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
}

/**
 * PUT request helper
 */
export function apiPut<T = unknown>(endpoint: string, data?: unknown, options?: ApiOptions): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...(options || {}),
    method: 'PUT',
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
}

/**
 * DELETE request helper
 */
export function apiDelete<T = unknown>(endpoint: string, options?: ApiOptions): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
}

/**
 * Get headers for API requests (used by legacy services)
 */
export function getHeaders(): Record<string, string> {
  const token = localStorage.getItem('workshub_auth_token') || sessionStorage.getItem('workshub_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// Re-export API_URL for backward compatibility
export { API_URL } from '../config';
