import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkAuthorization } from '@/lib/rbac';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';
import { normalizeOriginConfig } from '@/lib/origin-utils';
import { validateCustomSsl, normalizePem } from '@/lib/ssl-utils';
import { hydrateAppActivation } from '@/lib/activation-utils';
import { invalidateServerCache } from '@/lib/server-cache';

function sanitizeAppForClient(app) {
  const { tlsManaged, ssl, origins, ...safeApp } = app || {};
  const sanitizedSsl = ssl
    ? {
        ...ssl,
        cert: ssl.customCert ? '' : ssl.cert,
        key: ssl.customCert ? '' : ssl.key,
        fullchain: ssl.customCert ? '' : ssl.fullchain,
        hasStoredCustomCert: Boolean(ssl.customCert && ssl.cert && ssl.key),
      }
    : ssl;
  const sanitizedOrigins = Array.isArray(origins)
    ? origins.map((origin) => ({
        ...origin,
        authHeader: origin?.authHeader?.name
          ? { name: origin.authHeader.name, value: '' }
          : undefined,
        authHeaderConfigured: Boolean(origin?.authHeader?.name && origin?.authHeader?.value),
      }))
    : origins;
  return {
    ...safeApp,
    ssl: sanitizedSsl,
    origins: sanitizedOrigins,
  };
}

function invalidateTenantAppCaches(tenantName, appId) {
  invalidateServerCache(`apps:${tenantName}:`);
  invalidateServerCache(`policies:${tenantName}:`);
  invalidateServerCache(`analytics:${tenantName}:`);
  if (appId) {
    invalidateServerCache(`app:${tenantName}:${appId}`);
  }
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

    const app = await hydrateAppActivation({
      id: appDoc.id,
      ...sanitizeAppForClient(appData),
    });

    return NextResponse.json(app);
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
        const normalizedOrigins = [];
        for (const [index, origin] of origins.entries()) {
          const normalizedOrigin = normalizeOriginConfig(origin);
          if (!normalizedOrigin.valid) {
            return NextResponse.json(
              { error: normalizedOrigin.error },
              { status: 400 }
            );
          }
          const existingOrigin = Array.isArray(appData.origins) ? appData.origins[index] : null;
          const mergedOrigin = { ...normalizedOrigin.origin };

          if (!mergedOrigin.authHeader && existingOrigin?.authHeader?.name && existingOrigin?.authHeader?.value) {
            mergedOrigin.authHeader = existingOrigin.authHeader;
          }

          normalizedOrigins.push(mergedOrigin);
        }
        updateData.origins = normalizedOrigins;
      } else {
        return NextResponse.json(
          { error: 'Origins must be an array' },
          { status: 400 }
        );
      }
    }

    if (policyId !== undefined) {
      updateData.policyId = policyId;
    }

    if (responseInspectionEnabled !== undefined) {
      updateData.responseInspectionEnabled = responseInspectionEnabled;
    }

    if (ssl !== undefined) {
      if (ssl && ssl.customCert) {
        const hasNewCustomMaterial = Boolean(ssl.cert?.trim() || ssl.key?.trim() || ssl.fullchain?.trim());
        if (hasNewCustomMaterial) {
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
        } else if (appData.ssl?.customCert && appData.ssl?.cert && appData.ssl?.key) {
          updateData.ssl = {
            autoProvision: false,
            customCert: true,
            cert: appData.ssl.cert,
            key: appData.ssl.key,
            fullchain: appData.ssl.fullchain || null,
          };
        } else {
          return NextResponse.json(
            { error: 'Custom SSL is enabled but no stored certificate exists. Upload a certificate and private key.' },
            { status: 400 }
          );
        }
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

    const updatedApp = await hydrateAppActivation({
      id: updatedDoc.id,
      ...sanitizeAppForClient(updatedDoc.data()),
    });

    invalidateTenantAppCaches(tenantName, id);

    return NextResponse.json(updatedApp);
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
    invalidateTenantAppCaches(tenantName, id);

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
