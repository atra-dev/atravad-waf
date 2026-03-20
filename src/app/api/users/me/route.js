import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getUserByEmail, normalizeEmail } from '@/lib/user-utils';
import { getCurrentUser } from '@/lib/api-helpers';

function isAllowedSignInProvider(expectedAuthProvider, actualSignInProvider) {
  if (expectedAuthProvider === 'google') {
    return actualSignInProvider === 'google.com';
  }

  return actualSignInProvider === 'password' || actualSignInProvider === 'custom';
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
    } catch (dbError) {
      console.error('Error fetching user document:', dbError?.message || dbError);
      return NextResponse.json(
        { error: 'Failed to load user data' },
        { status: 503 }
      );
    }

    if (!userData) {
      return NextResponse.json(
        { error: 'Access denied: account is not provisioned by ATRAVAD WAF' },
        { status: 403 }
      );
    }

    const expectedAuthProvider = userData.authProvider || 'password';
    const actualSignInProvider = user.firebase?.sign_in_provider || null;
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
      const normalizedEmail = normalizeEmail(userData.email);
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
      return NextResponse.json(
        { error: 'Access denied: account is not provisioned by ATRAVAD WAF' },
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
