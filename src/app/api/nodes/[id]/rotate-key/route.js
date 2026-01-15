import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkAuthorization } from '@/lib/rbac';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';
import { rotateNodeApiKey } from '@/lib/node-auth';

/**
 * POST /api/nodes/[id]/rotate-key
 * Rotate API key for a node
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

    // Check authorization - only admins can rotate keys
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

    // Rotate the API key
    const result = await rotateNodeApiKey(id);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to rotate API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      newApiKey: result.newApiKey,
      message: 'API key rotated successfully. Save the new key - it will not be shown again.',
    });
  } catch (error) {
    console.error('Error rotating API key:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
