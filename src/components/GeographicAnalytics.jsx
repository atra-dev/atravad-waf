'use client';

import { useMemo } from 'react';
import { isPrivateIp } from '@/lib/ip-utils';

// Try to import react-simple-maps (React 19 compatible fork)
let ComposableMap, Geographies, Geography, Marker;
try {
  const maps = require('react-simple-maps');
  ComposableMap = maps.ComposableMap;
  Geographies = maps.Geographies;
  Geography = maps.Geography;
  Marker = maps.Marker;
} catch (e) {
  // Library not installed - will show placeholder
  ComposableMap = null;
}

/**
 * Geographic Analytics Component
 * Displays world map with traffic by country and geographic insights
 */
export default function GeographicAnalytics({ logs = [] }) {
  const countryData = useMemo(() => {
    const countryMap = new Map();

    logs.forEach((log) => {
      const ip = log.ipAddress || log.clientIp;
      const code =
        (typeof log.geoCountryCode === 'string' && log.geoCountryCode.trim().toUpperCase()) ||
        (isPrivateIp(ip) ? 'XX' : '');
      const name =
        (typeof log.geoCountry === 'string' && log.geoCountry.trim()) ||
        (code === 'XX' ? 'Private Network' : '');

      if (!code) return;

      const existing = countryMap.get(code) || {
        code,
        name: name || code,
        count: 0,
        blocked: 0,
        allowed: 0,
      };

      existing.count += 1;
      if (log.blocked) {
        existing.blocked += 1;
      } else {
        existing.allowed += 1;
      }

      countryMap.set(code, existing);
    });

    return Array.from(countryMap.values()).sort((a, b) => b.count - a.count);
  }, [logs]);

  // Top countries by traffic
  const topCountries = useMemo(() => {
    return countryData.slice(0, 10);
  }, [countryData]);

  // Total unique countries
  const uniqueCountries = countryData.length;

  // Total requests
  const totalRequests = logs.length;
  const blockedRequests = logs.filter(log => log.blocked).length;
  const allowedRequests = totalRequests - blockedRequests;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Total Requests</div>
          <div className="text-2xl font-bold text-gray-900">{totalRequests.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Blocked</div>
          <div className="text-2xl font-bold text-red-600">{blockedRequests.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">
            {totalRequests > 0 ? ((blockedRequests / totalRequests) * 100).toFixed(1) : 0}%
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Allowed</div>
          <div className="text-2xl font-bold text-green-600">{allowedRequests.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">
            {totalRequests > 0 ? ((allowedRequests / totalRequests) * 100).toFixed(1) : 0}%
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Countries</div>
          <div className="text-2xl font-bold text-blue-600">{uniqueCountries}</div>
        </div>
      </div>

      {/* World Map Visualization */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic by Country</h3>
        {ComposableMap ? (
          <div className="bg-gray-50 rounded-lg p-4">
            <ComposableMap
              projectionConfig={{
                scale: 147,
                center: [0, 20],
              }}
              className="w-full"
              style={{ width: '100%', height: 'auto' }}
            >
              <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const countryCode = geo.properties.ISO_A2;
                    const countryInfo = countryData.find(c => c.code === countryCode);
                    const fillColor = countryInfo
                      ? countryInfo.blocked > 0
                        ? `rgba(239, 68, 68, ${Math.min(0.3 + (countryInfo.blocked / countryInfo.count) * 0.7, 1)})`
                        : `rgba(34, 197, 94, ${Math.min(0.3 + (countryInfo.count / Math.max(...countryData.map(c => c.count))) * 0.7, 1)})`
                      : '#E5E7EB';
                    
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fillColor}
                        stroke="#FFFFFF"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: 'none' },
                          hover: { outline: 'none', fill: countryInfo ? '#3B82F6' : '#D1D5DB' },
                          pressed: { outline: 'none' },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
              {countryData.slice(0, 20).map((country, idx) => {
                // Get country coordinates (simplified - in production use a proper coordinate database)
                const coords = getCountryCoordinates(country.code);
                if (!coords) return null;
                
                return (
                  <Marker key={idx} coordinates={coords}>
                    <circle
                      r={Math.min(Math.max(country.count / 10, 3), 12)}
                      fill="#EF4444"
                      stroke="#FFFFFF"
                      strokeWidth={1}
                      opacity={0.8}
                    />
                    <text
                      textAnchor="middle"
                      y={-Math.min(Math.max(country.count / 10, 3), 12) - 5}
                      style={{ fontFamily: 'system-ui', fill: '#1F2937', fontSize: '10px', fontWeight: 'bold' }}
                    >
                      {country.count}
                    </text>
                  </Marker>
                );
              })}
            </ComposableMap>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-200 rounded"></div>
                <span>Allowed Traffic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-200 rounded"></div>
                <span>Blocked Traffic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Request Count</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-600 font-medium mb-2">World Map Visualization</p>
            <p className="text-sm text-gray-500 mb-4">
              Install a React 19-compatible map library to enable interactive world map
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-md mx-auto">
              <p className="text-sm font-semibold text-blue-900 mb-2">Option 1: React 19 Fork (Recommended)</p>
              <code className="block bg-white px-3 py-2 rounded text-xs mb-3">
                npm install github:vnedyalk0v/react19-simple-maps --legacy-peer-deps
              </code>
              <p className="text-sm font-semibold text-blue-900 mb-2">Option 2: Original (with legacy deps)</p>
              <code className="block bg-white px-3 py-2 rounded text-xs">
                npm install react-simple-maps --legacy-peer-deps
              </code>
            </div>
          </div>
        )}
      </div>

      {/* Top Countries Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Top Countries by Traffic</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Blocked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Allowed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Block Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topCountries.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No geographic data available yet. New logs will include country metadata for SOC analysis.
                  </td>
                </tr>
              ) : (
                topCountries.map((country, index) => (
                  <tr key={country.code} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getCountryFlag(country.code)}</span>
                        <span className="text-sm font-medium text-gray-900">{country.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {country.count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {country.blocked.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {country.allowed.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${(country.blocked / country.count) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {((country.blocked / country.count) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


/**
 * Get country flag emoji from country code
 */
function getCountryFlag(code) {
  // Convert country code to flag emoji
  if (code === 'XX') return '🏠';
  
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  
  return String.fromCodePoint(...codePoints);
}

/**
 * Get approximate coordinates for a country (simplified)
 * In production, use a proper coordinate database
 */
function getCountryCoordinates(countryCode) {
  // Simplified coordinate mapping for top countries
  const coordinates = {
    'US': [-95.7129, 37.0902],
    'GB': [-3.4360, 55.3781],
    'CA': [-106.3468, 56.1304],
    'AU': [133.7751, -25.2744],
    'DE': [10.4515, 51.1657],
    'FR': [2.2137, 46.2276],
    'IT': [12.5674, 41.8719],
    'ES': [-3.7492, 40.4637],
    'NL': [5.2913, 52.1326],
    'BR': [-51.9253, -14.2350],
    'IN': [78.9629, 20.5937],
    'CN': [104.1954, 35.8617],
    'JP': [138.2529, 36.2048],
    'KR': [127.7669, 35.9078],
    'MX': [-102.5528, 23.6345],
    'AR': [-63.6167, -38.4161],
    'ZA': [22.9375, -30.5595],
    'EG': [30.8025, 26.8206],
    'NG': [8.6753, 9.0820],
    'PH': [121.7740, 12.8797],
  };
  
  return coordinates[countryCode] || null;
}
