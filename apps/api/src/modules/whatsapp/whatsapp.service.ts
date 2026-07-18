import twilio from "twilio";
import { db } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { env } from "../../config/env.js";
import { buildWhatsAppSystemPrompt } from "@antigravity/agent-core";
import { generateChatReply, type ChatTurn } from "@antigravity/llm";
import { getErrorMessage } from "@antigravity/errors";
import type { ChatAgentPersona, TwilioWhatsAppWebhookPayload } from "@antigravity/types";
import { WhatsAppTemplateService } from "./whatsapp-template.service.js";

const log = logger.child({ module: "whatsapp-service" });

/** Turn stored in the session log's transcriptJson — same shape calls use. */
interface StoredTurn {
  role: "user" | "assistant";
  text: string;
  at: string;
  /** "ai" for generated replies, "human" for dashboard takeover replies. */
  by?: "ai" | "human";
  /** Present when the Twilio send was rejected or delivery failed. */
  failed?: boolean;
  /** Twilio error code when delivery failed (e.g. 63016 = outside 24h window). */
  errorCode?: string;
  /** Twilio message SID — lets async status callbacks find this turn. */
  sid?: string;
  /** Set when this turn was sent via an approved template. */
  template?: string;
}

function getTwilioClient() {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials not configured");
  }
  return twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
}

const renderTranscriptText = (turns: StoredTurn[]): string =>
  turns.map((t) => `${t.role === "user" ? "User" : "Agent"}: ${t.text}`).join("\n");

const normalizePhone = (raw: string): string => {
  const cleaned = raw.replace(/[^\d+]/g, "");
  const phone = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
  if (!/^\+\d{8,15}$/.test(phone)) {
    throw new Error("Enter a valid number with country code, e.g. +919876543210");
  }
  return phone;
};

const templateService = new WhatsAppTemplateService();

export class WhatsAppService {
  /**
   * Process one inbound WhatsApp message.
   *
   * Conversation model: one ChatSession = one CommunicationLog. Every message
   * appends a turn to that log's transcriptJson (exactly like a call
   * transcript) instead of creating a new log row — so Agent Logs shows one
   * entry per conversation, not one per message. When a human has taken over
   * the session from the dashboard, the AI stays silent.
   */
  async handleIncomingMessage(payload: TwilioWhatsAppWebhookPayload): Promise<void> {
    if (!payload.From || !payload.To) {
      log.warn("Malformed WhatsApp webhook payload — missing From/To");
      return;
    }
    const fromPhone = payload.From.replace("whatsapp:", "");
    const toPhone = payload.To.replace("whatsapp:", "");
    const hasMedia = Number(payload.NumMedia ?? "0") > 0;
    const body = payload.Body?.trim() || "";
    const inboundText = body || "[Customer sent a media attachment]";

    log.info("Received WhatsApp message", { fromPhone, toPhone, hasMedia });

    // 1. Resolve agent + tenant + knowledge by the dialed number — the same
    //    configuration the voice agent uses for this number.
    const agentInclude = {
      tenant: { select: { name: true } },
      knowledgeBases: { select: { name: true, content: true } },
    } as const;

    const phoneNumber = await db.phoneNumber.findFirst({
      where: { phoneNumber: toPhone, kind: "AGENT_LINE" },
    });
    let agent = phoneNumber
      ? await db.aIAgent.findFirst({
          where: { phoneNumberId: phoneNumber.id, deletedAt: null, isActive: true },
          include: agentInclude,
        })
      : null;

    // Twilio's shared WhatsApp sandbox number is not owned by any agent, so
    // outside production we route sandbox traffic to the first WhatsApp-enabled
    // agent. Production requires a real registered sender per agent.
    if (!agent && env.NODE_ENV !== "production") {
      agent = await db.aIAgent.findFirst({
        where: { deletedAt: null, isActive: true, whatsappEnabled: true },
        orderBy: { createdAt: "asc" },
        include: agentInclude,
      });
      if (agent) {
        log.info("Sandbox/dev fallback: routing to first WhatsApp-enabled agent", {
          toPhone,
          agentId: agent.id,
        });
      }
    }
    if (!agent) {
      log.warn("No active agent for this WhatsApp number", { toPhone });
      return;
    }
    if (!agent.whatsappEnabled) {
      log.info("WhatsApp bot disabled for this agent — ignoring message", { agentId: agent.id });
      return;
    }
    const tenantId = agent.tenantId;

    // 2. Identify or create the contact.
    let contact = await db.contact.findFirst({
      where: { tenantId, phones: { has: fromPhone }, deletedAt: null },
    });
    if (!contact) {
      contact = await db.contact.create({
        data: {
          tenantId,
          firstName: payload.ProfileName || "WhatsApp",
          lastName: payload.ProfileName ? "" : "Contact",
          phones: [fromPhone],
        },
      });
      await db.activity.create({
        data: {
          tenantId,
          contactId: contact.id,
          type: "CONTACT_CREATED",
          summary: "Contact automatically created from WhatsApp inbound message",
          metadata: { source: "whatsapp" },
          occurredAt: new Date(),
        },
      });
    }

    // 3. Open session + anchor log, or reuse the open one.
    const now = new Date();
    let session = await db.chatSession.findFirst({
      where: { tenantId, contactId: contact.id, agentId: agent.id, status: "OPEN" },
    });
    let commLog = session?.commLogId
      ? await db.communicationLog.findUnique({ where: { id: session.commLogId } })
      : null;

    if (!session || !commLog) {
      commLog = await db.communicationLog.create({
        data: {
          tenantId,
          contactId: contact.id,
          agentId: agent.id,
          type: "WHATSAPP",
          direction: "INBOUND",
          status: "IN_PROGRESS",
          phoneNumberId: phoneNumber?.id ?? null,
          transcriptJson: [],
          body: inboundText,
          metadata: { channel: "whatsapp", toPhone, fromPhone },
          occurredAt: now,
        },
      });
      session = await db.chatSession.create({
        data: {
          tenantId,
          contactId: contact.id,
          agentId: agent.id,
          commLogId: commLog.id,
        },
      });
      await db.communicationLog.update({
        where: { id: commLog.id },
        data: { sessionId: session.id },
      });
      // One timeline activity per conversation, not per message.
      await db.activity.create({
        data: {
          tenantId,
          contactId: contact.id,
          type: "WHATSAPP_RECEIVED",
          summary: `WhatsApp conversation started: ${inboundText.substring(0, 80)}${inboundText.length > 80 ? "…" : ""}`,
          commLogId: commLog.id,
          occurredAt: now,
        },
      });
    }

    const turns = (Array.isArray(commLog.transcriptJson)
      ? commLog.transcriptJson
      : []) as unknown as StoredTurn[];
    turns.push({ role: "user", text: inboundText, at: now.toISOString() });

    // Persist the customer's message IMMEDIATELY — the LLM takes seconds, and
    // a second message arriving in that window must not clobber this one.
    await this.persistTurns(session.id, commLog.id, turns, inboundText, now);

    // 4. Human takeover: message recorded, stay silent, let the human reply.
    if (session.humanTakeover) {
      log.info("human takeover active — AI reply suppressed", { sessionId: session.id });
      return;
    }

    // 5. Generate the AI reply from the agent's real persona.
    const persona: ChatAgentPersona = {
      agentName: agent.name,
      role: agent.role,
      tone: agent.tone,
      language: agent.language,
      businessName: agent.tenant.name,
      businessInfo: agent.businessInfo,
      knowledge: agent.knowledgeBases.map((kb) => ({ name: kb.name, content: kb.content ?? "" })),
      channelPrompt: agent.whatsappPrompt,
    };
    const history: ChatTurn[] = turns.map((t) => ({ role: t.role, content: t.text }));

    let reply: string;
    if (hasMedia && !body) {
      reply =
        "Sorry, main abhi sirf text messages padh sakta hoon. Aap apni baat likh kar bhej denge? 🙏";
    } else if (!env.OPENAI_API_KEY) {
      log.error("OPENAI_API_KEY not configured — sending fallback reply");
      reply = agent.fallbackMessage;
    } else {
      try {
        reply = await generateChatReply(
          {
            provider: "openai",
            apiKey: env.OPENAI_API_KEY,
            model: "gpt-4o-mini",
            temperature: 0.7,
          },
          buildWhatsAppSystemPrompt(persona),
          history,
        );
      } catch (err) {
        // A broken LLM must never leave the customer on read.
        log.error("LLM reply generation failed — using agent fallback message", {
          agentId: agent.id,
          error: getErrorMessage(err),
        });
        reply = agent.fallbackMessage;
      }
    }

    // 6. Send, then append the assistant turn onto the FRESHEST transcript —
    //    more customer messages may have landed while the LLM was thinking.
    const { error: sendError, sid } = await this.sendWhatsApp(toPhone, fromPhone, reply);
    const freshLog = await db.communicationLog.findUnique({ where: { id: commLog.id } });
    const freshTurns = (Array.isArray(freshLog?.transcriptJson)
      ? freshLog!.transcriptJson
      : turns) as unknown as StoredTurn[];
    freshTurns.push({
      role: "assistant",
      text: reply,
      at: new Date().toISOString(),
      by: "ai",
      ...(sid ? { sid } : {}),
      ...(sendError ? { failed: true } : {}),
    });
    await this.persistTurns(session.id, commLog.id, freshTurns, inboundText, now);

    if (sendError) {
      log.error("WhatsApp reply not delivered", { sessionId: session.id, error: sendError });
    } else {
      log.info("WhatsApp reply sent", { sessionId: session.id, contactId: contact.id });
    }
  }

  /** Send one WhatsApp message; returns {error} or {sid}, never throws. */
  async sendWhatsApp(
    fromPhone: string,
    toPhone: string,
    text: string,
  ): Promise<{ error: string | null; sid: string | null }> {
    try {
      const client = getTwilioClient();
      const msg = await client.messages.create({
        from: `whatsapp:${fromPhone}`,
        to: `whatsapp:${toPhone}`,
        body: text,
        // Delivery is async (e.g. 63016 outside the 24h window arrives later) —
        // the status webhook marks the turn undelivered so the UI can't lie.
        ...(env.WHATSAPP_WEBHOOK_URL
          ? { statusCallback: `${env.WHATSAPP_WEBHOOK_URL.replace(/\/$/, "")}/status` }
          : {}),
      });
      return { error: null, sid: msg.sid };
    } catch (err) {
      const message = getErrorMessage(err);
      log.error("Twilio send failed", { toPhone, error: message });
      return { error: message, sid: null };
    }
  }

  /**
   * Twilio message status callback: flags a sent turn as undelivered so the
   * dashboard shows the truth instead of a silently lost message.
   */
  async handleStatusCallback(payload: Record<string, unknown>): Promise<void> {
    const status = typeof payload.MessageStatus === "string" ? payload.MessageStatus : "";
    if (status !== "failed" && status !== "undelivered") return;
    const sid = typeof payload.MessageSid === "string" ? payload.MessageSid : null;
    const to = typeof payload.To === "string" ? payload.To.replace("whatsapp:", "") : null;
    const errorCode = payload.ErrorCode != null ? String(payload.ErrorCode) : "unknown";
    if (!sid || !to) return;

    // The undelivered message belongs to the contact's open (or latest)
    // conversation log — find the turn by Twilio SID and flag it.
    const contact = await db.contact.findFirst({
      where: { phones: { has: to }, deletedAt: null },
      select: { id: true },
    });
    if (!contact) return;
    const commLog = await db.communicationLog.findFirst({
      where: { contactId: contact.id, type: "WHATSAPP" },
      orderBy: { occurredAt: "desc" },
    });
    if (!commLog) return;

    const turns = (Array.isArray(commLog.transcriptJson)
      ? commLog.transcriptJson
      : []) as unknown as StoredTurn[];
    const turn = turns.find((t) => t.sid === sid);
    if (!turn || turn.failed) return;
    turn.failed = true;
    turn.errorCode = errorCode;

    await db.communicationLog.update({
      where: { id: commLog.id },
      data: { transcriptJson: turns as unknown as object[] },
    });
    log.warn("WhatsApp message undelivered", { sid, to, errorCode, logId: commLog.id });
  }

  private async persistTurns(
    sessionId: string,
    commLogId: string,
    turns: StoredTurn[],
    latestInbound: string,
    lastMessageAt: Date,
  ): Promise<void> {
    await Promise.all([
      db.communicationLog.update({
        where: { id: commLogId },
        data: {
          transcriptJson: turns as unknown as object[],
          transcript: renderTranscriptText(turns),
          body: latestInbound,
        },
      }),
      db.chatSession.update({
        where: { id: sessionId },
        data: { lastMessageAt },
      }),
    ]);
  }

  // ── Dashboard-facing session operations (human takeover) ──

  /** Session state for one conversation log — drives the reply box UI. */
  async getSessionByLog(tenantId: string, logId: string) {
    const session = await db.chatSession.findFirst({
      where: { tenantId, commLogId: logId },
      include: { contact: { select: { phones: true } }, agent: { select: { phoneNumberId: true } } },
    });
    if (!session) return null;
    return {
      sessionId: session.id,
      status: session.status,
      humanTakeover: session.humanTakeover,
      lastMessageAt: session.lastMessageAt.toISOString(),
    };
  }

  /**
   * Manual reply from the dashboard. First manual reply flips the session to
   * human takeover so the AI stops competing with the operator.
   */
  async sendManualReply(tenantId: string, sessionId: string, message: string) {
    const session = await db.chatSession.findFirst({
      where: { id: sessionId, tenantId },
      include: { contact: { select: { phones: true } } },
    });
    if (!session) throw new Error("Session not found");
    if (session.status !== "OPEN") throw new Error("Conversation is already closed");
    if (!session.commLogId) throw new Error("Session has no conversation log");

    const contactPhone = session.contact.phones[0];
    if (!contactPhone) throw new Error("Contact has no phone number");

    const commLog = await db.communicationLog.findUnique({ where: { id: session.commLogId } });
    const meta = (commLog?.metadata ?? {}) as Record<string, unknown>;
    // Reply from whatever number the customer wrote to (sandbox or real line).
    const fromPhone = typeof meta.toPhone === "string" && meta.toPhone ? meta.toPhone : null;
    if (!fromPhone) throw new Error("No sender number available for this conversation");

    const { error: sendError, sid } = await this.sendWhatsApp(fromPhone, contactPhone, message);
    if (sendError) throw new Error(`WhatsApp send failed: ${sendError}`);

    const turns = (Array.isArray(commLog?.transcriptJson)
      ? commLog!.transcriptJson
      : []) as unknown as StoredTurn[];
    turns.push({
      role: "assistant",
      text: message,
      at: new Date().toISOString(),
      by: "human",
      ...(sid ? { sid } : {}),
    });

    await Promise.all([
      db.communicationLog.update({
        where: { id: session.commLogId },
        data: { transcriptJson: turns as unknown as object[], transcript: renderTranscriptText(turns) },
      }),
      db.chatSession.update({
        where: { id: session.id },
        data: { humanTakeover: true, lastMessageAt: new Date() },
      }),
    ]);
    return { humanTakeover: true };
  }

  /**
   * Business-initiated message: start (or continue) a WhatsApp conversation
   * with any number from the dashboard. The session opens in human-takeover
   * mode — the operator started it, so the AI stays out until handed back.
   *
   * WhatsApp platform rule: freeform messages deliver only within 24h of the
   * customer's last inbound message. Cold outreach needs an approved template
   * — Twilio rejects it with error 63016, which we translate for the UI.
   */
  async sendOutboundMessage(tenantId: string, agentId: string, toRaw: string, message: string) {
    const toPhone = normalizePhone(toRaw);
    const { agent, phone } = await this.resolveAgentLine(tenantId, agentId);
    const businessPhone = phone.phoneNumber;

    // Send first — no session/contact litter when WhatsApp rejects the message.
    const { error: sendError, sid } = await this.sendWhatsApp(businessPhone, toPhone, message);
    if (sendError) {
      if (sendError.includes("63016") || sendError.toLowerCase().includes("outside the allowed window")) {
        throw new Error(
          "WhatsApp only allows freeform messages within 24 hours of the customer's last message. This number hasn't messaged you recently — they need to message you first, or use an approved template.",
        );
      }
      throw new Error(`WhatsApp send failed: ${sendError}`);
    }

    return this.recordOutbound(tenantId, agent.id, phone, toPhone, message, sid);
  }

  /**
   * Cold outreach: send a Meta-approved template to any number — the only
   * message type WhatsApp delivers outside the 24h customer window.
   */
  async sendTemplateMessage(
    tenantId: string,
    agentId: string,
    toRaw: string,
    contentSid: string,
    variables: Record<string, string>,
  ) {
    const toPhone = normalizePhone(toRaw);
    const { agent, phone } = await this.resolveAgentLine(tenantId, agentId);
    const businessPhone = phone.phoneNumber;

    const template = await templateService.getTemplate(contentSid);
    if (!template) throw new Error("Template not found");
    const renderedText = templateService.renderBody(template.body, variables);

    let sid: string | null = null;
    try {
      const client = getTwilioClient();
      const msg = await client.messages.create({
        from: `whatsapp:${businessPhone}`,
        to: `whatsapp:${toPhone}`,
        contentSid,
        ...(Object.keys(variables).length > 0
          ? { contentVariables: JSON.stringify(variables) }
          : {}),
        ...(env.WHATSAPP_WEBHOOK_URL
          ? { statusCallback: `${env.WHATSAPP_WEBHOOK_URL.replace(/\/$/, "")}/status` }
          : {}),
      });
      sid = msg.sid;
    } catch (err) {
      const message = getErrorMessage(err);
      log.error("Template send failed", { toPhone, contentSid, error: message });
      if (message.includes("63021") || message.toLowerCase().includes("not approved")) {
        throw new Error("This template isn't approved by Meta yet — check its status and try again once it's approved.");
      }
      throw new Error(`Template send failed: ${message}`);
    }

    return this.recordOutbound(tenantId, agent.id, phone, toPhone, renderedText, sid, template.name);
  }

  private async resolveAgentLine(tenantId: string, agentId: string) {
    const agent = await db.aIAgent.findFirst({
      where: { id: agentId, tenantId, deletedAt: null },
      select: { id: true, name: true, phoneNumberId: true },
    });
    if (!agent) throw new Error("Agent not found");
    if (!agent.phoneNumberId) throw new Error("This agent has no phone number");
    const phone = await db.phoneNumber.findUnique({
      where: { id: agent.phoneNumberId },
      select: { id: true, phoneNumber: true },
    });
    if (!phone) throw new Error("Agent's phone number not found");
    return { agent, phone };
  }

  /** Contact + session + anchor-log bookkeeping shared by all outbound sends. */
  private async recordOutbound(
    tenantId: string,
    agentId: string,
    phone: { id: string; phoneNumber: string },
    toPhone: string,
    message: string,
    sid: string | null,
    templateName?: string,
  ) {
    const businessPhone = phone.phoneNumber;
    let contact = await db.contact.findFirst({
      where: { tenantId, phones: { has: toPhone }, deletedAt: null },
    });
    if (!contact) {
      contact = await db.contact.create({
        data: { tenantId, firstName: "WhatsApp", lastName: "Contact", phones: [toPhone] },
      });
      await db.activity.create({
        data: {
          tenantId,
          contactId: contact.id,
          type: "CONTACT_CREATED",
          summary: "Contact created from outbound WhatsApp message",
          metadata: { source: "whatsapp" },
          occurredAt: new Date(),
        },
      });
    }

    const now = new Date();
    let session = await db.chatSession.findFirst({
      where: { tenantId, contactId: contact.id, agentId, status: "OPEN" },
    });
    let commLog = session?.commLogId
      ? await db.communicationLog.findUnique({ where: { id: session.commLogId } })
      : null;

    if (!session || !commLog) {
      commLog = await db.communicationLog.create({
        data: {
          tenantId,
          contactId: contact.id,
          agentId,
          type: "WHATSAPP",
          direction: "OUTBOUND",
          status: "IN_PROGRESS",
          phoneNumberId: phone.id,
          transcriptJson: [],
          body: message,
          // Same convention as inbound: toPhone = our number, fromPhone = customer.
          metadata: { channel: "whatsapp", toPhone: businessPhone, fromPhone: toPhone },
          occurredAt: now,
        },
      });
      session = await db.chatSession.create({
        data: {
          tenantId,
          contactId: contact.id,
          agentId,
          commLogId: commLog.id,
          humanTakeover: true,
        },
      });
      await db.communicationLog.update({
        where: { id: commLog.id },
        data: { sessionId: session.id },
      });
      await db.activity.create({
        data: {
          tenantId,
          contactId: contact.id,
          type: "WHATSAPP_SENT",
          summary: `WhatsApp conversation started: ${message.substring(0, 80)}${message.length > 80 ? "…" : ""}`,
          commLogId: commLog.id,
          occurredAt: now,
        },
      });
    } else if (!session.humanTakeover) {
      await db.chatSession.update({
        where: { id: session.id },
        data: { humanTakeover: true },
      });
    }

    const turns = (Array.isArray(commLog.transcriptJson)
      ? commLog.transcriptJson
      : []) as unknown as StoredTurn[];
    turns.push({
      role: "assistant",
      text: message,
      at: now.toISOString(),
      by: "human",
      ...(sid ? { sid } : {}),
      ...(templateName ? { template: templateName } : {}),
    });
    await db.communicationLog.update({
      where: { id: commLog.id },
      data: { transcriptJson: turns as unknown as object[], transcript: renderTranscriptText(turns) },
    });
    await db.chatSession.update({ where: { id: session.id }, data: { lastMessageAt: now } });

    return { logId: commLog.id, sessionId: session.id, contactId: contact.id };
  }

  /** Hand the conversation back to the AI (or pause it manually). */
  async setTakeover(tenantId: string, sessionId: string, enabled: boolean) {
    const updated = await db.chatSession.updateMany({
      where: { id: sessionId, tenantId, status: "OPEN" },
      data: { humanTakeover: enabled },
    });
    if (updated.count === 0) throw new Error("Session not found or already closed");
    return { humanTakeover: enabled };
  }

  /**
   * Manual "hang up": age the session past the idle window so the post-call
   * sweeper picks it up on its next pass (≤ sweep interval) and runs the
   * full post-processing pipeline on it.
   */
  async closeSession(tenantId: string, sessionId: string) {
    const updated = await db.chatSession.updateMany({
      where: { id: sessionId, tenantId, status: "OPEN" },
      data: { lastMessageAt: new Date(0) },
    });
    if (updated.count === 0) throw new Error("Session not found or already closed");
    return { closing: true };
  }
}
