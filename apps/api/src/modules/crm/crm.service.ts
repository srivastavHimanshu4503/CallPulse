import { db } from "../../config/database.js";
import type {
  Contact,
  Deal,
  Booking,
  Note,
  SerializedContactDetails
} from "@antigravity/types";

export class CrmService {
  /**
   * Fetch contacts with their custom field values
   */
  async getContacts(tenantId: string): Promise<Contact[]> {
    const list = await db.contact.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      include: {
        customFields: {
          include: {
            fieldDefinition: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return list.map((c: any) => ({
      id: c.id,
      tenantId: c.tenantId,
      firstName: c.firstName,
      lastName: c.lastName,
      emails: c.emails,
      phones: c.phones,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      deletedAt: c.deletedAt ? c.deletedAt.toISOString() : null,
      customFields: c.customFields.map((cv: any) => ({
        id: cv.id,
        tenantId: cv.tenantId,
        contactId: cv.contactId,
        fieldDefinitionId: cv.fieldDefinitionId,
        textValue: cv.textValue,
        numberValue: cv.numberValue,
        booleanValue: cv.booleanValue,
        dateValue: cv.dateValue ? Math.floor(cv.dateValue.getTime() / 1000) : null,
        source: cv.source,
        createdAt: cv.createdAt.toISOString(),
        updatedAt: cv.updatedAt.toISOString(),
        fieldName: cv.fieldDefinition.name,
        fieldType: cv.fieldDefinition.type,
      })) as any[],
    }));
  }

  /**
   * Create contact atomically with a CONTACT_CREATED system activity
   */
  async createContact(tenantId: string, data: { firstName: string; lastName: string; emails?: string[]; phones?: string[] }): Promise<Contact> {
    return db.$transaction(async (tx: any) => {
      const created = await tx.contact.create({
        data: {
          tenantId,
          firstName: data.firstName,
          lastName: data.lastName,
          emails: data.emails || [],
          phones: data.phones || [],
        },
      });

      // Log activity
      await tx.activity.create({
        data: {
          tenantId,
          contactId: created.id,
          type: "CONTACT_CREATED",
          summary: `Contact record was created for ${created.firstName} ${created.lastName}`,
          occurredAt: new Date(),
        },
      });

      return {
        id: created.id,
        tenantId: created.tenantId,
        firstName: created.firstName,
        lastName: created.lastName,
        emails: created.emails,
        phones: created.phones,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        deletedAt: null,
      };
    });
  }

  /**
   * Fetch full high-density contact details with timeline events
   */
  async getContactDetails(tenantId: string, id: string): Promise<SerializedContactDetails | null> {
    const contact = await db.contact.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        customFields: {
          include: {
            fieldDefinition: true,
          },
        },
        deals: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
        },
        bookings: {
          orderBy: { startTime: "desc" },
        },
        notes: {
          orderBy: { createdAt: "desc" },
        },
        activities: {
          include: {
            commLog: true,
          },
          orderBy: { occurredAt: "desc" },
        },
      },
    });

    if (!contact) return null;

    return {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      emails: contact.emails,
      phones: contact.phones,
      customFields: contact.customFields.map((cv: any) => ({
        id: cv.id,
        fieldDefinitionId: cv.fieldDefinitionId,
        name: cv.fieldDefinition.name,
        type: cv.fieldDefinition.type,
        value: cv.textValue ?? cv.numberValue ?? cv.booleanValue ?? (cv.dateValue ? Math.floor(cv.dateValue.getTime() / 1000) : ""),
      })),
      deals: contact.deals.map((d: any) => ({
        id: d.id,
        tenantId: d.tenantId,
        contactId: d.contactId,
        pipelineId: d.pipelineId,
        title: d.title,
        value: d.value,
        stage: d.stage,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        deletedAt: d.deletedAt ? d.deletedAt.toISOString() : null,
      })),
      bookings: contact.bookings.map((b: any) => ({
        id: b.id,
        tenantId: b.tenantId,
        contactId: b.contactId,
        title: b.title,
        startTime: b.startTime.toISOString(),
        endTime: b.endTime.toISOString(),
        status: b.status,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      })),
      notes: contact.notes.map((n: any) => ({
        id: n.id,
        tenantId: n.tenantId,
        contactId: n.contactId,
        content: n.content,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
      activities: contact.activities.map((a: any) => ({
        id: a.id,
        tenantId: a.tenantId,
        contactId: a.contactId,
        type: a.type,
        direction: a.direction,
        summary: a.summary,
        metadata: a.metadata ? JSON.parse(JSON.stringify(a.metadata)) : null,
        commLogId: a.commLogId,
        dealId: a.dealId,
        bookingId: a.bookingId,
        workflowRunId: a.workflowRunId,
        noteId: a.noteId,
        occurredAt: a.occurredAt.toISOString(),
        createdAt: a.createdAt.toISOString(),
        // Embed transcript / recording url context if it's a Call event
        commLog: a.commLog ? {
          recordingUrl: a.commLog.recordingUrl,
          transcript: a.commLog.transcript,
          body: a.commLog.body,
        } : null,
      })),
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString(),
    };
  }

  /**
   * Fetch all deals with their contacts
   */
  async getDeals(tenantId: string): Promise<Deal[]> {
    const list = await db.deal.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      include: {
        contact: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return list.map((d: any) => ({
      id: d.id,
      tenantId: d.tenantId,
      contactId: d.contactId,
      pipelineId: d.pipelineId,
      title: d.title,
      value: d.value,
      stage: d.stage,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      deletedAt: d.deletedAt ? d.deletedAt.toISOString() : null,
      contactName: `${d.contact.firstName} ${d.contact.lastName}`,
    })) as any[];
  }

  /**
   * Create deal linked to contact
   */
  async createDeal(tenantId: string, data: { contactId: string; pipelineId?: string | null; title: string; value: number; stage: string }): Promise<Deal> {
    return db.$transaction(async (tx: any) => {
      const created = await tx.deal.create({
        data: {
          tenantId,
          contactId: data.contactId,
          pipelineId: data.pipelineId || null,
          title: data.title,
          value: data.value,
          stage: data.stage,
        },
      });

      await tx.activity.create({
        data: {
          tenantId,
          contactId: data.contactId,
          type: "DEAL_CREATED",
          dealId: created.id,
          summary: `New deal opportunity registered: "${created.title}" value of Rs. ${created.value}`,
          occurredAt: new Date(),
        },
      });

      return {
        id: created.id,
        tenantId: created.tenantId,
        contactId: created.contactId,
        pipelineId: created.pipelineId,
        title: created.title,
        value: created.value,
        stage: created.stage,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        deletedAt: null,
      };
    });
  }

  /**
   * Update deal stage (moves on board)
   */
  async updateDealStage(tenantId: string, id: string, stage: string): Promise<Deal> {
    return db.$transaction(async (tx: any) => {
      const existing = await tx.deal.findFirst({
        where: { id, tenantId, deletedAt: null },
      });

      if (!existing) {
        throw new Error("Deal not found");
      }

      const updated = await tx.deal.update({
        where: { id },
        data: { stage },
      });

      await tx.activity.create({
        data: {
          tenantId,
          contactId: updated.contactId,
          type: "DEAL_STAGE_CHANGED",
          dealId: updated.id,
          summary: `Deal "${updated.title}" moved stage from "${existing.stage}" to "${updated.stage}"`,
          occurredAt: new Date(),
        },
      });

      return {
        id: updated.id,
        tenantId: updated.tenantId,
        contactId: updated.contactId,
        pipelineId: updated.pipelineId,
        title: updated.title,
        value: updated.value,
        stage: updated.stage,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        deletedAt: null,
      };
    });
  }

  /**
   * Fetch custom fields definitions
   */
  async getCustomFields(tenantId: string): Promise<any[]> {
    return db.customFieldDefinition.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Create custom field definition
   */
  async createCustomField(tenantId: string, data: { name: string; type: "TEXT" | "NUMBER" | "BOOLEAN" | "DROPDOWN" | "DATE"; parentType?: "CONTACT" | "DEAL"; options?: string[] }): Promise<any> {
    return db.customFieldDefinition.create({
      data: {
        tenantId,
        name: data.name,
        type: data.type,
        parentType: data.parentType || "CONTACT",
        options: data.options || [],
      },
    });
  }

  /**
   * Get dynamic custom pipelines. If none exist, seeds a default "Sales Pipeline"
   */
  async getPipelines(tenantId: string): Promise<any[]> {
    const list = await db.pipeline.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });

    if (list.length > 0) return list;

    // Seed a default Sales Pipeline atomically
    const defaultPipeline = await db.pipeline.create({
      data: {
        tenantId,
        name: "Sales Pipeline",
        stages: [
          "Contacted Us",
          "Prospect Contacted",
          "Visited",
          "Prospect",
          "Application Received"
        ],
      },
    });

    return [defaultPipeline];
  }

  /**
   * Create custom pipeline
   */
  async createPipeline(tenantId: string, data: { name: string; stages: string[]; filters?: any[] | null }): Promise<any> {
    return db.pipeline.create({
      data: {
        tenantId,
        name: data.name,
        stages: data.stages,
        filters: (data.filters as any) || undefined,
      },
    });
  }

  /**
   * Update dynamic custom pipeline stages or settings
   */
  async updatePipeline(tenantId: string, id: string, data: { name: string; stages: string[]; filters?: any[] | null }): Promise<any> {
    const existing = await db.pipeline.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new Error("Pipeline not found");
    }

    return db.pipeline.update({
      where: { id },
      data: {
        name: data.name,
        stages: data.stages,
        filters: (data.filters as any) || null,
      },
    });
  }

  /**
   * Delete dynamic custom pipeline
   */
  async deletePipeline(tenantId: string, id: string): Promise<void> {
    const existing = await db.pipeline.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new Error("Pipeline not found");
    }

    await db.$transaction(async (tx: any) => {
      await tx.deal.updateMany({
        where: { pipelineId: id, tenantId },
        data: { pipelineId: null },
      });

      await tx.pipeline.delete({
        where: { id },
      });
    });
  }

  /**
   * Create note on contact details profile
   */
  async createNote(tenantId: string, contactId: string, content: string): Promise<Note> {
    return db.$transaction(async (tx: any) => {
      const created = await tx.note.create({
        data: {
          tenantId,
          contactId,
          content,
        },
      });

      await tx.activity.create({
        data: {
          tenantId,
          contactId,
          type: "NOTE_ADDED",
          noteId: created.id,
          summary: `Manual note recorded: "${content.substring(0, 60)}${content.length > 60 ? "..." : ""}"`,
          occurredAt: new Date(),
        },
      });

      return {
        id: created.id,
        tenantId: created.tenantId,
        contactId: created.contactId,
        content: created.content,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Book appointment
   */
  async createBooking(tenantId: string, contactId: string, data: { title: string; startTime: Date; endTime: Date }): Promise<Booking> {
    return db.$transaction(async (tx: any) => {
      const created = await tx.booking.create({
        data: {
          tenantId,
          contactId,
          title: data.title,
          startTime: data.startTime,
          endTime: data.endTime,
          status: "CONFIRMED",
        },
      });

      await tx.activity.create({
        data: {
          tenantId,
          contactId,
          type: "BOOKING_CREATED",
          bookingId: created.id,
          summary: `Appointment booked: "${created.title}" on ${created.startTime.toLocaleString("en-IN")}`,
          occurredAt: new Date(),
        },
      });

      return {
        id: created.id,
        tenantId: created.tenantId,
        contactId: created.contactId,
        title: created.title,
        startTime: created.startTime.toISOString(),
        endTime: created.endTime.toISOString(),
        status: created.status,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Update dynamic custom field values on Contact details
   */
  async updateContactCustomFieldValues(tenantId: string, contactId: string, values: { fieldDefinitionId: string; value: any }[]): Promise<void> {
    await db.$transaction(async (tx: any) => {
      for (const item of values) {
        const def = await tx.customFieldDefinition.findFirst({
          where: { id: item.fieldDefinitionId, tenantId },
        });

        if (!def) continue;

        // Upsert value
        const match = await tx.customFieldValue.findFirst({
          where: {
            contactId,
            fieldDefinitionId: item.fieldDefinitionId,
          },
        });

        const textVal = def.type === "TEXT" || def.type === "DROPDOWN" ? String(item.value) : null;
        const numVal = def.type === "NUMBER" ? Number(item.value) : null;
        const boolVal = def.type === "BOOLEAN" ? Boolean(item.value) : null;
        
        let dateVal: Date | null = null;
        if (def.type === "DATE" && item.value) {
          const val = item.value;
          if (typeof val === "number") {
            const isSeconds = val < 10000000000;
            dateVal = new Date(isSeconds ? val * 1000 : val);
          } else if (typeof val === "string" && /^\d+$/.test(val)) {
            const num = Number(val);
            const isSeconds = num < 10000000000;
            dateVal = new Date(isSeconds ? num * 1000 : num);
          } else {
            dateVal = new Date(val);
          }
        }

        if (match) {
          await tx.customFieldValue.update({
            where: { id: match.id },
            data: {
              textValue: textVal,
              numberValue: numVal,
              booleanValue: boolVal,
              dateValue: dateVal,
            },
          });
        } else {
          await tx.customFieldValue.create({
            data: {
              tenantId,
              contactId,
              fieldDefinitionId: item.fieldDefinitionId,
              textValue: textVal,
              numberValue: numVal,
              booleanValue: boolVal,
              dateValue: dateVal,
              source: "MANUAL",
            },
          });
        }

        // Log field updated
        await tx.activity.create({
          data: {
            tenantId,
            contactId,
            type: "FIELD_UPDATED",
            summary: `Custom field "${def.name}" updated to "${item.value}"`,
            occurredAt: new Date(),
          },
        });
      }
    });
  }

  /**
   * Soft delete deal record
   */
  async deleteDeal(tenantId: string, id: string): Promise<void> {
    await db.$transaction(async (tx: any) => {
      const existing = await tx.deal.findFirst({
        where: { id, tenantId, deletedAt: null },
      });

      if (!existing) {
        throw new Error("Deal not found");
      }

      await tx.deal.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // Log activity
      await tx.activity.create({
        data: {
          tenantId,
          contactId: existing.contactId,
          dealId: existing.id,
          type: "DEAL_STAGE_CHANGED",
          summary: `Pipeline record opportunity "${existing.title}" was removed`,
          occurredAt: new Date(),
        },
      });
    });
  }

  /**
   * Update deal details (title, value, stage)
   */
  async updateDeal(tenantId: string, id: string, data: { title?: string; value?: number; stage?: string }): Promise<any> {
    return db.$transaction(async (tx: any) => {
      const existing = await tx.deal.findFirst({
        where: { id, tenantId, deletedAt: null },
      });

      if (!existing) {
        throw new Error("Deal not found");
      }

      const updated = await tx.deal.update({
        where: { id },
        data: {
          title: data.title !== undefined ? data.title : undefined,
          value: data.value !== undefined ? data.value : undefined,
          stage: data.stage !== undefined ? data.stage : undefined,
        },
      });

      // Log activity if stage changed or title changed
      let summary = `Pipeline record "${updated.title}" updated`;
      if (data.stage !== undefined && data.stage !== existing.stage) {
        summary = `Deal "${updated.title}" moved stage from "${existing.stage}" to "${updated.stage}"`;
      }

      await tx.activity.create({
        data: {
          tenantId,
          contactId: updated.contactId,
          type: "DEAL_STAGE_CHANGED",
          dealId: updated.id,
          summary,
          occurredAt: new Date(),
        },
      });

      return {
        id: updated.id,
        tenantId: updated.tenantId,
        contactId: updated.contactId,
        pipelineId: updated.pipelineId,
        title: updated.title,
        value: updated.value,
        stage: updated.stage,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        deletedAt: null,
      };
    });
  }
}
