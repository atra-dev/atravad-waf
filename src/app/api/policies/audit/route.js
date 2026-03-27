import { NextResponse } from 'next/server';
import { FieldPath } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';

function encodeCursor(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(String(cursor), 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    return parsed?.createdAt && parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

function resolveDateFloor(range) {
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  if (range === '7d') return new Date(now - 7 * dayMs).toISOString();
  if (range === '30d') return new Date(now - 30 * dayMs).toISOString();
  if (range === '90d') return new Date(now - 90 * dayMs).toISOString();
  return null;
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
      return NextResponse.json({ logs: [], nextCursor: null, hasMore: false });
    }

    const { searchParams } = new URL(request.url);
    const policyName = String(searchParams.get('name') || '').trim();
    const actorEmail = String(searchParams.get('actorEmail') || '').trim().toLowerCase();
    const changeScope = String(searchParams.get('changeScope') || '').trim().toLowerCase();
    const dateRange = String(searchParams.get('dateRange') || 'all').trim().toLowerCase();
    const cursor = decodeCursor(searchParams.get('cursor'));
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '10', 10);
    const limit = Math.min(Math.max(requestedLimit || 10, 1), 50);

    if (!policyName) {
      return NextResponse.json({ error: 'Policy name is required' }, { status: 400 });
    }

    let query = adminDb
      .collection('policyAuditLogs')
      .where('tenantName', '==', tenantName)
      .where('policyName', '==', policyName);

    if (actorEmail) {
      query = query.where('actorEmail', '==', actorEmail);
    }

    if (changeScope === 'ip' || changeScope === 'geo') {
      query = query.where('changeScopes', 'array-contains', changeScope);
    }

    const dateFloor = resolveDateFloor(dateRange);
    if (dateFloor) {
      query = query.where('createdAt', '>=', dateFloor);
    }

    query = query
      .orderBy('createdAt', 'desc')
      .orderBy(FieldPath.documentId(), 'desc');

    if (cursor) {
      query = query.startAfter(cursor.createdAt, cursor.id);
    }

    const snapshot = await query.limit(limit + 1).get();
    const docs = snapshot.docs;
    const hasMore = docs.length > limit;
    const pageDocs = hasMore ? docs.slice(0, limit) : docs;

    const logs = pageDocs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const lastDoc = pageDocs[pageDocs.length - 1];
    const nextCursor = hasMore && lastDoc
      ? encodeCursor({
          createdAt: lastDoc.data()?.createdAt || '',
          id: lastDoc.id,
        })
      : null;

    return NextResponse.json({
      logs,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('Error fetching policy audit logs:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
