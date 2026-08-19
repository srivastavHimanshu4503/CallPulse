import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { Logo } from "../common/Logo";
import { EASE } from "../motion/primitives";
import { VERTICALS } from "../../data/verticals";
import { CITIES } from "../../data/cities";

const LINKS = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

// The Solutions + Cities dropdown links are always in the DOM (not conditionally
// rendered) so Googlebot follows them on every page visit — big internal-linking
// signal for the vertical + city landing pages.
export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openMobileMenu, setOpenMobileMenu] = useState<"solutions" | "cities" | null>(null);

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
        <a href="/" aria-label="DeskBuddy home" className="relative inline-flex items-center">
          <Logo height={26} />
        </a>

        <div className="hidden md:flex items-center gap-6">
          <NavDropdown
            label="Solutions"
            items={VERTICALS.map((v) => ({
              label: `AI receptionist for ${v.name}`,
              href: `/for/${v.slug}`,
            }))}
          />
          <NavDropdown
            label="Cities"
            items={CITIES.map((c) => ({
              label: `AI receptionist in ${c.name}`,
              href: `/city/${c.slug}`,
            }))}
          />
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="nav-link text-[13.5px] font-medium text-fg-secondary hover:text-fg-primary transition-colors"
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
            className="btn-primary text-[13.5px] font-semibold rounded-[8px] px-4 py-2"
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
            <div className="px-4 py-4 space-y-1 max-h-[70vh] overflow-y-auto">
              <MobileSection
                label="Solutions"
                isOpen={openMobileMenu === "solutions"}
                onToggle={() =>
                  setOpenMobileMenu(openMobileMenu === "solutions" ? null : "solutions")
                }
                items={VERTICALS.map((v) => ({
                  label: `AI receptionist for ${v.name}`,
                  href: `/for/${v.slug}`,
                }))}
                onNavigate={() => setOpen(false)}
              />
              <MobileSection
                label="Cities"
                isOpen={openMobileMenu === "cities"}
                onToggle={() => setOpenMobileMenu(openMobileMenu === "cities" ? null : "cities")}
                items={CITIES.map((c) => ({
                  label: `AI receptionist in ${c.name}`,
                  href: `/city/${c.slug}`,
                }))}
                onNavigate={() => setOpen(false)}
              />
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
                  className="btn-primary text-center text-[14px] font-semibold rounded-[6px] px-4 py-2.5"
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

function NavDropdown({
  label,
  items,
}: {
  label: string;
  items: { label: string; href: string }[];
}) {
  return (
    <div className="relative group">
      <button
        type="button"
        className="nav-link inline-flex items-center gap-1 text-[13.5px] font-medium text-fg-secondary hover:text-fg-primary transition-colors py-2"
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
      </button>
      {/* Panel is always mounted so its links are in the DOM for crawlers;
          CSS opacity/pointer-events control visibility. */}
      <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto absolute left-0 top-full mt-1 w-[280px] bg-bg-canvas border border-line-default rounded-[12px] shadow-[0_20px_50px_-16px_rgba(15,23,42,0.18)] p-2 transition-all duration-150">
        <ul className="max-h-[380px] overflow-y-auto">
          {items.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="block px-3 py-2 text-[13px] text-fg-primary hover:bg-bg-muted rounded-[8px] transition-colors"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MobileSection({
  label,
  items,
  isOpen,
  onToggle,
  onNavigate,
}: {
  label: string;
  items: { label: string; href: string }[];
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-2 py-2.5 text-[15px] font-medium text-fg-primary rounded-[6px] hover:bg-bg-muted"
      >
        {label}
        <ChevronDown
          className={`h-4 w-4 text-fg-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {/* Always rendered — hidden via CSS so crawler still sees the links. */}
      <ul className={`${isOpen ? "block" : "hidden"} pl-2 pb-2 space-y-0.5`}>
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              onClick={onNavigate}
              className="block px-2 py-2 text-[13.5px] text-fg-secondary hover:text-fg-primary rounded-[6px]"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
