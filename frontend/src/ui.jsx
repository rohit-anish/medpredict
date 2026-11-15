// Shared brand mark and line icons (24×24, stroke-based).

const PATHS = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  heart: "M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z",
  alert: "M12 3.5L2.5 20h19L12 3.5zM12 10v4.5M12 17.2v.1",
  pulse: "M2.5 12h4l2.5-6 4.5 12 2.5-6h5.5",
  sigma: "M18 5H6l6 7-6 7h12",
  file: "M14 3H6.5v18h11V6.5L14 3zM14 3v3.5h3.5M12 10.5v6M9.2 14l2.8 2.8 2.8-2.8",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  shield: "M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6L12 3z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.8v.1",
};

export function Icon({ name, size = 20, strokeWidth = 2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export function Brand({ onClick }) {
  const inner = (
    <>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="#fff">
          <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />
        </svg>
      </span>
      <span className="brand-name">MedPredict</span>
    </>
  );
  return onClick ? (
    <button type="button" className="brand brand-btn" onClick={onClick} title="Home">
      {inner}
    </button>
  ) : (
    <div className="brand">{inner}</div>
  );
}

// A single ECG beat, drawn as an SVG path. Used on the home and sign-in pages.
export function EcgLine({ className, height = 70 }) {
  return (
    <svg className={className} viewBox="0 0 420 70" height={height} preserveAspectRatio="none" fill="none" aria-hidden="true">
      <path
        d="M0 42 H70 Q82 30 94 42 H112 L120 50 L132 6 L144 64 L152 42 H190 Q215 18 240 42 H300 Q312 30 324 42 H340 L348 50 L360 6 L372 64 L380 42 H420"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        pathLength="1"
      />
    </svg>
  );
}
