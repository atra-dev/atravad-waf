/**
 * Let's Encrypt / ACME auto-provisioning for ATRAVAD WAF.
 * Uses HTTP-01 challenge; proxy must serve /.well-known/acme-challenge/:token.
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const requireMod = createRequire(import.meta.url);
let acme = null;
try {
  acme = requireMod('acme-client');
} catch {
  acme = null;
}

const DEFAULT_CERTS_DIR = process.env.CERTS_DIR || path.join(process.cwd(), 'certs');
const ACCOUNT_KEY_PATH = path.join(DEFAULT_CERTS_DIR, 'account-key.pem');
const STAGING = process.env.LETSENCRYPT_STAGING === 'true' || process.env.LETSENCRYPT_STAGING === '1';
const DEFAULT_EMAIL = process.env.LETSENCRYPT_EMAIL || 'admin@atravad.local';

/**
 * Pending HTTP-01 challenges: token -> keyAuthorization (for proxy to serve).
 */
const pendingChallenges = new Map();

/**
 * Get the keyAuthorization for an ACME HTTP-01 challenge token.
 * Proxy should serve GET /.well-known/acme-challenge/:token with this body (text/plain).
 * @param {string} token
 * @returns {string|null}
 */
export function getAcmeChallengeResponse(token) {
  if (!token || typeof token !== 'string') return null;
  return pendingChallenges.get(token.trim()) ?? null;
}

/**
 * @param {string} token
 * @param {string} keyAuthorization
 */
export function setAcmeChallenge(token, keyAuthorization) {
  pendingChallenges.set(String(token).trim(), keyAuthorization);
}

/**
 * @param {string} token
 */
export function clearAcmeChallenge(token) {
  pendingChallenges.delete(String(token).trim());
}

/**
 * Ensure account key exists; create and persist if not.
 * @returns {Promise<string>} PEM private key
 */
async function getOrCreateAccountKey() {
  const fromEnv = process.env.LETSENCRYPT_ACCOUNT_KEY;
  if (fromEnv && fromEnv.trim()) {
    return fromEnv.trim().replace(/\\n/g, '\n');
  }
  if (fs.existsSync(ACCOUNT_KEY_PATH)) {
    return fs.readFileSync(ACCOUNT_KEY_PATH, 'utf8');
  }
  if (!acme || !acme.crypto) {
    throw new Error('acme-client not installed; run npm install acme-client');
  }
  const accountKey = await acme.crypto.createPrivateKey();
  const dir = path.dirname(ACCOUNT_KEY_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ACCOUNT_KEY_PATH, accountKey, { mode: 0o600 });
  return accountKey;
}

/**
 * Provision a certificate for a domain via Let's Encrypt (HTTP-01).
 * Requires the proxy to be reachable at http://domain/.well-known/acme-challenge/:token.
 * @param {string} domain - Domain name (e.g. example.com)
 * @param {Object} options
 * @param {import('./cert-store.js').CertStore} options.certStore - Certificate store to write result
 * @param {string} [options.email] - Contact email for ACME account
 * @param {boolean} [options.staging] - Use Let's Encrypt staging (default: LETSENCRYPT_STAGING env)
 * @returns {Promise<{ success: boolean, key?: string, cert?: string, fullchain?: string, error?: string }>}
 */
export async function provisionCertificate(domain, options = {}) {
  if (!acme) {
    return { success: false, error: 'acme-client not installed' };
  }

  const certStore = options.certStore;
  const email = options.email || DEFAULT_EMAIL;
  const useStaging = options.staging ?? STAGING;
  const directoryUrl = useStaging ? acme.directory.letsencrypt.staging : acme.directory.letsencrypt.production;

  if (!domain || typeof domain !== 'string') {
    return { success: false, error: 'domain is required' };
  }
  const normalizedDomain = domain.toLowerCase().trim().replace(/^\.+/, '');
  if (!normalizedDomain) {
    return { success: false, error: 'invalid domain' };
  }

  try {
    const accountKey = await getOrCreateAccountKey();
    const client = new acme.Client({
      directoryUrl,
      accountKey,
    });

    const [certificateKey, certificateCsr] = await acme.crypto.createCsr({
      commonName: normalizedDomain,
      altNames: [normalizedDomain],
    });

    const certificate = await client.auto({
      csr: certificateCsr,
      email,
      termsOfServiceAgreed: true,
      challengeCreateFn: async (_authz, challenge, keyAuthorization) => {
        if (challenge && challenge.token) {
          setAcmeChallenge(challenge.token, keyAuthorization);
        }
      },
      challengeRemoveFn: async (_authz, challenge) => {
        if (challenge && challenge.token) {
          clearAcmeChallenge(challenge.token);
        }
      },
      skipChallengeVerification: true,
    });

    const fullchain = certificate;
    const cert = certificate;

    const entry = {
      key: certificateKey,
      cert,
      fullchain,
      expiresAt: null,
    };
    try {
      const { X509Certificate } = await import('crypto');
      const x = new X509Certificate(cert);
      if (x.validTo) entry.expiresAt = new Date(x.validTo).getTime();
    } catch (_) {}

    if (certStore) {
      certStore.set(normalizedDomain, entry);
    }

    return {
      success: true,
      key: certificateKey,
      cert: entry.cert,
      fullchain: entry.fullchain,
    };
  } catch (err) {
    const message = err.message || String(err);
    console.warn('Let\'s Encrypt provision failed for', domain, message);
    return { success: false, error: message };
  }
}

/**
 * Ensure certificate for domain; provision if missing or expiring soon.
 * @param {string} domain
 * @param {Object} options
 * @param {import('./cert-store.js').CertStore} options.certStore
 * @param {string} [options.email]
 * @param {number} [options.renewBeforeDays=30]
 * @returns {Promise<boolean>} true if a valid cert is available
 */
export async function ensureCertificate(domain, options = {}) {
  const certStore = options.certStore;
  if (!certStore) return false;
  const renewBeforeDays = options.renewBeforeDays ?? 30;
  if (certStore.hasValidCert(domain, renewBeforeDays)) {
    return true;
  }
  const result = await provisionCertificate(domain, options);
  return result.success;
}

export const isLetsEncryptAvailable = Boolean(acme);
