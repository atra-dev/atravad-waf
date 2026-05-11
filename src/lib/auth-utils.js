/**
 * Authentication Utilities
 * Client-side authentication helpers for session management
 */

import { auth, waitForAuthRestore } from '@/lib/firebase';

const SESSION_CACHE_TTL_MS = 5000;

let cachedSessionResult = null;
let cachedSessionTimestamp = 0;
let inFlightSessionPromise = null;

function clearSessionCache() {
  cachedSessionResult = null;
  cachedSessionTimestamp = 0;
  inFlightSessionPromise = null;
}

function getCachedSessionResult() {
  if (!cachedSessionResult) {
    return null;
  }

  if (Date.now() - cachedSessionTimestamp > SESSION_CACHE_TTL_MS) {
    clearSessionCache();
    return null;
  }

  return cachedSessionResult;
}

function setCachedSessionResult(result) {
  cachedSessionResult = result;
  cachedSessionTimestamp = Date.now();
}

function getCookieSecurityFlags() {
  const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:';
  return isProduction ? '; Secure' : '';
}

export function setAuthTokenCookie(token, maxAge = 3600) {
  clearSessionCache();
  document.cookie = `authToken=${token}; path=/; max-age=${maxAge}; SameSite=Lax${getCookieSecurityFlags()}`;
}

export function clearAuthCookie() {
  clearSessionCache();
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

async function fetchManagedUserInternal() {
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
    clearAuthCookie();
    return { authenticated: false, user: null };
  }

  if (!response.ok) {
    return { authenticated: false, user: null };
  }

  const user = await response.json();
  return { authenticated: true, user };
}

export async function getManagedSession(options = {}) {
  const { force = false } = options;

  if (!force) {
    const cachedResult = getCachedSessionResult();
    if (cachedResult) {
      return cachedResult;
    }
  }

  if (!force && inFlightSessionPromise) {
    return inFlightSessionPromise;
  }

  const sessionPromise = (async () => {
    try {
      const result = await fetchManagedUserInternal();
      setCachedSessionResult(result);
      return result;
    } catch (error) {
      console.error('Auth check error:', error);
      clearAuthCookie();
      const failedResult = { authenticated: false, user: null };
      setCachedSessionResult(failedResult);
      return failedResult;
    } finally {
      if (inFlightSessionPromise === sessionPromise) {
        inFlightSessionPromise = null;
      }
    }
  })();

  inFlightSessionPromise = sessionPromise;
  return sessionPromise;
}

export async function getManagedUser(options = {}) {
  const { user } = await getManagedSession(options);
  return user;
}

/**
 * Check if user is authenticated by verifying token
 */
export async function checkAuthStatus() {
  return getManagedSession();
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
      clearAuthCookie();
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
    const { authenticated } = await getManagedSession();
    return authenticated;
  } catch (error) {
    return false;
  }
}
