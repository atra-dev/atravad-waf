import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';
import { checkAuthorization } from '@/lib/rbac';

/**
 * GET /api/deploy
 * Get deployment history
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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check authorization
    const authCheck = await checkAuthorization(adminDb, user.email, 'read', 'deployments');
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: 'Forbidden', details: authCheck.error },
        { status: 403 }
      );
    }

    const tenantName = await getTenantName(user);
    if (!tenantName) {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(request.url);
    const policyName = searchParams.get('policyName');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = adminDb
      .collection('deployments')
      .where('tenantName', '==', tenantName);

    if (policyName) {
      query = query.where('policyName', '==', policyName);
    }

    // Fetch without orderBy to avoid index requirement, then sort in memory
    const deploymentsSnapshot = await query.limit(limit * 2).get();

    const deployments = deploymentsSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => {
        const timeA = new Date(a.deployedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.deployedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, limit);

    return NextResponse.json(deployments);
  } catch (error) {
    console.error('Error fetching deployments:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
