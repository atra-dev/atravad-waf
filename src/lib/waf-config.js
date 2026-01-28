/**
 * WAF Multi-Region Configuration
 * 
 * Regions are configured at the system level via environment variables.
 * This provides a Sucuri-style infrastructure where WAF IPs are
 * automatically assigned based on origin server geolocation.
 */

// Default regions if WAF_REGIONS is not configured
const DEFAULT_REGIONS = [
  {
    id: 'default',
    name: 'Default',
    ip: '192.124.249.100',
    cname: 'waf.atravad.com',
    continents: ['NA', 'SA', 'EU', 'AF', 'AS', 'OC', 'AN'],
  },
];

/**
 * Parse WAF regions from environment variable
 * @returns {Array} Array of WAF region configurations
 */
export function getWafRegions() {
  const regionsEnv = process.env.WAF_REGIONS;
  
  if (!regionsEnv) {
    console.warn('WAF_REGIONS not configured, using default region');
    return DEFAULT_REGIONS;
  }
  
  try {
    const regions = JSON.parse(regionsEnv);
    
    if (!Array.isArray(regions) || regions.length === 0) {
      console.warn('WAF_REGIONS is empty or invalid, using default region');
      return DEFAULT_REGIONS;
    }
    
    // Validate each region has required fields
    for (const region of regions) {
      if (!region.id || !region.ip || !region.continents) {
        console.warn(`Invalid region configuration: ${JSON.stringify(region)}`);
        return DEFAULT_REGIONS;
      }
    }
    
    return regions;
  } catch (error) {
    console.error('Error parsing WAF_REGIONS:', error.message);
    return DEFAULT_REGIONS;
  }
}

/**
 * Get the default WAF region
 * @returns {Object} Default region configuration
 */
export function getDefaultRegion() {
  const regions = getWafRegions();
  const defaultRegionId = process.env.WAF_DEFAULT_REGION;
  
  if (defaultRegionId) {
    const defaultRegion = regions.find(r => r.id === defaultRegionId);
    if (defaultRegion) {
      return defaultRegion;
    }
  }
  
  // Return first region as default
  return regions[0];
}

/**
 * Get WAF region by continent code
 * @param {string} continentCode - Two-letter continent code (NA, SA, EU, AF, AS, OC, AN)
 * @returns {Object} Matching region or default region
 */
export function getRegionByContinent(continentCode) {
  const regions = getWafRegions();
  
  if (!continentCode) {
    return getDefaultRegion();
  }
  
  // Find region that handles this continent
  const matchingRegion = regions.find(region => 
    region.continents && region.continents.includes(continentCode.toUpperCase())
  );
  
  return matchingRegion || getDefaultRegion();
}

/**
 * Get WAF region by ID
 * @param {string} regionId - Region identifier
 * @returns {Object|null} Region configuration or null if not found
 */
export function getRegionById(regionId) {
  const regions = getWafRegions();
  return regions.find(r => r.id === regionId) || null;
}

/**
 * Get all available region IDs
 * @returns {Array<string>} Array of region IDs
 */
export function getRegionIds() {
  return getWafRegions().map(r => r.id);
}

/**
 * Continent code mappings for reference
 */
export const CONTINENT_CODES = {
  NA: 'North America',
  SA: 'South America',
  EU: 'Europe',
  AF: 'Africa',
  AS: 'Asia',
  OC: 'Oceania',
  AN: 'Antarctica',
};
