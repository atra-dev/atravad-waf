import { adminDb } from '@/lib/firebase-admin';
import { createOrGetUser, normalizeEmail, getUserByEmail, getTenantNameByEmail } from '@/lib/user-utils';

/**
 * Get current user from auth token
 * Returns null if token is missing, invalid, or expired
 */
export async function getCurrentUser(request) {
  const token = request.cookies.get('authToken')?.value;
  if (!token) {
    return null;
  }
  
  try {
    const { adminAuth } = await import('@/lib/firebase-admin');
    if (!adminAuth) {
      console.error('Firebase Admin Auth not initialized');
      return null;
    }
    
    // Verify token - this will throw if token is invalid or expired
    const decodedToken = await adminAuth.verifyIdToken(token, true); // checkRevoked = true
    
    // Additional check: ensure token hasn't been revoked
    if (!decodedToken || !decodedToken.email) {
      return null;
    }
    
    return decodedToken;
  } catch (error) {
    // Token is invalid, expired, or revoked
    console.error('Error verifying token:', error.message);
    return null;
  }
}

/**
 * Get tenant name for current user (using email as document ID)
 */
export async function getTenantName(user) {
  if (!adminDb || !user || !user.email) return null;
  
  // Ensure user document exists
  await createOrGetUser(adminDb, user);
  
  return await getTenantNameByEmail(adminDb, user.email);
}

/**
 * Get tenant ID for current user (backward compatibility - returns tenantName)
 * @deprecated Use getTenantName instead
 */
export async function getTenantId(user) {
  return getTenantName(user);
}

/**
 * Get user document data (using email as document ID)
 */
export async function getUserData(user) {
  if (!adminDb || !user || !user.email) return null;
  
  // Ensure user document exists
  await createOrGetUser(adminDb, user);
  
  // Get user document by email
  const normalizedEmail = normalizeEmail(user.email);
  const userDoc = await adminDb.collection('users').doc(normalizedEmail).get();
  
  if (!userDoc.exists) return null;
  return userDoc.data();
}
