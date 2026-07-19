export interface BookingContact {
  id: string;
  firstName: string;
  lastName: string;
  emails: string[];
  phones: string[];
}

export interface Booking {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  ccEmails: string[];
  notes: string | null;
  contact: BookingContact | null;
  agent: { id: string; name: string } | null;
  assignee: { id: string; name: string; email: string } | null;
}

export interface BookingUpdatePayload {
  title?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  assigneeId?: string | null;
  ccEmails?: string[];
  notes?: string | null;
  contactEmail?: string | null;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
}

export type ViewMode = "Month" | "Week" | "Day";
