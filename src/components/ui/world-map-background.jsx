'use client';

let ComposableMap;
let Geographies;
let Geography;

try {
  const maps = require('react-simple-maps');
  ComposableMap = maps.ComposableMap;
  Geographies = maps.Geographies;
  Geography = maps.Geography;
} catch (error) {
  ComposableMap = null;
  Geographies = null;
  Geography = null;
}

export function WorldMapBackground() {
  if (!ComposableMap) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[165vw] -translate-x-1/2 overflow-hidden opacity-[0.12] [mask-image:linear-gradient(90deg,transparent_0%,black_10%,black_90%,transparent_100%)]">
      <ComposableMap
        projectionConfig={{ scale: 182, center: [0, 16] }}
        className="h-full w-full scale-[1.22]"
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="rgba(255, 244, 216, 0.28)"
                stroke="rgba(212, 166, 79, 0.2)"
                strokeWidth={0.4}
                style={{
                  default: { outline: 'none' },
                  hover: { outline: 'none' },
                  pressed: { outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}
