export function splitBulkEntries(input) {
  return String(input || '')
    .split(/[\r\n,;\t ]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function validateIPv4orIPv6(value) {
  if (!value) return false;
  const ipv4 =
    /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  const ipv6 = /^[0-9a-f:]+$/i;
  return ipv4.test(value) || (value.includes(':') && ipv6.test(value));
}

export function validateCIDR(value) {
  const [ip, prefix] = String(value || '').split('/');
  if (!ip || prefix === undefined) return false;
  const prefixNum = Number(prefix);
  if (!Number.isInteger(prefixNum)) return false;
  if (ip.includes(':')) return validateIPv4orIPv6(ip) && prefixNum >= 0 && prefixNum <= 128;
  return validateIPv4orIPv6(ip) && prefixNum >= 0 && prefixNum <= 32;
}

export function validateCountryCode(value) {
  return /^[A-Z]{2}$/.test(String(value || ''));
}

export function validateRuleId(value) {
  return /^\d{3,10}$/.test(String(value || ''));
}

export function formatTimestamp(value) {
  if (!value) return 'Unknown';

  const date =
    typeof value === 'string' || typeof value === 'number'
      ? new Date(value)
      : typeof value?.toDate === 'function'
        ? value.toDate()
        : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getDefaultPolicyFormData() {
  return {
    name: '',
    mode: 'prevention',
    includeOWASPCRS: true,
    sqlInjection: false,
    xss: false,
    fileUpload: false,
    pathTraversal: false,
    rce: false,
    csrf: false,
    sessionFixation: false,
    ssrf: false,
    xxe: false,
    authBypass: false,
    idor: false,
    securityMisconfig: false,
    sensitiveDataExposure: false,
    brokenAccessControl: false,
    securityHeaders: false,
    owaspCRSRules: {
      REQUEST_901_INITIALIZATION: true,
      REQUEST_905_COMMON_EXCEPTIONS: true,
      REQUEST_910_IP_REPUTATION: true,
      REQUEST_911_METHOD_ENFORCEMENT: true,
      REQUEST_912_DOS_PROTECTION: true,
      REQUEST_913_SCANNER_DETECTION: true,
      REQUEST_920_PROTOCOL_ENFORCEMENT: true,
      REQUEST_921_PROTOCOL_ATTACK: true,
      REQUEST_930_APPLICATION_ATTACK_LFI: true,
      REQUEST_931_APPLICATION_ATTACK_RFI: true,
      REQUEST_932_APPLICATION_ATTACK_RCE: true,
      REQUEST_933_APPLICATION_ATTACK_PHP: true,
      REQUEST_934_APPLICATION_ATTACK_NODEJS: true,
      REQUEST_941_APPLICATION_ATTACK_XSS: true,
      REQUEST_942_APPLICATION_ATTACK_SQLI: true,
      REQUEST_943_APPLICATION_ATTACK_SESSION_FIXATION: true,
      REQUEST_944_APPLICATION_ATTACK_JAVA: true,
      REQUEST_949_BLOCKING_EVALUATION: true,
      RESPONSE_950_DATA_LEAKAGES: true,
      RESPONSE_951_DATA_LEAKAGES_SQL: true,
      RESPONSE_952_DATA_LEAKAGES_JAVA: true,
      RESPONSE_953_DATA_LEAKAGES_PHP: true,
      RESPONSE_954_DATA_LEAKAGES_IIS: true,
      RESPONSE_959_BLOCKING_EVALUATION: true,
      RESPONSE_980_CORRELATION: true,
    },
    rateLimiting: {
      enabled: false,
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      burstSize: 10,
    },
    ipAccessControl: {
      enabled: false,
      whitelist: [],
      blacklist: [],
      whitelistCIDR: [],
      blacklistCIDR: [],
    },
    geoBlocking: {
      enabled: false,
      blockedCountries: [],
      allowedCountries: [],
    },
    advancedRateLimiting: {
      enabled: false,
      perEndpoint: {},
      adaptive: false,
    },
    botDetection: {
      enabled: false,
      userAgentFiltering: true,
      botSignatureDetection: true,
      crawlerBlocking: false,
    },
    advancedFileUpload: {
      enabled: false,
      mimeTypeValidation: true,
      maxFileSize: 10485760,
      allowedExtensions: [],
      blockedExtensions: [],
    },
    apiProtection: {
      enabled: false,
      apiKeyValidation: false,
      oauthValidation: false,
      jwtValidation: false,
    },
    exceptionHandling: {
      enabled: false,
      excludedPaths: [],
      excludedRules: [],
    },
    virtualPatching: {
      enabled: false,
      cveRules: [],
    },
    applicationId: '',
  };
}
