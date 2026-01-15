/**
 * Authentication Utilities
 * Client-side authentication helpers for session management
 */

/**
 * Check if user is authenticated by verifying token
 */
export async function checkAuthStatus() {
  try {
    const response = await fetch('/api/users/me', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    
    if (response.status === 401 || response.status === 403) {
      return { authenticated: false, user: null };
    }
    
    if (!response.ok) {
      return { authenticated: false, user: null };
    }
    
    const user = await response.json();
    return { authenticated: true, user };
  } catch (error) {
    console.error('Auth check error:', error);
    return { authenticated: false, user: null };
  }
}

/**
 * Clear authentication and redirect to login
 */
export function clearAuthAndRedirect(redirectPath = null) {
  // Clear auth token
  document.cookie = 'authToken=; path=/; max-age=0; SameSite=Lax';
  
  // Redirect to login
  const loginUrl = redirectPath 
    ? `/login?redirect=${encodeURIComponent(redirectPath)}`
    : '/login';
  
  window.location.href = loginUrl;
}

/**
 * Setup API response interceptor to handle 401/403 responses
 * This should be called once in the app initialization
 */
export function setupAuthInterceptor() {
  // Intercept fetch requests
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const response = await originalFetch(...args);
    
    // If we get 401 or 403, clear auth and redirect
    if (response.status === 401 || response.status === 403) {
      // Only redirect if it's not already a login request
      const url = args[0];
      if (typeof url === 'string' && !url.includes('/api/users/me') && !url.includes('/login')) {
        clearAuthAndRedirect(window.location.pathname);
      }
    }
    
    return response;
  };
}

/**
 * Verify token is still valid
 */
export async function verifyToken() {
  try {
    const response = await fetch('/api/users/me', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}
