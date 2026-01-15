import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkAuthorization } from '@/lib/rbac';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';

/**
 * POST /api/deploy/[policyId]
 * Deploy a policy to one or more WAF nodes
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

    // Check authorization - only admins can deploy
    const authCheck = await checkAuthorization(adminDb, user.email, 'deploy', 'policies');
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: 'Forbidden', details: authCheck.error },
        { status: 403 }
      );
    }

    const { policyId } = params;
    const body = await request.json();
    const { nodeIds } = body; // Array of node IDs to deploy to

    if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
      return NextResponse.json(
        { error: 'nodeIds array is required' },
        { status: 400 }
      );
    }

    const tenantName = await getTenantName(user);
    if (!tenantName) {
      return NextResponse.json(
        { error: 'No tenant assigned' },
        { status: 400 }
      );
    }

    // Get policy
    const policyDoc = await adminDb.collection('policies').doc(policyId).get();
    if (!policyDoc.exists) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      );
    }

    const policyData = policyDoc.data();
    if (policyData.tenantName !== tenantName) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      );
    }

    // Verify all nodes belong to tenant
    // Note: Firestore 'in' queries are limited to 10 items, so we'll check individually if needed
    const nodeChecks = await Promise.all(
      nodeIds.map(async (nodeId) => {
        const nodeDoc = await adminDb.collection('nodes').doc(nodeId).get();
        return nodeDoc.exists && nodeDoc.data().tenantName === tenantName;
      })
    );
    
    if (!nodeChecks.every(Boolean) || nodeChecks.length !== nodeIds.length) {
      return NextResponse.json(
        { error: 'Some nodes not found or do not belong to tenant' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const deploymentId = adminDb.collection('deployments').doc().id;

    // Create deployment record
    const deploymentRef = await adminDb.collection('deployments').doc(deploymentId).set({
      policyId,
      policyName: policyData.name,
      policyVersion: policyData.version,
      nodeIds,
      tenantName,
      status: 'pending',
      createdBy: user.uid,
      createdAt: now,
      completedAt: null,
      results: [],
    });

    // Update node deployment status
    const batch = adminDb.batch();
    nodeIds.forEach((nodeId) => {
      const nodeRef = adminDb.collection('nodes').doc(nodeId);
      batch.update(nodeRef, {
        lastDeployment: {
          policyId,
          policyName: policyData.name,
          policyVersion: policyData.version,
          deploymentId,
          status: 'pending',
          requestedAt: now,
        },
      });
    });
    await batch.commit();

    // Return deployment info (nodes should poll or use webhooks to fetch config)
    return NextResponse.json({
      deploymentId,
      policyId,
      policyName: policyData.name,
      policyVersion: policyData.version,
      nodeIds,
      status: 'pending',
      createdAt: now,
      message: 'Deployment initiated. Nodes should fetch configuration from /api/nodes/[id]/config',
    });
  } catch (error) {
    console.error('Error deploying policy:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
