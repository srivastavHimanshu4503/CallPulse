import { PhoneCall } from "lucide-react";
import { Reveal, StaggerItem, Stagger } from "../motion/primitives";

// Vertical-specific example call flow. Renders a 2-turn transcript showing
// how DeskBuddy handles a real customer call for that vertical. Provides
// crawler-friendly text content that's highly specific to the vertical.
export function ExampleCall({
  vertical,
  script,
}: {
  vertical: string;
  script: { caller: string; agent: string }[];
}) {
  return (
    <section className="relative overflow-hidden bg-bg-subtle px-4 sm:px-6 py-12 sm:py-16">
      <div className="relative max-w-3xl mx-auto">
        <Reveal className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase text-brand bg-bg-highlight border border-brand/10 rounded-full px-3.5 py-1.5 mb-5">
            <PhoneCall className="h-3 w-3" /> Sample call
          </span>
          <h2 className="text-[26px] sm:text-[34px] font-extrabold tracking-tight text-fg-primary leading-[1.15]">
            How DeskBuddy answers a {vertical} call
          </h2>
        </Reveal>

        <Stagger className="space-y-4">
          {script.map((turn, i) => (
            <StaggerItem key={i}>
              <div className="bg-bg-raised border border-line-default rounded-[16px] p-5 sm:p-6">
                <div className="mb-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-fg-muted mb-1.5">
                    Caller
                  </p>
                  <p className="text-[15px] text-fg-primary leading-relaxed">
                    &ldquo;{turn.caller}&rdquo;
                  </p>
                </div>
                <div className="pt-4 border-t border-line-subtle">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand mb-1.5">
                    DeskBuddy
                  </p>
                  <p className="text-[15px] text-fg-primary leading-relaxed">
                    &ldquo;{turn.agent}&rdquo;
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
