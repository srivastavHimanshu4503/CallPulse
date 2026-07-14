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
   * When present, this wins over `height` and lets the logo scale with
   * the viewport instead of being pinned to one pixel value.
   */
  responsiveHeight?: string;
  title?: string;
}

// Source PNG dimensions.
const SRC_W = 1536;
const SRC_H = 1024;

// The source PNG has a lot of whitespace padding around the artwork. Both
// variants crop into that whitespace so the rendered pixels are actual
// artwork — otherwise a `height: 44px` element would only show ~20px of
// visible logo with the rest being blank canvas.
//
// Full artwork (mark + INDIAI wordmark + "AI RECEPTIONIST" tagline).
const FULL_X = 220;
const FULL_Y = 245;
const FULL_W = 1135;
const FULL_H = 520;

// Just the mark icon (the speech-bubble face).
const MARK_X = 225;
const MARK_Y = 250;
const MARK_W = 395;
const MARK_H = 500;

// Remote source (transparent-background version hosted on ibb).
const LOGO_URL =
  "https://i.ibb.co/RTNtMkWj/Chat-GPT-Image-Jul-13-2026-04-57-05-PM-Picsart-Background-Remover.png";

// Turn absolute pixel crop rects into scale-independent CSS background
// values, so any height (including `clamp()`) renders correctly.
const cropStyle = (x: number, y: number, w: number, h: number): React.CSSProperties => ({
  aspectRatio: `${w} / ${h}`,
  backgroundImage: `url('${LOGO_URL}')`,
  backgroundSize: `${(SRC_W / w) * 100}% ${(SRC_H / h) * 100}%`,
  backgroundPosition: `${(x / (SRC_W - w)) * 100}% ${(y / (SRC_H - h)) * 100}%`,
  backgroundRepeat: "no-repeat",
});

const FULL_STYLE = cropStyle(FULL_X, FULL_Y, FULL_W, FULL_H);
const MARK_STYLE = cropStyle(MARK_X, MARK_Y, MARK_W, MARK_H);

export function Logo({
  variant = "full",
  className = "",
  height = 28,
  responsiveHeight,
  title = "Indi AI",
}: LogoProps): React.JSX.Element {
  const resolvedHeight: string | number = responsiveHeight ?? height;
  const cropped = variant === "mark" ? MARK_STYLE : FULL_STYLE;

  return (
    <div
      role="img"
      aria-label={title}
      title={title}
      className={className}
      style={{ height: resolvedHeight, ...cropped }}
    />
  );
}

export default Logo;
