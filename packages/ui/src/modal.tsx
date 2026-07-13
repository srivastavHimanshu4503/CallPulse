import * as React from "react";
import { cn } from "./utils.js";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  /**
   * Disable the backdrop blur. backdrop-filter forces the compositor to
   * repaint whatever is behind the modal every frame, which is 10-30ms of
   * main-thread + compositor work on modest hardware. Opt out for modals
   * that render live content (WebRTC audio, streaming transcripts, timers)
   * where any per-frame overhead is felt as UI lag.
   */
  backdropBlur?: boolean;
}

const sizeClass: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  header,
  children,
  className,
  size = "md",
  closeOnBackdrop = true,
  closeOnEscape = true,
  backdropBlur = true,
}: ModalProps): React.JSX.Element | null {
  const [mounted, setMounted] = React.useState(false);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 150);
    return () => clearTimeout(t);
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={cn(
          "fixed inset-0 bg-black/40 transition-opacity duration-150 ease-out",
          backdropBlur && "backdrop-blur-[2px]",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-50 w-full rounded-xl border border-border bg-background shadow-2xl flex flex-col overflow-hidden",
          "transition-opacity duration-150 ease-out",
          visible ? "opacity-100" : "opacity-0",
          sizeClass[size],
          className
        )}
      >
        {(header ?? title) && (
          <div className="h-14 border-b border-border px-5 flex items-center justify-between shrink-0 bg-background">
            {header ?? <h2 className="text-sm font-semibold text-text-primary truncate">{title}</h2>}
            {!header && (
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 rounded-md hover:bg-surface flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
