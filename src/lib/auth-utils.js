/**
 * Authentication Utilities
 * Client-side authentication helpers for session management
 */

import { auth, waitForAuthRestore } from '@/lib/firebase';

function getCookieSecurityFlags() {
  const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:';
  return isProduction ? '; Secure' : '';
}

export function setAuthTokenCookie(token, maxAge = 3600) {
  document.cookie = `authToken=${token}; path=/; max-age=${maxAge}; SameSite=Lax${getCookieSecurityFlags()}`;
}

export function clearAuthCookie() {
  document.cookie = `authToken=; path=/; max-age=0; SameSite=Lax${getCookieSecurityFlags()}`;
}

export async function syncAuthTokenCookie(forceRefresh = false) {
  await waitForAuthRestore();

  if (!auth.currentUser) {
    return false;
  }

  const token = await auth.currentUser.getIdToken(forceRefresh);
  setAuthTokenCookie(token);
  return true;
}

/**
 * Check if user is authenticated by verifying token
 */
export async function checkAuthStatus() {
  try {
    await waitForAuthRestore();

    if (auth.currentUser) {
      try {
        await syncAuthTokenCookie();
      } catch (tokenError) {
        console.error('Unable to sync auth token before session check:', tokenError);
      }
    }

    let response = await fetch('/api/users/me', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if ((response.status === 401 || response.status === 403) && auth.currentUser) {
      try {
        const refreshed = await syncAuthTokenCookie(true);
        if (refreshed) {
          response = await fetch('/api/users/me', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
          });
        }
      } catch (tokenRefreshError) {
        console.error('Unable to refresh auth token during session check:', tokenRefreshError);
      }
    }

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
  clearAuthCookie();

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
  if (window.__atravaAuthInterceptorInstalled) {
    return;
  }

  window.__atravaAuthInterceptorInstalled = true;

  // Intercept fetch requests
  const originalFetch = window.fetch;

  window.fetch = async function(...args) {
    const response = await originalFetch(...args);

    // Only 401 indicates an invalid session. Regular 403s are valid authorization failures.
    if (response.status === 401) {
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
