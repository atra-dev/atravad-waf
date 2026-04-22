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

function normalizeCountryName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[().,']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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
      return {
        name,
        geo,
        coordinates,
      };
    })
    .filter(Boolean)
    .slice(0, 3);
}

function buildBlockedRoutes(blockedCountries, geographies, protectedEntries) {
  if (protectedEntries.length === 0) return [];

  return (Array.isArray(blockedCountries) ? blockedCountries : [])
    .filter((country) => Number(country?.blocked || 0) > 0)
    .sort((a, b) => Number(b?.blocked || 0) - Number(a?.blocked || 0))
    .slice(0, 6)
    .map((country, index) => {
      const sourceGeo = getGeoForCountry(country, geographies);
      const sourceCoordinates = getGeoCoordinates(sourceGeo);
      const target = protectedEntries[index % protectedEntries.length];
      if (!sourceGeo || !sourceCoordinates || !target?.coordinates) return null;

      return {
        id: `${country.code || country.name || index}-${target.name}-${index}`,
        label: country.name || country.code || `Source ${index + 1}`,
        blocked: Number(country.blocked || 0),
        startCoordinates: sourceCoordinates,
        endCoordinates: target.coordinates,
      };
    })
    .filter(Boolean);
}

function buildExactPointRoutes(attackPoints, protectedEntries) {
  if (protectedEntries.length === 0) return [];

  return (Array.isArray(attackPoints) ? attackPoints : [])
    .filter((point) => Number.isFinite(Number(point?.latitude)) && Number.isFinite(Number(point?.longitude)))
    .slice(0, 40)
    .map((point, index) => {
      const target = protectedEntries[index % protectedEntries.length];
      if (!target?.coordinates) return null;

      return {
        id: point.id || `${point.ip || point.country || index}-${index}`,
        label: point.country || point.ip || `Source ${index + 1}`,
        blocked: Number(point.blocked || 1),
        startCoordinates: [Number(point.longitude), Number(point.latitude)],
        endCoordinates: target.coordinates,
      };
    })
    .filter(Boolean);
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
                    const exactPointRoutes = buildExactPointRoutes(attackPoints, protectedEntries);
                    const blockedRoutes = exactPointRoutes.length > 0
                      ? exactPointRoutes
                      : buildBlockedRoutes(countries, geographies, protectedEntries);
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
                                fill="none"
                                stroke="rgba(239, 68, 68, 0.18)"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                              />
                              <path
                                d={routePath}
                                className="blocked-route-line"
                                fill="none"
                                stroke="rgba(239, 68, 68, 0.82)"
                                strokeWidth="2"
                                strokeLinecap="round"
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
