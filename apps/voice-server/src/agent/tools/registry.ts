import type { VoiceTool } from "./types.js";

const tools: Map<string, VoiceTool> = new Map();

export const registerTool = (tool: VoiceTool): void => {
  console.log(`[ToolRegistry] Registering tool: ${tool.name}`);
  tools.set(tool.name, tool);
};

export const getTools = (): VoiceTool[] => Array.from(tools.values());

export const getTool = (name: string): VoiceTool | undefined => tools.get(name);
export const clearTools = (): void => tools.clear();
