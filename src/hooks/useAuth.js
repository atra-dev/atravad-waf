'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { checkAuthStatus, clearAuthAndRedirect } from '@/lib/auth-utils';

/**
 * Custom hook to check authentication status
 * Redirects to login if user is not authenticated
 */
export function useAuth(redirectOnUnauth = true) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const verifyAuth = async () => {
      setIsLoading(true);
      try {
        const { authenticated, user: userData } = await checkAuthStatus();
        
        if (!authenticated || !userData) {
          setIsAuthenticated(false);
          setUser(null);
          
          if (redirectOnUnauth && pathname !== '/login') {
            clearAuthAndRedirect(pathname);
          }
        } else {
          setIsAuthenticated(true);
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        setIsAuthenticated(false);
        setUser(null);
        
        if (redirectOnUnauth && pathname !== '/login') {
          clearAuthAndRedirect(pathname);
        }
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, [pathname, redirectOnUnauth]);

  return { isAuthenticated, isLoading, user };
}
