import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkAuthorization } from '@/lib/rbac';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';

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

    // Check authorization - only admins can create apps
    const authCheck = await checkAuthorization(adminDb, user.email, 'create', 'apps');
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
    const {
      name,
      domain,
      origins,
      ssl,
      routing,
      policyId,
      trafficMode = 'detection',
      canaryPercent = 0,
      bodyLimitBytes = null,
    } = body;

    if (!name || !domain) {
      return NextResponse.json(
        { error: 'Name and domain are required' },
        { status: 400 }
      );
    }

    if (!['off', 'detection', 'prevention'].includes(trafficMode)) {
      return NextResponse.json(
        { error: 'Invalid trafficMode. Use off, detection, or prevention.' },
        { status: 400 }
      );
    }

    if (canaryPercent < 0 || canaryPercent > 100) {
      return NextResponse.json(
        { error: 'canaryPercent must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (bodyLimitBytes !== null && (isNaN(bodyLimitBytes) || bodyLimitBytes <= 0)) {
      return NextResponse.json(
        { error: 'bodyLimitBytes must be a positive number when provided' },
        { status: 400 }
      );
    }

    // Validate origins if provided
    if (origins && Array.isArray(origins)) {
      for (const origin of origins) {
        if (!origin.url) {
          return NextResponse.json(
            { error: 'Each origin must have a URL' },
            { status: 400 }
          );
        }
        try {
          new URL(origin.url);
        } catch (error) {
          return NextResponse.json(
            { error: `Invalid origin URL: ${origin.url}` },
            { status: 400 }
          );
        }
      }
    }

    const appRef = await adminDb.collection('applications').add({
      name,
      domain,
      origins: origins || [],
      ssl: ssl || null,
      routing: routing || { pathPrefix: '/', stripPath: false },
      policyId: policyId || null,
      trafficMode,
      canaryPercent,
      bodyLimitBytes,
      tenantName,
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
    });

    return NextResponse.json({
      id: appRef.id,
      name,
      domain,
      origins: origins || [],
      ssl: ssl || null,
      routing: routing || { pathPrefix: '/', stripPath: false },
      policyId: policyId || null,
      trafficMode,
      canaryPercent,
      bodyLimitBytes,
    });
  } catch (error) {
    console.error('Error creating application:', error);
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

    const appsSnapshot = await adminDb
      .collection('applications')
      .where('tenantName', '==', tenantName)
      .get();

    const apps = appsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(apps);
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
