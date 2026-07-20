import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "../common/Logo";
import { EASE } from "../motion/primitives";

const LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Industries", href: "#industries" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      className={`sticky top-0 z-50 bg-bg-canvas/85 backdrop-blur-md transition-shadow duration-300 ${
        scrolled
          ? "border-b border-line-subtle shadow-[0_1px_12px_rgba(15,23,42,0.05)]"
          : "border-b border-transparent"
      }`}
    >
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <a href="/" aria-label="DeskBuddy home">
          <Logo height={26} />
        </a>

        <div className="hidden md:flex items-center gap-7">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13.5px] font-medium text-fg-secondary hover:text-fg-primary transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a
            href="https://app.deskbuddy.in/login"
            className="text-[13.5px] font-semibold text-fg-secondary hover:text-fg-primary px-3 py-2 transition-colors"
          >
            Log in
          </a>
          <a
            href="https://app.deskbuddy.in/register"
            className="text-[13.5px] font-semibold text-white bg-brand hover:bg-brand-600 rounded-[6px] px-4 py-2 transition-all hover:shadow-[0_6px_16px_-6px_rgba(37,99,235,0.5)]"
          >
            Get started
          </a>
        </div>

        <button
          type="button"
          className="md:hidden p-2 -mr-2 text-fg-primary"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="md:hidden overflow-hidden border-t border-line-subtle bg-bg-canvas"
          >
            <div className="px-4 py-4 space-y-1">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block px-2 py-2.5 text-[15px] font-medium text-fg-primary rounded-[6px] hover:bg-bg-muted"
                >
                  {l.label}
                </a>
              ))}
              <div className="pt-3 mt-2 border-t border-line-subtle grid grid-cols-2 gap-2">
                <a
                  href="https://app.deskbuddy.in/login"
                  className="text-center text-[14px] font-semibold text-fg-primary border border-line-default rounded-[6px] px-4 py-2.5"
                >
                  Log in
                </a>
                <a
                  href="https://app.deskbuddy.in/register"
                  className="text-center text-[14px] font-semibold text-white bg-brand rounded-[6px] px-4 py-2.5"
                >
                  Get started
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
