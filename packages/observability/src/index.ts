import * as Sentry from "@sentry/node";

/**
 * Sentry wrapper for all three servers. Deliberately gated on the SENTRY_DSN
 * env var: the deployed box has it, local dev doesn't — so local runs stay
 * clean with zero configuration and every helper below degrades to a no-op.
 *
 * Error monitoring only (no tracing/profiling) — logs already go to
 * CloudWatch, and quota is better spent on exceptions.
 */

let enabled = false;

export const initSentry = (opts: { service: string; environment?: string }): boolean => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: opts.environment ?? process.env.NODE_ENV ?? "development",
    // Errors only — sampling traces costs quota and we don't consume them yet.
    tracesSampleRate: 0,
    initialScope: { tags: { service: opts.service } },
  });
  enabled = true;
  return true;
};

/**
 * Report an operational error with searchable context (tenantId, callSid,
 * logId, dealId, ...). Safe to call anywhere: no-op when Sentry is off, and
 * never throws — monitoring must never take a request or call down.
 */
export const captureError = (
  err: unknown,
  context?: Record<string, string | number | boolean | null | undefined>,
): void => {
  if (!enabled) return;
  try {
    Sentry.withScope((scope) => {
      if (context) {
        for (const [k, v] of Object.entries(context)) {
          if (v !== undefined && v !== null) scope.setTag(k, String(v));
        }
        scope.setContext("details", context as Record<string, unknown>);
      }
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    });
  } catch {
    /* never let monitoring break the app */
  }
};

/** Attach Sentry's Express error handler (no-op when disabled). */
export const attachExpressErrorHandler = (app: unknown): void => {
  if (!enabled) return;
  try {
    Sentry.setupExpressErrorHandler(app as Parameters<typeof Sentry.setupExpressErrorHandler>[0]);
  } catch {
    /* ignore */
  }
};

/** Flush pending events (call before process exit). */
export const flushSentry = async (timeoutMs = 2000): Promise<void> => {
  if (!enabled) return;
  try {
    await Sentry.flush(timeoutMs);
  } catch {
    /* ignore */
  }
};
