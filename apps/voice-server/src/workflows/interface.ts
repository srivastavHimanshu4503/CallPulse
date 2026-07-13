export interface IWorkflowTrigger {
  trigger(workflowName: string, payload: unknown): Promise<void>;
}
