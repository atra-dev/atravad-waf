'use client';

import { useMemo } from 'react';
import { isPrivateIp } from '@/lib/ip-utils';
import { normalizeDomainInput } from '@/lib/domain-utils';

// Try to import react-simple-maps (React 19 compatible fork)
let ComposableMap, Geographies, Geography, Line, Marker;
try {
  const maps = require('react-simple-maps');
  ComposableMap = maps.ComposableMap;
  Geographies = maps.Geographies;
  Geography = maps.Geography;
  Line = maps.Line;
  Marker = maps.Marker;
} catch (e) {
  // Library not installed - will show placeholder
  ComposableMap = null;
}

/**
 * Geographic Analytics Component
 * Displays world map with traffic by country and geographic insights
 */
export default function GeographicAnalytics({ logs = [], apps = [] }) {
  const appByDomain = useMemo(() => {
    const map = new Map();
    apps.forEach((app) => {
      const domain = normalizeDomainInput(String(app?.domain || ''));
      if (domain) map.set(domain, app);
    });
    return map;
  }, [apps]);
  const singleAppFallback = apps.length === 1 ? apps[0] : null;

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
  const maxCountryCount = useMemo(
    () => Math.max(...countryData.map((c) => c.count), 1),
    [countryData]
  );

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
      <div className="bg-[#090d1f] rounded-xl shadow-sm border border-slate-800 p-6 overflow-hidden relative">
        <div className="absolute inset-0 threat-grid opacity-40 pointer-events-none" />
        <h3 className="text-lg font-semibold text-slate-100 mb-4 relative z-10">Traffic by Country</h3>
        {ComposableMap ? (
          <div className="bg-transparent rounded-lg p-2 relative z-10">
            <ComposableMap
              projectionConfig={{
                scale: 147,
                center: [0, 20],
              }}
              className="w-full"
              style={{ width: '100%', height: 'auto' }}
            >
              <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
                {({ geographies }) => {
                  const coordinateIndex = buildCountryCoordinateIndex(geographies);

                  const routeLines = logs
                    .filter((log) => typeof log?.blocked === 'boolean')
                    .slice(0, 100)
                    .map((log, idx) => {
                      const sourceCode = String(log.geoCountryCode || '').trim().toUpperCase();
                      const sourceName = String(log.geoCountry || '').trim();
                      const sourceCoordinates = resolveCountryCoordinates(
                        { code: sourceCode, name: sourceName },
                        coordinateIndex
                      );

                      const rawHost = String(log?.request?.host || log?.source || '').split(':')[0];
                      const host = normalizeDomainInput(rawHost);
                      const app = (host ? appByDomain.get(host) : null) || singleAppFallback;
                      const destinationCountryName = String(app?.originCountry || '').trim();
                      let destinationCoordinates = resolveCountryCoordinates(
                        { code: '', name: destinationCountryName },
                        coordinateIndex
                      );
                      if (!destinationCoordinates) {
                        destinationCoordinates = CONTINENT_DEFAULT_COORDS[String(app?.originContinent || '').trim().toUpperCase()] || null;
                      }
                      if (!destinationCoordinates) {
                        destinationCoordinates = DEFAULT_DESTINATION_COORDS;
                      }

                      if (!sourceCoordinates) return null;
                      const adjustedDestination = adjustDestinationForVisibility(
                        sourceCoordinates,
                        destinationCoordinates,
                        idx
                      );

                      return {
                        id: `${log.id || idx}-${sourceCode}-${host || 'dst'}`,
                        sourceCoordinates,
                        destinationCoordinates: adjustedDestination,
                        blocked: Boolean(log.blocked),
                        sourceName: sourceName || sourceCode || 'Unknown',
                        destinationName: destinationCountryName || String(app?.originContinent || '').trim() || 'Protected',
                      };
                    })
                    .filter(Boolean)
                    .slice(0, 50);

                  return (
                    <>
                      {geographies.map((geo) => {
                        const countryInfo = findCountryInfoForGeo(geo, countryData);
                        const fillColor = countryInfo
                          ? countryInfo.blocked > 0
                            ? `rgba(239, 68, 68, ${Math.min(0.3 + (countryInfo.blocked / countryInfo.count) * 0.7, 1)})`
                            : `rgba(34, 197, 94, ${Math.min(0.45 + (countryInfo.count / maxCountryCount) * 0.55, 1)})`
                          : '#E5E7EB';

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={countryInfo ? fillColor : '#1f2937'}
                            stroke="#4b5563"
                            strokeWidth={0.35}
                            style={{
                              default: { outline: 'none' },
                              hover: { outline: 'none', fill: countryInfo ? '#64748b' : '#374151' },
                              pressed: { outline: 'none' },
                            }}
                          />
                        );
                      })}

                      {routeLines.map((line) => (
                        <Line
                          key={`line-${line.id}`}
                          from={line.sourceCoordinates}
                          to={line.destinationCoordinates}
                          stroke="#f59e0b"
                          strokeWidth={line.blocked ? 2.4 : 1.9}
                          strokeOpacity={line.blocked ? 0.96 : 0.8}
                          strokeDasharray={line.blocked ? '10 6' : '8 6'}
                          className={line.blocked ? 'route-line route-line-blocked' : 'route-line route-line-allowed'}
                        />
                      ))}

                      {routeLines.map((line) => (
                        <Marker key={`src-${line.id}`} coordinates={line.sourceCoordinates}>
                          <circle r={3.3} fill="#f59e0b" opacity="0.95" />
                          <circle r={8} fill="none" stroke="#f59e0b" strokeWidth="1.3" className="threat-pulse" />
                          <text y={-10} textAnchor="middle" fill="#e5e7eb" fontSize="8">
                            {shortCountryLabel(line.sourceName)}
                          </text>
                        </Marker>
                      ))}

                      {routeLines.map((line) => (
                        <Marker key={`dst-${line.id}`} coordinates={line.destinationCoordinates}>
                          <circle r={2.8} fill="#fbbf24" opacity="0.95" />
                          <circle r={6.5} fill="none" stroke="#fbbf24" strokeWidth="1.1" className="threat-pulse-slow" />
                        </Marker>
                      ))}
                    </>
                  );
                }}
              </Geographies>
            </ComposableMap>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-300 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-400/80 rounded"></div>
                <span>Allowed Country</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-rose-400/80 rounded"></div>
                <span>Blocked Country</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-amber-400 rounded"></div>
                <span>Route Flow (Source -{">"} Destination)</span>
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

      <style jsx>{`
        .threat-grid {
          background-image:
            repeating-linear-gradient(to right, rgba(244, 63, 94, 0.22) 0 1px, transparent 1px 64px),
            repeating-linear-gradient(to bottom, rgba(244, 63, 94, 0.22) 0 1px, transparent 1px 64px);
        }
        .route-line {
          filter: drop-shadow(0 0 2px rgba(251, 191, 36, 0.55));
        }
        .route-line-blocked {
          animation: blockedDash 0.8s linear infinite;
        }
        .route-line-allowed {
          animation: allowedDash 1.1s linear infinite;
        }
        @keyframes blockedDash {
          to {
            stroke-dashoffset: -38;
          }
        }
        @keyframes allowedDash {
          to {
            stroke-dashoffset: -28;
          }
        }
        .threat-pulse {
          animation: pulseFast 1.3s ease-out infinite;
          transform-origin: center;
        }
        .threat-pulse-slow {
          animation: pulseSlow 2.1s ease-out infinite;
          transform-origin: center;
        }
        @keyframes pulseFast {
          0% {
            opacity: 0.9;
            transform: scale(0.5);
          }
          100% {
            opacity: 0;
            transform: scale(1.4);
          }
        }
        @keyframes pulseSlow {
          0% {
            opacity: 0.7;
            transform: scale(0.6);
          }
          100% {
            opacity: 0;
            transform: scale(1.5);
          }
        }
      `}</style>
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

function normalizeCountryName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[().,']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findCountryInfoForGeo(geo, countryData) {
  const props = geo?.properties || {};
  const possibleCodes = [
    props.ISO_A2,
    props.iso_a2,
    props.ISO2,
    props.iso2,
  ]
    .filter(Boolean)
    .map((value) => String(value).toUpperCase());

  for (const code of possibleCodes) {
    const byCode = countryData.find((c) => c.code === code);
    if (byCode) return byCode;
  }

  const geoName = normalizeCountryName(
    props.NAME || props.name || props.ADMIN || props.admin || ''
  );
  if (!geoName) return null;

  return (
    countryData.find((c) => normalizeCountryName(c.name) === geoName) ||
    countryData.find((c) => {
      const countryName = normalizeCountryName(c.name);
      return countryName.includes(geoName) || geoName.includes(countryName);
    }) ||
    null
  );
}

function buildCountryCoordinateIndex(geographies = []) {
  const byCode = new Map();
  const byName = new Map();

  geographies.forEach((geo) => {
    const props = geo?.properties || {};
    const centroid = calculateGeometryCentroid(geo?.geometry);
    if (!centroid) return;

    const possibleCodes = [
      props.ISO_A2,
      props.iso_a2,
      props.ISO2,
      props.iso2,
      props.ADM0_A3,
      props.adm0_a3,
    ]
      .map((value) => String(value || '').trim().toUpperCase())
      .filter(Boolean)
      .filter((value) => value !== '-99');

    possibleCodes.forEach((code) => byCode.set(code, centroid));

    const possibleNames = [
      props.NAME,
      props.name,
      props.ADMIN,
      props.admin,
      props.NAME_LONG,
      props.name_long,
    ]
      .map((value) => normalizeCountryName(value))
      .filter(Boolean);

    possibleNames.forEach((name) => byName.set(name, centroid));
  });

  return { byCode, byName };
}

function resolveCountryCoordinates(country, coordinateIndex) {
  const code = String(country?.code || '').trim().toUpperCase();
  const name = normalizeCountryName(country?.name || '');

  if (code && coordinateIndex.byCode.has(code)) {
    return coordinateIndex.byCode.get(code);
  }

  if (name && coordinateIndex.byName.has(name)) {
    return coordinateIndex.byName.get(name);
  }

  return null;
}

function calculateGeometryCentroid(geometry) {
  if (!geometry || !geometry.type || !geometry.coordinates) return null;

  const points = [];
  collectGeometryPoints(geometry.coordinates, points);
  if (points.length === 0) return null;

  let lonTotal = 0;
  let latTotal = 0;
  points.forEach(([lon, lat]) => {
    lonTotal += Number(lon) || 0;
    latTotal += Number(lat) || 0;
  });

  const lon = lonTotal / points.length;
  const lat = latTotal / points.length;
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return [lon, lat];
}

function collectGeometryPoints(value, out) {
  if (!Array.isArray(value) || value.length === 0) return;

  if (
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  ) {
    out.push([value[0], value[1]]);
    return;
  }

  value.forEach((item) => collectGeometryPoints(item, out));
}

function adjustDestinationForVisibility(source, destination, idx = 0) {
  if (!Array.isArray(source) || !Array.isArray(destination)) return destination;
  const [slon, slat] = source;
  const [dlon, dlat] = destination;
  const lonDiff = Math.abs(slon - dlon);
  const latDiff = Math.abs(slat - dlat);
  if (lonDiff > 2 || latDiff > 2) return destination;

  const spread = 8 + (idx % 4) * 2;
  const latSpread = 4 + (idx % 3);
  const sign = idx % 2 === 0 ? 1 : -1;
  return [dlon + spread * sign, Math.max(-70, Math.min(80, dlat + latSpread * sign))];
}

function shortCountryLabel(name) {
  const text = String(name || '').trim();
  if (!text) return 'N/A';
  if (text.length <= 16) return text;
  return `${text.slice(0, 14)}..`;
}

const DEFAULT_DESTINATION_COORDS = [121.0, 14.6];
const CONTINENT_DEFAULT_COORDS = {
  AF: [21.1, 7.4],
  AN: [0.0, -82.9],
  AS: [89.3, 34.0],
  EU: [15.3, 54.5],
  NA: [-102.5, 51.0],
  OC: [134.5, -25.7],
  SA: [-58.4, -14.2],
};

