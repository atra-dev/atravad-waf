'use client';

const blockedRoutes = [
  {
    label: 'China',
    start: { x: 650, y: 168 },
    end: { x: 492, y: 334 },
    control: { x: 610, y: 248 },
  },
  {
    label: 'United States',
    start: { x: 154, y: 196 },
    end: { x: 492, y: 334 },
    control: { x: 294, y: 126 },
  },
  {
    label: 'Russia',
    start: { x: 560, y: 108 },
    end: { x: 492, y: 334 },
    control: { x: 610, y: 212 },
  },
  {
    label: 'Iran',
    start: { x: 510, y: 204 },
    end: { x: 492, y: 334 },
    control: { x: 546, y: 268 },
  },
  {
    label: 'Brazil',
    start: { x: 274, y: 350 },
    end: { x: 492, y: 334 },
    control: { x: 376, y: 410 },
  },
  {
    label: 'Germany',
    start: { x: 446, y: 170 },
    end: { x: 492, y: 334 },
    control: { x: 488, y: 246 },
  },
];

const regionShapes = [
  'M78 144C126 115 204 104 266 126C319 144 356 185 344 232C332 278 273 292 224 314C186 331 150 354 116 343C74 330 49 284 44 240C40 201 48 163 78 144Z',
  'M352 122C398 101 460 97 516 116C566 133 608 171 614 214C620 259 589 291 540 308C493 324 438 320 397 338C358 355 327 386 293 372C255 356 240 310 242 267C244 213 283 155 352 122Z',
  'M622 144C652 129 694 128 730 140C768 153 798 182 804 218C810 252 790 287 754 306C720 324 677 326 642 314C607 302 582 274 580 240C577 203 590 162 622 144Z',
  'M478 344C498 332 528 330 554 339C579 348 598 370 601 396C604 426 592 454 568 471C545 487 514 491 489 482C463 472 445 448 442 420C439 391 455 358 478 344Z',
];

function RoutePath({ route, index }) {
  const path = `M ${route.start.x} ${route.start.y} Q ${route.control.x} ${route.control.y} ${route.end.x} ${route.end.y}`;

  return (
    <g key={route.label}>
      <path
        d={path}
        fill="none"
        stroke="rgba(239, 68, 68, 0.16)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d={path}
        fill="none"
        stroke="rgba(239, 68, 68, 0.78)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="7 10"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="34"
          to="0"
          dur={`${2.8 + index * 0.28}s`}
          repeatCount="indefinite"
        />
      </path>
      <circle r="4.5" fill="rgba(248, 113, 113, 0.98)">
        <animateMotion
          dur={`${3.2 + index * 0.35}s`}
          repeatCount="indefinite"
          rotate="auto"
          begin={`${index * 0.28}s`}
          path={path}
        />
      </circle>
      <circle r="2.6" fill="rgba(254, 242, 242, 0.95)">
        <animateMotion
          dur={`${3.2 + index * 0.35}s`}
          repeatCount="indefinite"
          rotate="auto"
          begin={`${index * 0.28}s`}
          path={path}
        />
      </circle>
    </g>
  );
}

export function BlockedTrafficMap() {
  return (
    <div className="relative overflow-hidden" aria-hidden="true">
      <div className="relative overflow-hidden rounded-[32px] border border-[#d4a64f]/12 bg-[radial-gradient(circle_at_top,rgba(114,18,36,0.18),transparent_28%),linear-gradient(180deg,rgba(14,10,15,0.94),rgba(8,5,7,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.36)]">
        <div className="pointer-events-none absolute inset-x-10 top-4 h-32 rounded-full bg-[radial-gradient(circle,rgba(124,22,33,0.18),transparent_68%)] blur-3xl" />
        <div className="pointer-events-none absolute bottom-8 right-14 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(212,166,79,0.14),transparent_70%)] blur-2xl" />

        <svg viewBox="0 0 860 520" className="relative z-10 w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="route-grid" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(212,166,79,0.10)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
            </linearGradient>
            <linearGradient id="map-fill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(236,213,177,0.12)" />
              <stop offset="100%" stopColor="rgba(236,213,177,0.04)" />
            </linearGradient>
          </defs>

          {Array.from({ length: 8 }, (_, index) => 90 + index * 85).map((x) => (
            <line
              key={`grid-v-${x}`}
              x1={x}
              y1="48"
              x2={x}
              y2="470"
              stroke="url(#route-grid)"
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: 5 }, (_, index) => 102 + index * 78).map((y) => (
            <path
              key={`grid-h-${y}`}
              d={`M54 ${y} C 242 ${y - 26}, 620 ${y - 26}, 808 ${y}`}
              fill="none"
              stroke="url(#route-grid)"
              strokeWidth="1"
            />
          ))}

          {regionShapes.map((shape, index) => (
            <path
              key={shape}
              d={shape}
              fill={index === 2 ? 'rgba(185, 28, 28, 0.44)' : 'url(#map-fill)'}
              stroke={index === 2 ? 'rgba(254, 202, 202, 0.38)' : 'rgba(255,255,255,0.12)'}
              strokeWidth="1.1"
            />
          ))}

          {blockedRoutes.map((route, index) => (
            <RoutePath key={route.label} route={route} index={index} />
          ))}

          {blockedRoutes.map((route) => (
            <g key={`${route.label}-origin`}>
              <circle
                cx={route.start.x}
                cy={route.start.y}
                r="4.5"
                fill="rgba(127, 29, 29, 0.95)"
                stroke="rgba(254, 202, 202, 0.9)"
                strokeWidth="1.2"
              />
              <circle cx={route.start.x} cy={route.start.y} r="9" fill="rgba(239, 68, 68, 0.16)">
                <animate
                  attributeName="r"
                  values="6;11;6"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.45;0.15;0.45"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          ))}

          <g>
            <circle
              cx="492"
              cy="334"
              r="6"
              fill="rgba(185, 28, 28, 0.96)"
              stroke="rgba(254, 202, 202, 0.95)"
              strokeWidth="1.4"
            />
            <circle cx="492" cy="334" r="14" fill="rgba(239, 68, 68, 0.16)">
              <animate
                attributeName="r"
                values="10;18;10"
                dur="2.1s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.42;0.10;0.42"
                dur="2.1s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        </svg>
      </div>
    </div>
  );
}
