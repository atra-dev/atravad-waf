import { getOrSetServerCache, invalidateServerCache } from './server-cache.js';

export const TRAFFIC_LOGGING_MODES = {
  ROLLUPS_ONLY: 'rollups_only',
  SAMPLED: 'sampled',
};

const TRAFFIC_LOGGING_CACHE_KEY = 'logging:traffic:config';
const TRAFFIC_LOGGING_CACHE_TTL_MS = 30000;

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return fallback;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeTrafficLoggingMode(mode) {
  const normalized = String(mode || '').trim().toLowerCase();
  return normalized === TRAFFIC_LOGGING_MODES.SAMPLED
    ? TRAFFIC_LOGGING_MODES.SAMPLED
    : TRAFFIC_LOGGING_MODES.ROLLUPS_ONLY;
}

export function getDefaultTrafficLoggingConfig() {
  return {
    mode: normalizeTrafficLoggingMode(process.env.WAF_NORMAL_TRAFFIC_MODE),
    allowedSampleRate: parsePositiveInt(process.env.WAF_ALLOWED_LOG_SAMPLE_RATE, 200),
    storeAllowedRawLogs: parseBoolean(process.env.WAF_STORE_ALLOWED_RAW_LOGS, false),
    allowedRawLogSampleRate: parsePositiveInt(
      process.env.WAF_ALLOWED_RAW_LOG_SAMPLE_RATE,
      100
    ),
    investigation: {
      enabledUntil: null,
      mode: TRAFFIC_LOGGING_MODES.SAMPLED,
      allowedSampleRate: 20,
      storeAllowedRawLogs: false,
      allowedRawLogSampleRate: 20,
    },
  };
}

function coerceInvestigationConfig(value = {}, defaults) {
  return {
    enabledUntil: value.enabledUntil || null,
    mode: normalizeTrafficLoggingMode(value.mode || defaults.mode),
    allowedSampleRate: parsePositiveInt(value.allowedSampleRate, defaults.allowedSampleRate),
    storeAllowedRawLogs: parseBoolean(
      value.storeAllowedRawLogs,
      defaults.storeAllowedRawLogs
    ),
    allowedRawLogSampleRate: parsePositiveInt(
      value.allowedRawLogSampleRate,
      defaults.allowedRawLogSampleRate
    ),
  };
}

function mergeConfig(defaults, stored = {}) {
  return {
    mode: normalizeTrafficLoggingMode(stored.mode || defaults.mode),
    allowedSampleRate: parsePositiveInt(stored.allowedSampleRate, defaults.allowedSampleRate),
    storeAllowedRawLogs: parseBoolean(
      stored.storeAllowedRawLogs,
      defaults.storeAllowedRawLogs
    ),
    allowedRawLogSampleRate: parsePositiveInt(
      stored.allowedRawLogSampleRate,
      defaults.allowedRawLogSampleRate
    ),
    investigation: coerceInvestigationConfig(
      stored.investigation,
      defaults.investigation
    ),
  };
}

function buildEffectiveConfig(config) {
  const now = Date.now();
  const investigationUntil = config.investigation?.enabledUntil
    ? new Date(config.investigation.enabledUntil).getTime()
    : 0;
  const investigationActive = Number.isFinite(investigationUntil) && investigationUntil > now;

  if (!investigationActive) {
    return {
      ...config,
      effectiveMode: config.mode,
      effectiveAllowedSampleRate: config.allowedSampleRate,
      effectiveStoreAllowedRawLogs: config.storeAllowedRawLogs,
      effectiveAllowedRawLogSampleRate: config.allowedRawLogSampleRate,
      investigationActive: false,
    };
  }

  return {
    ...config,
    effectiveMode: config.investigation.mode,
    effectiveAllowedSampleRate: config.investigation.allowedSampleRate,
    effectiveStoreAllowedRawLogs: config.investigation.storeAllowedRawLogs,
    effectiveAllowedRawLogSampleRate: config.investigation.allowedRawLogSampleRate,
    investigationActive: true,
  };
}

export async function getTrafficLoggingConfig(adminDb) {
  const defaults = getDefaultTrafficLoggingConfig();
  if (!adminDb) {
    return buildEffectiveConfig(defaults);
  }

  return getOrSetServerCache(
    TRAFFIC_LOGGING_CACHE_KEY,
    async () => {
      const settingsDoc = await adminDb.collection('settings').doc('traffic_logging').get();
      const stored = settingsDoc.exists ? settingsDoc.data() || {} : {};
      return buildEffectiveConfig(mergeConfig(defaults, stored));
    },
    { ttlMs: TRAFFIC_LOGGING_CACHE_TTL_MS }
  );
}

export function invalidateTrafficLoggingCache() {
  invalidateServerCache(TRAFFIC_LOGGING_CACHE_KEY);
}

export function shouldCaptureAllowedTraffic(config) {
  const mode = normalizeTrafficLoggingMode(config?.effectiveMode || config?.mode);
  if (mode === TRAFFIC_LOGGING_MODES.ROLLUPS_ONLY) {
    return true;
  }

  const sampleRate = parsePositiveInt(
    config?.effectiveAllowedSampleRate ?? config?.allowedSampleRate,
    200
  );
  if (sampleRate <= 1) {
    return true;
  }
  return Math.random() < 1 / sampleRate;
}

export function shouldStoreAllowedRawLogs(config) {
  return parseBoolean(
    config?.effectiveStoreAllowedRawLogs ?? config?.storeAllowedRawLogs,
    false
  );
}

export function getAllowedRawLogSampleRate(config) {
  return parsePositiveInt(
    config?.effectiveAllowedRawLogSampleRate ?? config?.allowedRawLogSampleRate,
    100
  );
}
