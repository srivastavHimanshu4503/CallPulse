import * as React from "react";
import {
  PhoneCall,
  MessageSquare,
  MessageCircle,
  Layers,
  Calendar,
  StickyNote,
  Zap,
  UserPlus,
  Edit3,
  ArrowRightLeft,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@antigravity/ui";

// Icon + tone per ActivityType (matches Prisma enum values).
const TYPE_META: Record<
  string,
  { icon: LucideIcon; tone: string; ring: string; label: string }
> = {
  CALL_INBOUND: { icon: PhoneCall, tone: "text-brand-600", ring: "bg-brand-50 ring-brand-500/15", label: "Inbound call" },
  CALL_OUTBOUND: { icon: PhoneCall, tone: "text-accent-700", ring: "bg-accent-100 ring-accent-500/20", label: "Outbound call" },
  SMS_SENT: { icon: MessageSquare, tone: "text-brand-600", ring: "bg-brand-50 ring-brand-500/15", label: "SMS sent" },
  SMS_RECEIVED: { icon: MessageSquare, tone: "text-fg-secondary", ring: "bg-bg-muted ring-line-default", label: "SMS received" },
  WHATSAPP_SENT: { icon: MessageCircle, tone: "text-positive-500", ring: "bg-positive-50 ring-positive-500/15", label: "WhatsApp sent" },
  WHATSAPP_RECEIVED: { icon: MessageCircle, tone: "text-positive-500", ring: "bg-positive-50 ring-positive-500/15", label: "WhatsApp received" },
  DEAL_CREATED: { icon: Layers, tone: "text-accent-700", ring: "bg-accent-100 ring-accent-500/20", label: "Deal created" },
  DEAL_STAGE_CHANGED: { icon: ArrowRightLeft, tone: "text-attention-500", ring: "bg-attention-50 ring-attention-500/20", label: "Deal stage changed" },
  BOOKING_CREATED: { icon: Calendar, tone: "text-brand-600", ring: "bg-brand-50 ring-brand-500/15", label: "Booking" },
  FIELD_UPDATED: { icon: Edit3, tone: "text-fg-secondary", ring: "bg-bg-muted ring-line-default", label: "Field updated" },
  WORKFLOW_TRIGGERED: { icon: Zap, tone: "text-accent-700", ring: "bg-accent-100 ring-accent-500/20", label: "Workflow" },
  NOTE_ADDED: { icon: StickyNote, tone: "text-attention-600", ring: "bg-attention-50 ring-attention-500/20", label: "Note" },
  CONTACT_CREATED: { icon: UserPlus, tone: "text-brand-600", ring: "bg-brand-50 ring-brand-500/15", label: "Contact created" },
};

export function activityMeta(type: string): { icon: LucideIcon; tone: string; ring: string; label: string } {
  return TYPE_META[type] || { icon: StickyNote, tone: "text-fg-secondary", ring: "bg-bg-muted ring-line-default", label: type };
}

interface TimelineItemProps {
  type: string;
  title: React.ReactNode;
  timestamp: string;
  extra?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function TimelineItem({
  type,
  title,
  timestamp,
  extra,
  children,
  className,
}: TimelineItemProps): React.JSX.Element {
  const meta = activityMeta(type);
  const Icon = meta.icon;

  return (
    <li className={cn("relative pl-9", className)}>
      {/* Connector line */}
      <span aria-hidden className="absolute left-3.5 top-6 bottom-0 w-px bg-line-default" />

      {/* Icon */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-0 h-7 w-7 rounded-full ring-1 flex items-center justify-center shrink-0",
          meta.ring,
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", meta.tone)} />
      </span>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-fg-primary leading-snug">{title}</div>
          <div className="text-[10.5px] text-fg-muted mt-0.5 font-medium">{timestamp}</div>
        </div>
        {extra}
      </div>

      {children && <div className="mt-2">{children}</div>}
    </li>
  );
}

interface TimelineProps {
  children: React.ReactNode;
  className?: string;
}

export function Timeline({ children, className }: TimelineProps): React.JSX.Element {
  return <ul className={cn("space-y-4", className)}>{children}</ul>;
}
