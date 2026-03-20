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

const UsersIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);


export default function Layout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

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
    { href: '/apps', label: 'Sites', icon: AppsIcon, requiresRole: true },
    { href: '/policies', label: 'Security Policies', icon: PoliciesIcon, requiresRole: true },
    { href: '/logs', label: 'Security Logs', icon: LogsIcon, requiresRole: true },
    { href: '/analytics', label: 'Analytics', icon: AnalyticsIcon, requiresRole: true },
    { href: '/users', label: 'User Management', icon: UsersIcon, requiresAdmin: true },
    { href: '/admin', label: 'Super Admin', icon: SuperAdminIcon, requiresSuperAdmin: true, separator: true },
  ], []);

  // Build the list of nav items allowed for the current role.
  // CRITICAL: Only compute when roleLoaded — during loading we show ZERO menu labels
  // so that Super Admin, Admin, Client never see any unrelated menu, even for one frame.
  const visibleNavItems = useMemo(() => {
    if (!roleLoaded) return [];
    // Super admin sees ONLY the Super Admin link – no Dashboard, Applications, etc.
    if (userRole === 'super_admin') {
      return allNavItems.filter((item) => item.requiresSuperAdmin === true);
    }
    return allNavItems.filter((item) => {
      if (item.requiresSuperAdmin) return false;
      if (item.alwaysVisible) return true;
      if (item.requiresAdmin) return userRole === 'admin';
      if (item.requiresRole) return !!userRole;
      return false;
    });
  }, [roleLoaded, userRole, allNavItems]);

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
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white ring-1 ring-gray-200 overflow-hidden">
                  <img
                    src="/logo.png"
                    alt="ATRAVA Defense logo"
                    className="w-10 h-10 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                    ATRAVA Defense
                  </h1>
                  <p className="text-xs text-gray-500">Managed WAF-as-a-service</p>
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
            {!roleLoaded ? (
              /* During load/reload: show no menu labels — only a neutral loading state.
                 Prevents any unrelated menu from ever appearing for Super Admin, Admin, Client. */
              <div className="flex flex-col items-center justify-center py-12 px-4" aria-busy="true" aria-label="Loading navigation">
                <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
                <span className="mt-3 text-sm text-gray-500">Loading…</span>
              </div>
            ) : (
              visibleNavItems.map((item, index) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                const prevItem = index > 0 ? visibleNavItems[index - 1] : null;
                const shouldShowSeparator = item.separator && prevItem;
                return (
                  <div key={item.href} className="relative">
                    {shouldShowSeparator && (
                      <div className="my-2 mx-4 border-t border-gray-200" />
                    )}
                    <Link
                      href={item.href}
                      tabIndex={0}
                      className={`${
                        isActive
                          ? item.href === '/admin'
                            ? 'bg-purple-50 text-purple-700 border-l-4 border-purple-600'
                            : 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                      } group flex items-center px-4 py-3 text-sm font-medium rounded-r-lg transition-colors h-11`}
                    >
                      <Icon
                        className={`${
                          isActive
                            ? item.href === '/admin'
                              ? 'text-purple-600'
                              : 'text-blue-600'
                            : 'text-gray-500 group-hover:text-gray-700'
                        } h-5 w-5 mr-3 flex-shrink-0`}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.href === '/admin' && (
                        <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 rounded flex-shrink-0">
                          SA
                        </span>
                      )}
                    </Link>
                  </div>
                );
              })
            )}
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
