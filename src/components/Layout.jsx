'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { checkAuthStatus, clearAuthAndRedirect, setupAuthInterceptor } from '@/lib/auth-utils';

// Icon Components
const DashboardIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const AppsIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const PoliciesIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const NodesIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

const MenuIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const UserIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const LogoutIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const SuperAdminIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const TestIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LogsIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const AnalyticsIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);


export default function Layout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Setup auth interceptor on mount (only once)
  useEffect(() => {
    setupAuthInterceptor();
  }, []);

  // Initialize user document in Firestore on mount and verify session
  useEffect(() => {
    const initUser = async () => {
      try {
        // Check authentication status
        const { authenticated, user } = await checkAuthStatus();
        
        if (!authenticated || !user || !user.email) {
          // Session expired or invalid - redirect to login
          clearAuthAndRedirect(pathname);
          return;
        }
        
        setUserEmail(user.email);
        setUserRole(user.role || null);
        setRoleLoaded(true);
        // Small delay to ensure smooth transition after initial render
        requestAnimationFrame(() => {
          setTimeout(() => setIsInitialLoad(false), 50);
        });
      } catch (error) {
        console.error('Error initializing user:', error);
        // On error, clear token and redirect to login
        clearAuthAndRedirect(pathname);
      }
    };

    initUser();

    // Token refresh interval reference
    let tokenRefreshInterval = null;

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clear any existing refresh interval
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
        tokenRefreshInterval = null;
      }

      if (!firebaseUser) {
        // User signed out - clear session
        document.cookie = 'authToken=; path=/; max-age=0; SameSite=Lax';
        if (pathname !== '/login') {
          clearAuthAndRedirect(pathname);
        }
      } else {
        // User signed in - refresh token and verify session
        try {
          // Refresh token function
          const refreshToken = async () => {
            try {
              const newToken = await firebaseUser.getIdToken(true); // Force refresh
              const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:';
              const secureFlag = isProduction ? '; Secure' : '';
              document.cookie = `authToken=${newToken}; path=/; max-age=3600; SameSite=Lax${secureFlag}`;
            } catch (error) {
              console.error('Token refresh error:', error);
              if (tokenRefreshInterval) {
                clearInterval(tokenRefreshInterval);
                tokenRefreshInterval = null;
              }
              clearAuthAndRedirect(pathname);
            }
          };

          // Refresh token immediately
          await refreshToken();

          // Set up periodic token refresh (every 50 minutes)
          tokenRefreshInterval = setInterval(refreshToken, 50 * 60 * 1000);

          // Verify session is still valid
          const { authenticated } = await checkAuthStatus();
          if (!authenticated) {
            if (tokenRefreshInterval) {
              clearInterval(tokenRefreshInterval);
              tokenRefreshInterval = null;
            }
            clearAuthAndRedirect(pathname);
          }
        } catch (error) {
          console.error('Auth state change error:', error);
          if (tokenRefreshInterval) {
            clearInterval(tokenRefreshInterval);
            tokenRefreshInterval = null;
          }
          clearAuthAndRedirect(pathname);
        }
      }
    });

    return () => {
      unsubscribe();
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
      }
    };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Clear auth token
      document.cookie = 'authToken=; path=/; max-age=0; SameSite=Lax';
      // Clear user state
      setUserEmail('');
      setUserRole(null);
      // Redirect to login
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even on error
      document.cookie = 'authToken=; path=/; max-age=0; SameSite=Lax';
      router.push('/login');
    }
  };

  // Define all navigation items (always rendered, conditionally visible)
  // These are always in the DOM to prevent flickering
  const allNavItems = useMemo(() => [
    { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon, alwaysVisible: true },
    { href: '/apps', label: 'Applications', icon: AppsIcon, requiresRole: true },
    { href: '/policies', label: 'Security Policies', icon: PoliciesIcon, requiresRole: true },
    { href: '/test', label: 'Rule Testing', icon: TestIcon, requiresRole: true },
    { href: '/nodes', label: 'WAF Nodes', icon: NodesIcon, requiresRole: true },
    { href: '/logs', label: 'Security Logs', icon: LogsIcon, requiresRole: true },
    { href: '/analytics', label: 'Analytics', icon: AnalyticsIcon, requiresRole: true },
    { href: '/admin', label: 'Super Admin', icon: SuperAdminIcon, requiresSuperAdmin: true, separator: true },
  ], []);

  // Check visibility for each item (doesn't change array structure)
  // Security: Super Admin items must be completely hidden until role is confirmed
  const getItemVisibility = (item) => {
    if (item.alwaysVisible) return true;
    
    // Security: Never show Super Admin items during loading
    if (item.requiresSuperAdmin) {
      // Only show if role is loaded AND user is confirmed super admin
      if (!roleLoaded) return false;
      return userRole === 'super_admin';
    }
    
    // For regular role-based items, show in loading state to prevent flicker
    if (item.requiresRole) {
      if (!roleLoaded) return 'loading';
      return !!userRole;
    }
    
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                aria-label="Toggle sidebar"
              >
                <MenuIcon className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg">
                  <PoliciesIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                    ATRAVAD WAF
                  </h1>
                  <p className="text-xs text-gray-500">Enterprise Security Platform</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-lg">
                <UserIcon className="h-5 w-5 text-gray-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700 truncate max-w-xs">
                    {userEmail || 'User'}
                  </span>
                  {userRole && (
                    <span className={`text-xs font-medium ${
                      userRole === 'super_admin' ? 'text-purple-600' :
                      userRole === 'admin' ? 'text-blue-600' :
                      userRole === 'analyst' ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      {userRole === 'super_admin' ? 'Super Admin' :
                       userRole === 'admin' ? 'Admin' :
                       userRole === 'analyst' ? 'Analyst' :
                       'Client'}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogoutIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation - Sticky */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-0'
          } bg-white border-r border-gray-200 transition-all duration-300 ease-in-out overflow-hidden sticky top-16 self-start h-[calc(100vh-4rem)]`}
          style={{ maxHeight: 'calc(100vh - 4rem)' }}
        >
          <nav className="px-3 py-6 space-y-1 h-full overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
            {allNavItems.map((item, index) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              const visibility = getItemVisibility(item);
              const isVisible = visibility === true;
              const isLoading = visibility === 'loading';
              
              // Track previous visible items to determine separator position
              const prevVisibleItem = index > 0 ? allNavItems.slice(0, index).reverse().find(i => {
                const prevVis = getItemVisibility(i);
                return prevVis === true || prevVis === 'loading';
              }) : null;
              const shouldShowSeparator = item.separator && prevVisibleItem && (isVisible || isLoading);
              
              // Security: Super Admin items must be completely hidden (not just invisible) until confirmed
              const isSuperAdminItem = item.requiresSuperAdmin;
              const shouldRender = isVisible || (isLoading && !isSuperAdminItem);
              
              // During initial load, show non-sensitive items immediately to prevent flicker
              // Super Admin items stay hidden for security
              const showItem = shouldRender || (isInitialLoad && !isSuperAdminItem && item.requiresRole);
              
              // Optimized transitions for flicker-free rendering
              return (
                <div 
                  key={item.href}
                  className="relative"
                  style={{ 
                    height: showItem ? 'auto' : '0',
                    minHeight: showItem ? '44px' : '0',
                    overflow: 'hidden',
                    transition: isInitialLoad ? 'none' : 'height 0.12s cubic-bezier(0.4, 0, 0.2, 1), min-height 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
                    willChange: isInitialLoad ? 'auto' : 'height',
                  }}
                >
                  <div
                    className={`${
                      shouldRender
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 -translate-y-0.5 pointer-events-none'
                    } ${isInitialLoad ? '' : 'transition-all ease-out'}`}
                    style={{
                      transitionDuration: isInitialLoad ? '0ms' : '120ms',
                      willChange: isInitialLoad ? 'auto' : 'opacity, transform',
                      transitionDelay: isInitialLoad ? '0ms' : shouldRender ? '0ms' : '30ms',
                    }}
                  >
                    {shouldShowSeparator && (
                      <div className="my-2 mx-4 border-t border-gray-200"></div>
                    )}
                    <Link
                      href={item.href}
                      tabIndex={isVisible && !isLoading ? 0 : -1}
                      className={`${
                        isLoading
                          ? 'opacity-60 cursor-default pointer-events-none'
                          : isActive
                          ? item.href === '/admin'
                            ? 'bg-purple-50 text-purple-700 border-l-4 border-purple-600'
                            : 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                      } group flex items-center px-4 py-3 text-sm font-medium rounded-r-lg transition-colors h-11`}
                    style={{ transitionDuration: '120ms' }}
                      onClick={(e) => {
                        if (isLoading) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <Icon
                        className={`${
                          isLoading
                            ? 'text-gray-400'
                            : isActive
                            ? item.href === '/admin'
                              ? 'text-purple-600'
                              : 'text-blue-600'
                            : 'text-gray-500 group-hover:text-gray-700'
                        } h-5 w-5 mr-3 transition-colors flex-shrink-0`}
                        style={{ transitionDuration: '120ms' }}
                      />
                      <span className={`flex-1 transition-colors ${isLoading ? 'text-gray-400' : ''}`} style={{ transitionDuration: '120ms' }}>
                        {item.label}
                      </span>
                      {item.href === '/admin' && isVisible && !isLoading && (
                        <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 rounded flex-shrink-0">
                          SA
                        </span>
                      )}
                    </Link>
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
