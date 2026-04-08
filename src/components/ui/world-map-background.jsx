const continentShapes = [
  'M120 130C158 103 217 94 264 117C304 136 324 169 314 205C304 244 261 254 219 274C183 292 156 321 129 310C97 296 79 251 76 211C72 176 88 148 120 130Z',
  'M365 122C401 104 455 101 499 115C537 127 572 151 582 183C593 217 573 247 538 262C504 277 466 279 433 296C400 312 370 340 339 327C305 313 291 269 294 232C298 188 327 147 365 122Z',
  'M625 156C654 138 696 136 729 149C761 161 786 188 790 220C794 254 774 286 742 303C710 320 671 322 641 308C610 294 590 264 587 233C584 201 598 171 625 156Z',
  'M505 340C529 327 561 325 587 336C612 347 629 370 631 397C633 427 620 456 595 473C572 489 541 494 516 484C489 474 470 450 468 423C466 393 479 355 505 340Z',
  'M698 372C718 360 748 360 772 370C795 380 809 399 810 421C811 446 799 469 777 481C755 493 726 495 704 484C681 472 667 449 666 425C664 404 678 384 698 372Z',
];

const longitudeLines = [160, 260, 360, 460, 560, 660, 760];
const latitudeLines = [160, 240, 320, 400];

export function WorldMapBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 left-1/2 w-[165vw] -translate-x-1/2 overflow-hidden opacity-[0.12] [mask-image:linear-gradient(90deg,transparent_0%,black_10%,black_90%,transparent_100%)]"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 900 540"
        className="h-full w-full scale-[1.18]"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="world-map-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,244,216,0.42)" />
            <stop offset="100%" stopColor="rgba(212,166,79,0.18)" />
          </linearGradient>
        </defs>

        {latitudeLines.map((y) => (
          <path
            key={`lat-${y}`}
            d={`M52 ${y} C 250 ${y - 30}, 650 ${y - 30}, 848 ${y}`}
            fill="none"
            stroke="rgba(255,244,216,0.08)"
            strokeWidth="1"
          />
        ))}

        {longitudeLines.map((x) => (
          <path
            key={`lon-${x}`}
            d={`M${x} 52 C ${x - 34} 170, ${x + 28} 358, ${x} 488`}
            fill="none"
            stroke="rgba(212,166,79,0.08)"
            strokeWidth="1"
          />
        ))}

        {continentShapes.map((shape, index) => (
          <path
            key={shape}
            d={shape}
            fill="rgba(255,244,216,0.24)"
            stroke="url(#world-map-stroke)"
            strokeWidth="1.2"
            opacity={index === 1 ? 0.95 : 0.82}
          />
        ))}
      </svg>
    </div>
  );
}
