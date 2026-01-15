import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkAuthorization } from '@/lib/rbac';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';
import { revokeNodeApiKey } from '@/lib/node-auth';

/**
 * POST /api/nodes/[id]/revoke-key
 * Revoke API key for a node (disables the node)
 * Admin only
 */
export async function POST(request, { params }) {
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

    // Check authorization - only admins can revoke keys
    const authCheck = await checkAuthorization(adminDb, user.email, 'update', 'nodes');
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: 'Forbidden', details: authCheck.error },
        { status: 403 }
      );
    }

    const { id } = await params;
    const tenantName = await getTenantName(user);
    
    // Verify node belongs to tenant
    const nodeDoc = await adminDb.collection('nodes').doc(id).get();
    if (!nodeDoc.exists) {
      return NextResponse.json(
        { error: 'Node not found' },
        { status: 404 }
      );
    }

    const nodeData = nodeDoc.data();
    if (nodeData.tenantName !== tenantName) {
      return NextResponse.json(
        { error: 'Node not found' },
        { status: 404 }
      );
    }

    // Revoke the API key
    const result = await revokeNodeApiKey(id);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to revoke API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API key revoked. Node is now disabled.',
    });
  } catch (error) {
    console.error('Error revoking API key:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
