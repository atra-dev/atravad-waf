import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getUserByEmail, getUserByUid, normalizeEmail } from '@/lib/user-utils';
import { getCurrentUser } from '@/lib/api-helpers';

function isAllowedSignInProvider(expectedAuthProvider, actualSignInProvider) {
  if (expectedAuthProvider === 'google') {
    return actualSignInProvider === 'google.com';
  }

  return actualSignInProvider === 'password' || actualSignInProvider === 'custom';
}

function normalizeAuthProviderFromSignIn(signInProvider) {
  if (signInProvider === 'google.com') return 'google';
  if (signInProvider === 'password' || signInProvider === 'custom') return 'password';
  return null;
}

async function migrateLegacyUserByUid(firebaseUser) {
  if (!adminDb || !firebaseUser?.uid || !firebaseUser?.email) {
    return null;
  }

  const legacyUserData = await getUserByUid(adminDb, firebaseUser.uid);
  if (!legacyUserData) {
    return null;
  }

  const normalizedEmail = normalizeEmail(firebaseUser.email);
  const now = new Date().toISOString();
  const migratedUserData = {
    ...legacyUserData,
    email: normalizedEmail,
    uid: firebaseUser.uid,
    updatedAt: now,
  };

  await adminDb.runTransaction(async (transaction) => {
    const emailRef = adminDb.collection('users').doc(normalizedEmail);
    const emailDoc = await transaction.get(emailRef);

    if (!emailDoc.exists) {
      transaction.set(emailRef, migratedUserData);
    } else {
      transaction.set(emailRef, migratedUserData, { merge: true });
    }

    if (legacyUserData.id && legacyUserData.id !== normalizedEmail) {
      transaction.delete(adminDb.collection('users').doc(legacyUserData.id));
    }
  });

  return {
    id: normalizedEmail,
    ...migratedUserData,
  };
}

/**
 * GET /api/users/me
 * Get current user details for pre-provisioned managed users only
 */
export async function GET(request) {
  try {
    let user = null;
    try {
      user = await getCurrentUser(request);
    } catch (authError) {
      console.error('Error getting current user:', authError?.message || authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 503 }
      );
    }

    let userData;
    try {
      userData = await getUserByEmail(adminDb, user.email);
      if (!userData) {
        userData = await migrateLegacyUserByUid(user);
      }
    } catch (dbError) {
      console.error('Error fetching user document:', dbError?.message || dbError);
      return NextResponse.json(
        { error: 'Failed to load user data' },
        { status: 503 }
      );
    }

    if (!userData) {
      return NextResponse.json(
        { error: 'Access denied: account is not provisioned by ATRAVA Defense' },
        { status: 403 }
      );
    }

    const actualSignInProvider = user.firebase?.sign_in_provider || null;
    const normalizedEmail = normalizeEmail(userData.email);

    if (!userData.authProvider) {
      const inferredAuthProvider = normalizeAuthProviderFromSignIn(actualSignInProvider);
      if (inferredAuthProvider) {
        const migratedAt = new Date().toISOString();
        await adminDb.collection('users').doc(normalizedEmail).update({
          authProvider: inferredAuthProvider,
          updatedAt: migratedAt,
        });
        userData = {
          ...userData,
          authProvider: inferredAuthProvider,
          updatedAt: migratedAt,
        };
      }
    }

    const expectedAuthProvider = userData.authProvider || 'password';
    if (!isAllowedSignInProvider(expectedAuthProvider, actualSignInProvider)) {
      return NextResponse.json(
        {
          error: 'Access denied: account is not authorized for this sign-in method',
          expectedAuthProvider,
        },
        { status: 403 }
      );
    }

    if (userData.invitationPending === true) {
      const acceptedAt = new Date().toISOString();
      await adminDb.collection('users').doc(normalizedEmail).update({
        uid: user.uid,
        invitationPending: false,
        acceptedAt,
        updatedAt: acceptedAt,
      });
      userData = {
        ...userData,
        uid: user.uid,
        invitationPending: false,
        acceptedAt,
        updatedAt: acceptedAt,
      };
    }

    return NextResponse.json({
      ...userData,
      needsTenant: !userData.tenantName,
    });
  } catch (error) {
    console.error('Error in GET /api/users/me:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users/me
 * Update current user document for pre-provisioned users only
 */
export async function POST(request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      );
    }

    const user = await getCurrentUser(request);
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { role, tenantName } = body;

    let userData = await getUserByEmail(adminDb, user.email);
    if (!userData) {
      userData = await migrateLegacyUserByUid(user);
    }
    if (!userData) {
      return NextResponse.json(
        { error: 'Access denied: account is not provisioned by ATRAVA Defense' },
        { status: 403 }
      );
    }

    const updateData = {
      updatedAt: new Date().toISOString(),
    };

    if (role !== undefined) {
      updateData.role = role;
    }

    if (tenantName !== undefined) {
      updateData.tenantName = tenantName;
    }

    // Update user document (using email as document ID)
    const normalizedEmail = userData.email.toLowerCase().trim();
    await adminDb.collection('users').doc(normalizedEmail).update(updateData);

    const updatedUserDoc = await adminDb.collection('users').doc(normalizedEmail).get();
    return NextResponse.json({
      id: updatedUserDoc.id,
      ...updatedUserDoc.data(),
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
