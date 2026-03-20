import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { generateModSecurityConfig, validateModSecurityConfig } from '@/lib/modsecurity';
import { checkAuthorization } from '@/lib/rbac';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';

async function getTenantApplicationsById(tenantName) {
  const snapshot = await adminDb
    .collection('applications')
    .where('tenantName', '==', tenantName)
    .get();

  const appsById = new Map();
  for (const doc of snapshot.docs) {
    appsById.set(doc.id, { id: doc.id, ...doc.data() });
  }
  return appsById;
}

function getApplicationLabel(app) {
  return app?.domain || app?.name || app?.id || null;
}

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

    // Check authorization - only admins can create policies
    const authCheck = await checkAuthorization(adminDb, user.email, 'create', 'policies');
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
    
    // Enforce no manual rule editing - reject if modSecurityConfig is provided
    if (body.modSecurityConfig) {
      return NextResponse.json(
        { error: 'Manual rule editing is not allowed. Use the policy editor to configure protections.' },
        { status: 400 }
      );
    }
    const { 
      name, 
      sqlInjection, 
      xss, 
      fileUpload, 
      pathTraversal,
      rce,
      csrf,
      sessionFixation,
      ssrf,
      xxe,
      authBypass,
      idor,
      securityMisconfig,
      sensitiveDataExposure,
      brokenAccessControl,
      securityHeaders,
      rateLimiting,
      ipAccessControl,
      geoBlocking,
      advancedRateLimiting,
      botDetection,
      advancedFileUpload,
      apiProtection,
      exceptions,
      exceptionHandling,
      virtualPatching,
      customRules,
      applicationId,
      includeOWASPCRS = true,
      mode = 'prevention'
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const normalizedExceptions = Array.isArray(exceptions)
      ? exceptions
      : (exceptionHandling?.enabled && Array.isArray(exceptionHandling.excludedPaths))
        ? exceptionHandling.excludedPaths
            .map((path) => String(path || '').trim())
            .filter(Boolean)
            .map((path) => ({
              path,
              ruleIds: Array.isArray(exceptionHandling.excludedRules)
                ? exceptionHandling.excludedRules
                    .map((ruleId) => String(ruleId || '').trim())
                    .filter(Boolean)
                : [],
              reason: 'UI exception rule',
            }))
        : [];

    const normalizedVirtualPatching = Array.isArray(virtualPatching)
      ? virtualPatching
      : [];

    const policy = {
      sqlInjection: sqlInjection || false,
      xss: xss || false,
      fileUpload: fileUpload || false,
      pathTraversal: pathTraversal || false,
      rce: rce || false,
      csrf: csrf || false,
      sessionFixation: sessionFixation || false,
      ssrf: ssrf || false,
      xxe: xxe || false,
      authBypass: authBypass || false,
      idor: idor || false,
      securityMisconfig: securityMisconfig || false,
      sensitiveDataExposure: sensitiveDataExposure || false,
      brokenAccessControl: brokenAccessControl || false,
      securityHeaders: securityHeaders || false,
      rateLimiting: rateLimiting || false,
      ipAccessControl: ipAccessControl || null,
      geoBlocking: geoBlocking || null,
      advancedRateLimiting: advancedRateLimiting || null,
      botDetection: botDetection || null,
      advancedFileUpload: advancedFileUpload || null,
      apiProtection: apiProtection || null,
      exceptions: normalizedExceptions,
      virtualPatching: normalizedVirtualPatching,
      customRules: customRules || [],
    };

    // Generate comprehensive ModSecurity configuration using the engine
    const modSecurityConfig = generateModSecurityConfig(policy, {
      includeOWASPCRS,
      ruleIdBase: 100000,
      mode,
    });

    // Validate the generated configuration
    const validation = validateModSecurityConfig(modSecurityConfig);
    if (!validation.valid) {
      console.warn('ModSecurity config validation warnings:', validation.warnings);
      if (validation.errors.length > 0) {
        return NextResponse.json(
          { 
            error: 'Invalid ModSecurity configuration generated', 
            details: validation.errors 
          },
          { status: 400 }
        );
      }
    }

    // Get current version number
    // Fetch without orderBy to avoid index requirement, then sort in memory
    const existingPoliciesSnapshot = await adminDb
      .collection('policies')
      .where('tenantName', '==', tenantName)
      .where('name', '==', name)
      .get();

    let version = 1;
    if (!existingPoliciesSnapshot.empty) {
      const versions = existingPoliciesSnapshot.docs
        .map(doc => doc.data().version || 0)
        .sort((a, b) => b - a);
      version = versions[0] + 1;
    }

    let assignedApplication = null;
    if (applicationId) {
      const appDoc = await adminDb.collection('applications').doc(applicationId).get();
      if (!appDoc.exists) {
        return NextResponse.json({ error: 'Selected application not found' }, { status: 400 });
      }

      const appData = appDoc.data();
      if (appData.tenantName !== tenantName) {
        return NextResponse.json({ error: 'Selected application is outside your tenant' }, { status: 403 });
      }

      assignedApplication = { id: appDoc.id, ...appData };
    }

    const policyRef = await adminDb.collection('policies').add({
      name,
      policy,
      modSecurityConfig,
      version,
      tenantName,
      applicationId: applicationId || null,
      includeOWASPCRS,
      mode,
      validationWarnings: validation.warnings,
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
    });

    if (assignedApplication) {
      await adminDb.collection('applications').doc(assignedApplication.id).update({
        policyId: policyRef.id,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid,
      });
    }

    return NextResponse.json({
      id: policyRef.id,
      name,
      version,
      policy,
      modSecurityConfig,
      validationWarnings: validation.warnings,
      applicationId: assignedApplication?.id || null,
      applicationName: assignedApplication?.domain || assignedApplication?.name || null,
    });
  } catch (error) {
    console.error('Error creating policy:', error);
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

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    let query = adminDb
      .collection('policies')
      .where('tenantName', '==', tenantName);

    if (name) {
      query = query.where('name', '==', name);
    }

    // Fetch without orderBy to avoid index requirement, then sort in memory
    const policiesSnapshot = await query.get();

    const appsById = await getTenantApplicationsById(tenantName);
    const appsByPolicyId = new Map();

    for (const app of appsById.values()) {
      if (!app?.policyId) continue;
      const existingApps = appsByPolicyId.get(app.policyId) || [];
      existingApps.push(app);
      appsByPolicyId.set(app.policyId, existingApps);
    }

    const policies = policiesSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        const explicitApp = data.applicationId ? appsById.get(data.applicationId) : null;
        const reverseMatchedApps = appsByPolicyId.get(doc.id) || [];
        const assignedApps = [
          ...(explicitApp ? [explicitApp] : []),
          ...reverseMatchedApps,
        ].filter(Boolean);
        const uniqueAssignedApps = Array.from(
          new Map(assignedApps.map((app) => [app.id, app])).values()
        );
        const applicationNames = uniqueAssignedApps
          .map((app) => getApplicationLabel(app))
          .filter(Boolean);
        const applicationIds = uniqueAssignedApps
          .map((app) => app.id)
          .filter(Boolean);

        return {
          id: doc.id,
          ...data,
          applicationId: data.applicationId || applicationIds[0] || null,
          applicationIds,
          applicationName: applicationNames[0] || null,
          applicationNames,
        };
      })
      .sort((a, b) => {
        // Sort by createdAt descending (newest first)
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

    return NextResponse.json(policies);
  } catch (error) {
    console.error('Error fetching policies:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
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

    const authCheck = await checkAuthorization(adminDb, user.email, 'delete', 'policies');
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

    const { searchParams } = new URL(request.url);
    const name = String(searchParams.get('name') || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Policy name is required' }, { status: 400 });
    }

    const policiesSnapshot = await adminDb
      .collection('policies')
      .where('tenantName', '==', tenantName)
      .where('name', '==', name)
      .get();

    if (policiesSnapshot.empty) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    const policyIds = policiesSnapshot.docs.map((doc) => doc.id);

    // Guard: prevent deleting policies currently assigned to applications.
    const appsSnapshot = await adminDb
      .collection('applications')
      .where('tenantName', '==', tenantName)
      .get();

    const assignedApps = appsSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((app) => app.policyId && policyIds.includes(app.policyId));

    if (assignedApps.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete policy because it is assigned to application(s)',
          details: assignedApps.map((app) => app.domain || app.name || app.id),
        },
        { status: 409 }
      );
    }

    const batch = adminDb.batch();
    policiesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return NextResponse.json({
      success: true,
      deletedPolicyName: name,
      deletedVersions: policiesSnapshot.size,
    });
  } catch (error) {
    console.error('Error deleting policy:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
