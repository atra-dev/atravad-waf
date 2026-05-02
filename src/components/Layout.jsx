'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import {
  BarChart3,
  FileText,
  Globe,
  Home,
  Lock,
  Menu,
  Moon,
  ShieldCheck,
  ShieldPlus,
  Sun,
  User,
  Users,
  LogOut,
} from 'lucide-react';
import { auth, waitForAuthRestore } from '@/lib/firebase';
import ConfirmationModal from '@/app/policies/ConfirmationModal';
import {
  checkAuthStatus,
  clearAuthAndRedirect,
  clearAuthCookie,
  setAuthTokenCookie,
  setupAuthInterceptor,
} from '@/lib/auth-utils';

const iconStroke = 1.9;
const DashboardIcon = ({ className }) => <Home className={className} strokeWidth={iconStroke} />;
const AppsIcon = ({ className }) => <Globe className={className} strokeWidth={iconStroke} />;
const PoliciesIcon = ({ className }) => <ShieldCheck className={className} strokeWidth={iconStroke} />;
const MenuIcon = ({ className }) => <Menu className={className} strokeWidth={iconStroke} />;
const UserIcon = ({ className }) => <User className={className} strokeWidth={iconStroke} />;
const LogoutIcon = ({ className }) => <LogOut className={className} strokeWidth={iconStroke} />;
const SuperAdminIcon = ({ className }) => <ShieldPlus className={className} strokeWidth={iconStroke} />;
const LogsIcon = ({ className }) => <FileText className={className} strokeWidth={iconStroke} />;
const AnalyticsIcon = ({ className }) => <BarChart3 className={className} strokeWidth={iconStroke} />;
const UsersIcon = ({ className }) => <Users className={className} strokeWidth={iconStroke} />;
const SubscriptionIcon = ({ className }) => <Lock className={className} strokeWidth={iconStroke} />;
const SunIcon = ({ className }) => <Sun className={className} strokeWidth={iconStroke} />;
const MoonIcon = ({ className }) => <Moon className={className} strokeWidth={iconStroke} />;

function deriveDisplayName(email = '') {
  const localPart = String(email).split('@')[0] || '';
  const parts = localPart
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return 'ATRAVA User';

  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function deriveInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return 'AU';
  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
}

function buildAvatarFallback(name = '', photoUrl = '') {
  if (photoUrl) return photoUrl;
  const encoded = encodeURIComponent(name || 'ATRAVA User');
  return `https://ui-avatars.com/api/?name=${encoded}&background=0f172a&color=ffffff&bold=true&format=svg`;
}

function getRoleLabel(role) {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'admin') return 'Admin';
  if (role === 'analyst') return 'Analyst';
  return 'Client';
}

function getResolvedTheme() {
  if (typeof document === 'undefined') {
    return 'light';
  }

  const documentTheme = document.documentElement.dataset.theme;
  if (documentTheme === 'dark' || documentTheme === 'light') {
    return documentTheme;
  }

  try {
    const storedTheme = localStorage.getItem('atrava-theme');
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme;
    }
  } catch {}

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function Layout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [userPhotoUrl, setUserPhotoUrl] = useState('');
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [theme, setTheme] = useState(() => getResolvedTheme());

  useEffect(() => {
    setupAuthInterceptor();
  }, []);

  useEffect(() => {
    const syncThemeState = () => {
      setTheme(getResolvedTheme());
    };

    syncThemeState();

    const handleStorage = (event) => {
      if (event.key === null || event.key === 'atrava-theme') {
        syncThemeState();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncThemeState();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('pageshow', syncThemeState);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('pageshow', syncThemeState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let unsubscribe = () => {};
    let tokenRefreshInterval = null;
    const clearRefreshInterval = () => {
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
        tokenRefreshInterval = null;
      }
    };

    const syncUserFromSession = async () => {
      const { authenticated, user } = await checkAuthStatus();

      if (!authenticated || !user || !user.email) {
        if (!isCancelled) {
          clearAuthAndRedirect(pathname);
        }
        return false;
      }

      if (!isCancelled) {
        setUserEmail(user.email);
        setUserRole(user.role || null);
        setUserPhotoUrl(user.photoURL || user.avatarUrl || '');
        setRoleLoaded(true);
      }

      return true;
    };

    const initializeAuthState = async () => {
      try {
        await waitForAuthRestore();
        if (isCancelled) return;

        const sessionReady = await syncUserFromSession();
        if (isCancelled || !sessionReady) return;

        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          clearRefreshInterval();

          if (!firebaseUser) {
            clearAuthCookie();
            if (!isCancelled && pathname !== '/login') {
              clearAuthAndRedirect(pathname);
            }
            return;
          }

          try {
            const refreshToken = async (forceRefresh = false) => {
              const newToken = await firebaseUser.getIdToken(forceRefresh);
              if (!isCancelled) {
                setAuthTokenCookie(newToken);
              }
            };

            await refreshToken(false);
            tokenRefreshInterval = setInterval(() => {
              refreshToken(true).catch((error) => {
                console.error('Token refresh error:', error);
                clearRefreshInterval();
                if (!isCancelled) {
                  clearAuthAndRedirect(pathname);
                }
              });
            }, 50 * 60 * 1000);

            await syncUserFromSession();
          } catch (error) {
            console.error('Auth state change error:', error);
            clearRefreshInterval();
            if (!isCancelled) {
              clearAuthAndRedirect(pathname);
            }
          }
        });
      } catch (error) {
        console.error('Error initializing user:', error);
        if (!isCancelled) {
          clearAuthAndRedirect(pathname);
        }
      }
    };

    initializeAuthState();

    return () => {
      isCancelled = true;
      unsubscribe();
      clearRefreshInterval();
    };
  }, [pathname]);

  const handleLogout = async () => {
    setLogoutBusy(true);
    try {
      await signOut(auth);
      clearAuthCookie();
      setUserEmail('');
      setUserRole(null);
      setUserPhotoUrl('');
      setLogoutModalOpen(false);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      clearAuthCookie();
      setLogoutModalOpen(false);
      router.push('/login');
    } finally {
      setLogoutBusy(false);
    }
  };

  const toggleTheme = () => {
    const nextTheme = getResolvedTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem('atrava-theme', nextTheme);
    setTheme(nextTheme);
  };

  const userDisplayName = deriveDisplayName(userEmail);
  const userInitials = deriveInitials(userDisplayName);
  const userAvatarUrl = buildAvatarFallback(userDisplayName, userPhotoUrl);
  const roleLabel = getRoleLabel(userRole);
  const roleToneClassName =
    userRole === 'super_admin'
      ? 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300'
      : userRole === 'admin'
        ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
        : userRole === 'analyst'
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
          : 'bg-[var(--surface-3)] theme-text-secondary';

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
      <header className="theme-panel sticky top-0 z-50 border-b border-[var(--border-soft)]">
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
                  <Image src="/logo.png" alt="ATRAVA Defense logo" width={40} height={40} className="h-10 w-10 object-contain" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight theme-text-primary">ATRAVA Defense</h1>
                  <p className="text-xs theme-text-muted">Managed WAF-as-a-service</p>
                </div>
              </div>
            </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleTheme}
                  className="theme-button-neutral inline-flex h-10 items-center rounded-xl px-2 py-1.5 transition hover:border-[var(--accent-strong)]"
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                  aria-pressed={theme === 'dark'}
                  title={`Dark mode ${theme === 'dark' ? 'on' : 'off'}`}
                >
                  <span
                    className={`relative flex h-6 w-10 items-center rounded-full border transition-colors ${
                      theme === 'dark'
                        ? 'border-sky-400/60 bg-sky-500/90'
                        : 'border-[var(--border-soft)] bg-[var(--surface-3)]'
                    }`}
                  >
                    <span
                      className={`absolute flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition-transform dark:bg-slate-950 dark:text-slate-100 ${
                        theme === 'dark' ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    >
                      {theme === 'dark' ? <MoonIcon className="h-3 w-3" /> : <SunIcon className="h-3 w-3" />}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => setLogoutModalOpen(true)}
                  className="theme-button-neutral flex h-10 w-10 items-center justify-center rounded-xl p-0 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-900/50 dark:hover:bg-red-950/20 dark:hover:text-red-300"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-3)]">
                    <LogoutIcon className="h-4 w-4" />
                  </span>
                </button>
              </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-0'
          } theme-panel sticky top-16 h-[calc(100vh-4rem)] self-start overflow-hidden border-r border-[var(--border-soft)] transition-all duration-300 ease-in-out`}
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
                            ? 'theme-sidebar-admin-active'
                            : 'theme-sidebar-active'
                          : 'border-l-4 border-transparent theme-text-secondary hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]'
                      } group flex h-11 items-center rounded-r-lg px-4 py-3 text-sm font-medium transition-colors`}
                    >
                      <Icon
                        className={`${
                          isActive
                            ? item.href === '/admin'
                              ? 'text-inherit'
                              : 'text-inherit'
                            : 'theme-text-muted group-hover:text-[var(--text-primary)]'
                        } mr-3 h-5 w-5 flex-shrink-0`}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.href === '/admin' && (
                        <span className="ml-auto flex-shrink-0 rounded bg-purple-500/15 px-2 py-0.5 text-xs font-semibold text-purple-500">
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

      <ConfirmationModal
        open={logoutModalOpen}
        title="Sign out of ATRAVA Defense?"
        description="Your current session will be closed on this device and you will be returned to the login page."
        confirmLabel="Sign out"
        tone="red"
        busy={logoutBusy}
        onCancel={() => {
          if (!logoutBusy) {
            setLogoutModalOpen(false);
          }
        }}
        onConfirm={handleLogout}
      />
    </div>
  );
}
