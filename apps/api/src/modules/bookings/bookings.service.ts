import { db } from "../../config/database.js";
import type { Booking } from "@antigravity/types";
import { UpdateBookingInput } from "@antigravity/validators";

export const bookingsService = {
  async getBookings(tenantId: string): Promise<Booking[]> {
    const bookings = await db.booking.findMany({
      where: { tenantId },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            emails: true,
            phones: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        startTime: "desc",
      },
    });

    return bookings.map((b: any) => ({
      ...b,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    })) as any;
  },

  async getTeamMembers(tenantId: string): Promise<{ id: string; name: string; email: string }[]> {
    return db.user.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  },

  async updateBooking(
    tenantId: string,
    bookingId: string,
    data: UpdateBookingInput,
  ): Promise<Booking> {
    const existing = await db.booking.findFirst({
      where: { id: bookingId, tenantId },
    });

    if (!existing) {
      throw new Error("Booking not found");
    }

    // contactEmail lives on the Contact, not the Booking — it's the invite
    // destination, so an edit here updates the contact's primary email.
    const { contactEmail, ...bookingData } = data;
    if (contactEmail !== undefined) {
      const contact = await db.contact.findFirst({
        where: { id: existing.contactId, tenantId },
        select: { emails: true },
      });
      if (contact) {
        const rest = contact.emails.slice(1);
        await db.contact.update({
          where: { id: existing.contactId },
          data: { emails: contactEmail ? [contactEmail, ...rest] : rest },
        });
      }
    }

    const updated = await db.booking.update({
      where: { id: bookingId },
      data: bookingData,
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, emails: true, phones: true },
        },
        agent: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      ...updated,
      startTime: updated.startTime.toISOString(),
      endTime: updated.endTime.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    } as any;
  },
};
