import { motion } from "framer-motion";
import {
  Phone,
  BookOpen,
  Calendar,
  Users,
  MessageCircle,
  PhoneForwarded,
  Check,
  CheckCheck,
  BarChart3,
  Smartphone,
} from "lucide-react";
import { SectionHeading } from "../common/SectionHeading";
import { SpotlightCard } from "../common/SpotlightCard";
import { EASE, Stagger, StaggerItem } from "../motion/primitives";

const cardCls =
  "h-full bg-bg-raised border border-line-default rounded-[14px] p-6 shadow-sm hover:shadow-[0_16px_44px_-20px_rgba(15,23,42,0.16)] hover:border-brand/25 transition-all";

function CardHeader({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Phone;
  title: string;
  body: string;
}) {
  return (
    <>
      <div className="h-10 w-10 rounded-[10px] bg-bg-highlight text-brand flex items-center justify-center mb-4">
        <Icon className="h-[19px] w-[19px]" />
      </div>
      <h3 className="text-[15.5px] font-bold text-fg-primary mb-2">{title}</h3>
      <p className="text-[13.5px] text-fg-secondary leading-relaxed">{body}</p>
    </>
  );
}

function MiniWave() {
  return (
    <div className="flex items-center gap-[3px] h-6" aria-hidden>
      {[10, 18, 8, 22, 14, 20, 9, 16, 12, 19, 8, 15].map((h, i) => (
        <span
          key={i}
          className="wave-bar w-[3px] rounded-full bg-brand/70"
          style={{ height: h, animationDelay: `${i * 0.09}s` }}
        />
      ))}
    </div>
  );
}

function TransferVisual() {
  return (
    <div className="mt-4 relative flex items-center justify-between bg-bg-subtle border border-line-subtle rounded-[10px] px-4 py-3">
      <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-fg-secondary">
        <span className="h-6 w-6 rounded-full bg-bg-highlight text-brand flex items-center justify-center">
          <Phone className="h-3 w-3" />
        </span>
        DeskBuddy
      </span>

      {/* travelling dot */}
      <div className="relative flex-1 mx-3 h-[2px] bg-line-default rounded-full overflow-visible">
        <motion.span
          className="absolute -top-[3px] h-2 w-2 rounded-full bg-brand shadow-[0_0_8px_rgba(37,99,235,0.7)]"
          animate={{ left: ["0%", "92%"], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" }}
        />
      </div>

      <span className="inline-flex items-center gap-2 text-[12px] font-bold text-fg-primary">
        <span className="h-6 w-6 rounded-full bg-positive-50 text-positive flex items-center justify-center">
          <Smartphone className="h-3 w-3" />
        </span>
        You
      </span>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="bg-bg-canvas px-4 sm:px-6 py-16 sm:py-24">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Features"
          title="A full front desk, not just a voice"
          sub="Answering is the easy part. DeskBuddy finishes the job — books, records, follows up, and hands you the customer."
          className="mb-12"
        />

        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* AI voice calls — wide */}
          <StaggerItem className="lg:col-span-2">
            <SpotlightCard className={cardCls}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 h-full">
                <div className="max-w-sm">
                  <CardHeader
                    icon={Phone}
                    title="AI voice calls"
                    body="Picks up on the first ring, 24/7, in six languages. Natural, warm, and never annoyed — even on the fortieth call of the day."
                  />
                </div>
                <div className="sm:pt-2 sm:pr-2 shrink-0">
                  <div className="bg-bg-subtle border border-line-subtle rounded-[12px] px-4 py-4 w-full sm:w-[230px]">
                    <MiniWave />
                    <div className="mt-3.5 flex flex-wrap gap-1.5">
                      {["Hindi", "Hinglish", "English", "Tamil"].map((l) => (
                        <span
                          key={l}
                          className="text-[10.5px] font-semibold text-fg-secondary bg-bg-canvas border border-line-default rounded-full px-2 py-0.5"
                        >
                          {l}
                        </span>
                      ))}
                      <span className="text-[10.5px] font-semibold text-brand bg-bg-highlight rounded-full px-2 py-0.5">
                        +2
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </StaggerItem>

          {/* Auto knowledge base */}
          <StaggerItem>
            <SpotlightCard className={cardCls}>
              <CardHeader
                icon={BookOpen}
                title="Auto knowledge base"
                body="Your agent learns your business the moment you sign up. Edit what it knows anytime."
              />
              <div className="mt-4 space-y-1.5">
                {["Services & prices", "Timings & address", "Common questions"].map((t, i) => (
                  <motion.div
                    key={t}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.15, duration: 0.4, ease: EASE }}
                    className="flex items-center gap-2 text-[12px] text-fg-secondary"
                  >
                    <Check className="h-3.5 w-3.5 text-positive" />
                    {t}
                  </motion.div>
                ))}
              </div>
            </SpotlightCard>
          </StaggerItem>

          {/* Bookings */}
          <StaggerItem>
            <SpotlightCard className={cardCls}>
              <CardHeader
                icon={Calendar}
                title="Bookings & calendar"
                body="Takes appointments during the call. Callers get a confirmed slot, you get a full day."
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.35, type: "spring", stiffness: 240, damping: 20 }}
                className="mt-4 flex items-center justify-between bg-bg-subtle border border-line-subtle rounded-[10px] px-3.5 py-2.5"
              >
                <span className="text-[12px] font-semibold text-fg-primary">Tomorrow · 5:00 PM</span>
                <span className="text-[10.5px] font-bold text-positive bg-positive-50 rounded-full px-2 py-0.5">
                  Confirmed
                </span>
              </motion.div>
            </SpotlightCard>
          </StaggerItem>

          {/* Smart CRM — wide */}
          <StaggerItem className="lg:col-span-2">
            <SpotlightCard className={cardCls}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                <div className="max-w-sm">
                  <CardHeader
                    icon={Users}
                    title="Smart CRM"
                    body="Every caller becomes a contact automatically — with call history, transcripts, notes, and deals in one place."
                  />
                </div>
                <div className="sm:pt-2 sm:pr-2 shrink-0 w-full sm:w-[250px] space-y-2">
                  {[
                    { name: "Priya Verma", tag: "Booked", tagCls: "text-positive bg-positive-50" },
                    { name: "Rahul Jain", tag: "New lead", tagCls: "text-brand bg-bg-highlight" },
                    { name: "Amit Shah", tag: "Follow up", tagCls: "text-attention bg-attention-50" },
                  ].map((c, i) => (
                    <motion.div
                      key={c.name}
                      initial={{ opacity: 0, x: 16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.15, duration: 0.45, ease: EASE }}
                      className="flex items-center justify-between bg-bg-subtle border border-line-subtle rounded-[10px] px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="h-6 w-6 rounded-full bg-bg-highlight text-brand text-[10px] font-bold flex items-center justify-center">
                          {c.name.split(" ").map((p) => p[0]).join("")}
                        </span>
                        <span className="text-[12px] font-semibold text-fg-primary">{c.name}</span>
                      </div>
                      <span className={`text-[10.5px] font-bold rounded-full px-2 py-0.5 ${c.tagCls}`}>
                        {c.tag}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </SpotlightCard>
          </StaggerItem>

          {/* WhatsApp follow-ups */}
          <StaggerItem>
            <SpotlightCard className={cardCls}>
              <CardHeader
                icon={MessageCircle}
                title="WhatsApp & SMS follow-ups"
                body="After the call, DeskBuddy sends booking details or a follow-up on WhatsApp. No lead goes cold."
              />
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.35, duration: 0.45, ease: EASE }}
                className="mt-4 bg-bg-subtle border border-line-subtle rounded-[10px] rounded-bl-[3px] px-3.5 py-2.5"
              >
                <p className="text-[12px] text-fg-primary leading-relaxed">
                  Namaste Priya ji! Aapka appointment kal 5 PM confirm hai ✅
                </p>
                <p className="mt-1 text-right">
                  <CheckCheck className="inline h-3.5 w-3.5 text-brand" />
                </p>
              </motion.div>
            </SpotlightCard>
          </StaggerItem>

          {/* Call transfer */}
          <StaggerItem>
            <SpotlightCard className={cardCls}>
              <CardHeader
                icon={PhoneForwarded}
                title="Call transfer"
                body="Hot lead on the line? DeskBuddy warm-transfers the call to your phone, with context."
              />
              <TransferVisual />
            </SpotlightCard>
          </StaggerItem>

          {/* Recordings & analytics */}
          <StaggerItem>
            <SpotlightCard className={cardCls}>
              <CardHeader
                icon={BarChart3}
                title="Recordings & analytics"
                body="Every call recorded and transcribed. See what customers ask and how your agent handled it."
              />
              <div className="mt-4 flex items-end gap-1.5 h-12" aria-hidden>
                {[35, 55, 40, 70, 50, 85, 60, 95].map((h, i) => (
                  <motion.span
                    key={i}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.07, duration: 0.5, ease: EASE }}
                    className={`flex-1 rounded-t-[3px] ${i === 7 ? "bg-brand" : "bg-brand/25"}`}
                  />
                ))}
              </div>
            </SpotlightCard>
          </StaggerItem>
        </Stagger>
      </div>
    </section>
  );
}
