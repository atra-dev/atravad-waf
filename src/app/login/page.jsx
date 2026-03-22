'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState(null);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginInitRef = useRef(false);
  const sessionFinalizeRef = useRef(false);

  useEffect(() => {
    if (!toast) return undefined;

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const showToast = (message, tone = 'error') => {
    setToast({ message, tone });
  };

  const getFriendlyAuthError = (error, mode = 'email') => {
    const code = typeof error?.code === 'string' ? error.code : '';

    if (code === 'auth/popup-closed-by-user') {
      return 'Sign-in was cancelled before completion.';
    }
    if (code === 'auth/popup-blocked') {
      return 'The sign-in popup was blocked. Please allow popups and try again.';
    }
    if (code === 'auth/cancelled-popup-request') {
      return 'A sign-in request is already in progress. Please try again.';
    }
    if (code === 'auth/invalid-email') {
      return 'Enter a valid email address.';
    }
    if (code === 'auth/user-disabled') {
      return 'This account is currently disabled. Contact the ATRAVA Defense team.';
    }
    if (
      code === 'auth/user-not-found' ||
      code === 'auth/wrong-password' ||
      code === 'auth/invalid-credential' ||
      code === 'auth/invalid-login-credentials'
    ) {
      return mode === 'google'
        ? 'This Google account is not authorized for ATRAVA Defense access.'
        : 'Invalid sign-in credentials or the account is not authorized.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many sign-in attempts. Please wait and try again.';
    }

    return mode === 'google'
      ? 'Unable to sign in with Google. Please contact the ATRAVA Defense team if access should be enabled.'
      : 'Unable to sign in. Please verify your access with the ATRAVA Defense team.';
  };

  const getFriendlySessionError = (errorData) => {
    if (errorData?.error === 'Access denied: account is not provisioned by ATRAVA Defense') {
      return 'Your account has not been provisioned for ATRAVA Defense access.';
    }
    if (errorData?.error === 'Access denied: account is not authorized for this sign-in method') {
      if (errorData?.expectedAuthProvider === 'google') {
        return 'This account is authorized for Google sign-in only.';
      }
      if (errorData?.expectedAuthProvider === 'password') {
        return 'This account is authorized for password sign-in only.';
      }
      return 'This account is not authorized for the selected sign-in method.';
    }
    return 'Your account could not be verified for managed access.';
  };

  const completeManagedSession = async (firebaseUser) => {
    const token = await firebaseUser.getIdToken();
    const maxAge = 3600;
    const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isProduction ? '; Secure' : '';

    document.cookie = `authToken=${token}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;
    await new Promise((resolve) => setTimeout(resolve, 100));

    const verifyResponse = await fetch('/api/users/me', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json().catch(() => ({}));
      console.error('Session verification failed:', verifyResponse.status, errorData);
      document.cookie = 'authToken=; path=/; max-age=0';
      throw new Error(getFriendlySessionError(errorData));
    }

    return verifyResponse.json();
  };

  const finalizeGoogleSession = async (firebaseUser, fallbackMessage) => {
    if (!firebaseUser || sessionFinalizeRef.current) return false;

    sessionFinalizeRef.current = true;
    try {
      const userData = await completeManagedSession(firebaseUser);
      console.log('Session verified for user:', userData.email, 'Role:', userData.role);
      const redirect = searchParams.get('redirect') || '/dashboard';
      router.push(redirect);
      return true;
    } catch (error) {
      console.error('Google sign-in verification error:', error);
      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error('Error clearing failed Google session:', signOutError);
      }
      document.cookie = 'authToken=; path=/; max-age=0; SameSite=Lax';
      showToast(error?.message || fallbackMessage);
      sessionFinalizeRef.current = false;
      return false;
    }
  };

  const hasAuthTokenCookie = () => {
    if (typeof document === 'undefined') return false;
    return document.cookie
      .split(';')
      .some((cookie) => cookie.trim().startsWith('authToken='));
  };
  
  useEffect(() => {
    if (loginInitRef.current) return;
    loginInitRef.current = true;

    const initializeLogin = async () => {
      try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user) {
          const finalized = await finalizeGoogleSession(
            redirectResult.user,
            'Unable to verify managed access after Google sign-in.'
          );
          if (finalized) {
            return;
          }
        }

        if (auth.currentUser) {
          const finalized = await finalizeGoogleSession(
            auth.currentUser,
            'Unable to verify your restored Google session.'
          );
          if (finalized) {
            return;
          }
        }

        if (!hasAuthTokenCookie()) {
          return;
        }

        const response = await fetch('/api/users/me', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
        
        if (response.ok) {
          const user = await response.json();
          if (user && user.email) {
            const redirect = searchParams.get('redirect') || '/dashboard';
            router.push(redirect);
          }
        }
      } catch (error) {
        console.log('User not authenticated');
      }
    };
    
    initializeLogin();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) return;
      await finalizeGoogleSession(
        firebaseUser,
        'Unable to verify managed access after Google sign-in.'
      );
    });

    return () => unsubscribe();
  }, [router, searchParams]);

  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });

  const handleAuth = async (e) => {
    e.preventDefault();
    setToast(null);

    setLoadingEmail(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userData = await completeManagedSession(userCredential.user);
      console.log('Session verified for user:', userData.email, 'Role:', userData.role);

      const redirect = searchParams.get('redirect') || '/dashboard';
      router.push(redirect);
    } catch (err) {
      showToast(getFriendlyAuthError(err, 'email'));
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setToast(null);
    setLoadingGoogle(true);

    try {
      await signInWithRedirect(auth, googleProvider);
      return;
    } catch (err) {
      showToast(getFriendlyAuthError(err, 'google'));
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 px-4 sm:px-6 lg:px-8">
      {toast ? (
        <div className="fixed right-4 top-4 z-50 w-full max-w-sm">
          <div
            className={`rounded-2xl border px-4 py-3 shadow-xl backdrop-blur ${
              toast.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-red-200 bg-red-50 text-red-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  toast.tone === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {toast.tone === 'success' ? '!' : '!'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-6">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-xs font-semibold uppercase tracking-[0.2em] text-current/70 hover:text-current"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="max-w-md w-full space-y-8 scale-[0.8] origin-center">
        {/* Logo and Branding */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white ring-1 ring-gray-200 shadow-lg overflow-hidden">
              <img
                src="/logo.png"
                alt="ATRAVA Defense logo"
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
            ATRAVA Defense
          </h1>
          <p className="mt-2 text-base text-gray-600 font-medium">
            Managed WAF-as-a-service
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to your managed security dashboard
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 lg:p-10">
          <div className="mb-8 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">Managed access only</p>
            <p className="mt-1 text-sm text-blue-800">
              User accounts and tenant assignments are provisioned by the ATRAVA Defense super admin team as part of the managed service.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleAuth}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all sm:text-sm"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all sm:text-sm"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <button
                type="submit"
                disabled={loadingEmail || loadingGoogle}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loadingEmail 
                  ? (
                    <span className="flex items-center space-x-2">
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Signing in...</span>
                    </span>
                  ) 
                  : 'Sign In'
                }
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loadingEmail || loadingGoogle}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-gray-300 rounded-lg bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loadingGoogle ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Signing in with Google...</span>
                  </span>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>Google</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Managed web application firewall platform
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-pulse">
        <div className="text-center">
          <div className="h-16 w-16 bg-gray-200 rounded-2xl mx-auto mb-4" />
          <div className="h-10 bg-gray-200 rounded w-48 mx-auto" />
          <div className="h-4 bg-gray-200 rounded w-64 mx-auto mt-2" />
        </div>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 lg:p-10">
          <div className="h-12 bg-gray-100 rounded-lg mb-8" />
          <div className="space-y-4">
            <div className="h-12 bg-gray-100 rounded-lg" />
            <div className="h-12 bg-gray-100 rounded-lg" />
            <div className="h-12 bg-blue-200 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
