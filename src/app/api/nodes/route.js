import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkAuthorization } from '@/lib/rbac';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';
import { normalizeNodeName } from '@/lib/user-utils';
import { randomUUID } from 'crypto';
import { generateNodeApiKey, hashApiKey } from '@/lib/node-auth';

export async function POST(request) {
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

    // Check authorization - only admins can create nodes
    const authCheck = await checkAuthorization(adminDb, user.email, 'create', 'nodes');
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: 'Forbidden', details: authCheck.error },
        { status: 403 }
      );
    }

    const tenantName = await getTenantName(user);
    if (!tenantName) {
      return NextResponse.json({ error: 'No tenant assigned' }, { status: 400 });
    }

    const body = await request.json();
    const { name, ip } = body;

    if (!name || !ip) {
      return NextResponse.json(
        { error: 'Name and IP are required' },
        { status: 400 }
      );
    }

    // Normalize node name for validation and duplicate checking
    const normalizedNodeName = normalizeNodeName(name);
    if (!normalizedNodeName) {
      return NextResponse.json(
        { error: 'Invalid node name' },
        { status: 400 }
      );
    }

    // Check if node with this name already exists in this tenant
    const existingNodesSnapshot = await adminDb
      .collection('nodes')
      .where('tenantName', '==', tenantName)
      .where('normalizedName', '==', normalizedNodeName)
      .limit(1)
      .get();

    if (!existingNodesSnapshot.empty) {
      return NextResponse.json(
        { error: 'A node with this name already exists' },
        { status: 400 }
      );
    }

    // Generate secure random Node ID (UUID v4)
    const secureNodeId = randomUUID();

    // Generate high-entropy API key for this node
    const apiKey = generateNodeApiKey();
    const apiKeyHash = hashApiKey(apiKey, secureNodeId);

    // Create node with secure random ID as document ID
    const nodeRef = adminDb.collection('nodes').doc(secureNodeId);
    await nodeRef.set({
      name,
      normalizedName: normalizedNodeName, // Store for duplicate checking
      ip,
      tenantName,
      status: 'offline',
      lastSeen: null,
      apiKeyHash, // Store only the hash, never the plaintext key
      apiKeyPrefix: apiKey.substring(0, 12), // Store prefix for UI display
      apiKeyCreatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
    });

    // Return node info with API key (show once - user must save this)
    return NextResponse.json({
      id: secureNodeId,
      name,
      ip,
      status: 'offline',
      apiKey, // Return plaintext key ONCE - user must configure agent with this
      warning: 'Save this API key securely. It will not be shown again.',
    });
  } catch (error) {
    console.error('Error creating node:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
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

    const tenantName = await getTenantName(user);
    if (!tenantName) {
      return NextResponse.json([]);
    }

    const nodesSnapshot = await adminDb
      .collection('nodes')
      .where('tenantName', '==', tenantName)
      .get();

    const nodes = nodesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(nodes);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
