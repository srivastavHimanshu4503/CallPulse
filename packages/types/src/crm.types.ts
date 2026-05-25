export interface Deal {
  id: string;
  tenantId: string;
  contactId: string;
  title: string;
  value: number;
  stage: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Booking {
  id: string;
  tenantId: string;
  contactId: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
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
