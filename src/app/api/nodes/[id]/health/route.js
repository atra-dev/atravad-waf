import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyNodeApiKey, extractNodeCredentials } from '@/lib/node-auth';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/nodes/[id]/health
 * Heartbeat endpoint for nodes to report their health status
 * This endpoint should be called periodically by WAF nodes
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
    const nodeId = id;
    const apiKey = headerCreds?.apiKey || body.nodeApiKey;

    // Verify node API key
    const authResult = await verifyNodeApiKey(nodeId, apiKey);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication failed' },
        { status: authResult.error?.includes('disabled') || authResult.error?.includes('revoked') ? 403 : 401 }
      );
    }

    // Apply rate limiting (per-node for health endpoints)
    const rateLimitResult = await rateLimit(request, {
      routeGroup: '/api/nodes',
      nodeId: nodeId,
    });
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const { 
      status = 'online', 
      version,
      uptime,
      cpuUsage,
      memoryUsage,
      activeConnections,
      policiesDeployed,
      lastLogTime
    } = body;

    // Node already validated in auth check above
    const nodeData = authResult.node;
    const now = new Date().toISOString();

    // Update node health information
    await adminDb.collection('nodes').doc(id).update({
      status,
      lastSeen: now,
      health: {
        version,
        uptime,
        cpuUsage,
        memoryUsage,
        activeConnections,
        policiesDeployed,
        lastLogTime,
        lastUpdated: now,
      },
    });

    // Store health history (last 100 entries per node)
    await adminDb.collection('node_health_history').add({
      nodeId: id,
      tenantName: nodeData.tenantName,
      status,
      version,
      uptime,
      cpuUsage,
      memoryUsage,
      activeConnections,
      policiesDeployed,
      timestamp: now,
    });

    // Cleanup old health history (keep last 100 per node)
    // Fetch without orderBy to avoid index requirement, then sort in memory
    const historySnapshot = await adminDb
      .collection('node_health_history')
      .where('nodeId', '==', id)
      .get();

    if (historySnapshot.docs.length > 100) {
      // Sort by timestamp descending and get the oldest ones to delete
      const sortedHistory = historySnapshot.docs
        .map(doc => ({ id: doc.id, ref: doc.ref, ...doc.data() }))
        .sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeB - timeA; // Descending (newest first)
        });
      
      // Keep the first 100 (newest), delete the rest
      const toDelete = sortedHistory.slice(100);
      const batch = adminDb.batch();
      toDelete.forEach((item) => batch.delete(item.ref));
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      nodeId: id,
      timestamp: now,
    });
  } catch (error) {
    console.error('Error updating node health:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
