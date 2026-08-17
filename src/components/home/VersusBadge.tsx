export function VersusBadge() {
  return (
    <svg
      viewBox="0 0 120 96"
      className="z-10 h-12 w-16 shrink-0 drop-shadow-[0_12px_20px_rgba(0,0,0,0.9)] md:h-14 md:w-18"
      aria-hidden="true"
    >
      {/* Outer architectural frame */}
      <path
        d="M8 17 L35 10 L60 17 L85 10 L112 17 L105 79 L78 86 L60 79 L42 86 L15 79 Z"
        fill="#fff"
        stroke="#000"
        strokeWidth="2"
      />

      {/* Inner black field */}
      <path
        d="M14 21 L38 15 L60 21 L82 15 L106 21 L100 75 L77 81 L60 75 L43 81 L20 75 Z"
        fill="#000"
      />

      {/* Decorative diagonal cuts */}
      <path
        d="M17 27 L31 23"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M89 23 L103 27"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* V */}
      <text
        x="14"
        y="64"
        fill="#fff"
        fontFamily="Arial Black, Arial, Helvetica, sans-serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize="40"
      >
        V
      </text>

      {/* S */}
      <text
        x="66"
        y="64"
        fill="#fff"
        fontFamily="Arial Black, Arial, Helvetica, sans-serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize="40"
      >
        S
      </text>

      {/* Subtle center divider */}
      <path
        d="M60 27 L60 69"
        stroke="#fff"
        strokeWidth="1"
        opacity="0.25"
      />

      {/* Center dot */}
      <circle
        cx="60"
        cy="48"
        r="2"
        fill="#fff"
      />
    </svg>
  );
}