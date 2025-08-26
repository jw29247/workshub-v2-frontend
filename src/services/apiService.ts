/**
 * API Service with JWT authentication
 */

import { API_BASE_URL } from '../config';
import { backendAuthService } from './backendAuthService';

class ApiService {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add JWT token if authenticated
    if (backendAuthService.isAuthenticated()) {
      const authHeaders = backendAuthService.getAuthHeaders();
      Object.assign(headers, authHeaders);
    }

    return headers;
  }

  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    // If get 401, logout
    if (response.status === 401) {
      backendAuthService.logout();
      // Redirect to login
      window.location.href = '/login';
    }

    return response;
  }

  async get(url: string, options?: RequestInit): Promise<Response> {
    return this.fetch(url, { ...options, method: 'GET' });
  }

  async post(url: string, data?: unknown, options?: RequestInit): Promise<Response> {
    return this.fetch(url, {
      ...(options || {}),
      method: 'POST',
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
  }

  async put(url: string, data?: unknown, options?: RequestInit): Promise<Response> {
    return this.fetch(url, {
      ...(options || {}),
      method: 'PUT',
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
  }

  async patch(url: string, data?: unknown, options?: RequestInit): Promise<Response> {
    return this.fetch(url, {
      ...(options || {}),
      method: 'PATCH',
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
  }

  async delete(url: string, options?: RequestInit): Promise<Response> {
    return this.fetch(url, { ...options, method: 'DELETE' });
  }
}

export const apiService = new ApiService();
