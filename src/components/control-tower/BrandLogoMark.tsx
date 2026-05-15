/**
 * UX V2.2 §2 — ArcadeOps emblem.
 *
 * Custom radar-tower-meets-shield mark used in the compact dashboard
 * header. No external asset, no SVG file: pure inline SVG so it
 * tree-shakes with the component and inherits the Tailwind text
 * color via `currentColor`. Intentionally minimal — premium not
 * over-designed.
 */

interface BrandLogoMarkProps {
  /** Tailwind size class (e.g. "h-7 w-7"). Defaults to compact 28px. */
  className?: string;
  /** Accessible label exposed via `<title>`. */
  title?: string;
}

export function BrandLogoMark({
  className = "h-7 w-7",
  title = "ArcadeOps",
}: BrandLogoMarkProps) {
  return (
    <svg
      role="img"
      aria-label={title}
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      {/* Outer shield silhouette — protective gate metaphor. */}
      <path
        d="M16 2.5 L26.5 6 V14.5 C26.5 21 22 26.5 16 29.5 C10 26.5 5.5 21 5.5 14.5 V6 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        className="text-emerald-300"
      />
      {/* Inner radar dish base. */}
      <path
        d="M10 18 H22"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        className="text-emerald-300/80"
      />
      {/* Radar tower vertical mast. */}
      <path
        d="M16 18 V11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        className="text-emerald-200"
      />
      {/* Radar dish concentric arcs — scan signal. */}
      <path
        d="M11.5 11 A4.5 4.5 0 0 1 20.5 11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        className="text-emerald-200"
      />
      <path
        d="M13.5 11 A2.5 2.5 0 0 1 18.5 11"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        className="text-emerald-100"
      />
      {/* Center pulse — production gate dot. */}
      <circle
        cx="16"
        cy="11"
        r="0.9"
        fill="currentColor"
        className="text-emerald-200"
      />
    </svg>
  );
}
