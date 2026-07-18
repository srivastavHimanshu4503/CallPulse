// Basic logger for the LLM package
export const createLogger = (namespace: string) => {
  return {
    info: (msg: string, meta?: any) => console.log(`[INFO] [${namespace}] ${msg}`, meta || ""),
    error: (msg: string, meta?: any) => console.error(`[ERROR] [${namespace}] ${msg}`, meta || ""),
    warn: (msg: string, meta?: any) => console.warn(`[WARN] [${namespace}] ${msg}`, meta || ""),
    debug: (msg: string, meta?: any) => console.debug(`[DEBUG] [${namespace}] ${msg}`, meta || ""),
  };
};
