import { z } from "zod";

export const contactSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  emails: z.array(z.string().email({ message: "Invalid email address" })).default([]),
  phones: z.array(z.string().min(5, { message: "Phone number too short" })).default([]),
  customFields: z.array(z.object({
    fieldDefinitionId: z.string().uuid(),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  })).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;
