// API Configuration for separate frontend deployment
export const getApiUrl = (): string => {
  // Always require environment variable for API URL - no same-origin fallback
  const backendUrl = import.meta.env['VITE_API_URL'] || import.meta.env['VITE_BACKEND_URL'];
  
  if (!backendUrl) {
    // In development, default to localhost backend
    if (import.meta.env.DEV) {
      return 'http://localhost:3000';
    }
    throw new Error('VITE_API_URL environment variable is required');
  }

  // Check if URL already has protocol
  if (backendUrl.startsWith('http://') || backendUrl.startsWith('https://')) {
    return backendUrl;
  }
  
  // Add protocol based on environment
  const protocol = import.meta.env.DEV ? 'http' : 'https';
  return `${protocol}://${backendUrl}`;
};

export const API_URL = getApiUrl();
export const API_BASE_URL = API_URL;

// Environment detection - works with any hosting platform
export const isProduction = import.meta.env.PROD || import.meta.env['VITE_ENVIRONMENT'] === 'production';
export const isDevelopment = import.meta.env.DEV || import.meta.env['VITE_ENVIRONMENT'] === 'development';
export const isStaging = import.meta.env['VITE_ENVIRONMENT'] === 'staging';

// Platform-specific detection (optional, for platform-specific features)
export const isVercelDeployment = window.location.hostname.includes('.vercel.app');
export const isNetlifyDeployment = window.location.hostname.includes('.netlify.app');
export const isRailwayDeployment = window.location.hostname.includes('.up.railway.app');
export const isLocalhost = window.location.hostname === 'localhost';

// Feature flags based on environment
export const FEATURES = {
  debugMode: isDevelopment,
  analyticsEnabled: isProduction,
  mockData: false,
};
