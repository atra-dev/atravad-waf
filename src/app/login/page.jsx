'use client';

import Image from 'next/image';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';

const trustPoints = [
  { label: 'Protection model', value: 'Managed reverse proxy WAF' },
  { label: 'Inspection engine', value: 'ModSecurity v3 + OWASP CRS' },
  { label: 'Operational model', value: 'Managed SOC-backed access' },
];

const platformSignals = [
  'Managed tenant access and role-based onboarding',
  'Security analytics, logs, and policy control in one dashboard',
  'Google or password sign-in based on provisioned access',
];

const operationsHighlights = [
  { label: 'Tenant scope', value: 'Provisioned access only', tone: 'cyan' },
  { label: 'Policy status', value: 'Managed enforcement active', tone: 'emerald' },
  { label: 'Audit stream', value: 'Logs and analytics available', tone: 'sky' },
];

const activityRail = [
  {
    title: 'Protected applications',
    detail: 'Review sites, routing, and managed activation status from a single workspace.',
  },
  {
    title: 'Threat visibility',
    detail: 'Inspect blocked requests, origin denials, geographic patterns, and traffic behavior.',
  },
  {
    title: 'Operational control',
    detail: 'Tune policies, export investigations, and work inside your assigned tenant boundary.',
  },
];

function ShieldIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M12 3l7 3v5c0 4.4-2.9 8.4-7 9.7C7.9 19.4 5 15.4 5 11V6l7-3Z"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m9.5 12 1.8 1.8 3.7-4.1"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SectionEyebrow({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
      {children}
    </p>
  );
}

function HighlightToneClass(tone) {
  if (tone === 'emerald') {
    return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
  }
  if (tone === 'sky') {
    return 'border-sky-400/25 bg-sky-400/10 text-sky-100';
  }
  return 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100';
}

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
  const sessionFinalizePromiseRef = useRef(null);

  useEffect(() => {
    if (!toast) return undefined;

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const showToast = useCallback((message, tone = 'error') => {
    setToast({ message, tone });
  }, []);

  const getFriendlyAuthError = (error, mode = 'email') => {
    const code = typeof error?.code === 'string' ? error.code : '';

    if (code === 'auth/popup-closed-by-user') {
      return mode === 'google'
        ? 'Google sign-in popup was interrupted before Firebase finished. Redirect sign-in will be used instead.'
        : 'Sign-in was cancelled before completion.';
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
        : 'Invalid sign-in credentials. If this account was provisioned for Google access, use Continue with Google.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many sign-in attempts. Please wait and try again.';
    }

    return mode === 'google'
      ? 'Unable to sign in with Google. Please contact the ATRAVA Defense team if access should be enabled.'
      : 'Unable to sign in. Please verify your access with the ATRAVA Defense team.';
  };

  const getFriendlySessionError = useCallback((errorData) => {
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
  }, []);

  const completeManagedSession = useCallback(async (firebaseUser) => {
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
  }, [getFriendlySessionError]);

  const finalizeGoogleSession = useCallback(async (firebaseUser, fallbackMessage) => {
    if (!firebaseUser) return false;
    if (sessionFinalizePromiseRef.current) {
      return sessionFinalizePromiseRef.current;
    }

    sessionFinalizeRef.current = true;
    sessionFinalizePromiseRef.current = (async () => {
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
      } finally {
        sessionFinalizePromiseRef.current = null;
      }
    })();

    return sessionFinalizePromiseRef.current;
  }, [completeManagedSession, router, searchParams, showToast]);

  const hasAuthTokenCookie = useCallback(() => {
    if (typeof document === 'undefined') return false;
    return document.cookie
      .split(';')
      .some((cookie) => cookie.trim().startsWith('authToken='));
  }, []);
  
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
  }, [finalizeGoogleSession, hasAuthTokenCookie, router, searchParams]);

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
      const userCredential = await signInWithPopup(auth, googleProvider);
      const finalized = await finalizeGoogleSession(
        userCredential.user,
        'Unable to verify managed access after Google sign-in.'
      );

      if (finalized) {
        return;
      }

      throw new Error('Unable to verify managed access after Google sign-in.');
    } catch (err) {
      const code = typeof err?.code === 'string' ? err.code : '';

      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/popup-blocked' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError) {
          showToast(getFriendlyAuthError(redirectError, 'google'));
          return;
        }
      }

      showToast(getFriendlyAuthError(err, 'google'));
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#08111f] text-white">
      <div className="absolute inset-x-0 top-0 -z-10 h-[760px] bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.32),_transparent_42%),radial-gradient(circle_at_20%_25%,_rgba(14,165,233,0.24),_transparent_25%),linear-gradient(180deg,_#08111f_0%,_#09192d_48%,_#f3f6fb_48%,_#f3f6fb_100%)]" />
      <div className="absolute left-10 top-24 -z-10 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="absolute right-8 top-56 -z-10 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />

      {toast ? (
        <div className="fixed right-4 top-4 z-50 w-full max-w-sm">
          <div
            className={`rounded-2xl border px-4 py-3 shadow-xl backdrop-blur ${
              toast.tone === 'success'
                ? 'border-emerald-300/35 bg-emerald-400/12 text-emerald-50'
                : 'border-red-300/35 bg-red-400/12 text-red-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  toast.tone === 'success' ? 'bg-emerald-300/20 text-emerald-100' : 'bg-red-300/20 text-red-100'
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

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 pb-10 pt-4 lg:px-8 lg:pb-12 lg:pt-4">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-5 py-2.5 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/95 shadow-[0_12px_40px_rgba(15,23,42,0.35)]">
              <Image src="/logo.png" alt="ATRAVA Defense" width={32} height={32} className="h-8 w-8 object-contain" priority />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.2em] text-white/70">ATRAVA Defense</p>
              <p className="text-xs text-white/45">Managed WAF-as-a-service</p>
            </div>
          </div>
          <div className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
            Managed access portal
          </div>
        </header>

        <div className="grid flex-1 gap-10 pt-8 lg:grid-cols-[minmax(0,1.06fr)_446px] lg:items-center lg:gap-12 lg:pt-10">
          <section className="flex min-h-0 flex-col justify-center">
            <div>
              <SectionEyebrow>Customer access</SectionEyebrow>
                <h1 className="mt-3 max-w-[11.6ch] font-serif text-[2.5rem] leading-[0.92] text-white sm:text-[2.95rem] xl:max-w-[14.4ch] xl:text-[3.42rem]">
                Secure sign-in for managed WAF operations, tenant access, and security visibility.
              </h1>
              <p className="mt-5 max-w-[35rem] text-[0.98rem] leading-8 text-slate-300">
                Access the ATRAVA Defense dashboard to manage protected applications, review attack telemetry,
                update policies, and operate within your provisioned tenant scope.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {trustPoints.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-5 backdrop-blur"
                >
                  <p className="text-xs uppercase tracking-[0.25em] text-white/45">{item.label}</p>
                  <p className="mt-3 text-[0.9rem] font-semibold leading-8 text-white xl:text-[0.98rem]">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 [@media_(max-height:920px)]:hidden">
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">Operations view</p>
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                    Active
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {operationsHighlights.map((item) => (
                    <div
                      key={item.label}
                      className={`rounded-2xl border px-4 py-3 ${HighlightToneClass(item.tone)}`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-current/70">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/45 p-5">
                  <div className="space-y-5">
                    {activityRail.map((item, index) => (
                      <div key={item.title} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 text-xs font-semibold text-cyan-100">
                            {index + 1}
                          </span>
                          {index < activityRail.length - 1 ? (
                            <span className="mt-2 h-full w-px bg-white/10" />
                          ) : null}
                        </div>
                        <div className="pb-1">
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-300">{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="relative flex min-h-0 items-center pt-2 lg:justify-end lg:pt-0">
            <div className="absolute -left-6 top-10 h-28 w-28 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute -right-4 bottom-8 h-36 w-36 rounded-full bg-sky-500/20 blur-3xl" />
            <div className="relative w-full overflow-hidden rounded-[32px] border border-white/10 bg-white shadow-[0_32px_100px_rgba(2,6,23,0.35)]">
              <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_35%),linear-gradient(135deg,#eff6ff_0%,#f8fafc_55%,#eef2ff_100%)] px-7 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700">Sign in</p>
                <h2 className="mt-2 text-[1.85rem] font-bold tracking-tight text-slate-950">Access the dashboard</h2>
                <p className="mt-2 max-w-md text-[0.96rem] leading-7 text-slate-600">
                  Use the sign-in method assigned to your managed account. Google-enabled users should use the Google button below.
                </p>
              </div>

              <div className="p-6">
                <form className="space-y-2.5" onSubmit={handleAuth}>
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Email address
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Password
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      type="submit"
                      disabled={loadingEmail || loadingGoogle}
                      className="flex w-full items-center justify-center rounded-full bg-cyan-400 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_20px_60px_rgba(34,211,238,0.25)] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingEmail ? (
                        <span className="flex items-center space-x-2">
                          <svg className="h-5 w-5 animate-spin text-slate-950" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Signing in...</span>
                        </span>
                      ) : 'Sign In'}
                    </button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="bg-white px-4 font-medium text-slate-500">Or continue with</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loadingEmail || loadingGoogle}
                      className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingGoogle ? (
                        <span className="flex items-center space-x-2">
                          <svg className="h-5 w-5 animate-spin text-slate-700" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Signing in with Google...</span>
                        </span>
                      ) : (
                        <>
                          <svg className="h-5 w-5" viewBox="0 0 24 24">
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
                          <span>Continue with Google</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-3 rounded-3xl border border-slate-200 bg-slate-50/90 p-4 [@media_(max-height:920px)]:hidden">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Access note</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    If your account is provisioned for Google, password login will not work. Use the Google button to complete access verification.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#08111f] text-white">
      <div className="absolute inset-x-0 top-0 -z-10 h-[760px] bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.32),_transparent_42%),radial-gradient(circle_at_20%_25%,_rgba(14,165,233,0.24),_transparent_25%),linear-gradient(180deg,_#08111f_0%,_#09192d_48%,_#f3f6fb_48%,_#f3f6fb_100%)]" />
      <div className="mx-auto max-w-7xl animate-pulse px-6 pb-16 pt-6 lg:px-8 lg:pb-20">
        <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/20" />
            <div className="space-y-2">
              <div className="h-3 w-32 rounded bg-white/20" />
              <div className="h-3 w-24 rounded bg-white/10" />
            </div>
          </div>
        </div>

        <div className="grid gap-14 pt-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(400px,0.95fr)] lg:items-center">
          <div className="space-y-6">
            <div className="h-3 w-28 rounded bg-cyan-300/30" />
            <div className="h-14 max-w-2xl rounded bg-white/15" />
            <div className="h-14 max-w-xl rounded bg-white/10" />
            <div className="h-5 max-w-2xl rounded bg-white/10" />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="h-28 rounded-3xl bg-white/10" />
              <div className="h-28 rounded-3xl bg-white/10" />
              <div className="h-28 rounded-3xl bg-white/10" />
            </div>
          </div>

          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white shadow-[0_32px_100px_rgba(2,6,23,0.35)]">
            <div className="border-b border-slate-200 bg-slate-100 px-8 py-8">
              <div className="h-3 w-20 rounded bg-slate-300" />
              <div className="mt-3 h-10 w-52 rounded bg-slate-300" />
              <div className="mt-3 h-4 w-72 rounded bg-slate-200" />
            </div>
            <div className="space-y-5 p-8">
              <div className="h-14 rounded-2xl bg-slate-100" />
              <div className="h-14 rounded-2xl bg-slate-100" />
              <div className="h-14 rounded-full bg-cyan-200" />
              <div className="h-14 rounded-full bg-slate-100" />
            </div>
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
