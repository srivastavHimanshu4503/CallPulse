import { z } from "zod";

export const updateBookingSchema = z.object({
  status: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  title: z.string().min(1).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  ccEmails: z.array(z.string().email()).max(10).optional(),
  notes: z.string().max(2000).nullable().optional(),
  /** Updates the linked contact's primary email (where the invite goes). */
  contactEmail: z.string().email().nullable().optional(),
});

export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
