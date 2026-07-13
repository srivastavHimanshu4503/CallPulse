import { db } from "../client.js";
import type { Contact } from "../../generated/prisma-client/index.js";

/**
 * Find an existing contact by phone number for the given tenant, or create a
 * placeholder one. Voice-server uses this on inbound calls to attribute the
 * conversation to a Contact row.
 */
export const findOrCreateContactByPhone = async (input: {
  tenantId: string;
  phone: string;
  firstName?: string;
  lastName?: string;
}): Promise<Contact> => {
  const existing = await db.contact.findFirst({
    where: {
      tenantId: input.tenantId,
      phones: { has: input.phone },
      deletedAt: null,
    },
  });
  if (existing) return existing;

  return db.contact.create({
    data: {
      tenantId: input.tenantId,
      firstName: input.firstName ?? "Unknown",
      lastName: input.lastName ?? "Caller",
      phones: [input.phone],
      emails: [],
    },
  });
};
