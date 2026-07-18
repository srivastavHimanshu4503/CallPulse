const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;

const threshold: number =
  LEVELS[(process.env.LOG_LEVEL as Level) ?? "info"] ?? LEVELS.info;

const write = (level: Level, scope: string, msg: string, meta?: Record<string, unknown>) => {
  if (LEVELS[level] < threshold) return;
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${scope}] ${msg}`;
  const stream = level === "error" || level === "warn" ? process.stderr : process.stdout;
  if (meta && Object.keys(meta).length > 0) {
    stream.write(`${line} ${JSON.stringify(meta)}\n`);
  } else {
    stream.write(`${line}\n`);
  }
};

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  child(scope: string): Logger;
}

export const createLogger = (scope: string): Logger => ({
  debug: (msg, meta) => write("debug", scope, msg, meta),
  info: (msg, meta) => write("info", scope, msg, meta),
  warn: (msg, meta) => write("warn", scope, msg, meta),
  error: (msg, meta) => write("error", scope, msg, meta),
  child: (sub) => createLogger(`${scope}:${sub}`),
});
