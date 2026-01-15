import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkAuthorization, getUserRole } from '@/lib/rbac';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';

/**
 * DELETE /api/nodes/[id]
 * Delete a WAF node
 * Only admins can delete nodes within their tenant
 */
export async function DELETE(request, { params }) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized. Please check your environment variables.' },
        { status: 500 }
      );
    }

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check authorization - only admins can delete nodes
    const authCheck = await checkAuthorization(adminDb, user.email, 'delete', 'nodes');
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: 'Forbidden', details: authCheck.error },
        { status: 403 }
      );
    }

    const { id } = await params;
    
    // Validate node exists
    const nodeDoc = await adminDb.collection('nodes').doc(id).get();
    if (!nodeDoc.exists) {
      return NextResponse.json(
        { error: 'Node not found' },
        { status: 404 }
      );
    }

    const nodeData = nodeDoc.data();
    const tenantName = await getTenantName(user);

    // Get user role from Firestore
    const userRole = await getUserRole(adminDb, user.email);

    // Super admins can delete any node, regular admins can only delete nodes in their tenant
    if (userRole !== 'super_admin' && nodeData.tenantName !== tenantName) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot delete node from another tenant' },
        { status: 403 }
      );
    }

    // Delete the node document
    await adminDb.collection('nodes').doc(id).delete();

    // Optionally: Clean up related data (health history, deployments, logs)
    // For now, we'll leave related data for audit purposes
    // In a production system, you might want to:
    // - Delete health history entries
    // - Mark deployments as cancelled
    // - Archive logs instead of deleting

    return NextResponse.json({
      success: true,
      message: 'Node deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting node:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
