/**
 * Shared error taxonomy for every Antigravity service.
 *
 * Design rules:
 *   - Every thrown error in service code should be (or be wrapped into) an
 *     `AppError` subclass so callers can branch on `code` / `retryable`
 *     instead of parsing message strings.
 *   - `retryable` tells queue/pipeline layers whether re-running the
 *     operation could succeed (network blip, rate limit) or is pointless
 *     (validation failure, missing row).
 *   - `context` carries structured metadata for logs — never secrets.
 *   - `cause` preserves the original error for stack traces.
 */

export type ErrorCode =
  | "INTERNAL"
  | "DATABASE"
  | "NOT_FOUND"
  | "VALIDATION"
  | "LLM"
  | "EXTERNAL_SERVICE"
  | "CONFIG"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "TIMEOUT";

export interface AppErrorOptions {
  retryable?: boolean;
  context?: Record<string, unknown>;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly context: Record<string, unknown>;
  override readonly cause?: unknown;

  constructor(code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.context = options.context ?? {};
    this.cause = options.cause;
  }

  /** Structured shape safe for logging / JSON APIs. */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      context: this.context,
      cause: this.cause instanceof Error ? this.cause.message : this.cause,
    };
  }
}

/** A database read/write failed (connection, constraint, missing row on update). */
export class DatabaseError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("DATABASE", message, { retryable: true, ...options });
  }
}

/** An entity that was expected to exist does not. Not retryable. */
export class NotFoundError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("NOT_FOUND", message, { retryable: false, ...options });
  }
}

/** Input failed validation (bad payload, schema mismatch). Not retryable. */
export class ValidationError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("VALIDATION", message, { retryable: false, ...options });
  }
}

/** An LLM call failed (provider outage, malformed output, rate limit). */
export class LLMError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("LLM", message, { retryable: true, ...options });
  }
}

/** A third-party API call failed (Twilio, LiveKit, external CRM, webhook). */
export class ExternalServiceError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("EXTERNAL_SERVICE", message, { retryable: true, ...options });
  }
}

/** Service is misconfigured (missing env var, bad credentials shape). */
export class ConfigError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("CONFIG", message, { retryable: false, ...options });
  }
}

/** Auth failed — bad token, missing secret, tenant mismatch. */
export class UnauthorizedError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("UNAUTHORIZED", message, { retryable: false, ...options });
  }
}

/** Provider throttled us; retry after backoff. */
export class RateLimitError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("RATE_LIMITED", message, { retryable: true, ...options });
  }
}

/** Operation exceeded its deadline. */
export class TimeoutError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("TIMEOUT", message, { retryable: true, ...options });
  }
}

/** Extract a human-readable message from any thrown value. */
export const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
};

/**
 * Normalize any thrown value into an AppError so downstream code can rely on
 * `code` / `retryable` / `toJSON`. Unknown errors default to retryable
 * INTERNAL — safer to retry once than to drop work on the floor.
 */
export const toAppError = (err: unknown, fallbackCode: ErrorCode = "INTERNAL"): AppError => {
  if (err instanceof AppError) return err;
  return new AppError(fallbackCode, getErrorMessage(err), {
    retryable: true,
    cause: err,
  });
};

export const isRetryable = (err: unknown): boolean =>
  err instanceof AppError ? err.retryable : true;

/**
 * Run an async operation with retries + exponential backoff for retryable
 * failures. Non-retryable AppErrors short-circuit immediately.
 *
 * Usage: `await withRetries(() => llmCall(), { attempts: 3, label: "intent" })`
 */
export const withRetries = async <T>(
  op: () => Promise<T>,
  options: {
    attempts?: number;
    baseDelayMs?: number;
    label?: string;
    onRetry?: (err: AppError, attempt: number) => void;
  } = {},
): Promise<T> => {
  const attempts = Math.max(1, options.attempts ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 500;

  let lastError: AppError | undefined;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await op();
    } catch (err) {
      lastError = toAppError(err);
      if (!lastError.retryable || attempt === attempts) throw lastError;
      options.onRetry?.(lastError, attempt);
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** (attempt - 1)));
    }
  }
  // Unreachable, but satisfies the compiler.
  throw lastError ?? new AppError("INTERNAL", `withRetries(${options.label ?? "op"}) exhausted`);
};
