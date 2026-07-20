import { motion } from "framer-motion";
import { useRef, type ReactNode } from "react";

export function SpotlightCard({
  children,
  className = "",
  lift = true,
}: {
  children: ReactNode;
  className?: string;
  lift?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={ref}
      whileHover={lift ? { y: -5 } : undefined}
      transition={{ duration: 0.3 }}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
        el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
      }}
      className={`spotlight ${className}`}
    >
      {children}
    </motion.div>
  );
}
