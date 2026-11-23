import * as React from "react";
import { cn } from "./utils.js";

interface AvatarProps {
  name: string;
  gradient?: string;
  size?: number;
  className?: string;
}

// Deterministic pastel-ish gradient palette so the same name always gets the
// same tile — avoids random flicker between renders.
const PALETTE = [
  "from-blue-500 to-blue-700",
  "from-indigo-500 to-indigo-700",
  "from-emerald-500 to-emerald-700",
  "from-indigo-500 to-indigo-700",
  "from-rose-500 to-rose-700",
  "from-amber-500 to-amber-700",
  "from-blue-500 to-blue-700",
];

function pickGradient(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum = (sum + name.charCodeAt(i)) % 997;
  return PALETTE[sum % PALETTE.length]!;
}

export function Avatar({ name, gradient, size = 28, className }: AvatarProps): React.JSX.Element {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const g = gradient || pickGradient(name);
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0 bg-gradient-to-br",
        g,
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  );
}
