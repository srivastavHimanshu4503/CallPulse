import * as React from "react";
import { cn } from "./utils.js";
import { Button } from "./button.js";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps): React.JSX.Element | null {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Container */}
      <div
        className={cn(
          "relative z-50 w-full max-w-lg rounded-xl border border-border-dark dark:border-border-light bg-background-dark dark:bg-background-light p-6 shadow-2xl transition-all duration-200 animate-in fade-in zoom-in-95",
          className
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-dark dark:text-text-light">{title}</h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="text-text-dark dark:text-text-light">{children}</div>
      </div>
    </div>
  );
}
