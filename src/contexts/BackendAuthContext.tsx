import React, { createContext, useContext, useState, useEffect } from 'react';
import { backendAuthService } from '../services/backendAuthService';

interface User {
  id: string;
  email: string;
  username: string;
  role?: string;
  pod?: string;
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

interface BackendAuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { username?: string; email?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  getUserPreferences: () => Promise<UserPreferences>;
  updateUserPreferences: (preferences: UserPreferences) => Promise<UserPreferences>;
}

const BackendAuthContext = createContext<BackendAuthContextType | undefined>(undefined);

export function BackendAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on mount
    const checkAuth = async () => {
      if (backendAuthService.isAuthenticated()) {
        try {
          const userData = await backendAuthService.getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_error) {
          // Token might be expired
          backendAuthService.logout();
          setIsAuthenticated(false);
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await backendAuthService.login({ email, password });
    setUser(response.user);
    setIsAuthenticated(true);
  };

  const register = async (email: string, password: string, username: string) => {
    const response = await backendAuthService.register({ email, password, username });
    setUser(response.user);
    setIsAuthenticated(true);
  };

  const logout = () => {
    backendAuthService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const updateProfile = async (data: { username?: string; email?: string }) => {
    const updatedUser = await backendAuthService.updateProfile(data);
    setUser(updatedUser);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await backendAuthService.changePassword({
      current_password: currentPassword,
      new_password: newPassword,
    });
  };

  const getUserPreferences = async (): Promise<UserPreferences> => {
    return await backendAuthService.getUserPreferences();
  };

  const updateUserPreferences = async (preferences: UserPreferences): Promise<UserPreferences> => {
    return await backendAuthService.updateUserPreferences(preferences);
  };

  return (
    <BackendAuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        getUserPreferences,
        updateUserPreferences,
      }}
    >
      {children}
    </BackendAuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBackendAuth() {
  const context = useContext(BackendAuthContext);
  if (context === undefined) {
    throw new Error('useBackendAuth must be used within a BackendAuthProvider');
  }
  return context;
}
