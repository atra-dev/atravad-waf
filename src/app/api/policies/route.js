import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { generateModSecurityConfig, validateModSecurityConfig } from '@/lib/modsecurity';
import { checkAuthorization } from '@/lib/rbac';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';
import { getOrSetServerCache, invalidateServerCache } from '@/lib/server-cache';
import { adjustTenantUsage, getTenantLimitStatus, invalidateTenantSubscriptionCache } from '@/lib/tenant-subscription';

const POLICIES_CACHE_TTL_MS = 60000;

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

function normalizeLookupValue(value) {
  return String(value || '').trim().toLowerCase();
}

function getTenantApplicationLookups(appsById) {
  const appsByName = new Map();
  const appsByDomain = new Map();

  for (const app of appsById.values()) {
    const normalizedName = normalizeLookupValue(app?.name);
    const normalizedDomain = normalizeLookupValue(app?.domain);

    if (normalizedName && !appsByName.has(normalizedName)) {
      appsByName.set(normalizedName, app);
    }

    if (normalizedDomain && !appsByDomain.has(normalizedDomain)) {
      appsByDomain.set(normalizedDomain, app);
    }
  }

  return { appsByName, appsByDomain };
}

function resolveTenantApplications(selectedValues, appsById, appsByName, appsByDomain) {
  const resolvedApplications = [];
  const seenIds = new Set();

  for (const selectedValue of selectedValues) {
    const normalizedValue = normalizeLookupValue(selectedValue);
    if (!normalizedValue) continue;

    const matchedApp =
      appsById.get(selectedValue) ||
      appsByName.get(normalizedValue) ||
      appsByDomain.get(normalizedValue) ||
      null;

    if (!matchedApp || seenIds.has(matchedApp.id)) continue;

    seenIds.add(matchedApp.id);
    resolvedApplications.push(matchedApp);
  }

  return resolvedApplications;
}

function getApplicationLabel(app) {
  return app?.domain || app?.name || app?.id || null;
}

function invalidateTenantPolicyCaches(tenantName) {
  invalidateServerCache(`policies:${tenantName}:`);
  invalidateServerCache(`apps:${tenantName}:`);
  invalidateServerCache(`analytics:${tenantName}:`);
  invalidateTenantSubscriptionCache(tenantName);
}

function normalizeList(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))].sort();
}

function normalizeApplications(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))].sort();
}

function diffLists(previousValues = [], nextValues = []) {
  const previous = normalizeList(previousValues);
  const next = normalizeList(nextValues);
  const previousSet = new Set(previous);
  const nextSet = new Set(next);

  return {
    before: previous,
    after: next,
    added: next.filter((item) => !previousSet.has(item)),
    removed: previous.filter((item) => !nextSet.has(item)),
  };
}

function sortObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortObjectKeys(value[key]);
        return acc;
      }, {});
  }

  return value;
}

function stableStringify(value) {
  return JSON.stringify(sortObjectKeys(value));
}

function sanitizePolicyForVersionComparison(policy = {}) {
  const nextPolicy = { ...policy };
  delete nextPolicy.ipAccessControl;
  delete nextPolicy.geoBlocking;
  return nextPolicy;
}

function isOperationalListOnlyUpdate({
  existingPolicyDoc,
  name,
  nextPolicy,
  mode,
  includeOWASPCRS,
  applicationIds,
}) {
  if (!existingPolicyDoc) return false;
  if (String(existingPolicyDoc.name || '').trim() !== String(name || '').trim()) return false;
  if ((existingPolicyDoc.mode || 'prevention') !== (mode || 'prevention')) return false;
  if (Boolean(existingPolicyDoc.includeOWASPCRS) !== Boolean(includeOWASPCRS)) return false;

  const existingApplicationIds = normalizeApplications(
    Array.isArray(existingPolicyDoc.applicationIds)
      ? existingPolicyDoc.applicationIds
      : existingPolicyDoc.applicationId
        ? [existingPolicyDoc.applicationId]
        : []
  );
  const nextApplicationIds = normalizeApplications(applicationIds);
  if (stableStringify(existingApplicationIds) !== stableStringify(nextApplicationIds)) {
    return false;
  }

  const existingPolicy = existingPolicyDoc.policy || {};
  const existingComparable = sanitizePolicyForVersionComparison(existingPolicy);
  const nextComparable = sanitizePolicyForVersionComparison(nextPolicy);

  return stableStringify(existingComparable) === stableStringify(nextComparable);
}

function buildOperationalAuditChanges(previousPolicy = {}, nextPolicy = {}) {
  const previousIp = previousPolicy.ipAccessControl || {};
  const nextIp = nextPolicy.ipAccessControl || {};
  const previousGeo = previousPolicy.geoBlocking || {};
  const nextGeo = nextPolicy.geoBlocking || {};

  const changes = {
    ipAccessControl: {
      enabledBefore: Boolean(previousPolicy.ipAccessControl),
      enabledAfter: Boolean(nextPolicy.ipAccessControl),
      whitelist: diffLists(previousIp.whitelist, nextIp.whitelist),
      blacklist: diffLists(previousIp.blacklist, nextIp.blacklist),
      whitelistCIDR: diffLists(previousIp.whitelistCIDR, nextIp.whitelistCIDR),
      blacklistCIDR: diffLists(previousIp.blacklistCIDR, nextIp.blacklistCIDR),
    },
    geoBlocking: {
      enabledBefore: Boolean(previousPolicy.geoBlocking),
      enabledAfter: Boolean(nextPolicy.geoBlocking),
      blockedCountries: diffLists(previousGeo.blockedCountries, nextGeo.blockedCountries),
      allowedCountries: diffLists(previousGeo.allowedCountries, nextGeo.allowedCountries),
    },
  };

  const hasEntries = [
    ...Object.values(changes.ipAccessControl).filter((value) => value && typeof value === 'object'),
    ...Object.values(changes.geoBlocking).filter((value) => value && typeof value === 'object'),
  ].some((entry) => Array.isArray(entry.added) && (entry.added.length > 0 || entry.removed.length > 0));

  const toggled =
    changes.ipAccessControl.enabledBefore !== changes.ipAccessControl.enabledAfter ||
    changes.geoBlocking.enabledBefore !== changes.geoBlocking.enabledAfter;

  return {
    hasChanges: hasEntries || toggled,
    changes,
  };
}

function getOperationalChangeScopes(changes) {
  const scopes = [];
  const hasIpChanges = [
    changes?.ipAccessControl?.whitelist,
    changes?.ipAccessControl?.blacklist,
    changes?.ipAccessControl?.whitelistCIDR,
    changes?.ipAccessControl?.blacklistCIDR,
  ].some((entry) => (entry?.added?.length || 0) > 0 || (entry?.removed?.length || 0) > 0);

  const hasGeoChanges = [
    changes?.geoBlocking?.blockedCountries,
    changes?.geoBlocking?.allowedCountries,
  ].some((entry) => (entry?.added?.length || 0) > 0 || (entry?.removed?.length || 0) > 0);

  if (hasIpChanges) scopes.push('ip');
  if (hasGeoChanges) scopes.push('geo');
  return scopes;
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
      applicationIds,
      applicationId,
      includeOWASPCRS = true,
      mode = 'prevention',
      policyId,
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

    // Fetch without orderBy to avoid index requirement, then sort in memory
    const existingPoliciesSnapshot = await adminDb
      .collection('policies')
      .where('tenantName', '==', tenantName)
      .where('name', '==', name)
      .get();

    const existingPolicies = existingPoliciesSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => Number(b.version || 0) - Number(a.version || 0));
    const latestExistingPolicy = existingPolicies[0] || null;
    const isEditingExistingPolicy = Boolean(policyId && latestExistingPolicy);

    if (!isEditingExistingPolicy && !existingPoliciesSnapshot.empty) {
      const policyLimit = await getTenantLimitStatus(adminDb, tenantName, 'maxPolicies');
      if (!policyLimit.allowed) {
        return NextResponse.json(
          {
            error: `Plan limit reached: ${policyLimit.current} of ${policyLimit.limit} policies used`,
            code: 'PLAN_LIMIT_MAX_POLICIES',
            limit: policyLimit.limit,
            current: policyLimit.current,
            planId: policyLimit.tenant?.planId || null,
          },
          { status: 403 }
        );
      }
    } else if (!latestExistingPolicy) {
      const policyLimit = await getTenantLimitStatus(adminDb, tenantName, 'maxPolicies');
      if (!policyLimit.allowed) {
        return NextResponse.json(
          {
            error: `Plan limit reached: ${policyLimit.current} of ${policyLimit.limit} policies used`,
            code: 'PLAN_LIMIT_MAX_POLICIES',
            limit: policyLimit.limit,
            current: policyLimit.current,
            planId: policyLimit.tenant?.planId || null,
          },
          { status: 403 }
        );
      }
    }

    let version = 1;
    if (existingPolicies.length > 0) {
      const versions = existingPolicies
        .map((doc) => doc.version || 0)
        .sort((a, b) => b - a);
      version = versions[0] + 1;
    }

    const normalizedApplicationInputs = [
      ...new Set(
        (Array.isArray(applicationIds) ? applicationIds : applicationId ? [applicationId] : [])
          .map((value) => String(value || '').trim())
          .filter(Boolean)
      ),
    ];

    const appsById = normalizedApplicationInputs.length > 0
      ? await getTenantApplicationsById(tenantName)
      : new Map();
    const { appsByName, appsByDomain } = getTenantApplicationLookups(appsById);
    const assignedApplications = resolveTenantApplications(
      normalizedApplicationInputs,
      appsById,
      appsByName,
      appsByDomain
    );

    if (assignedApplications.length !== normalizedApplicationInputs.length) {
      return NextResponse.json({ error: 'One or more selected applications were not found' }, { status: 400 });
    }

    const normalizedApplicationIds = assignedApplications.map((app) => app.id);
    const operationalListOnlyUpdate = isOperationalListOnlyUpdate({
      existingPolicyDoc: latestExistingPolicy,
      name,
      nextPolicy: policy,
      mode,
      includeOWASPCRS,
      applicationIds: normalizedApplicationIds,
    });
    const now = new Date().toISOString();

    let savedPolicyId = '';
    let savedVersion = version;
    let saveMode = 'created';

    if (operationalListOnlyUpdate && latestExistingPolicy) {
      const operationalAudit = buildOperationalAuditChanges(latestExistingPolicy.policy || {}, policy);
      await adminDb.collection('policies').doc(latestExistingPolicy.id).update({
        name,
        policy,
        modSecurityConfig,
        tenantName,
        applicationId: normalizedApplicationIds[0] || null,
        applicationIds: normalizedApplicationIds,
        includeOWASPCRS,
        mode,
        validationWarnings: validation.warnings,
        updatedAt: now,
        updatedBy: user.uid,
        lastOperationalUpdateAt: now,
        lastOperationalUpdateBy: user.uid,
        lastOperationalUpdateType: 'ip_geo_access_lists',
      });
      savedPolicyId = latestExistingPolicy.id;
      savedVersion = latestExistingPolicy.version || 1;
      saveMode = 'updated';

        if (operationalAudit.hasChanges) {
        const changeScopes = getOperationalChangeScopes(operationalAudit.changes);
        await adminDb.collection('policyAuditLogs').add({
          tenantName,
          policyId: latestExistingPolicy.id,
          policyName: name,
          policyVersion: latestExistingPolicy.version || 1,
          eventType: 'operational_list_update',
          changes: operationalAudit.changes,
          changeScopes,
          actorEmail: user.email || null,
          actor: {
            uid: user.uid,
            email: user.email || null,
          },
          createdAt: now,
        });
      }
    } else {
      const policyRef = await adminDb.collection('policies').add({
        name,
        policy,
        modSecurityConfig,
        version,
        tenantName,
        applicationId: normalizedApplicationIds[0] || null,
        applicationIds: normalizedApplicationIds,
        includeOWASPCRS,
        mode,
        validationWarnings: validation.warnings,
        createdAt: now,
        createdBy: user.uid,
      });
      savedPolicyId = policyRef.id;
      saveMode = existingPolicies.length > 0 ? 'versioned' : 'created';
    }

    if (assignedApplications.length > 0) {
      const updateBatch = adminDb.batch();
      for (const assignedApplication of assignedApplications) {
        updateBatch.update(adminDb.collection('applications').doc(assignedApplication.id), {
          policyId: savedPolicyId,
          updatedAt: now,
          updatedBy: user.uid,
        });
      }
      await updateBatch.commit();
    }

    if (!latestExistingPolicy) {
      await adjustTenantUsage(adminDb, tenantName, { currentPolicies: 1 });
    }
    invalidateTenantPolicyCaches(tenantName);

    return NextResponse.json({
      id: savedPolicyId,
      name,
      version: savedVersion,
      policy,
      modSecurityConfig,
      validationWarnings: validation.warnings,
      applicationId: normalizedApplicationIds[0] || null,
      applicationIds: normalizedApplicationIds,
      applicationName: assignedApplications[0] ? getApplicationLabel(assignedApplications[0]) : null,
      applicationNames: assignedApplications.map((app) => getApplicationLabel(app)).filter(Boolean),
      saveMode,
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

    const policies = await getOrSetServerCache(
      `policies:${tenantName}:${name || 'all'}`,
      async () => {
        let query = adminDb
          .collection('policies')
          .where('tenantName', '==', tenantName);

        if (name) {
          query = query.where('name', '==', name);
        }

        const [policiesSnapshot, appsById] = await Promise.all([
          query.get(),
          getTenantApplicationsById(tenantName),
        ]);
        const appsByPolicyId = new Map();

        for (const app of appsById.values()) {
          if (!app?.policyId) continue;
          const existingApps = appsByPolicyId.get(app.policyId) || [];
          existingApps.push(app);
          appsByPolicyId.set(app.policyId, existingApps);
        }

        return policiesSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            const explicitApps = [
              ...(Array.isArray(data.applicationIds)
                ? data.applicationIds.map((id) => appsById.get(id)).filter(Boolean)
                : []),
              ...(data.applicationId ? [appsById.get(data.applicationId)].filter(Boolean) : []),
            ];
            const reverseMatchedApps = appsByPolicyId.get(doc.id) || [];
            const assignedApps = [
              ...explicitApps,
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
              applicationId: applicationIds[0] || null,
              applicationIds,
              applicationName: applicationNames[0] || null,
              applicationNames,
            };
          })
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
      },
      { ttlMs: POLICIES_CACHE_TTL_MS }
    );

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
    await adjustTenantUsage(adminDb, tenantName, { currentPolicies: -1 });
    invalidateTenantPolicyCaches(tenantName);

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
