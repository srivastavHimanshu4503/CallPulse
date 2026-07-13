import type { IWorkflowTrigger } from "./interface.js";

export class WorkflowTriggerStub implements IWorkflowTrigger {
  async trigger(workflowName: string, payload: unknown): Promise<void> {
    console.log(`[WorkflowTriggerStub] Triggered: ${workflowName}`, payload);
    // Temporal client will wire in here when ready — no other changes needed
  }
}
