import type { CallContext } from "./types.js";
import { getTool } from "./registry.js";

export async function executeTool(
  name: string,
  argsString: string,
  context: CallContext,
): Promise<string> {
  console.log(`[ToolExecutor] Executing tool "${name}" with args: ${argsString}`);
  const tool = getTool(name);
  if (!tool) {
    console.warn(`[ToolExecutor] Tool "${name}" is not registered`);
    return `Error: Tool "${name}" does not exist.`;
  }

  try {
    // Parse arguments with safety check for empty/missing arguments
    const parsedArgs = argsString.trim() ? JSON.parse(argsString) : {};

    // Execute the tool and return its response string
    const result = await tool.execute(parsedArgs, context);
    console.log(`[ToolExecutor] Tool "${name}" executed successfully`);
    return result;
  } catch (error: any) {
    console.error(`[ToolExecutor] Failed to execute tool "${name}":`, error);
    return `Error executing tool: ${error.message || "Unknown error"}`;
  }
}
