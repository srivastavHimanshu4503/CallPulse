import * as React from "react";

interface LogoProps {
  variant?: "full" | "mark";
  className?: string;
  /**
   * Fixed height in px. Ignored when `responsiveHeight` is set.
   * Kept for existing callers that just need a plain number.
   */
  height?: number;
  /**
   * Any CSS length (e.g. `"88px"`, `"clamp(56px, 5.5vw, 88px)"`).
   * When present, this wins over `height`.
   */
  responsiveHeight?: string;
  title?: string;
}

// Pure text wordmark — no image assets. "Desk" inherits the surrounding text
// color; "Buddy" carries the app's single blue accent.
export function Logo({
  variant = "full",
  className = "",
  height = 28,
  responsiveHeight,
  title = "DeskBuddy",
}: LogoProps): React.JSX.Element {
  const resolvedHeight: string | number = responsiveHeight ?? height;
  // The wordmark's cap height should fill roughly the same box the old image
  // logo did, so font-size tracks the requested height.
  const fontSize =
    typeof resolvedHeight === "number"
      ? `${Math.round(resolvedHeight * 0.72)}px`
      : `calc(${resolvedHeight} * 0.72)`;

  return (
    <span
      role="img"
      aria-label={title}
      title={title}
      className={`inline-flex select-none items-center font-extrabold leading-none tracking-tight ${className}`}
      style={{ height: resolvedHeight, fontSize }}
    >
      {variant === "mark" ? (
        <>
          D<span className="text-blue-600">B</span>
        </>
      ) : (
        <>
          Desk<span className="text-blue-600">Buddy</span>
        </>
      )}
    </span>
  );
}

export default Logo;
