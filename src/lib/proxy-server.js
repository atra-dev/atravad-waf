/**
 * ATRAVAD Proxy WAF Server
 *
 * Modern reverse proxy WAF (Sucuri-style):
 * - SSL/TLS termination, domain-based routing
 * - ModSecurity (libmodsecurity) request inspection including body
 * - Buffers request body when needed, then inspects, then forwards
 * - Optional response inspection (Phase 4)
 * - Health checks and failover
 */

import http from 'http';
import https from 'https';
import tls from 'tls';
import { URL } from 'url';
import { createRequire } from 'module';
import { adminDb } from './firebase-admin';
import { createModSecurityProxy } from './modsecurity-proxy.js';
import { createCertStore } from './cert-store.js';
import { getAcmeChallengeResponse, ensureCertificate, isLetsEncryptAvailable } from './letsencrypt.js';

const requireMod = createRequire(import.meta.url);
let selfsigned = null;
try {
  selfsigned = requireMod('selfsigned').default || requireMod('selfsigned');
} catch {
  selfsigned = null;
}

const BODY_BUFFER_TIMEOUT_MS = 10000;

function hasRequestBody(req) {
  const method = (req.method || 'GET').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return false;
  const cl = parseInt(req.headers['content-length'], 10);
  const te = (req.headers['transfer-encoding'] || '').toLowerCase();
  return (Number.isFinite(cl) && cl > 0) || te === 'chunked';
}

function collectRequestBody(req, maxBytes, timeoutMs = BODY_BUFFER_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const contentLength = parseInt(req.headers['content-length'], 10);
    const isChunked = (req.headers['transfer-encoding'] || '').toLowerCase() === 'chunked';
    if (!isChunked && !Number.isFinite(contentLength)) {
      resolve(null);
      return;
    }
    if (!isChunked && contentLength === 0) {
      resolve(Buffer.alloc(0));
      return;
    }
    const chunks = [];
    let total = 0;
    const timer = setTimeout(() => {
      req.destroy();
      reject(new Error('Request body timeout'));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      req.removeListener('data', onData);
      req.removeListener('end', onEnd);
      req.removeListener('error', onError);
    };
    const onData = (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        cleanup();
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = () => {
      cleanup();
      resolve(Buffer.concat(chunks));
    };
    const onError = (err) => {
      cleanup();
      reject(err);
    };
    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
  });
}

/**
 * Proxy Server Class
 */
export class ProxyWAFServer {
  constructor(options = {}) {
    this.port = options.port || 80;
    this.httpsPort = options.httpsPort || 443;
    this.applications = new Map(); // domain -> application config
    this.originHealth = new Map(); // origin URL -> health status
    this.httpServer = null;
    this.httpsServer = null;
    this.healthCheckIntervals = new Map();
    this.tenantName = options.tenantName || null;
    // Multi-tenant: support single name or comma-separated list (Firestore 'in' max 10)
    this.tenantNames = this.tenantName
      ? this.tenantName.split(',').map((s) => s.trim()).filter(Boolean)
      : null;
    if (this.tenantNames && this.tenantNames.length > 10) {
      console.warn('ATRAVAD: Firestore "in" query limited to 10 tenants; using first 10.');
      this.tenantNames = this.tenantNames.slice(0, 10);
    }
    this.modSecurity = options.modSecurity || createModSecurityProxy();
    this.certStore = options.certStore || createCertStore();
    this.getAcmeChallengeResponse = options.getAcmeChallengeResponse || getAcmeChallengeResponse;
    this.letsEncryptEnabled = options.letsEncryptEnabled !== false && isLetsEncryptAvailable;
    this.provisioningInProgress = new Set(); // domain -> avoid duplicate provision

    // Load applications from Firestore
    this.loadApplications();

    // Listen for real-time updates
    this.setupRealtimeListener();
  }

  /**
   * Load policy for an application
   */
  async loadPolicyForApplication(app) {
    if (!app.policyId || !this.modSecurity) {
      return;
    }

    try {
      const policy = await this.modSecurity.loadPolicy(app.policyId);
      if (policy) {
        console.log(`Loaded policy "${policy.name}" for application ${app.domain}`);
      } else {
        console.warn(`Policy ${app.policyId} not found for application ${app.domain}`);
      }
    } catch (error) {
      console.error(`Error loading policy for application ${app.domain}:`, error);
    }
  }

  /**
   * Load applications from Firestore
   */
  async loadApplications() {
    try {
      if (!adminDb) {
        console.warn('Firebase Admin not initialized, proxy server will use in-memory config');
        return;
      }

      const tenantNames = this.tenantNames;
      if (tenantNames?.length) {
        console.log(`Loading applications for tenant(s): ${tenantNames.join(', ')}`);
      } else {
        console.log('Loading all applications (no tenant filter)');
      }

      // Load applications (filtered by tenant(s) if set)
      let appsSnapshot;
      if (tenantNames?.length === 1) {
        appsSnapshot = await adminDb
          .collection('applications')
          .where('tenantName', '==', tenantNames[0])
          .get();
      } else if (tenantNames?.length > 1) {
        appsSnapshot = await adminDb
          .collection('applications')
          .where('tenantName', 'in', tenantNames)
          .get();
      } else {
        appsSnapshot = await adminDb.collection('applications').get();
      }
      
      for (const doc of appsSnapshot.docs) {
        const app = { id: doc.id, ...doc.data() };
        if (app.domain) {
          this.applications.set(app.domain, app);
          console.log(`Loaded application: ${app.domain}`);

          if (app.ssl?.customCert && app.ssl?.cert && app.ssl?.key) {
            try {
              this.certStore.set(app.domain, {
                key: app.ssl.key,
                cert: app.ssl.cert,
                fullchain: app.ssl.fullchain || app.ssl.cert,
              });
              console.log(`Loaded custom SSL certificate for ${app.domain}`);
            } catch (err) {
              console.warn(`Failed to load custom SSL for ${app.domain}:`, err.message);
            }
          }

          // Load policy if assigned
          await this.loadPolicyForApplication(app);

          // Start health checks for origins
          if (app.origins && Array.isArray(app.origins)) {
            app.origins.forEach((origin) => {
              this.startHealthCheck(origin);
            });
          }
        }
      }
      
      console.log(`Loaded ${this.applications.size} application(s)`);

      if (this.letsEncryptEnabled) {
        this.triggerAutoProvision();
      }
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  }

  /**
   * Trigger Let's Encrypt provisioning for apps with ssl.autoProvision and no valid cert.
   */
  async triggerAutoProvision() {
    for (const [domain, app] of this.applications) {
      if (app.ssl?.customCert) continue;
      const autoProvision = app.ssl && (app.ssl.autoProvision === true || app.ssl?.autoProvision === true);
      if (!autoProvision || this.provisioningInProgress.has(domain)) continue;
      if (this.certStore.hasValidCert(domain)) continue;
      this.provisioningInProgress.add(domain);
      ensureCertificate(domain, { certStore: this.certStore })
        .then((ok) => {
          if (ok) console.log(`Let's Encrypt: provisioned certificate for ${domain}`);
        })
        .catch((err) => console.warn(`Let's Encrypt: provision failed for ${domain}`, err.message))
        .finally(() => this.provisioningInProgress.delete(domain));
    }
  }

  /**
   * Setup real-time listener for application changes (tenant-scoped when tenantName is set)
   */
  setupRealtimeListener() {
    if (!adminDb) return;

    const tenantNames = this.tenantNames;
    let applicationsRef;
    if (tenantNames?.length === 1) {
      applicationsRef = adminDb.collection('applications').where('tenantName', '==', tenantNames[0]);
    } else if (tenantNames?.length > 1) {
      applicationsRef = adminDb.collection('applications').where('tenantName', 'in', tenantNames);
    } else {
      applicationsRef = adminDb.collection('applications');
    }

    applicationsRef.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const app = { id: change.doc.id, ...change.doc.data() };
        
        if (change.type === 'added' || change.type === 'modified') {
          if (app.domain) {
            this.applications.set(app.domain, app);
            console.log(`Application updated: ${app.domain}`);

            if (app.ssl?.customCert && app.ssl?.cert && app.ssl?.key) {
              try {
                this.certStore.set(app.domain, {
                  key: app.ssl.key,
                  cert: app.ssl.cert,
                  fullchain: app.ssl.fullchain || app.ssl.cert,
                });
                console.log(`Loaded custom SSL certificate for ${app.domain}`);
              } catch (err) {
                console.warn(`Failed to load custom SSL for ${app.domain}:`, err.message);
              }
            } else if (app.ssl && app.ssl.customCert === false) {
              this.certStore.remove(app.domain);
            }

            if (this.letsEncryptEnabled && !app.ssl?.customCert && app.ssl?.autoProvision && !this.provisioningInProgress.has(app.domain) && !this.certStore.hasValidCert(app.domain)) {
              this.provisioningInProgress.add(app.domain);
              ensureCertificate(app.domain, { certStore: this.certStore })
                .then((ok) => { if (ok) console.log(`Let's Encrypt: provisioned certificate for ${app.domain}`); })
                .catch((err) => console.warn(`Let's Encrypt: provision failed for ${app.domain}`, err.message))
                .finally(() => this.provisioningInProgress.delete(app.domain));
            }

            // Load policy if assigned
            this.loadPolicyForApplication(app).catch((error) => {
              console.error(`Error loading policy for ${app.domain}:`, error);
            });

            // Start health checks for origins
            if (app.origins && Array.isArray(app.origins)) {
              app.origins.forEach((origin) => {
                this.startHealthCheck(origin);
              });
            }
          }
        } else if (change.type === 'removed') {
          this.applications.delete(app.domain);
          console.log(`Application removed: ${app.domain}`);
        }
      });
    });
  }

  /**
   * Start health check for an origin server
   */
  startHealthCheck(origin) {
    if (!origin.url || !origin.healthCheck) return;

    const originUrl = origin.url;
    const healthCheck = origin.healthCheck;
    const checkPath = healthCheck.path || '/health';
    const interval = (healthCheck.interval || 30) * 1000; // Convert to ms
    const timeout = (healthCheck.timeout || 5) * 1000;

    // Stop existing health check if any
    if (this.healthCheckIntervals.has(originUrl)) {
      clearInterval(this.healthCheckIntervals.get(originUrl));
    }

    // Initial health check
    this.performHealthCheck(originUrl, checkPath, timeout);

    // Periodic health checks
    const intervalId = setInterval(() => {
      this.performHealthCheck(originUrl, checkPath, timeout);
    }, interval);

    this.healthCheckIntervals.set(originUrl, intervalId);
  }

  /**
   * Perform a single health check
   */
  async performHealthCheck(originUrl, checkPath, timeout) {
    try {
      const url = new URL(originUrl);
      const healthUrl = `${url.protocol}//${url.host}${checkPath}`;
      
      const requestOptions = {
        method: 'GET',
        timeout,
        headers: {
          'User-Agent': 'ATRAVAD-WAF-HealthCheck/1.0',
        },
      };

      const protocol = url.protocol === 'https:' ? https : http;
      
      const req = protocol.request(healthUrl, requestOptions, (res) => {
        const isHealthy = res.statusCode >= 200 && res.statusCode < 300;
        this.originHealth.set(originUrl, {
          healthy: isHealthy,
          lastCheck: new Date().toISOString(),
          statusCode: res.statusCode,
        });
        
        if (!isHealthy) {
          console.warn(`Origin ${originUrl} health check failed: ${res.statusCode}`);
        }
      });

      req.on('error', (error) => {
        this.originHealth.set(originUrl, {
          healthy: false,
          lastCheck: new Date().toISOString(),
          error: error.message,
        });
        console.warn(`Origin ${originUrl} health check error:`, error.message);
      });

      req.on('timeout', () => {
        req.destroy();
        this.originHealth.set(originUrl, {
          healthy: false,
          lastCheck: new Date().toISOString(),
          error: 'Timeout',
        });
        console.warn(`Origin ${originUrl} health check timeout`);
      });

      req.end();
    } catch (error) {
      this.originHealth.set(originUrl, {
        healthy: false,
        lastCheck: new Date().toISOString(),
        error: error.message,
      });
      console.error(`Health check error for ${originUrl}:`, error);
    }
  }

  /**
   * Get healthy origin for an application
   */
  getHealthyOrigin(app) {
    if (!app.origins || !Array.isArray(app.origins) || app.origins.length === 0) {
      return null;
    }

    // Filter healthy origins
    const healthyOrigins = app.origins.filter((origin) => {
      const health = this.originHealth.get(origin.url);
      return health && health.healthy !== false; // Default to healthy if not checked yet
    });

    if (healthyOrigins.length === 0) {
      // No healthy origins, use first one anyway (circuit breaker could be added)
      return app.origins[0];
    }

    // Weighted selection (simple round-robin for now, can be enhanced)
    // Sort by weight (descending) and return first healthy
    healthyOrigins.sort((a, b) => (b.weight || 100) - (a.weight || 100));
    return healthyOrigins[0];
  }

  /**
   * Handle incoming HTTP request
   * Serves ACME HTTP-01 challenge first, then buffers request body when needed for ModSecurity, then forwards.
   */
  async handleRequest(req, res) {
    try {
      const pathname = req.url?.split('?')[0] || '/';

      // Health check for load balancers and data-center orchestration (any Host)
      if (pathname === '/health' || pathname === '/_atravad/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'ok',
            service: 'atravad-waf',
            tenant: this.tenantName || 'all',
            tenants: this.tenantNames?.length ? this.tenantNames.length : null,
            applications: this.applications.size,
          })
        );
        return;
      }

      const host = req.headers.host?.split(':')[0];
      if (!host) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing Host header');
        return;
      }

      if (this.getAcmeChallengeResponse && pathname.startsWith('/.well-known/acme-challenge/')) {
        const token = pathname.slice('/.well-known/acme-challenge/'.length).trim();
        const keyAuthorization = this.getAcmeChallengeResponse(token);
        if (keyAuthorization) {
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(keyAuthorization);
          return;
        }
      }

      const app = this.applications.get(host);
      if (!app) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`Application not found for domain: ${host}`);
        return;
      }

      const origin = this.getHealthyOrigin(app);
      if (!origin || !origin.url) {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        res.end('No origin server configured');
        return;
      }

      let bodyBuffer = null;
      if (app.policyId && this.modSecurity && hasRequestBody(req)) {
        try {
          const limit = typeof this.modSecurity.getBodyLimit === 'function'
            ? this.modSecurity.getBodyLimit()
            : 13107200;
          bodyBuffer = await collectRequestBody(req, limit, BODY_BUFFER_TIMEOUT_MS);
        } catch (err) {
          console.warn('Request body buffer error:', err.message);
          if (!res.headersSent) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Request body too large or timeout' }));
          }
          return;
        }
      }

      if (app.policyId && this.modSecurity) {
        const inspection = await this.modSecurity.inspectRequest(req, app.policyId, bodyBuffer);
        if (!inspection.allowed || inspection.blocked) {
          res.writeHead(403, {
            'Content-Type': 'application/json',
            'X-ATRAVAD-Blocked': 'true',
            'X-ATRAVAD-Reason': inspection.matchedRules[0]?.message || 'Security rule violation',
          });
          res.end(JSON.stringify({
            error: 'Request blocked by WAF',
            reason: inspection.matchedRules[0]?.message || 'Security rule violation',
            matchedRules: inspection.matchedRules,
          }));
          console.warn(`Request blocked for ${host}:`, {
            url: req.url,
            method: req.method,
            matchedRules: inspection.matchedRules,
            engine: inspection.engine,
          });
          return;
        }
      }

      await this.forwardRequest(req, res, origin.url, app, bodyBuffer);
    } catch (error) {
      console.error('Error handling request:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
      }
    }
  }

  /**
   * Forward request to origin server.
   * @param {object} clientReq - Incoming request
   * @param {object} clientRes - Response to client
   * @param {string} originUrl - Origin base URL
   * @param {object} app - Application config (policyId, etc.)
   * @param {Buffer|null} bodyBuffer - Buffered request body when already consumed for inspection
   */
  forwardRequest(clientReq, clientRes, originUrl, app, bodyBuffer = null) {
    try {
      const originUrlObj = new URL(originUrl);
      const targetPath = clientReq.url;

      const requestOptions = {
        method: clientReq.method,
        hostname: originUrlObj.hostname,
        port: originUrlObj.port || (originUrlObj.protocol === 'https:' ? 443 : 80),
        path: targetPath + (originUrlObj.search || ''),
        headers: { ...clientReq.headers },
      };

      delete requestOptions.headers['connection'];
      delete requestOptions.headers['host'];
      delete requestOptions.headers['transfer-encoding'];
      delete requestOptions.headers['upgrade'];
      requestOptions.headers['host'] = originUrlObj.host;
      requestOptions.headers['x-forwarded-for'] =
        (clientReq.headers['x-forwarded-for'] || '') +
        (clientReq.headers['x-forwarded-for'] ? ', ' : '') +
        (clientReq.socket.remoteAddress || 'unknown');
      requestOptions.headers['x-forwarded-proto'] = clientReq.secure ? 'https' : 'http';
      requestOptions.headers['x-forwarded-host'] = clientReq.headers.host;

      const protocol = originUrlObj.protocol === 'https:' ? https : http;
      const doResponseInspection = Boolean(
        app.policyId && this.modSecurity && (app.responseInspectionEnabled !== false && this.modSecurity.responseInspectionEnabled !== false)
      );
      const responseBodyLimit = typeof this.modSecurity?.getResponseBodyLimit === 'function'
        ? this.modSecurity.getResponseBodyLimit()
        : 524288;

      const proxyReq = protocol.request(requestOptions, (proxyRes) => {
        if (doResponseInspection) {
          const chunks = [];
          let total = 0;
          proxyRes.on('data', (chunk) => {
            if (total < responseBodyLimit) {
              const want = Math.min(chunk.length, responseBodyLimit - total);
              chunks.push(chunk.subarray(0, want));
            }
            total += chunk.length;
          });
          proxyRes.on('end', async () => {
            const body = Buffer.concat(chunks);
            try {
              const inspection = await this.modSecurity.inspectResponse(
                {
                  statusCode: proxyRes.statusCode,
                  httpVersion: proxyRes.httpVersion || '1.1',
                  headers: proxyRes.headers,
                  rawHeaders: proxyRes.rawHeaders || [],
                  body,
                },
                app.policyId
              );
              if (!inspection.allowed) {
                if (!clientRes.headersSent) {
                  clientRes.writeHead(502, { 'Content-Type': 'application/json' });
                  clientRes.end(JSON.stringify({
                    error: 'Response blocked by WAF',
                    matchedRules: inspection.matchedRules || [],
                  }));
                }
                return;
              }
            } catch (err) {
              console.warn('Response inspection error:', err.message);
            }
            if (!clientRes.headersSent) {
              clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
              clientRes.end(body);
            }
          });
          proxyRes.on('error', (err) => {
            console.error('Proxy response error:', err);
            if (!clientRes.headersSent) {
              clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
              clientRes.end('Bad Gateway');
            }
          });
        } else {
          if (!clientRes.headersSent) {
            clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
          }
          proxyRes.pipe(clientRes);
        }
      });

      proxyReq.on('error', (error) => {
        console.error('Proxy request error:', error);
        if (!clientRes.headersSent) {
          clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
          clientRes.end('Bad Gateway: Origin server error');
        }
      });

      if (bodyBuffer && bodyBuffer.length >= 0) {
        proxyReq.write(bodyBuffer);
        proxyReq.end();
      } else {
        clientReq.pipe(proxyReq);
      }
    } catch (error) {
      console.error('Error forwarding request:', error);
      if (!clientRes.headersSent) {
        clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
        clientRes.end('Bad Gateway');
      }
    }
  }

  /**
   * Start HTTP server
   */
  startHttpServer() {
    this.httpServer = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.httpServer.listen(this.port, () => {
      console.log(`ATRAVAD Proxy WAF HTTP server listening on port ${this.port}`);
    });

    this.httpServer.on('error', (error) => {
      console.error('HTTP server error:', error);
    });
  }

  /**
   * Build default key/cert and secure context for SNI fallback (self-signed or first cert in store).
   */
  _getDefaultSecureContext() {
    if (this._defaultSecureContext) return this._defaultSecureContext;
    const domains = this.certStore.listDomains();
    if (domains.length > 0) {
      const entry = this.certStore.get(domains[0]);
      if (entry) {
        this._defaultKeyCert = { key: entry.key, cert: entry.fullchain || entry.cert };
        this._defaultSecureContext = tls.createSecureContext(this._defaultKeyCert);
        return this._defaultSecureContext;
      }
    }
    if (selfsigned) {
      const attrs = [{ name: 'commonName', value: 'localhost' }];
      const pems = selfsigned.generate(attrs, { days: 365, keySize: 2048 });
      this._defaultKeyCert = { key: pems.private, cert: pems.cert };
      this._defaultSecureContext = tls.createSecureContext(this._defaultKeyCert);
      return this._defaultSecureContext;
    }
    return null;
  }

  /**
   * Start HTTPS server with SNI (certificate per domain from certStore).
   */
  startHttpsServer(sslOptions = {}) {
    const defaultContext = this._getDefaultSecureContext();
    const certStore = this.certStore;
    const defaultKeyCert = this._defaultKeyCert || {};

    const serverOptions = {
      key: sslOptions.key || defaultKeyCert.key,
      cert: sslOptions.cert || defaultKeyCert.cert,
      SNICallback: (servername, cb) => {
        const entry = certStore.get(servername);
        if (entry && entry.key && (entry.fullchain || entry.cert)) {
          try {
            const ctx = tls.createSecureContext({
              key: entry.key,
              cert: entry.fullchain || entry.cert,
            });
            return cb(null, ctx);
          } catch (err) {
            console.warn('SNI secure context failed for', servername, err.message);
          }
        }
        cb(null, defaultContext);
      },
    };

    if (!serverOptions.key || !serverOptions.cert) {
      console.warn('HTTPS: no default key/cert; SNI will still work for provisioned domains');
    }

    this.httpsServer = https.createServer(serverOptions, (req, res) => {
      this.handleRequest(req, res);
    });

    this.httpsServer.listen(this.httpsPort, () => {
      console.log(`ATRAVAD Proxy WAF HTTPS server listening on port ${this.httpsPort} (SNI + Let's Encrypt)`);
    });

    this.httpsServer.on('error', (error) => {
      console.error('HTTPS server error:', error);
    });
  }

  /**
   * Start the proxy server
   */
  start(sslOptions = {}) {
    this.startHttpServer();

    if (sslOptions && (sslOptions.key || sslOptions.cert)) {
      this.startHttpsServer(sslOptions);
    } else if (this.letsEncryptEnabled && this._getDefaultSecureContext()) {
      this.startHttpsServer();
    }
    console.log('ATRAVAD Proxy WAF server started');
  }

  /**
   * Stop the proxy server
   */
  stop() {
    // Stop health checks
    this.healthCheckIntervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.healthCheckIntervals.clear();

    // Stop servers
    if (this.httpServer) {
      this.httpServer.close();
    }
    if (this.httpsServer) {
      this.httpsServer.close();
    }

    console.log('ATRAVAD Proxy WAF server stopped');
  }
}

/**
 * Create and start proxy server instance
 */
export function createProxyServer(options = {}) {
  const server = new ProxyWAFServer(options);
  server.start(options.ssl);
  return server;
}
