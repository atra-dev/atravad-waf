import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin if not already initialized
let isInitialized = false;

if (!getApps().length) {
  try {
    // Check if required environment variables are present
    if (
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL &&
      process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY
    ) {
      initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      isInitialized = true;
    } else {
      console.warn('Firebase Admin environment variables not set. API routes will not work.');
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