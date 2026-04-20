/**
 * Geolocation Service
 * 
 * Provides IP geolocation for automatic WAF region assignment.
 * Uses ip-api.com (free tier: 45 requests/minute, no API key required)
 */

import dns from 'dns';
import { promisify } from 'util';
import { normalizeIpAddress, isPrivateIp } from './ip-utils.js';

const dnsResolve = promisify(dns.resolve4);
const geoCache = new Map();
const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function parseAsnNumber(asValue) {
  const match = String(asValue || '').trim().match(/^AS(\d+)/i);
  return match ? `AS${match[1]}` : null;
}

function deriveUsageType(data = {}) {
  if (data.proxy === true) return 'Proxy/VPN';
  if (data.hosting === true) return 'Hosting Provider';
  if (data.mobile === true) return 'Mobile Network';
  return 'Fixed Line ISP';
}

/**
 * Extract hostname from URL and resolve to IP address
 * @param {string} originUrl - Full URL (e.g., https://origin.example.com)
 * @returns {Promise<string|null>} IP address or null if resolution fails
 */
export async function getIpFromUrl(originUrl) {
  if (!originUrl) {
    return null;
  }

  try {
    // Parse URL to extract hostname
    const url = new URL(originUrl);
    const hostname = url.hostname;

    // Check if hostname is already an IP address
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
      return hostname;
    }

    // Resolve hostname to IP
    const addresses = await dnsResolve(hostname);
    return addresses && addresses.length > 0 ? addresses[0] : null;
  } catch (error) {
    console.error(`Error resolving IP for ${originUrl}:`, error.message);
    return null;
  }
}

/**
 * Geolocate an IP address using ip-api.com
 * @param {string} ip - IP address to geolocate
 * @returns {Promise<Object>} Geolocation data
 */
export async function geolocateIp(ip) {
  const normalizedIp = normalizeIpAddress(ip);
  if (!normalizedIp) {
    return {
      success: false,
      error: 'No IP provided',
      ip: null,
      country: null,
      countryCode: null,
      continent: null,
      continentCode: null,
      asn: null,
      asnName: null,
      isp: null,
      organization: null,
      hostname: null,
      domain: null,
      usageType: null,
    };
  }

  // Don't geolocate private/local IPs
  if (isPrivateIp(normalizedIp)) {
    return {
      success: true,
      ip: normalizedIp,
      country: 'Local',
      countryCode: 'XX',
      continent: 'Unknown',
      continentCode: null, // Will use default region
      asn: null,
      asnName: 'Private Network',
      isp: 'Private Network',
      organization: null,
      hostname: null,
      domain: null,
      usageType: 'Private Network',
      isPrivate: true,
    };
  }

  try {
    const response = await fetch(
      `http://ip-api.com/json/${normalizedIp}?fields=status,message,country,countryCode,continent,continentCode,as,asname,isp,org,reverse,mobile,proxy,hosting`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'fail') {
      return {
        success: false,
        error: data.message || 'Geolocation failed',
        ip: normalizedIp,
        country: null,
        countryCode: null,
        continent: null,
        continentCode: null,
        asn: null,
        asnName: null,
        isp: null,
        organization: null,
        hostname: null,
        domain: null,
        usageType: null,
      };
    }

    return {
      success: true,
      ip: normalizedIp,
      country: data.country,
      countryCode: data.countryCode,
      continent: data.continent,
      continentCode: data.continentCode,
      asn: parseAsnNumber(data.as),
      asnName: String(data.asname || '').trim() || null,
      isp: String(data.isp || '').trim() || null,
      organization: String(data.org || '').trim() || null,
      hostname: String(data.reverse || '').trim() || null,
      domain: String(data.reverse || '').trim().split('.').slice(-2).join('.') || null,
      usageType: deriveUsageType(data),
    };
  } catch (error) {
    console.error(`Error geolocating IP ${normalizedIp}:`, error.message);
    return {
      success: false,
      error: error.message,
      ip: normalizedIp,
      country: null,
      countryCode: null,
      continent: null,
      continentCode: null,
      asn: null,
      asnName: null,
      isp: null,
      organization: null,
      hostname: null,
      domain: null,
      usageType: null,
    };
  }
}

export async function geolocateIpCached(ip) {
  const normalizedIp = normalizeIpAddress(ip);
  if (!normalizedIp) {
    return {
      success: false,
      error: 'No IP provided',
      ip: null,
      country: null,
      countryCode: null,
      continent: null,
      continentCode: null,
      asn: null,
      asnName: null,
      isp: null,
      organization: null,
      hostname: null,
      domain: null,
      usageType: null,
    };
  }

  const cached = geoCache.get(normalizedIp);
  if (cached && Date.now() - cached.timestamp < GEO_CACHE_TTL_MS) {
    return cached.value;
  }

  const value = await geolocateIp(normalizedIp);
  geoCache.set(normalizedIp, {
    value,
    timestamp: Date.now(),
  });
  return value;
}

/**
 * Get geolocation for an origin URL
 * Combines IP resolution and geolocation in one call
 * @param {string} originUrl - Origin server URL
 * @returns {Promise<Object>} Geolocation data with resolved IP
 */
export async function geolocateOrigin(originUrl) {
  const ip = await getIpFromUrl(originUrl);
  
  if (!ip) {
    return {
      success: false,
      error: 'Could not resolve origin IP',
      originUrl,
      ip: null,
      country: null,
      countryCode: null,
      continent: null,
      continentCode: null,
      asn: null,
      asnName: null,
      isp: null,
      organization: null,
      hostname: null,
      domain: null,
      usageType: null,
    };
  }

  const geoData = await geolocateIp(ip);
  return {
    ...geoData,
    originUrl,
  };
}
