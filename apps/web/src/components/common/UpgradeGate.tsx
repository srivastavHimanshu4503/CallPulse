import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Sparkles, Check } from "lucide-react";

const FEATURE_COPY: Record<string, { title: string; points: string[] }> = {
  CONTACT_DETAILS: {
    title: "See the full story of every contact",
    points: [
      "Complete activity timeline — every call, SMS and field change",
      "AI call summaries and transcripts on the contact",
      "Deals, notes and bookings in one place",
    ],
  },
  WEBSITE_WIDGET: {
    title: "Put your AI receptionist on your website",
    points: [
      "Visitors talk to your AI directly from your site",
      "Every conversation lands in your CRM automatically",
      "Same AI, one more channel — zero extra work",
    ],
  },
  ANALYTICS_PAGE: {
    title: "Know exactly how your AI performs",
    points: [
      "Call volume trends, peak hours and outcomes",
      "Lead conversion funnel and agent comparison",
      "Spot busy hours and missed opportunities",
    ],
  },
  WORKFLOW_ACTIVATION: {
    title: "Put your workflows to work",
    points: [
      "Activate any workflow you've built — they run automatically",
      "Follow-ups, notifications and CRM updates on autopilot",
      "Build free, activate on Pro",
    ],
  },
};

/**
 * Full-panel upsell shown in place of a Pro-only feature. The API blocks
 * these routes too — this is the friendly face of that 403.
 */
export function UpgradeGate({ feature }: { feature: string }): React.JSX.Element {
  const navigate = useNavigate();
  const copy = FEATURE_COPY[feature] ?? {
    title: "This feature needs the Pro plan",
    points: ["Upgrade to unlock everything your AI can do"],
  };

  return (
    <div className="flex-1 h-full flex items-center justify-center p-8">
      <div className="max-w-md w-full rounded-xl border border-line-default bg-bg-raised shadow-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-500/25 flex items-center justify-center">
              <Crown className="h-5 w-5" />
            </span>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                Pro feature
              </div>
              <h2 className="text-[15px] font-semibold text-fg-primary leading-tight">
                {copy.title}
              </h2>
            </div>
          </div>

          <ul className="space-y-2">
            {copy.points.map((p) => (
              <li key={p} className="flex items-start gap-2 text-[12.5px] text-fg-secondary">
                <Check className="h-3.5 w-3.5 text-positive-500 mt-0.5 shrink-0" />
                {p}
              </li>
            ))}
          </ul>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/settings?tab=billing")}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-semibold shadow-card transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Upgrade to Pro
            </button>
            <span className="text-[11px] text-fg-muted">Takes less than a minute</span>
          </div>
        </div>
      </div>
    </div>
  );
}
