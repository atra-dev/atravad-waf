import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin if not already initialized
let isInitialized = false;

if (!getApps().length) {
  try {
    // Support both FIREBASE_* (server-only, recommended) and NEXT_PUBLIC_FIREBASE_* env vars
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: (typeof privateKey === 'string' ? privateKey : '').replace(/\\n/g, '\n'),
        }),
      });
      isInitialized = true;
    } else {
      console.warn('Firebase Admin environment variables not set. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL, NEXT_PUBLIC_FIREBASE_PRIVATE_KEY.');
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
} else {
  isInitialized = true;
}

// Get Firestore and Auth instances
// These will be null if Firebase Admin wasn't initialized
let adminDb = null;
let adminAuth = null;

if (isInitialized) {
  try {
    adminDb = getFirestore();
    adminAuth = getAuth();
  } catch (error) {
    console.error('Error getting Firebase Admin services:', error);
  }
}

// Export the initialized services (may be null if initialization failed)
export { adminDb, adminAuth };