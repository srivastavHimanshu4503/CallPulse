export interface Deal {
  id: string;
  tenantId: string;
  contactId: string;
  pipelineId: string | null;
  title: string;
  value: number;
  stage: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  contactName?: string;
}

export interface Pipeline {
  id: string;
  tenantId: string;
  name: string;
  stages: string[];
  filters?: any[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  tenantId: string;
  contactId: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  ccEmails: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  tenantId: string;
  contactId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  tenantId: string;
  contactId: string;
  type: string;
  direction: string | null;
  summary: string;
  metadata: any | null;
  commLogId: string | null;
  dealId: string | null;
  bookingId: string | null;
  workflowRunId: string | null;
  noteId: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface SerializedContactDetails {
  id: string;
  firstName: string;
  lastName: string;
  emails: string[];
  phones: string[];
  customFields: any[];
  deals: Deal[];
  bookings: Booking[];
  notes: Note[];
  activities: Activity[];
  createdAt: string;
  updatedAt: string;
}

export enum FilterLogicalOperator {
  AND = "AND",
  OR = "OR",
}

export enum FilterOperator {
  CONTAINS = "contains",
  EQUALS = "equals",
  GREATER_THAN_OR_EQUAL = "gt",
  LESS_THAN_OR_EQUAL = "lt",
  IS_EMPTY = "empty",
  IS_NOT_EMPTY = "not_empty",
  IS_AFTER = "after",
  IS_BEFORE = "before",
}

export interface FilterCondition {
  id: string;
  fieldId: string;
  operator: FilterOperator;
  value: string;
}

