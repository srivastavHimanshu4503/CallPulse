import { Logo } from "../common/Logo";

export function Footer() {
  return (
    <footer className="bg-bg-inverse border-t border-white/10 px-4 sm:px-6 py-14 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-3 gap-10">
          <div>
            <Logo height={24} className="text-white" />
            <p className="mt-3 text-[13px] text-white/50 leading-relaxed max-w-xs">
              The AI receptionist for Indian businesses. Every call answered,
              every customer kept.
            </p>
          </div>

          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-white/40 mb-3">
              Product
            </h4>
            <ul className="space-y-2 text-[13.5px]">
              <li><a href="#features" className="text-white/70 hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-white/70 hover:text-white transition-colors">Pricing</a></li>
              <li><a href="https://app.deskbuddy.in/login" className="text-white/70 hover:text-white transition-colors">Log in</a></li>
              <li><a href="https://app.deskbuddy.in/register" className="text-white/70 hover:text-white transition-colors">Get started</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-white/40 mb-3">
              Company
            </h4>
            <ul className="space-y-2 text-[13.5px]">
              <li><a href="mailto:hello@deskbuddy.in" className="text-white/70 hover:text-white transition-colors">Contact</a></li>
              <li><a href="/privacy" className="text-white/70 hover:text-white transition-colors">Privacy</a></li>
              <li><a href="/terms" className="text-white/70 hover:text-white transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 text-[12.5px] text-white/40">
          © {new Date().getFullYear()} DeskBuddy · Made in India
        </div>
      </div>
    </footer>
  );
}
