import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyNodeApiKey, extractNodeCredentials } from '@/lib/node-auth';
import { rateLimit } from '@/lib/rate-limit';

/**
 * GET /api/nodes/[id]/config
 * Endpoint for nodes to fetch their current policy configuration
 * Nodes should poll this endpoint or use webhooks
 * 
 * Authentication: Requires valid node API key
 */
export async function GET(request, { params }) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      );
    }

    const { id } = await params;
    
    // Extract API key from headers
    const headerCreds = extractNodeCredentials(request);
    if (!headerCreds || !headerCreds.apiKey) {
      return NextResponse.json(
        { error: 'Missing node API key. Include X-Node-Id and X-Node-Api-Key headers.' },
        { status: 401 }
      );
    }

    // Verify node API key
    const authResult = await verifyNodeApiKey(id, headerCreds.apiKey);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication failed' },
        { status: authResult.error?.includes('disabled') || authResult.error?.includes('revoked') ? 403 : 401 }
      );
    }

    // Apply rate limiting (per-node for config endpoints)
    const rateLimitResult = await rateLimit(request, {
      routeGroup: '/api/nodes',
      nodeId: id,
    });
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    // Get node
    const nodeDoc = await adminDb.collection('nodes').doc(id).get();
    if (!nodeDoc.exists) {
      return NextResponse.json(
        { error: 'Node not found' },
        { status: 404 }
      );
    }

    const nodeData = nodeDoc.data();

    // Get latest deployment for this node
    // Fetch without orderBy to avoid index requirement, then sort in memory
    const deploymentSnapshot = await adminDb
      .collection('deployments')
      .where('nodeIds', 'array-contains', id)
      .where('tenantName', '==', nodeData.tenantName)
      .get();

    if (deploymentSnapshot.empty) {
      return NextResponse.json({
        nodeId: id,
        hasConfig: false,
        message: 'No policy deployed to this node',
      });
    }

    // Sort by createdAt descending and get the latest
    const deployments = deploymentSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

    const deployment = deployments[0];
    const policyId = deployment.policyId;

    // Get policy configuration
    const policyDoc = await adminDb.collection('policies').doc(policyId).get();
    if (!policyDoc.exists) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      );
    }

    const policyData = policyDoc.data();

    // Update deployment status if needed
    const deploymentId = deployment.id;
    const nodeDeploymentResult = deployment.results?.find((r) => r.nodeId === id);
    
    if (!nodeDeploymentResult || nodeDeploymentResult.status === 'pending') {
      // Mark as fetched (node will update to 'deployed' after successful application)
      const existingResults = deployment.results || [];
      const updatedResults = existingResults.filter((r) => r.nodeId !== id);
      updatedResults.push({
        nodeId: id,
        status: 'fetched',
        fetchedAt: new Date().toISOString(),
      });
      await adminDb.collection('deployments').doc(deploymentId).update({
        results: updatedResults,
      });
    }

    return NextResponse.json({
      nodeId: id,
      hasConfig: true,
      deploymentId,
      policy: {
        id: policyId,
        name: policyData.name,
        version: policyData.version,
        modSecurityConfig: policyData.modSecurityConfig,
        mode: policyData.mode,
        includeOWASPCRS: policyData.includeOWASPCRS,
      },
    });
  } catch (error) {
    console.error('Error fetching node config:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/nodes/[id]/config
 * Endpoint for nodes to report deployment status
 * 
 * Authentication: Requires valid node API key
 */
export async function POST(request, { params }) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    
    // Extract API key from headers or body (backward compatibility)
    const headerCreds = extractNodeCredentials(request);
    const apiKey = headerCreds?.apiKey || body.nodeApiKey;

    // Verify node API key
    const authResult = await verifyNodeApiKey(id, apiKey);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication failed' },
        { status: authResult.error?.includes('disabled') || authResult.error?.includes('revoked') ? 403 : 401 }
      );
    }

    // Apply rate limiting (per-node for config endpoints)
    const rateLimitResult = await rateLimit(request, {
      routeGroup: '/api/nodes',
      nodeId: id,
    });
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const { deploymentId, status, error: errorMessage } = body;

    if (!deploymentId || !status) {
      return NextResponse.json(
        { error: 'deploymentId and status are required' },
        { status: 400 }
      );
    }

    // Update deployment result
    const deploymentDoc = await adminDb.collection('deployments').doc(deploymentId).get();
    if (!deploymentDoc.exists) {
      return NextResponse.json(
        { error: 'Deployment not found' },
        { status: 404 }
      );
    }

    const deployment = deploymentDoc.data();
    const existingResults = deployment.results || [];
    const updatedResults = existingResults.filter((r) => r.nodeId !== id);
    
    updatedResults.push({
      nodeId: id,
      status,
      error: errorMessage || null,
      updatedAt: new Date().toISOString(),
    });

    // Update deployment
    await adminDb.collection('deployments').doc(deploymentId).update({
      results: updatedResults,
      // If all nodes have completed, update overall status
      status: updatedResults.every((r) => r.status !== 'pending' && r.status !== 'fetched')
        ? (updatedResults.some((r) => r.status === 'failed') ? 'partial' : 'completed')
        : 'in_progress',
    });

    // Update node deployment status
    await adminDb.collection('nodes').doc(id).update({
      'lastDeployment.status': status,
      'lastDeployment.completedAt': new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      deploymentId,
      nodeId: id,
      status,
    });
  } catch (error) {
    console.error('Error updating deployment status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
