import * as React from "react";

interface LogoProps {
  variant?: "full" | "mark";
  className?: string;
  height?: number;
  responsiveHeight?: string;
  title?: string;
}

export function Logo({
  variant = "full",
  className = "",
  height = 28,
  responsiveHeight,
  title = "DeskBuddy",
}: LogoProps): React.JSX.Element {
  const resolvedHeight: string | number = responsiveHeight ?? height;
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
          D<span className="text-brand">B</span>
        </>
      ) : (
        <>
          Desk<span className="text-brand">Buddy</span>
        </>
      )}
    </span>
  );
}

export default Logo;
