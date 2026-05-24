import { z } from "zod";

export const customFieldDefinitionSchema = z.object({
  name: z.string().min(1, { message: "Field name is required" }),
  type: z.enum(["TEXT", "NUMBER", "BOOLEAN", "DROPDOWN", "DATE"], {
    errorMap: () => ({ message: "Must be a valid CustomFieldType" }),
  }),
  parentType: z.enum(["CONTACT", "DEAL"], {
    errorMap: () => ({ message: "Must be a valid ParentType" }),
  }),
});

export type CustomFieldDefinitionInput = z.infer<typeof customFieldDefinitionSchema>;
