import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkAuthorization } from '@/lib/rbac';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';
import { getRegionByContinent, getDefaultRegion } from '@/lib/waf-config';
import { geolocateOrigin } from '@/lib/geolocation';
import { validateCustomSsl, normalizePem } from '@/lib/ssl-utils';

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
    const { name, domain, origins, ssl, routing, policyId, responseInspectionEnabled } = body;

    if (!name || !domain) {
      return NextResponse.json(
        { error: 'Name and domain are required' },
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

    // Validate and normalize SSL (custom certificate)
    let sslConfig = null;
    if (ssl && ssl.customCert) {
      const validation = validateCustomSsl(ssl);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      sslConfig = {
        autoProvision: false,
        customCert: true,
        cert: normalizePem(ssl.cert),
        key: normalizePem(ssl.key),
        fullchain: ssl.fullchain ? normalizePem(ssl.fullchain) : null,
      };
    } else if (ssl) {
      sslConfig = { autoProvision: ssl.autoProvision !== false, customCert: false };
    }

    // Auto-assign WAF region based on origin server geolocation
    let wafRegion = getDefaultRegion();
    let originGeoData = null;

    // Try to geolocate the first origin to determine best WAF region
    if (origins && origins.length > 0 && origins[0].url) {
      try {
        originGeoData = await geolocateOrigin(origins[0].url);
        if (originGeoData.success && originGeoData.continentCode) {
          wafRegion = getRegionByContinent(originGeoData.continentCode);
        }
      } catch (geoError) {
        console.warn('Geolocation failed, using default region:', geoError.message);
      }
    }

    const appRef = await adminDb.collection('applications').add({
      name,
      domain,
      origins: origins || [],
      ssl: sslConfig || ssl || null,
      routing: routing || { pathPrefix: '/', stripPath: false },
      policyId: policyId || null,
      responseInspectionEnabled: responseInspectionEnabled !== false,
      tenantName,
      // Automatically assigned WAF configuration based on geolocation
      wafRegion: wafRegion.id,
      wafRegionName: wafRegion.name,
      firewallIp: wafRegion.ip,
      firewallCname: wafRegion.cname || '',
      // Origin geolocation data (for reference)
      originCountry: originGeoData?.country || null,
      originContinent: originGeoData?.continent || null,
      activated: false, // DNS not yet configured
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
    });

    return NextResponse.json({
      id: appRef.id,
      name,
      domain,
      origins: origins || [],
      ssl: sslConfig || ssl || null,
      routing: routing || { pathPrefix: '/', stripPath: false },
      policyId: policyId || null,
      responseInspectionEnabled: responseInspectionEnabled !== false,
      wafRegion: wafRegion.id,
      wafRegionName: wafRegion.name,
      firewallIp: wafRegion.ip,
      firewallCname: wafRegion.cname || '',
      originCountry: originGeoData?.country || null,
      originContinent: originGeoData?.continent || null,
      activated: false,
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
