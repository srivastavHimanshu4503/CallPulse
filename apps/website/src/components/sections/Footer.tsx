import { Logo } from "../common/Logo";
import { VERTICALS } from "../../data/verticals";
import { CITIES } from "../../data/cities";

export function Footer() {
  return (
    <footer className="bg-bg-inverse border-t border-white/10 px-4 sm:px-6 py-14 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <Logo height={24} className="text-white" />
            <p className="mt-3 text-[13px] text-white/50 leading-relaxed max-w-xs">
              The AI receptionist for Indian businesses. Every call answered, every customer kept.
            </p>
          </div>

          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-white/40 mb-3">
              Product
            </h4>
            <ul className="space-y-2 text-[13.5px]">
              <li>
                <a href="/#features" className="text-white/70 hover:text-white transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="/#pricing" className="text-white/70 hover:text-white transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="/#faq" className="text-white/70 hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="https://app.deskbuddy.in/login"
                  className="text-white/70 hover:text-white transition-colors"
                >
                  Log in
                </a>
              </li>
              <li>
                <a
                  href="https://app.deskbuddy.in/register"
                  className="text-white/70 hover:text-white transition-colors"
                >
                  Get started
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-white/40 mb-3">
              For your business
            </h4>
            <ul className="space-y-2 text-[13.5px]">
              {VERTICALS.map((v) => (
                <li key={v.slug}>
                  <a
                    href={`/for/${v.slug}`}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    {v.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-white/40 mb-3">
              In your city
            </h4>
            <ul className="space-y-2 text-[13.5px]">
              {CITIES.map((c) => (
                <li key={c.slug}>
                  <a
                    href={`/city/${c.slug}`}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    {c.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12.5px] text-white/40">
            © {new Date().getFullYear()} DeskBuddy · Made in India
          </p>
          <ul className="flex items-center gap-5 text-[12.5px]">
            <li>
              <a
                href="mailto:hello@deskbuddy.in"
                className="text-white/50 hover:text-white transition-colors"
              >
                Contact
              </a>
            </li>
            <li>
              <a href="/privacy" className="text-white/50 hover:text-white transition-colors">
                Privacy
              </a>
            </li>
            <li>
              <a href="/terms" className="text-white/50 hover:text-white transition-colors">
                Terms
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
