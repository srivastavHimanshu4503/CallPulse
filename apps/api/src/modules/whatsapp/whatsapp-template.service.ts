import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { getErrorMessage } from "@antigravity/errors";

const log = logger.child({ module: "whatsapp-templates" });

const CONTENT_API = "https://content.twilio.com/v1";

export interface WhatsAppTemplate {
  sid: string;
  name: string;
  language: string;
  body: string;
  variables: string[];
  /** unsubmitted | received | pending | approved | rejected | paused | disabled */
  approvalStatus: string;
  rejectionReason: string | null;
  category: string | null;
  createdAt: string;
}

const authHeader = (): string =>
  "Basic " + Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");

const extractVariables = (body: string): string[] => {
  const found = new Set<string>();
  for (const m of body.matchAll(/\{\{(\d+)\}\}/g)) found.add(m[1]!);
  return [...found].sort((a, b) => Number(a) - Number(b));
};

const parseContent = (c: any): WhatsAppTemplate => {
  const body: string = c.types?.["twilio/text"]?.body ?? "";
  const wa = c.approval_requests;
  return {
    sid: c.sid,
    name: c.friendly_name ?? "(unnamed)",
    language: c.language ?? "en",
    body,
    variables: extractVariables(body),
    approvalStatus: wa?.status ?? "unsubmitted",
    rejectionReason: wa?.rejection_reason || null,
    category: wa?.category ?? null,
    createdAt: c.date_created ?? "",
  };
};

export class WhatsAppTemplateService {
  /** All templates with their WhatsApp approval state. */
  async listTemplates(): Promise<WhatsAppTemplate[]> {
    const res = await fetch(`${CONTENT_API}/ContentAndApprovals?PageSize=100`, {
      headers: { Authorization: authHeader() },
    });
    if (!res.ok) throw new Error(`Template list failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { contents: any[] };
    return data.contents
      .map(parseContent)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Create a text template and submit it for WhatsApp approval in one go.
   * Meta reviews the copy — usually minutes for UTILITY, longer for MARKETING.
   */
  async createTemplate(input: {
    name: string;
    body: string;
    category?: string;
    language?: string;
  }): Promise<WhatsAppTemplate> {
    const name = input.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!name) throw new Error("Template name is required");
    if (!input.body.trim()) throw new Error("Template body is required");
    const category = (input.category || "MARKETING").toUpperCase();
    if (!["MARKETING", "UTILITY", "AUTHENTICATION"].includes(category)) {
      throw new Error("Category must be MARKETING, UTILITY, or AUTHENTICATION");
    }

    const variables = extractVariables(input.body);
    const createRes = await fetch(`${CONTENT_API}/Content`, {
      method: "POST",
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        friendly_name: name,
        language: input.language || "en",
        // Sample values are required by Meta review for variable templates.
        variables: Object.fromEntries(variables.map((v) => [v, `sample${v}`])),
        types: { "twilio/text": { body: input.body.trim() } },
      }),
    });
    if (!createRes.ok) {
      throw new Error(`Template creation failed: ${await createRes.text()}`);
    }
    const created = (await createRes.json()) as any;

    const approvalRes = await fetch(
      `${CONTENT_API}/Content/${created.sid}/ApprovalRequests/whatsapp`,
      {
        method: "POST",
        headers: { Authorization: authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ name, category }),
      },
    );
    if (!approvalRes.ok) {
      log.error("approval submission failed — template created but unsubmitted", {
        sid: created.sid,
        body: await approvalRes.text(),
      });
    }

    log.info("WhatsApp template created and submitted for approval", {
      sid: created.sid,
      name,
      category,
    });
    return {
      ...parseContent(created),
      approvalStatus: approvalRes.ok ? "pending" : "unsubmitted",
      category,
    };
  }

  async deleteTemplate(sid: string): Promise<void> {
    const res = await fetch(`${CONTENT_API}/Content/${sid}`, {
      method: "DELETE",
      headers: { Authorization: authHeader() },
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Template deletion failed: ${await res.text()}`);
    }
  }

  /** Fetch one template (for rendering the sent text into the transcript). */
  async getTemplate(sid: string): Promise<WhatsAppTemplate | null> {
    try {
      const res = await fetch(`${CONTENT_API}/Content/${sid}`, {
        headers: { Authorization: authHeader() },
      });
      if (!res.ok) return null;
      return parseContent(await res.json());
    } catch (err) {
      log.error("template fetch failed", { sid, error: getErrorMessage(err) });
      return null;
    }
  }

  /** Substitute {{n}} placeholders so the transcript shows the real text. */
  renderBody(body: string, variables: Record<string, string>): string {
    return body.replace(/\{\{(\d+)\}\}/g, (_, n: string) => variables[n] ?? `{{${n}}}`);
  }
}
