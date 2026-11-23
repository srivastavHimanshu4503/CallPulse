import * as React from "react";
import { cn } from "./utils.js";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
  as?: keyof React.JSX.IntrinsicElements;
}

export function Card({
  children,
  className,
  padded = true,
  as: Tag = "div",
}: CardProps): React.JSX.Element {
  return React.createElement(
    Tag,
    {
      className: cn(
        "rounded-xl border border-line-default bg-bg-raised shadow-card",
        padded && "p-4",
        className,
      ),
    },
    children,
  );
}
