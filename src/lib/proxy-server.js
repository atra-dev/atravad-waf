/**
 * ATRAVAD Proxy WAF Server
 * 
 * Modern reverse proxy WAF that:
 * - Handles SSL/TLS termination
 * - Routes traffic based on domain (Host header)
 * - Integrates ModSecurity for request inspection
 * - Forwards clean traffic to origin servers
 * - Supports health checks and failover
 * 
 * Architecture similar to Sucuri/Reblaze
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';
import { adminDb } from './firebase-admin';
import { createModSecurityProxy } from './modsecurity-proxy.js';

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
    this.nodeId = options.nodeId;
    this.apiKey = options.apiKey;
    this.dashboardUrl = options.dashboardUrl;
    this.modSecurity = options.modSecurity || createModSecurityProxy();
    
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

      // Get node's tenant for filtering
      let tenantName = null;
      if (this.nodeId) {
        try {
          const nodeDoc = await adminDb.collection('nodes').doc(this.nodeId).get();
          if (nodeDoc.exists) {
            tenantName = nodeDoc.data().tenantName;
            console.log(`Loading applications for tenant: ${tenantName}`);
          }
        } catch (error) {
          console.warn('Could not fetch node tenant, loading all applications:', error.message);
        }
      }

      // Load applications (filtered by tenant if available)
      let appsSnapshot;
      if (tenantName) {
        appsSnapshot = await adminDb
          .collection('applications')
          .where('tenantName', '==', tenantName)
          .get();
      } else {
        // Fallback: load all applications (for testing or if tenant not available)
        appsSnapshot = await adminDb.collection('applications').get();
      }
      
      for (const doc of appsSnapshot.docs) {
        const app = { id: doc.id, ...doc.data() };
        if (app.domain) {
          this.applications.set(app.domain, app);
          console.log(`Loaded application: ${app.domain}`);
          
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
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  }

  /**
   * Setup real-time listener for application changes
   */
  setupRealtimeListener() {
    if (!adminDb) return;

    // Listen for new/updated applications
    adminDb.collection('applications').onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const app = { id: change.doc.id, ...change.doc.data() };
        
        if (change.type === 'added' || change.type === 'modified') {
          if (app.domain) {
            this.applications.set(app.domain, app);
            console.log(`Application updated: ${app.domain}`);
            
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
   */
  async handleRequest(req, res) {
    try {
      const host = req.headers.host?.split(':')[0]; // Remove port if present
      
      if (!host) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing Host header');
        return;
      }

      // Find application by domain
      const app = this.applications.get(host);
      
      if (!app) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`Application not found for domain: ${host}`);
        return;
      }

      // Get healthy origin
      const origin = this.getHealthyOrigin(app);
      
      if (!origin || !origin.url) {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        res.end('No origin server configured');
        return;
      }

      // Request size guard based on app or policy
      const contentLength = Number(req.headers['content-length'] || 0);
      const bodyLimit = app.bodyLimitBytes || null;
      if (bodyLimit && contentLength > bodyLimit) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Payload Too Large',
          limit: bodyLimit,
          received: contentLength,
        }));
        return;
      }

      // ModSecurity inspection with traffic mode/canary
      if (app.policyId && this.modSecurity && app.trafficMode !== 'off') {
        let effectiveMode = app.trafficMode || 'detection';
        if (effectiveMode === 'prevention' && app.canaryPercent >= 0 && app.canaryPercent < 100) {
          const inCanary = Math.random() * 100 < app.canaryPercent;
          if (!inCanary) {
            effectiveMode = 'detection';
          }
        }

        const inspection = await this.modSecurity.inspectRequest(req, app.policyId, effectiveMode);

        if (effectiveMode === 'prevention' && (!inspection.allowed || inspection.blocked)) {
          const reason = inspection.matchedRules[0]?.message || 'Security rule violation';
          res.writeHead(403, {
            'Content-Type': 'application/json',
            'X-ATRAVAD-Blocked': 'true',
            'X-ATRAVAD-Reason': reason,
          });

          res.end(JSON.stringify({
            error: 'Request blocked by WAF',
            reason,
            matchedRules: inspection.matchedRules,
            mode: inspection.mode,
          }));

          console.warn(`Request blocked for ${host} (${inspection.mode || 'prevention'}):`, {
            url: req.url,
            method: req.method,
            matchedRules: inspection.matchedRules,
          });

          return;
        }
      }
      
      // Forward clean request to origin
      await this.forwardRequest(req, res, origin.url, app);
      
    } catch (error) {
      console.error('Error handling request:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal server error');
    }
  }

  /**
   * Forward request to origin server
   */
  async forwardRequest(clientReq, clientRes, originUrl, app) {
    try {
      const originUrlObj = new URL(originUrl);
      const targetPath = clientReq.url;
      
      // Build target URL
      const targetUrl = `${originUrlObj.protocol}//${originUrlObj.host}${targetPath}${originUrlObj.search || ''}`;

      // Prepare request options
      const requestOptions = {
        method: clientReq.method,
        hostname: originUrlObj.hostname,
        port: originUrlObj.port || (originUrlObj.protocol === 'https:' ? 443 : 80),
        path: targetPath + (originUrlObj.search || ''),
        headers: { ...clientReq.headers },
      };

      // Remove hop-by-hop headers
      delete requestOptions.headers['connection'];
      delete requestOptions.headers['host'];
      delete requestOptions.headers['transfer-encoding'];
      delete requestOptions.headers['upgrade'];

      // Set correct host header
      requestOptions.headers['host'] = originUrlObj.host;

      // Add X-Forwarded-* headers
      requestOptions.headers['x-forwarded-for'] = 
        (clientReq.headers['x-forwarded-for'] || '') + 
        (clientReq.headers['x-forwarded-for'] ? ', ' : '') + 
        (clientReq.socket.remoteAddress || 'unknown');
      requestOptions.headers['x-forwarded-proto'] = clientReq.secure ? 'https' : 'http';
      requestOptions.headers['x-forwarded-host'] = clientReq.headers.host;

      // Use appropriate protocol
      const protocol = originUrlObj.protocol === 'https:' ? https : http;

      // Forward request
      const proxyReq = protocol.request(requestOptions, (proxyRes) => {
        // Forward status and headers
        clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);

        // Pipe response
        proxyRes.pipe(clientRes);
      });

      proxyReq.on('error', (error) => {
        console.error('Proxy request error:', error);
        if (!clientRes.headersSent) {
          clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
          clientRes.end('Bad Gateway: Origin server error');
        }
      });

      // Pipe request body
      clientReq.pipe(proxyReq);

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
   * Start HTTPS server
   */
  startHttpsServer(sslOptions = {}) {
    // SSL options should include certificates
    // For now, create a basic server (certificates will be loaded per-domain)
    
    this.httpsServer = https.createServer(sslOptions, (req, res) => {
      this.handleRequest(req, res);
    });

    this.httpsServer.listen(this.httpsPort, () => {
      console.log(`ATRAVAD Proxy WAF HTTPS server listening on port ${this.httpsPort}`);
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
