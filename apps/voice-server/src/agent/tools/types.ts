import type { llm } from "@livekit/agents";
type Message = llm.ChatMessage;
import type { IWorkflowTrigger } from "../../workflows/interface.js";

export interface VoiceTool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<
      string,
      {
        type: string;
        description: string;
        enum?: string[];
      }
    >;
    required: string[];
  };
  execute: (args: Record<string, any>, context: CallContext) => Promise<string>;
}

export interface CallContext {
  callSid: string;
  callerNumber: string;
  orgId: string; // Empty string now, populated when multi-tenant
  sessionId: string;
  conversationHistory: Message[];
  workflowTrigger: IWorkflowTrigger; // Injected — tools can trigger workflows
  transferCall: (to: string) => Promise<void>; // Tools can transfer calls
}
