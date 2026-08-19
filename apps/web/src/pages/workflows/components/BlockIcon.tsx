import * as React from "react";
import * as Icons from "lucide-react";
import { cn } from "@antigravity/ui";
import { TONE_STYLES } from "../registry.js";
import type { BlockTone } from "../types.js";

interface BlockIconProps {
  icon: string;
  tone: BlockTone;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Renders a tinted rounded tile with the lucide icon named in the registry.
 * We look up dynamically so registry entries stay as simple strings.
 */
export function BlockIcon({
  icon,
  tone,
  size = "md",
  className,
}: BlockIconProps): React.JSX.Element {
  const IconCmp =
    (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[icon] ||
    Icons.Zap;
  const t = TONE_STYLES[tone];
  const dims = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span
      className={cn(
        `${dims} rounded-lg ring-1 flex items-center justify-center shrink-0`,
        t.tile,
        t.ring,
        className,
      )}
    >
      <IconCmp className={iconSize} />
    </span>
  );
}
