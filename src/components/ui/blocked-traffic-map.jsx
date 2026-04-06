'use client';

import { useEffect, useState } from 'react';
import { geoEqualEarth } from 'd3-geo';

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

const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;
const MAP_SCALE = 164;
const MAP_CENTER = [0, 17];
const MAP_TRANSLATE = [MAP_WIDTH / 2, MAP_HEIGHT / 2 - 20];
const mapProjection = geoEqualEarth()
  .scale(MAP_SCALE)
  .center(MAP_CENTER)
  .translate(MAP_TRANSLATE);

const blockedCountryCodes = new Set([
  'CN',
  'CHN',
  'US',
  'USA',
  'RU',
  'RUS',
  'KP',
  'PRK',
  'IR',
  'IRN',
  'BR',
  'BRA',
  'DE',
  'DEU',
  'IN',
  'IND',
  'VN',
  'VNM',
  'UA',
  'UKR',
]);

const blockedCountryNames = new Set([
  'china',
  'united states of america',
  'united states',
  'russia',
  'russian federation',
  'north korea',
  'iran',
  'brazil',
  'germany',
  'india',
  'vietnam',
  'ukraine',
]);

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

function isBlockedCountry(geo) {
  const { codes, names } = getCountryIdentifiers(geo);

  if (codes.some((code) => blockedCountryCodes.has(code))) {
    return true;
  }

  return names.some((name) => blockedCountryNames.has(name));
}

const blockedRoutes = [
  {
    label: 'China',
    start: { lat: 35.8617, lng: 104.1954 },
    end: { lat: 14.5995, lng: 120.9842 },
  },
  {
    label: 'United States',
    start: { lat: 37.0902, lng: -95.7129 },
    end: { lat: 14.5995, lng: 120.9842 },
  },
  {
    label: 'Russia',
    start: { lat: 61.524, lng: 105.3188 },
    end: { lat: 14.5995, lng: 120.9842 },
  },
  {
    label: 'Iran',
    start: { lat: 32.4279, lng: 53.688 },
    end: { lat: 14.5995, lng: 120.9842 },
  },
  {
    label: 'Brazil',
    start: { lat: -14.235, lng: -51.9253 },
    end: { lat: 14.5995, lng: 120.9842 },
  },
  {
    label: 'Germany',
    start: { lat: 51.1657, lng: 10.4515 },
    end: { lat: 14.5995, lng: 120.9842 },
  },
];

const protectedNodes = [
  { label: 'Protected edge', coordinates: [120.9842, 14.5995] },
];

function buildRoutePath(route) {
  const startPoint = mapProjection([route.start.lng, route.start.lat]);
  const endPoint = mapProjection([route.end.lng, route.end.lat]);

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

export function BlockedTrafficMap() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="relative overflow-hidden">
      <div className="relative">
        {isMounted && ComposableMap && Marker ? (
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
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const isBlocked = isBlockedCountry(geo);

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={isBlocked ? 'rgba(185, 28, 28, 0.9)' : 'rgba(236, 213, 177, 0.12)'}
                          stroke={isBlocked ? 'rgba(254, 202, 202, 0.65)' : 'rgba(255,255,255,0.18)'}
                          strokeWidth={0.45}
                          style={{
                            default: { outline: 'none' },
                            hover: {
                              outline: 'none',
                              fill: isBlocked ? 'rgba(220, 38, 38, 1)' : 'rgba(212, 166, 79, 0.32)',
                            },
                            pressed: { outline: 'none' },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>

                {blockedRoutes.map((route) => (
                  <Marker key={`${route.label}-start`} coordinates={[route.start.lng, route.start.lat]}>
                    <g>
                      <circle r="4.5" fill="rgba(127, 29, 29, 0.95)" stroke="rgba(254, 202, 202, 0.9)" strokeWidth="1.2" />
                      <circle r="9" fill="rgba(239, 68, 68, 0.16)" className="blocked-route-pulse" />
                    </g>
                  </Marker>
                ))}

                {protectedNodes.map((node) => (
                  <Marker key={node.label} coordinates={node.coordinates}>
                    <g>
                      <circle r="5" fill="rgba(185, 28, 28, 0.96)" stroke="rgba(254, 202, 202, 0.95)" strokeWidth="1.2" />
                      <circle r="10" fill="rgba(239, 68, 68, 0.16)" className="blocked-route-pulse-slow" />
                    </g>
                  </Marker>
                ))}
              </ComposableMap>

              <svg
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                className="pointer-events-none absolute inset-0 z-20 h-full w-full"
                aria-hidden="true"
              >
                <defs>
                  <filter id="attackPulseGlow">
                    <feGaussianBlur stdDeviation="2.6" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {blockedRoutes.map((route, index) => {
                  const routePath = buildRoutePath(route);

                  if (!routePath) {
                    return null;
                  }

                  return (
                    <g key={`${route.label}-route`}>
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
                      <circle r="5.5" fill="rgba(239, 68, 68, 0.22)" className="blocked-impact-pulse">
                        <animate
                          attributeName="opacity"
                          values="0.1;0.6;0.1"
                          dur={`${2.2 + index * 0.22}s`}
                          repeatCount="indefinite"
                          begin={`${index * 0.28}s`}
                        />
                        <animate
                          attributeName="r"
                          values="4;10;4"
                          dur={`${2.2 + index * 0.22}s`}
                          repeatCount="indefinite"
                          begin={`${index * 0.28}s`}
                        />
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
              </svg>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex min-h-[520px] items-center justify-center px-8 text-sm text-[#d9c9a8]">
              {isMounted
                ? 'Map visualization is unavailable because the map library could not be loaded in this environment.'
                : 'Loading global traffic map...'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
