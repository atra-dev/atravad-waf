#!/usr/bin/env node

/**
 * ATRAVAD Proxy WAF Standalone Server
 * 
 * This is the standalone proxy server that runs on WAF nodes.
 * It connects to the dashboard to fetch configurations and serves as a reverse proxy.
 * 
 * Usage:
 *   node proxy-server-standalone.js --node-id=<NODE_ID> --api-key=<API_KEY> --dashboard-url=<URL>
 * 
 * Or set environment variables:
 *   ATRAVAD_NODE_ID=<NODE_ID>
 *   ATRAVAD_API_KEY=<API_KEY>
 *   ATRAVAD_DASHBOARD_URL=<URL>
 *   ATRAVAD_HTTP_PORT=80
 *   ATRAVAD_HTTPS_PORT=443
 */

import { ProxyWAFServer } from './src/lib/proxy-server.js';
import { createModSecurityProxy } from './src/lib/modsecurity-proxy.js';

// Parse command line arguments
const args = process.argv.slice(2);
const config = {};

args.forEach((arg) => {
  const [key, value] = arg.split('=');
  if (key && value) {
    config[key.replace('--', '')] = value;
  }
});

// Load from environment variables or command line
const NODE_ID = config['node-id'] || process.env.ATRAVAD_NODE_ID;
const API_KEY = config['api-key'] || process.env.ATRAVAD_API_KEY;
const DASHBOARD_URL = config['dashboard-url'] || process.env.ATRAVAD_DASHBOARD_URL || 'http://localhost:3000';
const HTTP_PORT = parseInt(config['http-port'] || process.env.ATRAVAD_HTTP_PORT || '80', 10);
const HTTPS_PORT = parseInt(config['https-port'] || process.env.ATRAVAD_HTTPS_PORT || '443', 10);

if (!NODE_ID || !API_KEY) {
  console.error('Error: NODE_ID and API_KEY are required');
  console.error('Usage: node proxy-server-standalone.js --node-id=<NODE_ID> --api-key=<API_KEY>');
  console.error('Or set environment variables: ATRAVAD_NODE_ID, ATRAVAD_API_KEY');
  process.exit(1);
}

console.log('ATRAVAD Proxy WAF Standalone Server');
console.log('====================================');
console.log(`Node ID: ${NODE_ID}`);
console.log(`Dashboard URL: ${DASHBOARD_URL}`);
console.log(`HTTP Port: ${HTTP_PORT}`);
console.log(`HTTPS Port: ${HTTPS_PORT}`);
console.log('');

// Create ModSecurity proxy integration
const modSecurity = createModSecurityProxy({
  useStandalone: true,
});

// Create and start proxy server
const proxyServer = new ProxyWAFServer({
  port: HTTP_PORT,
  httpsPort: HTTPS_PORT,
  nodeId: NODE_ID,
  apiKey: API_KEY,
  dashboardUrl: DASHBOARD_URL,
  modSecurity: modSecurity,
});

// Start the server
proxyServer.start();

// Graceful shutdown
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

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  proxyServer.stop();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
