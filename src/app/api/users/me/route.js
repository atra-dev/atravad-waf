import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { createOrGetUser } from '@/lib/user-utils';
import { getCurrentUser } from '@/lib/api-helpers';

/**
 * GET /api/users/me
 * Get current user details, auto-create user document if it doesn't exist (idempotent)
 * Uses email as document ID for clearer database schema
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

    // Create or get user document (idempotent - uses transaction to prevent duplicates)
    let userData;
    try {
      userData = await createOrGetUser(adminDb, user);
    } catch (dbError) {
      console.error('Error creating/fetching user document:', dbError?.message || dbError);
      return NextResponse.json(
        { error: 'Failed to load user data' },
        { status: 503 }
      );
    }

    if (!userData) {
      return NextResponse.json(
        { error: 'Failed to create user document' },
        { status: 503 }
      );
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
