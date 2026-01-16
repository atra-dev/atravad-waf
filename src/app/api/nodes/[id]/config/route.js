import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyNodeApiKey, extractNodeCredentials } from '@/lib/node-auth';
import { rateLimit } from '@/lib/rate-limit';

/**
 * GET /api/nodes/[id]/config
 * Endpoint for proxy nodes to fetch application configurations
 * Proxy nodes poll this endpoint to get applications they should protect
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
    const tenantName = nodeData.tenantName;

    // Get all applications for this tenant (proxy nodes protect all applications in tenant)
    const appsSnapshot = await adminDb
      .collection('applications')
      .where('tenantName', '==', tenantName)
      .get();

    const applications = [];
    
    for (const appDoc of appsSnapshot.docs) {
      const app = { id: appDoc.id, ...appDoc.data() };
      
      // If application has a policy, fetch it
      if (app.policyId) {
        const policyDoc = await adminDb.collection('policies').doc(app.policyId).get();
        if (policyDoc.exists) {
          app.policy = {
            id: policyDoc.id,
            name: policyDoc.data().name,
            version: policyDoc.data().version,
            modSecurityConfig: policyDoc.data().modSecurityConfig,
            mode: policyDoc.data().mode,
            includeOWASPCRS: policyDoc.data().includeOWASPCRS,
          };
        }
      }
      
      applications.push(app);
    }

    return NextResponse.json({
      nodeId: id,
      hasConfig: applications.length > 0,
      applications: applications,
      timestamp: new Date().toISOString(),
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
 * Endpoint for nodes to report configuration status (optional)
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
    
    // Extract API key from headers
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

    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, {
      routeGroup: '/api/nodes',
      nodeId: id,
    });
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    // Update node last config fetch time
    await adminDb.collection('nodes').doc(id).update({
      lastConfigFetch: new Date().toISOString(),
      configStatus: body.status || 'active',
    });

    return NextResponse.json({
      success: true,
      nodeId: id,
      message: 'Configuration status updated',
    });
  } catch (error) {
    console.error('Error updating config status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
