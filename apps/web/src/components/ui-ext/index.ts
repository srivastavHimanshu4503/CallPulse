/**
 * Shared web-app primitives that build on top of `@antigravity/ui`. Import
 * anywhere in the web app via `../components/ui-ext` (or a longer relative
 * path). Kept in the app so we don't need to rebuild `packages/ui` on
 * every tweak — promote up to the package once the API stabilises.
 */

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
export {
  computeLeadScore,
  BAND_LABEL,
  BAND_TONE,
} from "./leadScore.js";
export type { ScoreBreakdown } from "./leadScore.js";
export {
  readConsent,
  canSend,
  DEFAULT_CONSENT,
} from "./consent.js";
export type { ConsentState } from "./consent.js";
export {
  buildSmartSegments,
  loadSavedSegments,
  saveSegment,
  deleteSavedSegment,
} from "./smartSegments.js";
export type { SmartSegment, SavedSegment } from "./smartSegments.js";
