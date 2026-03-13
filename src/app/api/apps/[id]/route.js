import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkAuthorization } from '@/lib/rbac';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';
import { validateCustomSsl, normalizePem } from '@/lib/ssl-utils';

function sanitizeAppForClient(app) {
  const { tlsManaged, ...safeApp } = app || {};
  return safeApp;
}

/**
 * GET /api/apps/[id]
 * Get a single application by ID
 */
export async function GET(request, { params }) {
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

    const tenantName = await getTenantName(user);
    if (!tenantName) {
      return NextResponse.json({ error: 'No tenant assigned' }, { status: 400 });
    }

    const { id } = await params;
    const appDoc = await adminDb.collection('applications').doc(id).get();

    if (!appDoc.exists) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const appData = appDoc.data();
    
    // Verify tenant ownership
    if (appData.tenantName !== tenantName) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      id: appDoc.id,
      ...sanitizeAppForClient(appData),
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/apps/[id]
 * Update an application
 */
export async function PATCH(request, { params }) {
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

    // Check authorization - only admins can update apps
    const authCheck = await checkAuthorization(adminDb, user.email, 'update', 'apps');
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

    const { id } = await params;
    const appRef = adminDb.collection('applications').doc(id);
    const appDoc = await appRef.get();

    if (!appDoc.exists) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const appData = appDoc.data();
    
    // Verify tenant ownership
    if (appData.tenantName !== tenantName) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { origins, policyId, responseInspectionEnabled, ssl, routing, activated } = body;

    // Build update object (only include provided fields)
    const updateData = {
      updatedAt: new Date().toISOString(),
      updatedBy: user.uid,
    };

    if (origins !== undefined) {
      // Validate origins
      if (Array.isArray(origins)) {
        for (const origin of origins) {
          if (!origin.url) {
            return NextResponse.json(
              { error: 'Each origin must have a URL' },
              { status: 400 }
            );
          }
          try {
            new URL(origin.url);
          } catch {
            return NextResponse.json(
              { error: `Invalid origin URL: ${origin.url}` },
              { status: 400 }
            );
          }
        }
      }
      updateData.origins = origins;
    }

    if (policyId !== undefined) {
      updateData.policyId = policyId;
    }

    if (responseInspectionEnabled !== undefined) {
      updateData.responseInspectionEnabled = responseInspectionEnabled;
    }

    if (ssl !== undefined) {
      if (ssl && ssl.customCert) {
        const validation = validateCustomSsl(ssl);
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 });
        }
        updateData.ssl = {
          autoProvision: false,
          customCert: true,
          cert: normalizePem(ssl.cert),
          key: normalizePem(ssl.key),
          fullchain: ssl.fullchain ? normalizePem(ssl.fullchain) : null,
        };
      } else {
        updateData.ssl = {
          autoProvision: ssl?.autoProvision !== false,
          customCert: false,
        };
      }
    }

    if (routing !== undefined) {
      updateData.routing = routing;
    }

    if (activated !== undefined) {
      updateData.activated = activated;
    }

    await appRef.update(updateData);

    // Fetch updated document
    const updatedDoc = await appRef.get();

    return NextResponse.json({
      id: updatedDoc.id,
      ...sanitizeAppForClient(updatedDoc.data()),
    });
  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/apps/[id]
 * Delete an application
 */
export async function DELETE(request, { params }) {
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

    // Check authorization - only admins can delete apps
    const authCheck = await checkAuthorization(adminDb, user.email, 'delete', 'apps');
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

    const { id } = await params;
    const appRef = adminDb.collection('applications').doc(id);
    const appDoc = await appRef.get();

    if (!appDoc.exists) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const appData = appDoc.data();
    
    // Verify tenant ownership
    if (appData.tenantName !== tenantName) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await appRef.delete();

    return NextResponse.json({ 
      success: true, 
      message: 'Application deleted successfully',
      id,
    });
  } catch (error) {
    console.error('Error deleting application:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
