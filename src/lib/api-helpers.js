import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { normalizeEmail, getUserByEmail, getTenantNameByEmail } from '@/lib/user-utils';

/**
 * Get current user from auth token
 * Returns null if token is missing, invalid, or expired
 */
export async function getCurrentUser(request) {
  const token = request.cookies.get('authToken')?.value;
  if (!token) {
    return null;
  }

  if (!adminAuth) {
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token, true); // checkRevoked = true
    if (!decodedToken || !decodedToken.email) {
      return null;
    }
    return decodedToken;
  } catch (error) {
    console.error('Error verifying token:', error.message);
    return null;
  }
}

/**
 * Get tenant name for current user (using email as document ID)
 */
export async function getTenantName(user) {
  if (!adminDb || !user || !user.email) return null;

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
  const normalizedEmail = normalizeEmail(user.email);
  const userDoc = await adminDb.collection('users').doc(normalizedEmail).get();

  if (!userDoc.exists) return null;
  return userDoc.data();
}
