import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { createOrGetUser } from '@/lib/user-utils';

async function getCurrentUser(request) {
  const token = request.cookies.get('authToken')?.value;
  if (!token) return null;
  
  try {
    const { adminAuth } = await import('@/lib/firebase-admin');
    if (!adminAuth) {
      console.error('Firebase Admin Auth not initialized');
      return null;
    }
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

/**
 * GET /api/users/me
 * Get current user details, auto-create user document if it doesn't exist (idempotent)
 * Uses email as document ID for clearer database schema
 */
export async function GET(request) {
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

    // Create or get user document (idempotent - uses transaction to prevent duplicates)
    const userData = await createOrGetUser(adminDb, user);

    if (!userData) {
      return NextResponse.json(
        { error: 'Failed to create user document' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...userData,
      needsTenant: !userData.tenantName,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users/me
 * Update current user document
 * Uses email as document ID
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

    // Get or create user document first
    let userData = await createOrGetUser(adminDb, user);
    if (!userData) {
      return NextResponse.json(
        { error: 'Failed to get user document' },
        { status: 500 }
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
