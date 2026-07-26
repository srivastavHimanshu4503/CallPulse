import { llm } from "@livekit/agents";
import { z } from "zod";
import { createLogger } from "../../logger.js";
import type { IWorkflowTrigger } from "../../workflows/interface.js";
import type { TransferConfig } from "../../agent-config/types.js";

const log = createLogger("tools");

export interface ToolContext {
  callSid: string;
  callerNumber: string;
  sessionId: string;
  tenantId: string;
  agentId: string;
  workflowTrigger: IWorkflowTrigger;
  /** Called by the `end_call` tool to hang up the call cleanly. */
  endCall: (reason: string) => Promise<void>;
  /**
   * Transfer workflow config — when absent, the `transfer_call` tool is not
   * registered at all, so agents without transfer can never invoke it.
   * The destination number lives in this config, never in LLM arguments.
   */
  transfer?: TransferConfig | null;
  /** Redirects the caller to the configured human number. Returns a status string for the LLM. */
  transferCall?: (reason: string) => Promise<string>;
}

/**
 * Build the LLM-callable tool set for a call. All tools are per-call because
 * they close over the current context (callSid, tenantId, endCall handle).
 */
export const buildTools = (ctx: ToolContext) => {
  const tools: Record<string, ReturnType<typeof llm.tool>> = {
    collect_callback_details: llm.tool({
      description:
        "Save the caller's name and callback number for a human callback. Invoke ONLY after the caller has clearly opted into a callback.",
      parameters: z.object({
        name: z.string().describe("Caller's full name"),
        phone: z.string().describe("Callback phone number in E.164 format when possible"),
        reason: z.string().describe("Short summary of why the caller wants a callback"),
      }),
      execute: async (args) => {
        log.info("collect_callback_details", {
          callSid: ctx.callSid,
          name: args.name,
          phone: args.phone,
        });
        await ctx.workflowTrigger.trigger("CallbackWorkflow", {
          callSid: ctx.callSid,
          callerNumber: ctx.callerNumber,
          tenantId: ctx.tenantId,
          agentId: ctx.agentId,
          ...args,
        });
        return "Noted. Someone from our team will call you back shortly.";
      },
    }),

    end_call: llm.tool({
      description:
        "Hang up the phone call — the ONLY way to actually end it. Invoke ONLY when the caller has clearly signaled they want to end the call (an unambiguous farewell like 'bye', 'goodbye', 'chalo bye', 'thanks bye', 'phir milte'). Speak your short goodbye in the SAME turn. NEVER invoke on bare 'ok'/'haan'/'hmm'/'theek hai'/'thank you'/'that's all'/'I have to go'/'I'll think about it'/silence — those are NOT farewells. If unsure, ask 'kya main call disconnect kar doon?' (or 'anything else I can help with?') and only invoke after they clearly agree.",
      parameters: z.object({
        reason: z.string().describe(
          "One short phrase quoting the caller's farewell, e.g. 'caller said bye', 'caller said thanks bye after quote confirmed'."
        ),
        userWantsToEnd: z
          .boolean()
          .describe(
            "true ONLY if the caller explicitly said an unambiguous farewell in their own words ('bye', 'goodbye', 'okay bye', 'chalo bye', 'thanks bye', 'phir milte', 'alvida'), OR clearly agreed after YOU asked 'shall I end the call / kya main call disconnect kar doon'. NEVER guess true from bare 'ok', 'haan', 'hmm', 'theek hai', 'thank you' alone, 'that's all', 'I have to go', 'call me later', 'I'll think about it', silence, or your own judgment that the call feels done."
          ),
      }),
      // Confirmation gate mirrors transfer_call. Same failure mode: an
      // unwanted end_call drops the caller mid-conversation, which is worse
      // than a slightly-too-long call. If userWantsToEnd is false the tool
      // refuses and tells the LLM to ask for confirmation first.
      //
      // On the happy path, block on the goodbye playing out BEFORE we trigger
      // teardown. Tool + TTS run in parallel inside the same LLM turn, so
      // returning immediately (fire-and-forget teardown) races the audio and
      // clips the last sentence. `RunContext.waitForPlayout` is the SDK's own
      // primitive for this: it waits for THIS step's spoken response only,
      // so there's no circular wait. Capped so a stuck TTS can't strand the
      // caller in dead air.
      execute: async (args, { ctx: runCtx }) => {
        if (!args.userWantsToEnd) {
          log.warn("end_call blocked — userWantsToEnd=false", {
            callSid: ctx.callSid,
            reason: args.reason,
          });
          return "Do NOT end the call yet. The caller has not given a clear farewell. Ask them briefly if there's anything else you can help with, or 'kya main call disconnect kar doon?', and only invoke end_call again AFTER they say a clear farewell in response.";
        }
        log.warn("end_call TOOL FIRED — waiting for goodbye playout", {
          callSid: ctx.callSid,
          reason: args.reason,
        });
        const waitStart = Date.now();
        try {
          await Promise.race([
            runCtx.waitForPlayout(),
            new Promise((resolve) => setTimeout(resolve, 15_000)),
          ]);
        } catch (err) {
          log.warn("end_call: waitForPlayout rejected — proceeding to teardown", {
            callSid: ctx.callSid,
            message: (err as Error)?.message,
          });
        }
        log.info("end_call goodbye played out — triggering teardown", {
          callSid: ctx.callSid,
          waitedMs: Date.now() - waitStart,
        });
        void ctx.endCall(args.reason);
        return "Call ended.";
      },
    }),
  };

  if (ctx.transfer && ctx.transferCall) {
    const transferCall = ctx.transferCall;
    tools.transfer_call = llm.tool({
      description:
        "Transfer this call to a human team member's real phone. Dials a REAL number — invoke ONLY per the CALL TRANSFER rules in your instructions: condition met AND the caller explicitly asked for a human or clearly confirmed yes. Never for jokes, banter, or unanswerable questions (offer a callback instead).",
      parameters: z.object({
        reason: z
          .string()
          .describe(
            "One short phrase quoting what the caller asked for, e.g. 'caller asked to speak to the owner about a bulk order'."
          ),
        userConfirmed: z
          .boolean()
          .describe(
            "true ONLY if the caller explicitly asked to speak to a human in their own words, OR clearly agreed after you asked them. Never guess true."
          ),
      }),
      execute: async (args) => {
        if (!args.userConfirmed) {
          log.warn("transfer_call blocked — userConfirmed=false", {
            callSid: ctx.callSid,
            reason: args.reason,
          });
          return "Do NOT transfer yet. First ask the caller to confirm they want to be connected to the team, and only invoke transfer_call again after they clearly say yes.";
        }
        log.warn("transfer_call TOOL FIRED", {
          callSid: ctx.callSid,
          reason: args.reason,
        });
        return transferCall(args.reason);
      },
    });
  }

  return tools;
};
