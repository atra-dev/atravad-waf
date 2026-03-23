import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

function resolveAuthDomain() {
  const configuredAuthDomain =
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

  if (typeof window === 'undefined') {
    return configuredAuthDomain;
  }

  const { hostname } = window.location;
  const isLocalhost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0';

  // On custom domains, same-origin auth handlers avoid the cross-site
  // redirect/popup handoff problem that sends users back to /login.
  return isLocalhost ? configuredAuthDomain : hostname;
}

// Firebase Client Configuration
// These values should be in .env.local (lines 1-10)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: resolveAuthDomain(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
