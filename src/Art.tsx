export function Landscape({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={small ? "landscape small" : "landscape"}
      viewBox="0 0 760 460"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={small ? "mist-s" : "mist"}
          x1="0"
          y1="170"
          x2="0"
          y2="440"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#66786e" stopOpacity=".45" />
          <stop offset="1" stopColor="#aeb5a1" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={small ? "ink-s" : "ink"}
          x1="200"
          y1="220"
          x2="350"
          y2="410"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#24483f" stopOpacity=".85" />
          <stop offset="1" stopColor="#698575" stopOpacity=".1" />
        </linearGradient>
        <filter id="rough">
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".018"
            numOctaves="3"
            seed="7"
            result="noise"
          />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" />
        </filter>
      </defs>
      <circle cx="511" cy="104" r="45" fill="#bc8d59" opacity=".62" />
      <g fill={`url(#${small ? "mist-s" : "mist"})`} filter="url(#rough)">
        <path d="M85 355q23-32 42-80 8-16 19 25 12-43 37-65 9-7 21 22 13-25 26-59 17-55 25-37 7 23 12 15 9-26 13-16 12 40 37 81 9-5 18-29 9-9 36 61 9-12 18-48 6-9 34 27 10-6 26-54 9-11 30 72 12-5 19-40 8-18 26 50 12-14 30-40 13 5 25 64 11-18 22-17 17 12 45 72Z" />
        <path
          d="M273 355q26-51 45-92 10-8 22 13 10-25 35-82 6-14 25 25 15-50 30-78 13-35 20-29 8 18 13 14 11-30 26-48 10 0 24 27 16 53 37 98 9-14 17-20 8-4 17 19 15 34 38 79 11-20 21-22 19 16 38 64 13-27 28-33 28 41 69 135Z"
          opacity=".55"
        />
      </g>
      <path
        d="M79 407q24-25 36-41 9-7 32 6 20-40 36-65 8-8 28 10 11-20 22-50 5-7 19 24 8-3 13-29 5-7 20 34 9-1 24-16 10 12 33 57 11-2 22-21 13 13 35 50 17-18 30-17 14 6 39 46 18-18 36-12 13 17 38 27Z"
        fill={`url(#${small ? "ink-s" : "ink"})`}
        filter="url(#rough)"
      />
      <g stroke="#667c6c" strokeWidth=".7" opacity=".24">
        <path d="m254 187 15 48-22 51m219-150 17 44-5 77m-84-32 25 56m-207 49 15 32m122-23 15 47" />
      </g>
      <path
        d="M40 418q100-24 204 0t200-7 256 5M165 435q100-12 212-2t190-5"
        stroke="#6a8170"
        strokeWidth=".7"
        opacity=".4"
      />
      <g stroke="#385248" strokeWidth="1.4" strokeLinecap="round">
        <path d="m354 99 11 3 8 10m-8-10 11-9 8 2M309 125l8 2 7 8m-7-8 8-7 6 1M415 73l7 3 5 7m-5-7 8-5 6 2" />
      </g>
      <g transform="translate(589 295)" stroke="#344e40" opacity=".8">
        <path
          d="M0 111q3-50-8-81m8 37q-14-7-29-22m30 37q12-9 29-16m-32-11 16-26"
          strokeWidth="2.8"
        />
        <g strokeWidth="1.2">
          <path d="m-28 43-18 2m20-1-8-15m9 17-4-20m1 17 9-15m-8 19-1 14M25 67l15 4m-17-5 9-13m-9 16 1 17m-1-20-8-13M8 35l16-4M7 35l2-18m-4 21-8-12" />
        </g>
        <g fill="#344e40" stroke="none">
          <ellipse
            cx="-29"
            cy="38"
            rx="18"
            ry="6"
            transform="rotate(-12 -29 38)"
          />
          <ellipse
            cx="13"
            cy="28"
            rx="17"
            ry="5"
            transform="rotate(-15 13 28)"
          />
          <ellipse cx="28" cy="63" rx="21" ry="6" transform="rotate(9 28 63)" />
        </g>
      </g>
      <g transform="translate(476 385)" stroke="#4e6256" strokeWidth="1">
        <path d="M0 8q25 12 56 0M10 8l-4-7m4 2 17-4m-6-6 2 10m1-14 2 0" />
        <path d="m31 1 28 9" />
      </g>
    </svg>
  );
}

export function Motif({ type }: { type: string }) {
  return (
    <svg className="motif" viewBox="0 0 130 100" fill="none" aria-hidden="true">
      {type === "moon" ? (
        <>
          <circle cx="82" cy="38" r="27" fill="currentColor" opacity=".1" />
          <path
            d="M20 85q25-20 55-8t50-7M35 95q35-15 70-6"
            stroke="currentColor"
            opacity=".2"
          />
        </>
      ) : type === "bamboo" ? (
        <g stroke="currentColor" opacity=".25">
          <path d="M81 105 70 8m24 93L104 24M73 40l-25-16m28 35 22-17m-17 42L56 66" />
          <path
            d="m47 23 15 5-4 12m41 2-10 5 2 12m-35 6 13 7-2 11"
            strokeWidth="4"
          />
        </g>
      ) : (
        <>
          <path
            d="m4 99 30-46 11 8 20-42 19 34 10-10 37 56"
            fill="currentColor"
            opacity=".09"
          />
          <path
            d="m0 96 28-18 19 8 25-29 17 18 13-9 28 30"
            fill="currentColor"
            opacity=".12"
          />
          {type === "river" && (
            <path
              d="M5 92q40-12 70 1t60 0"
              stroke="currentColor"
              opacity=".2"
            />
          )}
        </>
      )}
    </svg>
  );
}
