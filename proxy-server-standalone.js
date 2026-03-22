#!/usr/bin/env node

/**
 * ATRAVA Defense Standalone Server
 *
 * Data-center ready, multi-tenant WAF edge. Loads sites from Firestore by tenant.
 * Add site → point DNS → SSL → done.
 *
 * Usage:
 *   node proxy-server-standalone.js [--tenant-name=Acme] [--http-port=80] [--https-port=443] [--env-file=.env.waf]
 *
 * Environment variables (also loadable via --env-file or .env.waf / .env):
 *   ATRAVAD_TENANT_NAME=Acme   (optional; unset = serve all tenants; comma-separated = serve multiple, e.g. Acme,Corp)
 *   ATRAVAD_HTTP_PORT=80
 *   ATRAVAD_HTTPS_PORT=443
 *   FIREBASE_PROJECT_ID / NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL / NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY / NEXT_PUBLIC_FIREBASE_PRIVATE_KEY
 *
 * Health check: GET /health or GET /_atravad/health (returns 200 JSON with status and tenant info).
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { ProxyWAFServer } from "./src/lib/proxy-server.js";
import { createModSecurityProxy } from "./src/lib/modsecurity-proxy.js";
import { createCertStore } from "./src/lib/cert-store.js";

/**
 * Load env file into process.env (KEY=VALUE, no quotes required; supports \n in values).
 * Used for data-center deployment so a single .env.waf file configures Firebase and ports.
 */
function loadEnvFile(filePath) {
  const resolved = resolve(filePath);
  if (!existsSync(resolved)) return false;
  try {
    const content = readFileSync(resolved, "utf8");
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const raw = trimmed.slice(eq + 1).trim();
      let value = raw;
      if (
        (raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))
      ) {
        value = raw.slice(1, -1).replace(/\\n/g, "\n");
      }
      if (key) process.env[key] = value;
    }
    return true;
  } catch (err) {
    console.warn("Could not load env file:", resolved, err.message);
    return false;
  }
}

const args = process.argv.slice(2);
const config = {};
args.forEach((arg) => {
  const [key, value] = arg.split("=");
  if (key && value) {
    config[key.replace("--", "")] = value;
  }
});

// Load env: --env-file path, then .env.waf in cwd, then .env in cwd
const envFile = config["env-file"] || process.env.ATRAVAD_ENV_FILE;
if (envFile) {
  loadEnvFile(envFile);
} else {
  loadEnvFile(".env.waf") || loadEnvFile(".env");
}

const TENANT_NAME =
  config["tenant-name"] ?? process.env.ATRAVAD_TENANT_NAME ?? null;
const HTTP_PORT = parseInt(
  config["http-port"] || process.env.ATRAVAD_HTTP_PORT || "80",
  10,
);
const HTTPS_PORT = parseInt(
  config["https-port"] || process.env.ATRAVAD_HTTPS_PORT || "443",
  10,
);

console.log("ATRAVA Defense Standalone Server");
console.log("====================================");
console.log(
  `Tenant: ${TENANT_NAME !== null && TENANT_NAME !== "" ? TENANT_NAME : "(all tenants)"}`,
);
console.log(`HTTP Port: ${HTTP_PORT}`);
console.log(`HTTPS Port: ${HTTPS_PORT}`);
console.log("");

const modSecurity = createModSecurityProxy({
  responseInspectionEnabled: true,
  failOpen: false,
});
const certStore = createCertStore({
  persistToDisk:
    process.env.CERT_STORE_PERSIST_TO_DISK === "true" ||
    process.env.CERT_STORE_PERSIST_TO_DISK === "1",
});

const proxyServer = new ProxyWAFServer({
  port: HTTP_PORT,
  httpsPort: HTTPS_PORT,
  tenantName: TENANT_NAME || null,
  modSecurity,
  certStore,
  letsEncryptEnabled: true,
});

proxyServer.start();

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  proxyServer.stop();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully...");
  proxyServer.stop();
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  if (typeof proxyServer?.stop === "function") proxyServer.stop();
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
});
