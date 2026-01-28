/**
 * User utility functions
 * Handles email normalization and user document lookups
 */

/**
 * Normalize email for use as document ID
 * - Lowercase
 * - Trim whitespace
 * - Firestore document IDs can contain @ and . so emails are valid
 */
export function normalizeEmail(email) {
  if (!email) return null;
  return email.toLowerCase().trim();
}

/**
 * Normalize tenant name for use as document ID
 * - Lowercase
 * - Replace spaces with hyphens
 * - Remove special characters (keep alphanumeric, hyphens, underscores)
 * - Trim whitespace
 * - Firestore document IDs cannot contain: /, \, ?, #, [, ], *, whitespace
 */
export function normalizeTenantName(name) {
  if (!name) return null;
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9_-]/g, '') // Remove special characters except hyphens and underscores
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Get user document ID from email
 */
export function getUserDocumentId(email) {
  return normalizeEmail(email);
}

/**
 * Get user document by email
 */
export async function getUserByEmail(adminDb, email) {
  if (!adminDb || !email) return null;
  
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  
  try {
    const userDoc = await adminDb.collection('users').doc(normalizedEmail).get();
    if (!userDoc.exists) return null;
    return { id: userDoc.id, ...userDoc.data() };
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

/**
 * Get user document by UID (for backward compatibility during migration)
 * Note: This searches by uid field since documents are now keyed by email
 */
export async function getUserByUid(adminDb, uid) {
  if (!adminDb || !uid) return null;
  
  try {
    const userSnapshot = await adminDb
      .collection('users')
      .where('uid', '==', uid)
      .limit(1)
      .get();
    
    if (userSnapshot.empty) return null;
    const userDoc = userSnapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() };
  } catch (error) {
    console.error('Error getting user by UID:', error);
    return null;
  }
}

/**
 * Create or get user document (idempotent)
 * Uses email as document ID
 */
export async function createOrGetUser(adminDb, user) {
  if (!adminDb || !user || !user.email) return null;
  
  const normalizedEmail = normalizeEmail(user.email);
  if (!normalizedEmail) return null;
  
  const userRef = adminDb.collection('users').doc(normalizedEmail);
  
  try {
    // Use transaction to prevent duplicate creation
    return await adminDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (userDoc.exists) {
        // User already exists, return existing data
        const data = userDoc.data();
        return {
          id: userDoc.id,
          ...data,
        };
      }
      
      // Create new user document
      const userData = {
        email: normalizedEmail,
        uid: user.uid, // Store UID for Firebase Auth linking
        role: 'client',
        tenantName: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      transaction.set(userRef, userData);
      
      return {
        id: normalizedEmail,
        ...userData,
      };
    });
  } catch (error) {
    console.error('Error creating/getting user:', error);
    throw error;
  }
}

/**
 * Get tenant name for a user by email
 */
export async function getTenantNameByEmail(adminDb, email) {
  const user = await getUserByEmail(adminDb, email);
  return user?.tenantName || null;
}

/**
 * Get tenant name for a user by UID (backward compatibility)
 */
export async function getTenantNameByUid(adminDb, uid) {
  const user = await getUserByUid(adminDb, uid);
  return user?.tenantName || null;
}

/**
 * Get tenant ID for a user by email (backward compatibility - returns tenantName)
 * @deprecated Use getTenantNameByEmail instead
 */
export async function getTenantIdByEmail(adminDb, email) {
  return getTenantNameByEmail(adminDb, email);
}

/**
 * Get tenant ID for a user by UID (backward compatibility - returns tenantName)
 * @deprecated Use getTenantNameByUid instead
 */
export async function getTenantIdByUid(adminDb, uid) {
  return getTenantNameByUid(adminDb, uid);
}

