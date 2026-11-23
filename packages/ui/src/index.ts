export * from "./button.js";
export * from "./input.js";
export * from "./badge.js";
export * from "./modal.js";
export { cn } from "./utils.js";
export type { ButtonProps } from "./button.js";
export type { InputProps } from "./input.js";
export type { BadgeProps } from "./badge.js";
export type { ModalProps } from "./modal.js";
export type { ClassValue } from "clsx";
export { twMerge } from "tailwind-merge";

// Design system primitives migrated from web ui-ext
export { Card } from "./Card.js";
export { SectionHead } from "./SectionHead.js";
export { Kpi } from "./Kpi.js";
export type { KpiProps, KpiTone } from "./Kpi.js";
export { Avatar } from "./Avatar.js";
export { StatusPill } from "./StatusPill.js";
export type { StatusTone } from "./StatusPill.js";
export { EmptyState } from "./EmptyState.js";
export { Tabs } from "./Tabs.js";
export type { TabDef } from "./Tabs.js";
export { DataTable } from "./DataTable.js";
export type { Column, DataTableProps } from "./DataTable.js";
export { Pagination } from "./Pagination.js";
export { SearchInput } from "./SearchInput.js";
export { Timeline, TimelineItem, activityMeta } from "./Timeline.js";
export { FilterBuilder, evaluateCondition } from "./FilterBuilder.js";
export type { FilterFieldDef } from "./FilterBuilder.js";
export { computeLeadScore, BAND_LABEL, BAND_TONE } from "./leadScore.js";
export type { ScoreBreakdown } from "./leadScore.js";
export { readConsent, canSend, DEFAULT_CONSENT } from "./consent.js";
export type { ConsentState } from "./consent.js";
export {
  buildSmartSegments,
  loadSavedSegments,
  saveSegment,
  deleteSavedSegment,
} from "./smartSegments.js";
export type { SmartSegment, SavedSegment } from "./smartSegments.js";
