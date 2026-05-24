export type CustomFieldType = "TEXT" | "NUMBER" | "BOOLEAN" | "DROPDOWN" | "DATE";

export interface CustomFieldDefinition {
  id: string;
  tenantId: string;
  name: string;
  type: CustomFieldType;
  parentType: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldValue {
  id: string;
  tenantId: string;
  contactId: string;
  fieldDefinitionId: string;
  textValue: string | null;
  numberValue: number | null;
  booleanValue: boolean | null;
  dateValue: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  emails: string[];
  phones: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  customFields?: CustomFieldValue[];
}
