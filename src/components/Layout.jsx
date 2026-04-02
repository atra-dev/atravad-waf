'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { checkAuthStatus, clearAuthAndRedirect, setupAuthInterceptor } from '@/lib/auth-utils';

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

const SubscriptionIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a5 5 0 00-10 0v2m-2 0h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2zm7 4h.01" />
  </svg>
);

const SunIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2.25M12 18.75V21M4.97 4.97l1.59 1.59M17.44 17.44l1.59 1.59M3 12h2.25M18.75 12H21M4.97 19.03l1.59-1.59M17.44 6.56l1.59-1.59M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
);

const MoonIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
  </svg>
);

export default function Layout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    setupAuthInterceptor();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    setTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    const initUser = async () => {
      try {
        const { authenticated, user } = await checkAuthStatus();

        if (!authenticated || !user || !user.email) {
          clearAuthAndRedirect(pathname);
          return;
        }

        setUserEmail(user.email);
        setUserRole(user.role || null);
        setRoleLoaded(true);
      } catch (error) {
        console.error('Error initializing user:', error);
        clearAuthAndRedirect(pathname);
      }
    };

    initUser();

    let tokenRefreshInterval = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
        tokenRefreshInterval = null;
      }

      if (!firebaseUser) {
        document.cookie = 'authToken=; path=/; max-age=0; SameSite=Lax';
        if (pathname !== '/login') {
          clearAuthAndRedirect(pathname);
        }
      } else {
        try {
          const refreshToken = async () => {
            try {
              const newToken = await firebaseUser.getIdToken(true);
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

          await refreshToken();
          tokenRefreshInterval = setInterval(refreshToken, 50 * 60 * 1000);

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
      document.cookie = 'authToken=; path=/; max-age=0; SameSite=Lax';
      setUserEmail('');
      setUserRole(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      document.cookie = 'authToken=; path=/; max-age=0; SameSite=Lax';
      router.push('/login');
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem('atrava-theme', nextTheme);
    setTheme(nextTheme);
  };

  const allNavItems = useMemo(() => [
    { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon, alwaysVisible: true },
    { href: '/apps', label: 'Sites', icon: AppsIcon, requiresRole: true },
    { href: '/policies', label: 'Security Policies', icon: PoliciesIcon, requiresRole: true },
    { href: '/logs', label: 'Security Logs', icon: LogsIcon, requiresRole: true },
    { href: '/analytics', label: 'Analytics', icon: AnalyticsIcon, requiresRole: true },
    { href: '/subscription', label: 'Subscription', icon: SubscriptionIcon, requiresRole: true },
    { href: '/users', label: 'User Management', icon: UsersIcon, requiresAdmin: true },
    { href: '/admin', label: 'Super Admin', icon: SuperAdminIcon, requiresSuperAdmin: true, separator: true },
  ], []);

  const visibleNavItems = useMemo(() => {
    if (!roleLoaded) return [];
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
    <div className="min-h-screen">
      <header className="theme-panel sticky top-0 z-50 border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-lg p-2 theme-text-secondary transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
                aria-label="Toggle sidebar"
              >
                <MenuIcon className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-[var(--surface-2)] ring-1 ring-[var(--border-soft)]">
                  <img src="/logo.png" alt="ATRAVA Defense logo" className="h-10 w-10 object-contain" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight theme-text-primary">ATRAVA Defense</h1>
                  <p className="text-xs theme-text-muted">Managed WAF-as-a-service</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-3)] px-3 py-2 text-sm font-medium theme-text-secondary hover:border-[var(--accent-strong)] hover:text-[var(--text-primary)]"
                aria-label="Toggle dark theme"
              >
                {theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
              </button>
              <div className="hidden items-center space-x-3 rounded-lg bg-[var(--surface-3)] px-4 py-2 sm:flex">
                <UserIcon className="h-5 w-5 theme-text-secondary" />
                <div className="flex flex-col">
                  <span className="max-w-xs truncate text-sm font-medium theme-text-primary">{userEmail || 'User'}</span>
                  {userRole && (
                    <span className={`text-xs font-medium ${
                      userRole === 'super_admin' ? 'text-purple-400' :
                      userRole === 'admin' ? 'text-sky-400' :
                      userRole === 'analyst' ? 'text-amber-400' :
                      'theme-text-secondary'
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
                className="flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium theme-text-secondary transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
              >
                <LogoutIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-0'
          } theme-panel sticky top-16 h-[calc(100vh-4rem)] self-start overflow-hidden border-r transition-all duration-300 ease-in-out`}
          style={{ maxHeight: 'calc(100vh - 4rem)' }}
        >
          <nav className="h-full space-y-1 overflow-x-hidden overflow-y-auto px-3 py-6" style={{ scrollbarWidth: 'thin', scrollbarColor: '#64748b transparent' }}>
            {!roleLoaded ? (
              <div className="flex flex-col items-center justify-center px-4 py-12" aria-busy="true" aria-label="Loading navigation">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-soft)] border-t-[var(--accent-strong)]" />
                <span className="mt-3 text-sm theme-text-muted">Loading...</span>
              </div>
            ) : (
              visibleNavItems.map((item, index) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                const prevItem = index > 0 ? visibleNavItems[index - 1] : null;
                const shouldShowSeparator = item.separator && prevItem;

                return (
                  <div key={item.href} className="relative">
                    {shouldShowSeparator && <div className="mx-4 my-2 border-t border-[var(--border-soft)]" />}
                    <Link
                      href={item.href}
                      tabIndex={0}
                      className={`${
                        isActive
                          ? item.href === '/admin'
                            ? 'border-l-4 border-purple-500 bg-purple-500/12 text-purple-200'
                            : 'border-l-4 border-cyan-400 bg-cyan-400/12 text-cyan-100'
                          : 'border-l-4 border-transparent theme-text-secondary hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]'
                      } group flex h-11 items-center rounded-r-lg px-4 py-3 text-sm font-medium transition-colors`}
                    >
                      <Icon
                        className={`${
                          isActive
                            ? item.href === '/admin'
                              ? 'text-purple-300'
                              : 'text-cyan-300'
                            : 'theme-text-muted group-hover:text-[var(--text-primary)]'
                        } mr-3 h-5 w-5 flex-shrink-0`}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.href === '/admin' && (
                        <span className="ml-auto flex-shrink-0 rounded bg-purple-500/15 px-2 py-0.5 text-xs font-semibold text-purple-200">
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

        <main className="min-w-0 flex-1">
          <div className="p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
