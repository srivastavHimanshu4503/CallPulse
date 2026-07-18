import { createLogger } from "../logger.js";
import type { JobHandler, PostCallContext } from "./types.js";
import { getErrorMessage } from "@antigravity/errors";
import { ACTIVITY_TYPES } from "@antigravity/types";
import { z } from "zod";
import { db } from "@antigravity/db";
import { extractStructured, llmEnabled } from "../llm/client.js";
import {
  buildCrmExtractionSchema,
  buildCrmExtractionSystemPrompt,
  buildTranscriptUserPrompt,
  customFieldKey,
  describeCallMoment,
  type ExtractableFieldDef,
} from "../prompts/index.js";

const log = createLogger("job:crm-extraction");

/**
 * Extract structured CRM fields from the transcript and write them to the
 * contact. Failure philosophy: every step degrades independently — a failed
 * contact update must not block custom-field writes, and any DB failure must
 * not discard the extracted data (it still lands on the CommunicationLog via
 * the pipeline's extractedFields).
 */
export const crmExtraction: JobHandler = {
  name: "crm-extraction",
  async run(ctx: PostCallContext): Promise<Partial<PostCallContext>> {
    const turnCount = ctx.job.transcript.length;

    if (turnCount === 0 || !llmEnabled()) {
      log.info("Skipping extraction (no transcript or no API key)", { turnCount });
      return { extractedFields: {} };
    }

    log.info("Extracting CRM fields via LLM", {
      logId: ctx.job.logId,
      tenantId: ctx.job.tenantId,
      intent: ctx.intent?.primary,
    });

    // 1. Fetch custom fields for this organization. A DB failure here just
    // means we extract standard fields only.
    let customFieldDefs: ExtractableFieldDef[] = [];
    try {
      const rows = await db.customFieldDefinition.findMany({
        where: { tenantId: ctx.job.tenantId, parentType: "CONTACT" },
      });
      customFieldDefs = rows.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        options: r.options,
      }));
    } catch (err) {
      log.error("Failed to load custom field definitions — extracting standard fields only", {
        logId: ctx.job.logId,
        error: getErrorMessage(err),
      });
    }

    // 2. LLM extraction. If this fails after retries, there is nothing to
    // write — return empty and let the pipeline continue.
    let extracted: Record<string, unknown>;
    try {
      extracted = await extractStructured({
        schema: buildCrmExtractionSchema(customFieldDefs),
        schemaName: "CrmExtraction",
        system: buildCrmExtractionSystemPrompt(
          customFieldDefs,
          describeCallMoment(ctx.job.startedAt)
        ),
        user: buildTranscriptUserPrompt(ctx.job.transcript),
      });
    } catch (err) {
      log.error("CRM extraction failed after retries", {
        logId: ctx.job.logId,
        error: getErrorMessage(err),
      });
      return { extractedFields: {} };
    }

    // 3. Post-validate leniently — a malformed value becomes null instead of
    // failing the extraction.
    const name = asNonEmptyString(extracted.name);
    const company = asNonEmptyString(extracted.company);
    const summary = asNonEmptyString(extracted.summary);
    const rawEmail = asNonEmptyString(extracted.email);
    const email = rawEmail && z.string().email().safeParse(rawEmail).success
      ? rawEmail.toLowerCase()
      : undefined;

    // 4. Update Contact — isolated so a DB error can't lose the extraction.
    // NOTE: Contact has firstName/lastName + emails[]/phones[] arrays. There
    // is no name/email/company scalar column — writing those was the source
    // of persistent "db.update failed" errors. `company` lives only in the
    // extractedFields JSON on the CommunicationLog.
    const updatedFields: Record<string, unknown> = {};
    if (ctx.job.contactId) {
      try {
        const updateData: Record<string, unknown> = {};
        if (name) {
          const parts = name.split(/\s+/);
          updateData.firstName = parts[0]!;
          if (parts.length > 1) updateData.lastName = parts.slice(1).join(" ");
        }
        if (email) {
          const existing = await db.contact.findUnique({
            where: { id: ctx.job.contactId },
            select: { emails: true },
          });
          if (existing && !existing.emails.includes(email)) {
            updateData.emails = [...existing.emails, email];
          }
        }

        if (Object.keys(updateData).length > 0) {
          await db.contact.update({
            where: { id: ctx.job.contactId },
            data: updateData,
          });
          if (name) updatedFields["Name"] = name;
          if (updateData.emails) updatedFields["Email"] = email;
          log.info("Updated contact with extracted fields", {
            contactId: ctx.job.contactId,
            fields: Object.keys(updateData),
          });
        }
      } catch (err) {
        log.error("Contact update failed — continuing with custom fields", {
          contactId: ctx.job.contactId,
          error: getErrorMessage(err),
        });
      }

      // 5. Upsert custom field values — each isolated so one bad field
      // can't block the others.
      for (const def of customFieldDefs) {
        const val = extracted[customFieldKey(def.id)];
        if (val === undefined || val === null || val === "") continue;
        try {
          await upsertCustomFieldValue(ctx.job.tenantId, ctx.job.contactId, def, val);
          updatedFields[def.name] = val;
        } catch (err) {
          log.error("Custom field upsert failed — skipping field", {
            contactId: ctx.job.contactId,
            field: def.name,
            error: getErrorMessage(err),
          });
        }
      }

      // Timeline entry: one FIELD_UPDATED activity listing everything this
      // call changed on the contact. Best-effort — never fails extraction.
      if (Object.keys(updatedFields).length > 0) {
        try {
          await db.activity.create({
            data: {
              tenantId: ctx.job.tenantId,
              contactId: ctx.job.contactId,
              type: ACTIVITY_TYPES.FIELD_UPDATED,
              summary: `Updated from call: ${Object.keys(updatedFields).join(", ")}`,
              metadata: { fields: updatedFields } as any,
              commLogId: ctx.job.logId,
              occurredAt: new Date(),
            },
          });
        } catch (err) {
          log.error("FIELD_UPDATED activity write failed", {
            logId: ctx.job.logId,
            error: getErrorMessage(err),
          });
        }
      }
    }

    // 6. Clean JSON object for the CommunicationLog + downstream handlers.
    const cleanExtractedFields: Record<string, unknown> = { name, email, company, summary };
    for (const def of customFieldDefs) {
      const val = extracted[customFieldKey(def.id)];
      if (val !== undefined && val !== null && val !== "") {
        cleanExtractedFields[def.name] = val;
      }
    }

    return { extractedFields: cleanExtractedFields };
  },
};

const asNonEmptyString = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const upsertCustomFieldValue = async (
  tenantId: string,
  contactId: string,
  def: ExtractableFieldDef,
  val: unknown
): Promise<void> => {
  const data: Record<string, unknown> = {
    tenantId,
    contactId,
    fieldDefinitionId: def.id,
    source: "CALL",
  };
  if (def.type === "NUMBER") {
    const n = Number(val);
    if (Number.isNaN(n)) return;
    data.numberValue = n;
  } else if (def.type === "BOOLEAN") {
    data.booleanValue = Boolean(val);
  } else if (def.type === "DATE") {
    const d = new Date(String(val));
    if (Number.isNaN(d.getTime())) return;
    data.dateValue = d;
  } else {
    data.textValue = String(val);
  }

  const existing = await db.customFieldValue.findFirst({
    where: { contactId, fieldDefinitionId: def.id },
    select: { id: true },
  });

  if (existing) {
    await db.customFieldValue.update({ where: { id: existing.id }, data });
  } else {
    await db.customFieldValue.create({ data: data as any });
  }
};
