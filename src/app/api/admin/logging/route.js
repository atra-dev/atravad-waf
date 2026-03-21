import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getCurrentUser } from '@/lib/api-helpers';
import { getUserRole, isSuperAdmin } from '@/lib/rbac';
import {
  getDefaultTrafficLoggingConfig,
  getTrafficLoggingConfig,
  invalidateTrafficLoggingCache,
  normalizeTrafficLoggingMode,
  TRAFFIC_LOGGING_MODES,
} from '@/lib/traffic-logging';

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return fallback;
}

async function requireSuperAdmin(request) {
  if (!adminDb) {
    return {
      error: NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      ),
    };
  }

  const user = await getCurrentUser(request);
  if (!user || !user.email) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const userRole = await getUserRole(adminDb, user.email);
  if (!isSuperAdmin(userRole)) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      ),
    };
  }

  return { user };
}

export async function GET(request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.error) return auth.error;

    const config = await getTrafficLoggingConfig(adminDb);
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching traffic logging config:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const defaults = getDefaultTrafficLoggingConfig();

    const mode = normalizeTrafficLoggingMode(body.mode || defaults.mode);
    const allowedSampleRate = parsePositiveInt(
      body.allowedSampleRate,
      defaults.allowedSampleRate
    );
    const storeAllowedRawLogs = parseBoolean(
      body.storeAllowedRawLogs,
      defaults.storeAllowedRawLogs
    );
    const allowedRawLogSampleRate = parsePositiveInt(
      body.allowedRawLogSampleRate,
      defaults.allowedRawLogSampleRate
    );

    const investigationHours = Math.max(
      Number.parseInt(String(body.investigationHours ?? 0), 10) || 0,
      0
    );
    const investigationEnabledUntil =
      investigationHours > 0
        ? new Date(Date.now() + investigationHours * 60 * 60 * 1000).toISOString()
        : null;

    const investigationMode = normalizeTrafficLoggingMode(
      body.investigationMode || TRAFFIC_LOGGING_MODES.SAMPLED
    );
    const investigationAllowedSampleRate = parsePositiveInt(
      body.investigationAllowedSampleRate,
      20
    );
    const investigationStoreAllowedRawLogs = parseBoolean(
      body.investigationStoreAllowedRawLogs,
      false
    );
    const investigationAllowedRawLogSampleRate = parsePositiveInt(
      body.investigationAllowedRawLogSampleRate,
      investigationAllowedSampleRate
    );

    await adminDb.collection('settings').doc('traffic_logging').set(
      {
        mode,
        allowedSampleRate,
        storeAllowedRawLogs,
        allowedRawLogSampleRate,
        investigation: {
          enabledUntil: investigationEnabledUntil,
          mode: investigationMode,
          allowedSampleRate: investigationAllowedSampleRate,
          storeAllowedRawLogs: investigationStoreAllowedRawLogs,
          allowedRawLogSampleRate: investigationAllowedRawLogSampleRate,
        },
        updatedAt: new Date().toISOString(),
        updatedBy: auth.user.email,
      },
      { merge: true }
    );

    invalidateTrafficLoggingCache();

    const config = await getTrafficLoggingConfig(adminDb);
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error updating traffic logging config:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
