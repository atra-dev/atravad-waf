import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkAuthorization } from '@/lib/rbac';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';
import { verifyNodeApiKey, extractNodeCredentials } from '@/lib/node-auth';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/logs
 * Endpoint for WAF nodes to send logs (basic log ingestion)
 * This is called by nodes, authenticated via node API key
 * 
 * Authentication: Requires valid node API key
 */
export async function POST(request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      );
    }

    const body = await request.json();
    
    // Extract API key from headers or body (backward compatibility)
    const headerCreds = extractNodeCredentials(request);
    const nodeId = headerCreds?.nodeId || body.nodeId;
    const apiKey = headerCreds?.apiKey || body.nodeApiKey;
    const { logs } = body;

    if (!nodeId || !apiKey) {
      return NextResponse.json(
        { error: 'nodeId and nodeApiKey are required' },
        { status: 401 }
      );
    }

    // Verify node API key using centralized authentication
    const authResult = await verifyNodeApiKey(nodeId, apiKey);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication failed' },
        { status: authResult.error?.includes('disabled') || authResult.error?.includes('revoked') ? 403 : 401 }
      );
    }

    const nodeData = authResult.node;

    // Apply rate limiting (strict per-node limits for log ingestion)
    const rateLimitResult = await rateLimit(request, {
      routeGroup: '/api/logs',
      nodeId: nodeId,
    });
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    if (!logs || !Array.isArray(logs)) {
      return NextResponse.json(
        { error: 'logs array is required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const batch = adminDb.batch();

    // Store logs
    logs.forEach((log) => {
      const logRef = adminDb.collection('logs').doc();
      batch.set(logRef, {
        nodeId,
        tenantName: nodeData.tenantName,
        timestamp: log.timestamp || now,
        level: log.level || 'info',
        message: log.message,
        ruleId: log.ruleId || null,
        ruleMessage: log.ruleMessage || null,
        severity: log.severity || null,
        request: log.request || null,
        response: log.response || null,
        clientIp: log.clientIp || null,
        userAgent: log.userAgent || null,
        uri: log.uri || null,
        method: log.method || null,
        statusCode: log.statusCode || null,
        blocked: log.blocked || false,
        ingestedAt: now,
      });
    });

    await batch.commit();

    // Update node's last log time
    await adminDb.collection('nodes').doc(nodeId).update({
      lastLogTime: now,
    });

    return NextResponse.json({
      success: true,
      ingested: logs.length,
      timestamp: now,
    });
  } catch (error) {
    console.error('Error ingesting logs:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/logs
 * Retrieve logs (analysts and admins only)
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

    // Check authorization - analysts and admins can view logs
    const authCheck = await checkAuthorization(adminDb, user.email, 'read', 'logs');
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
    const nodeId = searchParams.get('nodeId');
    const level = searchParams.get('level');
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '100');
    const startAfter = searchParams.get('startAfter');

    let query = adminDb
      .collection('logs')
      .where('tenantName', '==', tenantName);

    if (nodeId) {
      query = query.where('nodeId', '==', nodeId);
    }

    if (level) {
      query = query.where('level', '==', level);
    }

    if (severity) {
      query = query.where('severity', '==', severity);
    }

    // Fetch without orderBy to avoid index requirement, then sort in memory
    // Fetch more than needed to handle pagination
    const fetchLimit = startAfter ? limit * 2 : limit;
    const logsSnapshot = await query.limit(fetchLimit).get();

    let logs = logsSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => {
        // Sort by timestamp descending (newest first)
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });

    // Handle pagination (startAfter)
    if (startAfter) {
      const startAfterIndex = logs.findIndex(log => log.id === startAfter);
      if (startAfterIndex !== -1) {
        logs = logs.slice(startAfterIndex + 1);
      }
    }

    // Apply limit after sorting
    const hasMore = logs.length > limit;
    logs = logs.slice(0, limit);

    return NextResponse.json({
      logs,
      count: logs.length,
      hasMore,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
