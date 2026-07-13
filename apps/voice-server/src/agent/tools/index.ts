import { llm } from "@livekit/agents";
import { z } from "zod";
import { createLogger } from "../../logger.js";
import type { IWorkflowTrigger } from "../../workflows/interface.js";

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
}

/**
 * Build the LLM-callable tool set for a call. All tools are per-call because
 * they close over the current context (callSid, tenantId, endCall handle).
 */
export const buildTools = (ctx: ToolContext) => {
  return {
    collect_callback_details: llm.tool({
      description:
        "Save the caller's name and callback number when they explicitly want a human to call them back or when the current query cannot be resolved on the call. Do NOT invoke this unless the caller has clearly opted into a callback.",
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
        "End the phone call. Invoke when the caller clearly signals they want to hang up — any explicit goodbye phrase like 'bye', 'goodbye', 'thank you bye', 'thank you goodbye', 'ok bye', 'phir milte', 'chalo bye', 'rakhta hoon', 'that's all', 'I have to go'. Do NOT invoke for filler acknowledgments like 'okay', 'haan', 'hmm', 'theek hai', 'ji' — those are not goodbyes. Say a short warm goodbye line first, then invoke this.",
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
};
