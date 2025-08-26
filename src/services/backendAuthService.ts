/**
 * Backend authentication service for WorksHub
 * This service handles authentication with the backend API using JWT tokens
 */

import { API_BASE_URL } from '../config';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  username: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    username: string;
    email_verified: boolean;
  };
}

interface PasswordResetRequest {
  email: string;
}

interface PasswordResetConfirm {
  token: string;
  new_password: string;
}

interface UserProfileUpdate {
  username?: string;
  email?: string;
}

interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

interface UserPreferences {
  email_notifications?: boolean;
  task_updates?: boolean;
  time_tracking?: boolean;
  weekly_reports?: boolean;
  dashboard_theme?: string;
  time_format?: string;
  show_in_dashboard?: boolean;
}

class BackendAuthService {
  private static TOKEN_KEY = 'workshub_auth_token';
  private static USER_KEY = 'workshub_user';

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    const authData = await response.json();
    this.saveAuthData(authData);
    return authData;
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials, options?: { remember?: boolean }): Promise<AuthResponse> {
    let response: Response;
    
    try {
      response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
    } catch (error) {
      // Handle network errors
      console.error('Network error during login:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to the server. Please check your connection and try again.');
      }
      throw error;
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: 'Login failed' };
      }
      
      console.error('Login API error:', { status: response.status, error: errorData });
      
      if (response.status === 401) {
        throw new Error('Invalid email or password');
      } else if (response.status === 422) {
        throw new Error('Please check your email and password format');
      } else if (response.status === 500) {
        throw new Error('Server error. Please try again later');
      }
      
      throw new Error(errorData.detail || errorData.message || 'Login failed');
    }

    const authData = await response.json();
    this.saveAuthData(authData, options?.remember !== false);
    return authData;
  }

  /**
   * Request password reset email
   */
  async requestPasswordReset(data: PasswordResetRequest): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/auth/password-reset/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to send reset email');
    }
  }

  /**
   * Reset password with token
   */
  async confirmPasswordReset(data: PasswordResetConfirm): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/auth/password-reset/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to reset password');
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<AuthResponse['user']> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.logout();
        throw new Error('Session expired');
      }
      throw new Error('Failed to get user info');
    }

    return response.json();
  }

  /**
   * Logout the user
   */
  logout(): void {
    localStorage.removeItem(BackendAuthService.TOKEN_KEY);
    localStorage.removeItem(BackendAuthService.USER_KEY);
    sessionStorage.removeItem(BackendAuthService.TOKEN_KEY);
    sessionStorage.removeItem(BackendAuthService.USER_KEY);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Get stored auth token
   */
  getToken(): string | null {
    return (
      localStorage.getItem(BackendAuthService.TOKEN_KEY) ||
      sessionStorage.getItem(BackendAuthService.TOKEN_KEY)
    );
  }

  /**
   * Get stored user data
   */
  getStoredUser(): AuthResponse['user'] | null {
    const userStr =
      localStorage.getItem(BackendAuthService.USER_KEY) ||
      sessionStorage.getItem(BackendAuthService.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Update user profile
   */
  async updateProfile(data: UserProfileUpdate): Promise<AuthResponse['user']> {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update profile');
    }

    const userData = await response.json();
    // Update stored user data
    localStorage.setItem(BackendAuthService.USER_KEY, JSON.stringify(userData));
    return userData;
  }

  /**
   * Change password
   */
  async changePassword(data: PasswordChangeRequest): Promise<void> {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to change password');
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(): Promise<UserPreferences> {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/api/auth/preferences`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch preferences');
    }

    return response.json();
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(preferences: UserPreferences): Promise<UserPreferences> {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/api/auth/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update preferences');
    }

    return response.json();
  }

  /**
   * Get authorization headers for API requests
   */
  getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  /**
   * Save authentication data to localStorage
   */
  private saveAuthData(authData: AuthResponse, remember: boolean = true): void {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(BackendAuthService.TOKEN_KEY, authData.access_token);
    storage.setItem(BackendAuthService.USER_KEY, JSON.stringify(authData.user));
  }

  /**
   * Make authenticated API request
   */
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.logout();
      throw new Error('Session expired');
    }

    return response;
  }
}

export const backendAuthService = new BackendAuthService();
