/**
 * Geolocation Service
 * 
 * Provides IP geolocation for automatic WAF region assignment.
 * Uses ip-api.com (free tier: 45 requests/minute, no API key required)
 */

import dns from 'dns';
import { promisify } from 'util';

const dnsResolve = promisify(dns.resolve4);

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
  if (!ip) {
    return {
      success: false,
      error: 'No IP provided',
      ip: null,
      country: null,
      countryCode: null,
      continent: null,
      continentCode: null,
    };
  }

  // Don't geolocate private/local IPs
  if (isPrivateIp(ip)) {
    return {
      success: true,
      ip,
      country: 'Local',
      countryCode: 'XX',
      continent: 'Unknown',
      continentCode: null, // Will use default region
      isPrivate: true,
    };
  }

  try {
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,continent,continentCode`,
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
        ip,
        country: null,
        countryCode: null,
        continent: null,
        continentCode: null,
      };
    }

    return {
      success: true,
      ip,
      country: data.country,
      countryCode: data.countryCode,
      continent: data.continent,
      continentCode: data.continentCode,
    };
  } catch (error) {
    console.error(`Error geolocating IP ${ip}:`, error.message);
    return {
      success: false,
      error: error.message,
      ip,
      country: null,
      countryCode: null,
      continent: null,
      continentCode: null,
    };
  }
}

/**
 * Check if an IP address is private/local
 * @param {string} ip - IP address to check
 * @returns {boolean} True if IP is private
 */
function isPrivateIp(ip) {
  if (!ip) return false;
  
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;

  // 10.0.0.0 - 10.255.255.255
  if (parts[0] === 10) return true;

  // 172.16.0.0 - 172.31.255.255
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  // 192.168.0.0 - 192.168.255.255
  if (parts[0] === 192 && parts[1] === 168) return true;

  // 127.0.0.0 - 127.255.255.255 (localhost)
  if (parts[0] === 127) return true;

  return false;
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
    };
  }

  const geoData = await geolocateIp(ip);
  return {
    ...geoData,
    originUrl,
  };
}
