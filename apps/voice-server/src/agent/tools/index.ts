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
        "Hang up the phone call — the ONLY way to actually end it. Whenever your reply contains a closing farewell, invoke this in the SAME turn via function calling. Invoke only for the unambiguous farewells listed in your ENDING THE CALL instructions (a leading 'okay'/'haan' before the farewell still counts); never for bare acknowledgments, 'thank you' alone, or silence.",
      parameters: z.object({
        reason: z.string().describe(
          "One short phrase describing why the call is ending, e.g. 'caller said bye', 'query resolved and caller said thanks bye'."
        ),
      }),
      execute: async (args) => {
        log.warn("end_call TOOL FIRED — hanging up call", {
          callSid: ctx.callSid,
          reason: args.reason,
        });
        // Fire and forget — the LLM finishes speaking its goodbye first,
        // then the telephony provider tears down the call. Awaiting here
        // would delay the goodbye playback.
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
