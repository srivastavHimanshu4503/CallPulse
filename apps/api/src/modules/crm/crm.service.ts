import { db } from "../../config/database.js";
import type {
  Contact,
  Deal,
  Booking,
  Note,
  SerializedContactDetails
} from "@antigravity/types";

/**
 * Aggregated call/comm-log signals used for lead score + latest-sentiment
 * enrichment. Computed inline per contact so we don't need a schema change.
 */
interface EnrichmentSignals {
  latestSentiment: number | null;
  lastCallAt: string | null;
  callCount: number;
  extractedSummary: Record<string, any> | null;
  channelsUsed: string[];
}

function computeScore(args: {
  createdAt: Date;
  deals: Array<{ deletedAt: Date | null; value: number | null }>;
  signals: EnrichmentSignals;
  bookings: number;
}): number {
  let s = 20;
  const openDeals = args.deals.filter((d) => !d.deletedAt);
  if (openDeals.length > 0) {
    s += 25;
    const totalValue = openDeals.reduce((acc, d) => acc + (d.value || 0), 0);
    if (totalValue > 100_000) s += 10;
  }

  const lastCallDays = args.signals.lastCallAt
    ? (Date.now() - new Date(args.signals.lastCallAt).getTime()) / 86_400_000
    : Infinity;
  if (lastCallDays <= 2) s += 20;
  else if (lastCallDays <= 7) s += 12;
  else if (lastCallDays <= 30) s += 4;
  else if (lastCallDays !== Infinity) s -= 5;

  if (typeof args.signals.latestSentiment === "number") {
    if (args.signals.latestSentiment > 0.3) s += 8;
    else if (args.signals.latestSentiment < -0.3) s -= 6;
  }

  if (args.bookings > 0) s += 12;

  const ageDays = (Date.now() - args.createdAt.getTime()) / 86_400_000;
  if (ageDays <= 3) s += 5;

  return Math.max(0, Math.min(100, Math.round(s)));
}

async function loadEnrichmentSignals(tenantId: string, contactId: string): Promise<EnrichmentSignals> {
  const logs = await db.communicationLog.findMany({
    where: { tenantId, contactId },
    orderBy: { occurredAt: "desc" },
    take: 25,
  });

  let latestSentiment: number | null = null;
  let lastCallAt: string | null = null;
  let callCount = 0;
  let extractedSummary: Record<string, any> | null = null;
  const channelsUsed = new Set<string>();

  for (const log of logs as any[]) {
    channelsUsed.add(log.type);
    if (log.type === "CALL") {
      callCount += 1;
      if (!lastCallAt) lastCallAt = log.occurredAt.toISOString();
      if (latestSentiment === null && typeof log.sentimentScore === "number") {
        latestSentiment = log.sentimentScore;
      }
      if (!extractedSummary && log.extractedFields && typeof log.extractedFields === "object") {
        extractedSummary = log.extractedFields as Record<string, any>;
      }
    }
  }

  return {
    latestSentiment,
    lastCallAt,
    callCount,
    extractedSummary,
    channelsUsed: Array.from(channelsUsed),
  };
}

export class CrmService {
  /**
   * Fetch contacts with enrichment: lead score, latest sentiment, last-call
   * timestamp, channels used. Computed on the fly so no schema migration
   * is required for the first cut.
   */
  async getContacts(tenantId: string): Promise<any[]> {
    const list = await db.contact.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        customFields: { include: { fieldDefinition: true } },
        deals: { where: { deletedAt: null } },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch aggregate signals per contact in parallel (bounded by DB pool).
    const enrichments = await Promise.all(
      list.map((c: any) => loadEnrichmentSignals(tenantId, c.id)),
    );

    return list.map((c: any, i: number) => {
      const signals = enrichments[i]!;
      const score = computeScore({
        createdAt: c.createdAt,
        deals: c.deals,
        signals,
        bookings: c._count.bookings,
      });

      return {
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
        })),
        deals: c.deals.map((d: any) => ({
          id: d.id,
          value: d.value,
          stage: d.stage,
          title: d.title,
          deletedAt: null,
        })),
        // Enrichment fields
        score,
        latestSentiment: signals.latestSentiment,
        lastCallAt: signals.lastCallAt,
        callCount: signals.callCount,
        channelsUsed: signals.channelsUsed,
      };
    });
  }

  async createContact(
    tenantId: string,
    data: { firstName: string; lastName: string; emails?: string[]; phones?: string[] },
  ): Promise<Contact> {
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
   * Soft-delete a contact (and its open deals). Used by both single delete
   * and bulk delete.
   */
  async softDeleteContact(tenantId: string, id: string): Promise<void> {
    await db.$transaction(async (tx: any) => {
      const existing = await tx.contact.findFirst({ where: { id, tenantId, deletedAt: null } });
      if (!existing) throw new Error("Contact not found");
      await tx.contact.update({ where: { id }, data: { deletedAt: new Date() } });
      await tx.deal.updateMany({
        where: { contactId: id, tenantId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    });
  }

  async bulkDeleteContacts(tenantId: string, ids: string[]): Promise<{ deleted: number }> {
    let deleted = 0;
    for (const id of ids) {
      try {
        await this.softDeleteContact(tenantId, id);
        deleted += 1;
      } catch {
        // continue; we don't want a single bad id to fail the whole batch
      }
    }
    return { deleted };
  }

  /**
   * Import contacts from a CSV row array. Existing contacts matched by
   * phone or email are merged (missing fields updated); otherwise created.
   * Returns counts for a UI-visible summary.
   */
  async bulkImport(
    tenantId: string,
    rows: Array<{ firstName: string; lastName: string; email?: string; phone?: string }>,
  ): Promise<{ imported: number; merged: number; skipped: number }> {
    let imported = 0, merged = 0, skipped = 0;

    for (const raw of rows) {
      const firstName = (raw.firstName || "").trim();
      const lastName = (raw.lastName || "").trim();
      if (!firstName || !lastName) {
        skipped += 1;
        continue;
      }
      const email = (raw.email || "").trim();
      const phone = (raw.phone || "").trim();

      const existing = await db.contact.findFirst({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            phone ? { phones: { has: phone } } : undefined,
            email ? { emails: { has: email } } : undefined,
          ].filter(Boolean) as any[],
        },
      });

      if (existing) {
        const nextEmails = email && !existing.emails.includes(email)
          ? [...existing.emails, email]
          : existing.emails;
        const nextPhones = phone && !existing.phones.includes(phone)
          ? [...existing.phones, phone]
          : existing.phones;

        await db.contact.update({
          where: { id: existing.id },
          data: { emails: nextEmails, phones: nextPhones },
        });
        merged += 1;
      } else {
        await db.$transaction(async (tx: any) => {
          const created = await tx.contact.create({
            data: {
              tenantId,
              firstName,
              lastName,
              emails: email ? [email] : [],
              phones: phone ? [phone] : [],
            },
          });
          await tx.activity.create({
            data: {
              tenantId,
              contactId: created.id,
              type: "CONTACT_CREATED",
              summary: `Imported via CSV: ${firstName} ${lastName}`,
              occurredAt: new Date(),
            },
          });
        });
        imported += 1;
      }
    }

    return { imported, merged, skipped };
  }

  /**
   * Merge two contacts. The `sourceId` is soft-deleted; its emails/phones,
   * deals, notes, bookings, activities and comm-logs are moved to `targetId`.
   */
  async mergeContacts(tenantId: string, targetId: string, sourceId: string): Promise<void> {
    if (targetId === sourceId) return;
    await db.$transaction(async (tx: any) => {
      const [target, source] = await Promise.all([
        tx.contact.findFirst({ where: { id: targetId, tenantId, deletedAt: null } }),
        tx.contact.findFirst({ where: { id: sourceId, tenantId, deletedAt: null } }),
      ]);
      if (!target || !source) throw new Error("Contact not found");

      const mergedEmails = Array.from(new Set([...(target.emails || []), ...(source.emails || [])]));
      const mergedPhones = Array.from(new Set([...(target.phones || []), ...(source.phones || [])]));

      await tx.contact.update({
        where: { id: target.id },
        data: { emails: mergedEmails, phones: mergedPhones },
      });

      // Reassign all children
      await tx.deal.updateMany({ where: { contactId: sourceId }, data: { contactId: targetId } });
      await tx.note.updateMany({ where: { contactId: sourceId }, data: { contactId: targetId } });
      await tx.booking.updateMany({ where: { contactId: sourceId }, data: { contactId: targetId } });
      await tx.activity.updateMany({ where: { contactId: sourceId }, data: { contactId: targetId } });
      await tx.communicationLog.updateMany({
        where: { contactId: sourceId },
        data: { contactId: targetId },
      });
      await tx.customFieldValue.updateMany({
        where: { contactId: sourceId },
        data: { contactId: targetId },
      });

      await tx.contact.update({ where: { id: sourceId }, data: { deletedAt: new Date() } });

      await tx.activity.create({
        data: {
          tenantId,
          contactId: targetId,
          type: "FIELD_UPDATED",
          summary: `Merged duplicate contact "${source.firstName} ${source.lastName}" into this record`,
          occurredAt: new Date(),
        },
      });
    });
  }

  /**
   * Find likely duplicate pairs by shared phone or email. Returns pairs
   * (target, source) so the UI can offer a "merge" flow.
   */
  async findDuplicates(tenantId: string): Promise<Array<{ a: any; b: any; via: string; matchValue: string }>> {
    const contacts = await db.contact.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, emails: true, phones: true, createdAt: true },
    });

    const seenPhone = new Map<string, typeof contacts[number]>();
    const seenEmail = new Map<string, typeof contacts[number]>();
    const pairs: Array<{ a: any; b: any; via: string; matchValue: string }> = [];
    const seenPairs = new Set<string>();

    for (const c of contacts) {
      for (const phone of c.phones) {
        const key = phone.replace(/\D/g, "").slice(-10);
        if (!key) continue;
        const existing = seenPhone.get(key);
        if (existing && existing.id !== c.id) {
          const pairKey = [existing.id, c.id].sort().join("|");
          if (!seenPairs.has(pairKey)) {
            seenPairs.add(pairKey);
            pairs.push({ a: existing, b: c, via: "phone", matchValue: phone });
          }
        } else {
          seenPhone.set(key, c);
        }
      }
      for (const email of c.emails) {
        const key = email.toLowerCase().trim();
        if (!key) continue;
        const existing = seenEmail.get(key);
        if (existing && existing.id !== c.id) {
          const pairKey = [existing.id, c.id].sort().join("|");
          if (!seenPairs.has(pairKey)) {
            seenPairs.add(pairKey);
            pairs.push({ a: existing, b: c, via: "email", matchValue: email });
          }
        } else {
          seenEmail.set(key, c);
        }
      }
    }

    return pairs;
  }

  async getContactDetails(tenantId: string, id: string): Promise<SerializedContactDetails | null> {
    const contact = await db.contact.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        customFields: { include: { fieldDefinition: true } },
        deals: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
        bookings: { orderBy: { startTime: "desc" } },
        notes: { orderBy: { createdAt: "desc" } },
        activities: {
          include: { commLog: true },
          orderBy: { occurredAt: "desc" },
        },
      },
    });

    if (!contact) return null;

    const signals = await loadEnrichmentSignals(tenantId, id);
    const score = computeScore({
      createdAt: contact.createdAt,
      deals: contact.deals,
      signals,
      bookings: contact.bookings.length,
    });

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
        source: cv.source,
        value: cv.textValue ?? cv.numberValue ?? cv.booleanValue ?? (cv.dateValue ? Math.floor(cv.dateValue.getTime() / 1000) : ""),
      })) as any,
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
        commLog: a.commLog
          ? {
              recordingUrl: a.commLog.recordingUrl,
              transcript: a.commLog.transcript,
              transcriptJson: a.commLog.transcriptJson,
              extractedFields: a.commLog.extractedFields,
              sentimentScore: a.commLog.sentimentScore,
              body: a.commLog.body,
              type: a.commLog.type,
              status: a.commLog.status,
              direction: a.commLog.direction,
              duration: a.commLog.duration,
            }
          : null,
      })) as any,
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString(),
      // Enrichment
      score,
      latestSentiment: signals.latestSentiment,
      lastCallAt: signals.lastCallAt,
      callCount: signals.callCount,
      extractedSummary: signals.extractedSummary,
      channelsUsed: signals.channelsUsed,
    } as any;
  }

  async getDeals(tenantId: string): Promise<Deal[]> {
    const list = await db.deal.findMany({
      where: { tenantId, deletedAt: null },
      include: { contact: true },
      orderBy: { createdAt: "desc" },
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

  async createDeal(
    tenantId: string,
    data: { contactId: string; pipelineId?: string | null; title: string; value: number; stage: string },
  ): Promise<Deal> {
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

  async updateDealStage(tenantId: string, id: string, stage: string): Promise<Deal> {
    return db.$transaction(async (tx: any) => {
      const existing = await tx.deal.findFirst({ where: { id, tenantId, deletedAt: null } });
      if (!existing) throw new Error("Deal not found");

      const updated = await tx.deal.update({ where: { id }, data: { stage } });

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

  async getCustomFields(tenantId: string): Promise<any[]> {
    return db.customFieldDefinition.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  }

  async createCustomField(
    tenantId: string,
    data: {
      name: string;
      type: "TEXT" | "NUMBER" | "BOOLEAN" | "DROPDOWN" | "DATE";
      parentType?: "CONTACT" | "DEAL";
      options?: string[];
    },
  ): Promise<any> {
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

  async getPipelines(tenantId: string): Promise<any[]> {
    const list = await db.pipeline.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } });
    if (list.length > 0) return list;

    const defaultPipeline = await db.pipeline.create({
      data: {
        tenantId,
        name: "Sales Pipeline",
        stages: ["New lead", "Contacted", "Qualified", "Booked", "Closed won"],
      },
    });
    return [defaultPipeline];
  }

  async createPipeline(
    tenantId: string,
    data: { name: string; stages: string[]; filters?: any[] | null },
  ): Promise<any> {
    return db.pipeline.create({
      data: {
        tenantId,
        name: data.name,
        stages: data.stages,
        filters: (data.filters as any) || undefined,
      },
    });
  }

  async updatePipeline(
    tenantId: string,
    id: string,
    data: { name: string; stages: string[]; filters?: any[] | null },
  ): Promise<any> {
    const existing = await db.pipeline.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error("Pipeline not found");

    return db.pipeline.update({
      where: { id },
      data: {
        name: data.name,
        stages: data.stages,
        filters: (data.filters as any) || null,
      },
    });
  }

  async deletePipeline(tenantId: string, id: string): Promise<void> {
    const existing = await db.pipeline.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error("Pipeline not found");

    await db.$transaction(async (tx: any) => {
      await tx.deal.updateMany({ where: { pipelineId: id, tenantId }, data: { pipelineId: null } });
      await tx.pipeline.delete({ where: { id } });
    });
  }

  async createNote(tenantId: string, contactId: string, content: string): Promise<Note> {
    return db.$transaction(async (tx: any) => {
      const created = await tx.note.create({ data: { tenantId, contactId, content } });
      await tx.activity.create({
        data: {
          tenantId,
          contactId,
          type: "NOTE_ADDED",
          noteId: created.id,
          summary: `Note: "${content.substring(0, 60)}${content.length > 60 ? "..." : ""}"`,
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

  async createBooking(
    tenantId: string,
    contactId: string,
    data: { title: string; startTime: Date; endTime: Date },
  ): Promise<Booking> {
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

  async updateContactCustomFieldValues(
    tenantId: string,
    contactId: string,
    values: { fieldDefinitionId: string; value: any }[],
  ): Promise<void> {
    await db.$transaction(async (tx: any) => {
      for (const item of values) {
        const def = await tx.customFieldDefinition.findFirst({
          where: { id: item.fieldDefinitionId, tenantId },
        });
        if (!def) continue;

        const match = await tx.customFieldValue.findFirst({
          where: { contactId, fieldDefinitionId: item.fieldDefinitionId },
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
   * Called after a call completes with extracted intent fields. Inspects
   * `extractedFields` for pricing/interest cues and auto-creates a deal
   * on a target pipeline. Returns the created deal (if any) so callers
   * can log it. Safe to call multiple times: dedupes on (contactId,title).
   */
  async applyPostCallRule(
    tenantId: string,
    contactId: string,
    extractedFields: Record<string, any>,
  ): Promise<{ dealId: string | null; skipped: string | null }> {
    if (!extractedFields || typeof extractedFields !== "object") {
      return { dealId: null, skipped: "no-fields" };
    }

    // Detect budget / value & intent title from extracted signals
    let value: number | null = null;
    let title: string | null = null;
    for (const [k, v] of Object.entries(extractedFields)) {
      const lk = k.toLowerCase();
      if (!value && (lk.includes("budget") || lk.includes("value") || lk.includes("price") || lk.includes("amount"))) {
        const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.]/g, ""));
        if (!Number.isNaN(n) && n > 0) value = n;
      }
      if (!title && (lk.includes("interest") || lk.includes("product") || lk.includes("service") || lk.includes("requirement"))) {
        title = String(v).slice(0, 120);
      }
    }
    if (!value && !title) return { dealId: null, skipped: "no-intent" };

    const contact = await db.contact.findFirst({
      where: { id: contactId, tenantId, deletedAt: null },
      include: { deals: { where: { deletedAt: null } } },
    });
    if (!contact) return { dealId: null, skipped: "no-contact" };

    const dealTitle = title || `${contact.firstName} ${contact.lastName} — new opportunity`;

    // Dedupe: if an open deal with same title already exists, don't create.
    if (contact.deals.some((d) => d.title.toLowerCase() === dealTitle.toLowerCase())) {
      return { dealId: null, skipped: "duplicate" };
    }

    const pipelines = await db.pipeline.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } });
    const pipeline = pipelines[0] || (await db.pipeline.create({
      data: {
        tenantId,
        name: "Sales Pipeline",
        stages: ["New lead", "Contacted", "Qualified", "Booked", "Closed won"],
      },
    }));

    const deal = await db.$transaction(async (tx: any) => {
      const created = await tx.deal.create({
        data: {
          tenantId,
          contactId,
          pipelineId: pipeline.id,
          title: dealTitle,
          value: value || 0,
          stage: pipeline.stages[0] || "New lead",
        },
      });
      await tx.activity.create({
        data: {
          tenantId,
          contactId,
          type: "DEAL_CREATED",
          dealId: created.id,
          summary: `Deal auto-created from AI-extracted call signals: "${dealTitle}"`,
          occurredAt: new Date(),
          metadata: { source: "AUTO", extractedFields },
        },
      });
      return created;
    });

    return { dealId: deal.id, skipped: null };
  }

  async deleteDeal(tenantId: string, id: string): Promise<void> {
    await db.$transaction(async (tx: any) => {
      const existing = await tx.deal.findFirst({ where: { id, tenantId, deletedAt: null } });
      if (!existing) throw new Error("Deal not found");

      await tx.deal.update({ where: { id }, data: { deletedAt: new Date() } });

      await tx.activity.create({
        data: {
          tenantId,
          contactId: existing.contactId,
          dealId: existing.id,
          type: "DEAL_STAGE_CHANGED",
          summary: `Deal "${existing.title}" was removed`,
          occurredAt: new Date(),
        },
      });
    });
  }

  async updateDeal(
    tenantId: string,
    id: string,
    data: { title?: string; value?: number; stage?: string },
  ): Promise<any> {
    return db.$transaction(async (tx: any) => {
      const existing = await tx.deal.findFirst({ where: { id, tenantId, deletedAt: null } });
      if (!existing) throw new Error("Deal not found");

      const updated = await tx.deal.update({
        where: { id },
        data: {
          title: data.title !== undefined ? data.title : undefined,
          value: data.value !== undefined ? data.value : undefined,
          stage: data.stage !== undefined ? data.stage : undefined,
        },
      });

      let summary = `Deal "${updated.title}" updated`;
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
