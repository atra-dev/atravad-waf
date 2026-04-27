'use client';

import { useSyncExternalStore } from 'react';
import { geoCentroid, geoEqualEarth } from 'd3-geo';

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

let ComposableMap;
let Geographies;
let Geography;
let Marker;

try {
  const maps = require('react-simple-maps');
  ComposableMap = maps.ComposableMap;
  Geographies = maps.Geographies;
  Geography = maps.Geography;
  Marker = maps.Marker;
} catch (error) {
  ComposableMap = null;
  Geographies = null;
  Geography = null;
  Marker = null;
}

const MAP_SCALE = 164;
const MAP_CENTER = [0, 17];
const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;
const MAP_TRANSLATE = [MAP_WIDTH / 2, MAP_HEIGHT / 2 - 20];
const mapProjection = geoEqualEarth()
  .scale(MAP_SCALE)
  .center(MAP_CENTER)
  .translate(MAP_TRANSLATE);

const COUNTRY_COORDINATE_OVERRIDES = {
  FR: [2.2137, 46.2276],
  ES: [-3.7492, 40.4637],
  PT: [-8.2245, 39.3999],
  GB: [-3.436, 55.3781],
  UK: [-3.436, 55.3781],
  IE: [-8.2439, 53.4129],
  DE: [10.4515, 51.1657],
  NL: [5.2913, 52.1326],
  BE: [4.4699, 50.5039],
  LU: [6.1296, 49.8153],
  CH: [8.2275, 46.8182],
  AT: [14.5501, 47.5162],
  IT: [12.5674, 41.8719],
  PL: [19.1451, 51.9194],
  SE: [18.6435, 60.1282],
  NO: [8.4689, 60.472],
  FI: [25.7482, 61.9241],
  DK: [9.5018, 56.2639],
  GR: [21.8243, 39.0742],
  TR: [35.2433, 38.9637],
  UA: [31.1656, 48.3794],
  RO: [24.9668, 45.9432],
  PH: [121.774, 12.8797],
  SG: [103.8198, 1.3521],
  IN: [78.9629, 20.5937],
  KR: [127.7669, 35.9078],
  AU: [133.7751, -25.2744],
  NZ: [174.886, -40.9006],
  MX: [-102.5528, 23.6345],
  AR: [-63.6167, -38.4161],
  CL: [-71.543, -35.6751],
  JP: [138.2529, 36.2048],
  US: [-98.5795, 39.8283],
  CA: [-106.3468, 56.1304],
  BR: [-51.9253, -14.235],
  CN: [104.1954, 35.8617],
};

function normalizeCountryName(value) {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/[().,']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized === 'united states' || normalized === 'usa' || normalized === 'us') {
    return 'united states of america';
  }

  if (normalized === 'uk') {
    return 'united kingdom';
  }

  return normalized;
}

function getCountryIdentifiers(geo) {
  const props = geo?.properties || {};
  const codes = [
    props.ISO_A2,
    props.iso_a2,
    props.ISO2,
    props.iso2,
    props.ISO_A3,
    props.iso_a3,
    props.ADM0_A3,
    props.adm0_a3,
  ]
    .filter(Boolean)
    .map((value) => String(value).toUpperCase());

  const names = [
    props.NAME,
    props.name,
    props.ADMIN,
    props.admin,
    props.NAME_LONG,
    props.name_long,
    props.BRK_NAME,
    props.brk_name,
  ]
    .filter(Boolean)
    .map((value) => normalizeCountryName(value));

  return { codes, names };
}

function getCountryDataForGeo(geo, countries) {
  const { codes, names } = getCountryIdentifiers(geo);

  return (
    countries.find((country) => codes.includes(String(country?.code || '').toUpperCase())) ||
    countries.find((country) => names.includes(normalizeCountryName(country?.name))) ||
    null
  );
}

function getGeoForCountry(country, geographies) {
  if (!country) return null;

  return (
    geographies.find((geo) => {
      const { codes, names } = getCountryIdentifiers(geo);
      return (
        codes.includes(String(country?.code || '').toUpperCase()) ||
        names.includes(normalizeCountryName(country?.name))
      );
    }) || null
  );
}

function getGeoCoordinates(geo) {
  if (!geo) return null;
  const { codes, names } = getCountryIdentifiers(geo);
  const overrideCode = codes.find((code) => COUNTRY_COORDINATE_OVERRIDES[code]);
  if (overrideCode) {
    return COUNTRY_COORDINATE_OVERRIDES[overrideCode];
  }

  const overrideName = names.find((name) => COUNTRY_COORDINATE_OVERRIDES[name]);
  if (overrideName) {
    return COUNTRY_COORDINATE_OVERRIDES[overrideName];
  }

  const [lng, lat] = geoCentroid(geo);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat];
}

function buildRoutePath(startCoordinates, endCoordinates) {
  const startPoint = mapProjection(startCoordinates);
  const endPoint = mapProjection(endCoordinates);

  if (!startPoint || !endPoint) {
    return null;
  }

  const [sx, sy] = startPoint;
  const [ex, ey] = endPoint;
  const midX = (sx + ex) / 2;
  const midY = (sy + ey) / 2;
  const curveLift = Math.min(150, Math.max(55, Math.hypot(ex - sx, ey - sy) * 0.22));
  const controlX = midX;
  const controlY = midY - curveLift;

  return `M ${sx} ${sy} Q ${controlX} ${controlY} ${ex} ${ey}`;
}

function buildProtectedCountryEntries(protectedCountries, geographies) {
  const normalized = Array.from(
    new Set(
      (Array.isArray(protectedCountries) ? protectedCountries : [])
        .map((country) => String(country || '').trim())
        .filter(Boolean)
    )
  );

  return normalized
    .map((name) => {
      const geo = geographies.find((entry) => {
        const { names } = getCountryIdentifiers(entry);
        return names.includes(normalizeCountryName(name));
      });
      const coordinates = getGeoCoordinates(geo);
      if (!geo || !coordinates) return null;
      const identifiers = getCountryIdentifiers(geo);
      return {
        name,
        normalizedName: normalizeCountryName(name),
        geo,
        codes: identifiers.codes,
        names: identifiers.names,
        coordinates,
      };
    })
    .filter(Boolean)
    .slice(0, 3);
}

function isDomesticSourceForTarget({ sourceCode, sourceName, target }) {
  if (!target) return false;

  const normalizedSourceCode = String(sourceCode || '').trim().toUpperCase();
  const normalizedSourceName = normalizeCountryName(sourceName);

  if (normalizedSourceCode && target.codes.includes(normalizedSourceCode)) {
    return true;
  }

  if (normalizedSourceName && target.names.includes(normalizedSourceName)) {
    return true;
  }

  return normalizedSourceName && normalizedSourceName === target.normalizedName;
}

function buildBlockedRoutes(blockedCountries, geographies, protectedEntries) {
  if (protectedEntries.length === 0) return { routes: [], domesticCounts: new Map() };

  const domesticCounts = new Map();
  const routes = (Array.isArray(blockedCountries) ? blockedCountries : [])
    .filter((country) => Number(country?.blocked || 0) > 0)
    .sort((a, b) => Number(b?.blocked || 0) - Number(a?.blocked || 0))
    .slice(0, 6)
    .map((country, index) => {
      const sourceGeo = getGeoForCountry(country, geographies);
      const sourceCoordinates = getGeoCoordinates(sourceGeo);
      const target = protectedEntries[index % protectedEntries.length];
      if (!sourceGeo || !sourceCoordinates || !target?.coordinates) return null;
      if (isDomesticSourceForTarget({ sourceCode: country?.code, sourceName: country?.name, target })) {
        domesticCounts.set(target.name, (domesticCounts.get(target.name) || 0) + Number(country?.blocked || 0));
        return null;
      }

      return {
        id: `${country.code || country.name || index}-${target.name}-${index}`,
        label: country.name || country.code || `Source ${index + 1}`,
        blocked: Number(country.blocked || 0),
        startCoordinates: sourceCoordinates,
        endCoordinates: target.coordinates,
      };
    })
    .filter(Boolean);

  return { routes, domesticCounts };
}

function buildExactPointRoutes(attackPoints, protectedEntries) {
  if (protectedEntries.length === 0) return { routes: [], domesticCounts: new Map() };

  const domesticCounts = new Map();
  const routes = (Array.isArray(attackPoints) ? attackPoints : [])
    .filter((point) => Number.isFinite(Number(point?.latitude)) && Number.isFinite(Number(point?.longitude)))
    .slice(0, 40)
    .map((point, index) => {
      const target = protectedEntries[index % protectedEntries.length];
      if (!target?.coordinates) return null;
      if (isDomesticSourceForTarget({ sourceCode: point?.countryCode, sourceName: point?.country, target })) {
        domesticCounts.set(target.name, (domesticCounts.get(target.name) || 0) + Number(point?.blocked || 1));
        return null;
      }

      return {
        id: point.id || `${point.ip || point.country || index}-${index}`,
        label: point.country || point.ip || `Source ${index + 1}`,
        blocked: Number(point.blocked || 1),
        startCoordinates: [Number(point.longitude), Number(point.latitude)],
        endCoordinates: target.coordinates,
      };
    })
    .filter(Boolean);

  return { routes, domesticCounts };
}

export function BlockedTrafficMap({ countries = [], protectedCountries = [], attackPoints = [] }) {
  const isClient = useIsClient();

  if (!isClient) {
    return (
      <div className="relative overflow-hidden">
        <div className="relative min-h-[520px]">
          <div className="pointer-events-none absolute inset-x-10 top-4 h-32 rounded-full bg-[radial-gradient(circle,rgba(124,22,33,0.18),transparent_68%)] blur-3xl" />
          <div className="pointer-events-none absolute bottom-8 right-14 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(212,166,79,0.14),transparent_70%)] blur-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div className="relative">
        {ComposableMap && Marker ? (
          <div className="overflow-hidden">
            <div className="relative -mt-10 scale-[1.03]">
              <div className="pointer-events-none absolute inset-x-10 top-4 h-32 rounded-full bg-[radial-gradient(circle,rgba(124,22,33,0.18),transparent_68%)] blur-3xl" />
              <div className="pointer-events-none absolute bottom-8 right-14 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(212,166,79,0.14),transparent_70%)] blur-2xl" />
              <ComposableMap
                projectionConfig={{ scale: MAP_SCALE, center: MAP_CENTER }}
                className="relative z-10 w-full"
                style={{ width: '100%', height: 'auto' }}
                projection={mapProjection}
              >
                <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
                  {({ geographies }) => {
                    const protectedEntries = buildProtectedCountryEntries(protectedCountries, geographies);
                    const exactPointResult = buildExactPointRoutes(attackPoints, protectedEntries);
                    const fallbackResult = buildBlockedRoutes(countries, geographies, protectedEntries);
                    const blockedRoutes = exactPointResult.routes.length > 0
                      ? exactPointResult.routes
                      : fallbackResult.routes;
                    const domesticCounts = exactPointResult.routes.length > 0
                      ? exactPointResult.domesticCounts
                      : fallbackResult.domesticCounts;
                    const maxBlocked = Math.max(
                      ...countries.map((country) => Number(country?.blocked || 0)),
                      1
                    );

                    return (
                      <>
                        {geographies.map((geo) => {
                          const countryData = getCountryDataForGeo(geo, countries);
                          const blockedCount = Number(countryData?.blocked || 0);
                          const isProtected = protectedEntries.some((entry) => entry.geo?.rsmKey === geo.rsmKey);
                          const intensity = blockedCount > 0
                            ? Math.min(0.35 + (blockedCount / maxBlocked) * 0.65, 1)
                            : 0;

                          let fill = 'rgba(236, 213, 177, 0.12)';
                          let stroke = 'rgba(255,255,255,0.18)';

                          if (blockedCount > 0) {
                            fill = `rgba(220, 38, 38, ${intensity})`;
                            stroke = 'rgba(254, 202, 202, 0.7)';
                          } else if (isProtected) {
                            fill = 'rgba(59, 130, 246, 0.42)';
                            stroke = 'rgba(147, 197, 253, 0.8)';
                          }

                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              fill={fill}
                              stroke={stroke}
                              strokeWidth={0.45}
                              style={{
                                default: { outline: 'none' },
                                hover: {
                                  outline: 'none',
                                  fill: blockedCount > 0 ? 'rgba(239, 68, 68, 1)' : isProtected ? 'rgba(96, 165, 250, 0.62)' : 'rgba(212, 166, 79, 0.32)',
                                },
                                pressed: { outline: 'none' },
                              }}
                            />
                          );
                        })}

                        {blockedRoutes.map((route, index) => {
                          const routePath = buildRoutePath(route.startCoordinates, route.endCoordinates);
                          if (!routePath) return null;

                          return (
                            <g key={route.id}>
                              <path
                                d={routePath}
                                className="blocked-route-dash"
                                fill="none"
                                stroke="rgba(248, 113, 113, 0.62)"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                                strokeDasharray="3.5 7"
                              />
                              <circle r="4.5" fill="rgba(248, 113, 113, 0.98)" filter="url(#attackPulseGlow)">
                                <animateMotion
                                  dur={`${3.2 + index * 0.35}s`}
                                  repeatCount="indefinite"
                                  rotate="auto"
                                  begin={`${index * 0.28}s`}
                                  path={routePath}
                                />
                              </circle>
                              <circle r="2.6" fill="rgba(254, 242, 242, 0.95)">
                                <animateMotion
                                  dur={`${3.2 + index * 0.35}s`}
                                  repeatCount="indefinite"
                                  rotate="auto"
                                  begin={`${index * 0.28}s`}
                                  path={routePath}
                                />
                              </circle>
                            </g>
                          );
                        })}

                        {blockedRoutes.map((route) => (
                          <Marker key={`${route.id}-source`} coordinates={route.startCoordinates}>
                            <g>
                              <circle r="4.5" fill="rgba(127, 29, 29, 0.95)" stroke="rgba(254, 202, 202, 0.9)" strokeWidth="1.2" />
                              <circle r="9" fill="rgba(239, 68, 68, 0.16)" className="blocked-route-pulse" />
                            </g>
                          </Marker>
                        ))}

                        {protectedEntries.map((node) => (
                          <Marker key={`protected-${node.name}`} coordinates={node.coordinates}>
                            <g>
                              {Number(domesticCounts.get(node.name) || 0) > 0 ? (
                                <>
                                  <circle r="14" fill="rgba(239, 68, 68, 0.16)" className="blocked-route-pulse" />
                                  <circle r="20" fill="rgba(239, 68, 68, 0.10)" className="blocked-route-pulse-slow" />
                                </>
                              ) : null}
                              <circle r="5" fill="rgba(37, 99, 235, 0.96)" stroke="rgba(191, 219, 254, 0.95)" strokeWidth="1.2" />
                              <circle r="10" fill="rgba(59, 130, 246, 0.18)" className="blocked-route-pulse-slow" />
                            </g>
                          </Marker>
                        ))}

                        <defs>
                          <filter id="attackPulseGlow">
                            <feGaussianBlur stdDeviation="2.6" result="coloredBlur" />
                            <feMerge>
                              <feMergeNode in="coloredBlur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>
                      </>
                    );
                  }}
                </Geographies>
              </ComposableMap>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex min-h-[520px] items-center justify-center px-8 text-sm text-[#d9c9a8]">
              Map visualization is unavailable because the map library could not be loaded in this environment.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
