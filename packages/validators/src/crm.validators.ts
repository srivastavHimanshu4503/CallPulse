import { z } from "zod";

export const createContactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  emails: z.array(z.string().email("Invalid email format")).default([]),
  phones: z.array(z.string().min(5, "Invalid phone number")).default([]),
});

export const dealPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const createDealSchema = z.object({
  contactId: z.string().uuid("Invalid contact ID"),
  pipelineId: z.string().uuid("Invalid pipeline ID").optional().nullable(),
  title: z.string().min(1, "Deal title is required"),
  value: z.coerce.number().min(0, "Deal value must be positive"),
  stage: z.string().min(1, "Pipeline stage is required"),
  currency: z.string().length(3).optional(),
  probability: z.coerce.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.coerce.date().optional().nullable(),
  priority: dealPrioritySchema.optional(),
  leadSource: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  ownerId: z.string().uuid().optional().nullable(),
  nextFollowUpAt: z.coerce.date().optional().nullable(),
});

// Everything editable after creation; the contact link is immutable — a deal
// can never be detached from its contact (spec rule #1).
export const updateDealSchema = createDealSchema.omit({ contactId: true }).partial();

export const createCustomFieldSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  type: z.enum(["TEXT", "NUMBER", "BOOLEAN", "DROPDOWN", "DATE"], {
    errorMap: () => ({ message: "Please select a valid custom field type" }),
  }),
  parentType: z.enum(["CONTACT", "DEAL"]).default("CONTACT"),
  options: z.array(z.string()).default([]),
});

// Stages accept plain names (legacy UI) or full configs. Plain names get
// sensible defaults (position-based probability, no won/lost flags).
export const pipelineStageInputSchema = z.object({
  name: z.string().min(1, "Stage name cannot be empty"),
  color: z.string().optional(),
  probability: z.coerce.number().int().min(0).max(100).optional(),
  isWon: z.boolean().optional(),
  isLost: z.boolean().optional(),
});

export const createPipelineSchema = z.object({
  name: z.string().min(1, "Pipeline name is required"),
  stages: z
    .array(z.union([z.string().min(1, "Stage name cannot be empty"), pipelineStageInputSchema]))
    .min(1, "Pipeline must have at least one stage"),
  filters: z
    .array(
      z.object({
        fieldDefinitionId: z.string(),
        value: z.string(),
      }),
    )
    .optional()
    .nullable(),
});

export const createNoteSchema = z.object({
  content: z.string().min(1, "Note content cannot be empty"),
});

export const createBookingSchema = z.object({
  title: z.string().min(1, "Booking title is required"),
  startTime: z.string().datetime("Invalid start time date string"),
  endTime: z.string().datetime("Invalid end time date string"),
  agentId: z.string().optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type PipelineStageInput = z.infer<typeof pipelineStageInputSchema>;
export type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CreatePipelineInput = z.infer<typeof createPipelineSchema>;
