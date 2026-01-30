/**
 * SSL certificate validation helpers for custom certificate uploads.
 */

const PEM_CERT_REGEX = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/;
const PEM_KEY_REGEX = /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC )?PRIVATE KEY-----/;

/**
 * Check if a string looks like a PEM certificate.
 * @param {string} pem
 * @returns {boolean}
 */
export function isValidPemCertificate(pem) {
  if (!pem || typeof pem !== 'string') return false;
  const trimmed = pem.trim().replace(/\\n/g, '\n');
  return PEM_CERT_REGEX.test(trimmed);
}

/**
 * Check if a string looks like a PEM private key.
 * @param {string} pem
 * @returns {boolean}
 */
export function isValidPemPrivateKey(pem) {
  if (!pem || typeof pem !== 'string') return false;
  const trimmed = pem.trim().replace(/\\n/g, '\n');
  return PEM_KEY_REGEX.test(trimmed);
}

/**
 * Normalize PEM string (trim, fix line endings).
 * @param {string} pem
 * @returns {string}
 */
export function normalizePem(pem) {
  if (!pem || typeof pem !== 'string') return '';
  return pem.trim().replace(/\\n/g, '\n');
}

/**
 * Validate SSL object for custom certificate.
 * @param {Object} ssl - { customCert, cert, key, fullchain }
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCustomSsl(ssl) {
  if (!ssl || !ssl.customCert) {
    return { valid: true };
  }
  if (!ssl.cert || !ssl.key) {
    return { valid: false, error: 'Certificate and private key are required when using a custom certificate.' };
  }
  if (!isValidPemCertificate(ssl.cert)) {
    return { valid: false, error: 'Invalid certificate format. Paste a PEM certificate (-----BEGIN CERTIFICATE----- ... -----END CERTIFICATE-----).' };
  }
  if (!isValidPemPrivateKey(ssl.key)) {
    return { valid: false, error: 'Invalid private key format. Paste a PEM private key (-----BEGIN PRIVATE KEY----- or -----BEGIN RSA PRIVATE KEY----- ...).' };
  }
  if (ssl.fullchain && !isValidPemCertificate(ssl.fullchain)) {
    return { valid: false, error: 'Invalid CA chain format. Use PEM format or leave empty.' };
  }
  return { valid: true };
}
