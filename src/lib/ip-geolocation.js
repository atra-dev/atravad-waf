/**
 * IP Geolocation Utility (Client-side)
 * 
 * Provides country information from IP addresses for analytics.
 * Uses ip-api.com for geolocation (free tier: 45 requests/minute)
 */

const geolocationCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get country information from IP address
 * @param {string} ip - IP address
 * @returns {Promise<{code: string, name: string} | null>}
 */
export async function getCountryFromIP(ip) {
  if (!ip) return null;

  // Check cache first
  const cached = geolocationCache.get(ip);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // Skip private IPs
  if (isPrivateIP(ip)) {
    return { code: 'XX', name: 'Private Network' };
  }

  try {
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.status === 'success' && data.countryCode) {
      const result = {
        code: data.countryCode,
        name: data.country || data.countryCode,
      };

      // Cache the result
      geolocationCache.set(ip, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    }

    return null;
  } catch (error) {
    console.warn(`Geolocation failed for IP ${ip}:`, error.message);
    return null;
  }
}

/**
 * Batch geolocate multiple IPs
 * @param {string[]} ips - Array of IP addresses
 * @returns {Promise<Map<string, {code: string, name: string}>>}
 */
export async function batchGeolocateIPs(ips) {
  const results = new Map();
  const uniqueIPs = [...new Set(ips.filter(ip => ip && !isPrivateIP(ip)))];

  // Process in batches to respect rate limits (45 req/min)
  const batchSize = 40; // Leave some headroom
  for (let i = 0; i < uniqueIPs.length; i += batchSize) {
    const batch = uniqueIPs.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (ip) => {
        const country = await getCountryFromIP(ip);
        if (country) {
          results.set(ip, country);
        }
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      })
    );
  }

  return results;
}

/**
 * Check if IP is private/local
 * @param {string} ip - IP address
 * @returns {boolean}
 */
function isPrivateIP(ip) {
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
