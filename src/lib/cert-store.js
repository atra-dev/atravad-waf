/**
 * Certificate store for Let's Encrypt / TLS certificates.
 * In-memory store with optional file persistence per domain.
 */

import fs from 'fs';
import path from 'path';
import { X509Certificate } from 'crypto';

const DEFAULT_CERTS_DIR = process.env.CERTS_DIR || path.join(process.cwd(), 'certs');

/**
 * @typedef {Object} CertEntry
 * @property {string} key - PEM private key
 * @property {string} cert - PEM certificate
 * @property {string} fullchain - PEM certificate chain (cert + issuer)
 * @property {number} [expiresAt] - Unix timestamp (ms) when cert expires
 */

/**
 * Certificate store: get/set certificates by domain.
 * Optionally persists to disk under certsDir (e.g. certs/domain/key.pem, certs/domain/cert.pem).
 */
export class CertStore {
  /**
   * @param {Object} options
   * @param {string} [options.certsDir] - Directory for persistent storage (default: CERTS_DIR or ./certs)
   * @param {boolean} [options.persistToDisk=true] - Whether to save/load certs to/from disk
   */
  constructor(options = {}) {
    this.certsDir = options.certsDir || DEFAULT_CERTS_DIR;
    this.persistToDisk = options.persistToDisk !== false;
    /** @type {Map<string, CertEntry>} */
    this.store = new Map();
    if (this.persistToDisk) {
      this._loadAllFromDisk();
    }
  }

  /**
   * @param {string} domain - Domain name (e.g. example.com)
   * @returns {CertEntry|null}
   */
  get(domain) {
    const key = this._normalizeDomain(domain);
    return this.store.get(key) || null;
  }

  /**
   * @param {string} domain
   * @param {CertEntry} entry
   */
  set(domain, entry) {
    const key = this._normalizeDomain(domain);
    this.store.set(key, {
      key: entry.key,
      cert: entry.cert,
      fullchain: entry.fullchain != null ? entry.fullchain : entry.cert,
      expiresAt: entry.expiresAt,
    });
    if (this.persistToDisk) {
      this._saveToDisk(key, this.store.get(key));
    }
  }

  /**
   * @param {string} domain
   * @returns {boolean}
   */
  has(domain) {
    return this.store.has(this._normalizeDomain(domain));
  }

  /**
   * @param {string} domain
   */
  remove(domain) {
    const key = this._normalizeDomain(domain);
    this.store.delete(key);
    if (this.persistToDisk) {
      const domainDir = path.join(this.certsDir, key);
      try {
        if (fs.existsSync(domainDir)) {
          fs.rmSync(domainDir, { recursive: true });
        }
      } catch (err) {
        console.warn('CertStore: failed to remove domain dir', domainDir, err.message);
      }
    }
  }

  /**
   * @returns {string[]}
   */
  listDomains() {
    return Array.from(this.store.keys());
  }

  /**
   * Check if a cert exists and is not expired (with buffer days).
   * @param {string} domain
   * @param {number} [renewBeforeDays=30]
   * @returns {boolean}
   */
  hasValidCert(domain, renewBeforeDays = 30) {
    const entry = this.get(domain);
    if (!entry || !entry.expiresAt) return false;
    const renewBefore = renewBeforeDays * 24 * 60 * 60 * 1000;
    return Date.now() < entry.expiresAt - renewBefore;
  }

  _normalizeDomain(domain) {
    if (!domain || typeof domain !== 'string') return '';
    return domain.toLowerCase().trim().replace(/^\.+/, '');
  }

  _loadAllFromDisk() {
    try {
      if (!fs.existsSync(this.certsDir)) {
        fs.mkdirSync(this.certsDir, { recursive: true });
        return;
      }
      const entries = fs.readdirSync(this.certsDir, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        const domainKey = e.name;
        const keyPath = path.join(this.certsDir, domainKey, 'key.pem');
        const certPath = path.join(this.certsDir, domainKey, 'cert.pem');
        const fullchainPath = path.join(this.certsDir, domainKey, 'fullchain.pem');
        if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
          const key = fs.readFileSync(keyPath, 'utf8');
          const cert = fs.readFileSync(certPath, 'utf8');
          const fullchain = fs.existsSync(fullchainPath)
            ? fs.readFileSync(fullchainPath, 'utf8')
            : cert;
          let expiresAt = null;
          try {
            const x = new X509Certificate(cert);
            if (x.validTo) expiresAt = new Date(x.validTo).getTime();
          } catch (_) {}
          this.store.set(domainKey, { key, cert, fullchain, expiresAt });
        }
      }
    } catch (err) {
      console.warn('CertStore: failed to load from disk', this.certsDir, err.message);
    }
  }

  _saveToDisk(domainKey, entry) {
    try {
      const domainDir = path.join(this.certsDir, domainKey);
      fs.mkdirSync(domainDir, { recursive: true });
      fs.writeFileSync(path.join(domainDir, 'key.pem'), entry.key, { mode: 0o600 });
      fs.writeFileSync(path.join(domainDir, 'cert.pem'), entry.cert);
      fs.writeFileSync(path.join(domainDir, 'fullchain.pem'), entry.fullchain);
    } catch (err) {
      console.warn('CertStore: failed to save to disk', domainKey, err.message);
    }
  }
}

/**
 * @param {Object} options
 * @returns {CertStore}
 */
export function createCertStore(options = {}) {
  return new CertStore(options);
}
