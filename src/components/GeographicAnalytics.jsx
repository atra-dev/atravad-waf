'use client';

import { useEffect, useMemo, useState } from 'react';
import { isPrivateIp } from '@/lib/ip-utils';

// Try to import react-simple-maps (React 19 compatible fork)
let ComposableMap, Geographies, Geography, Marker, Line;
try {
  const maps = require('react-simple-maps');
  ComposableMap = maps.ComposableMap;
  Geographies = maps.Geographies;
  Geography = maps.Geography;
  Marker = maps.Marker;
  Line = maps.Line;
} catch (e) {
  // Library not installed - will show placeholder
  ComposableMap = null;
}

/**
 * Geographic Analytics Component
 * Displays world map with traffic by country and geographic insights
 */
export default function GeographicAnalytics({ logs = [] }) {
  const [liveAttackIndex, setLiveAttackIndex] = useState(0);

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

  const liveAttackEvents = useMemo(() => {
    return logs
      .filter((log) => {
        const ip = log.ipAddress || log.clientIp;
        const code =
          (typeof log.geoCountryCode === 'string' && log.geoCountryCode.trim().toUpperCase()) ||
          (isPrivateIp(ip) ? 'XX' : '');
        return Boolean(log.blocked && code && code !== 'XX');
      })
      .sort((a, b) => {
        const ta = new Date(a.timestamp || 0).getTime();
        const tb = new Date(b.timestamp || 0).getTime();
        return tb - ta;
      })
      .slice(0, 40)
      .map((log, idx) => {
        const code = String(log.geoCountryCode || '').trim().toUpperCase();
        return {
          id: `${log.id || idx}-${code}-${log.timestamp || ''}`,
          countryCode: code,
          countryName: log.geoCountry || code,
          source: log.source || log.nodeId || 'Unknown source',
          message: log.message || 'Blocked request',
          timestamp: log.timestamp || null,
        };
      })
      .filter((item) => item.countryCode && item.countryCode !== 'XX');
  }, [logs]);

  useEffect(() => {
    if (liveAttackEvents.length <= 1) return;
    const timer = setInterval(() => {
      setLiveAttackIndex((prev) => (prev + 1) % liveAttackEvents.length);
    }, 1800);
    return () => clearInterval(timer);
  }, [liveAttackEvents.length]);

  const currentAttack = liveAttackEvents[liveAttackIndex] || null;

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

      {/* Live Threat Map */}
      <div className="rounded-xl border border-slate-700 bg-slate-950 text-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-wide">Live Cyber Threat Map</h3>
            <p className="text-xs text-slate-400 mt-1">
              {blockedRequests.toLocaleString()} blocked attacks in current log window
            </p>
          </div>
          <div className="text-xs uppercase tracking-widest text-red-400 font-semibold">
            Live
          </div>
        </div>

        {ComposableMap ? (
          <div className="p-4 md:p-6">
            <div className="rounded-lg border border-slate-800 bg-[#090d1f] p-3 md:p-4">
              <ComposableMap
                projection="geoEqualEarth"
                projectionConfig={{ scale: 165, center: [10, 10] }}
                className="w-full"
                style={{ width: '100%', height: 'auto' }}
              >
                <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
                  {({ geographies }) => {
                    const coordinateIndex = buildCountryCoordinateIndex(geographies);
                    const eventsWithCoordinates = liveAttackEvents
                      .map((event) => ({
                        ...event,
                        coordinates: resolveAttackCoordinates(event, coordinateIndex),
                      }))
                      .filter((event) => Array.isArray(event.coordinates));

                    const currentAttackWithCoordinates = (() => {
                      if (eventsWithCoordinates.length === 0) return null;
                      const preferred = eventsWithCoordinates.find(
                        (event) => event.id === currentAttack?.id
                      );
                      return preferred || eventsWithCoordinates[0];
                    })();

                    return (
                      <>
                        {geographies.map((geo) => (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill="#1f2937"
                            stroke="#334155"
                            strokeWidth={0.35}
                            style={{
                              default: { outline: 'none' },
                              hover: { outline: 'none' },
                              pressed: { outline: 'none' },
                            }}
                          />
                        ))}

                        {currentAttackWithCoordinates && (
                          <Line
                            from={currentAttackWithCoordinates.coordinates}
                            to={PROTECTED_ASSET_COORDS}
                            stroke="#f59e0b"
                            strokeWidth={1.8}
                            strokeLinecap="round"
                            strokeDasharray="4 4"
                            className="threat-line"
                          />
                        )}

                        {eventsWithCoordinates.slice(0, 12).map((event) => (
                          <Marker key={`src-${event.id}`} coordinates={event.coordinates}>
                            <circle r={2.8} fill="#ef4444" opacity="0.9" />
                            <circle r={6} fill="none" stroke="#ef4444" strokeWidth="1.2" className="threat-pulse" />
                          </Marker>
                        ))}
                      </>
                    );
                  }}
                </Geographies>

                <Marker coordinates={PROTECTED_ASSET_COORDS}>
                  <circle r={3.2} fill="#22c55e" />
                  <circle r={7} fill="none" stroke="#22c55e" strokeWidth="1.2" className="threat-pulse-slow" />
                </Marker>
              </ComposableMap>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
                <div className="text-[11px] uppercase tracking-widest text-slate-400 mb-1">Current Attack</div>
                {currentAttack ? (
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-red-300">
                      {currentAttack.countryName} ({currentAttack.countryCode}) -> Protected Asset
                    </div>
                    <div className="text-xs text-slate-300 truncate">{currentAttack.message}</div>
                    <div className="text-[11px] text-slate-500">
                      {currentAttack.timestamp ? new Date(currentAttack.timestamp).toLocaleString() : 'No timestamp'}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">No blocked geo attacks yet.</div>
                )}
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
                <div className="text-[11px] uppercase tracking-widest text-slate-400 mb-1">Recent Attack Sources</div>
                <div className="text-sm text-slate-200">
                  {liveAttackEvents.slice(0, 6).map((event) => event.countryCode).join(' - ') || 'N/A'}
                </div>
                <div className="text-xs text-slate-500 mt-1">Updated from latest blocked requests.</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 py-8 text-sm text-slate-400">
            World map library is not installed. Install `react-simple-maps` to enable the live threat map.
          </div>
        )}
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
        .threat-line {
          animation: dashShift 1.2s linear infinite;
        }
        .threat-pulse {
          transform-origin: center;
          animation: pulseFast 1.4s ease-out infinite;
        }
        .threat-pulse-slow {
          transform-origin: center;
          animation: pulseSlow 2s ease-out infinite;
        }
        @keyframes dashShift {
          to {
            stroke-dashoffset: -16;
          }
        }
        @keyframes pulseFast {
          0% {
            opacity: 0.9;
            transform: scale(0.55);
          }
          100% {
            opacity: 0;
            transform: scale(1.35);
          }
        }
        @keyframes pulseSlow {
          0% {
            opacity: 0.8;
            transform: scale(0.65);
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

const PROTECTED_ASSET_COORDS = [121.0, 14.6];

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

function resolveAttackCoordinates(event, coordinateIndex) {
  const byCode = coordinateIndex?.byCode || new Map();
  const byName = coordinateIndex?.byName || new Map();

  const rawCode = String(event?.countryCode || '').trim().toUpperCase();
  if (rawCode) {
    const exact = byCode.get(rawCode);
    if (exact) return exact;
  }

  const normalizedName = normalizeCountryName(event?.countryName || '');
  if (normalizedName) {
    const exactName = byName.get(normalizedName);
    if (exactName) return exactName;
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

