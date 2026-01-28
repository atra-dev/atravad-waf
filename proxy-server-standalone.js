#!/usr/bin/env node

/**
 * ATRAVAD Proxy WAF Standalone Server
 *
 * Sucuri-style: no nodes. Run this on your edge; it loads sites from Firestore by tenant.
 * Add site → point DNS → SSL → done.
 *
 * Usage:
 *   node proxy-server-standalone.js --tenant-name=Acme --http-port=80 --https-port=443
 *
 * Or environment variables:
 *   ATRAVAD_TENANT_NAME=Acme   (optional; if unset, loads all applications)
 *   ATRAVAD_HTTP_PORT=80
 *   ATRAVAD_HTTPS_PORT=443
 */

import { ProxyWAFServer } from './src/lib/proxy-server.js';
import { createModSecurityProxy } from './src/lib/modsecurity-proxy.js';

const args = process.argv.slice(2);
const config = {};
args.forEach((arg) => {
  const [key, value] = arg.split('=');
  if (key && value) {
    config[key.replace('--', '')] = value;
  }
});

const TENANT_NAME = config['tenant-name'] || process.env.ATRAVAD_TENANT_NAME || null;
const HTTP_PORT = parseInt(config['http-port'] || process.env.ATRAVAD_HTTP_PORT || '80', 10);
const HTTPS_PORT = parseInt(config['https-port'] || process.env.ATRAVAD_HTTPS_PORT || '443', 10);

console.log('ATRAVAD Proxy WAF Standalone Server');
console.log('====================================');
console.log(`Tenant: ${TENANT_NAME || '(all)'}`);
console.log(`HTTP Port: ${HTTP_PORT}`);
console.log(`HTTPS Port: ${HTTPS_PORT}`);
console.log('');

const modSecurity = createModSecurityProxy({ responseInspectionEnabled: true });

const proxyServer = new ProxyWAFServer({
  port: HTTP_PORT,
  httpsPort: HTTPS_PORT,
  tenantName: TENANT_NAME,
  modSecurity,
});

proxyServer.start();

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  proxyServer.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  proxyServer.stop();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  proxyServer.stop();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
