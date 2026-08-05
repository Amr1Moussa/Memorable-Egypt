/**
 * Structured logger.
 *
 * Phase 1 ships a thin console-backed logger with a stable interface so
 * we can swap in Sentry/Pino later without touching call sites. Per
 * doc 05 / 27, it must NEVER log secrets or PII.
 *
 * Source: doc 05 (Logging), doc 27 (Monitoring).
 */

type Level = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: Level;
  message: string;
  /** Optional structured context — never put secrets/PII here. */
  context?: Record<string, unknown>;
  /** Optional error for stack traces. */
  error?: unknown;
}

const LEVEL_PRIORITY: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * Minimum level emitted. Defaults to `info`; lowered to `debug` in dev.
 * Read once at module load to keep the logger hot.
 */
const minLevel: Level =
  process.env.NODE_ENV === "production" ? "info" : "debug";

function serialize(error: unknown): unknown {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return error;
}

function emit(entry: LogEntry): void {
  if (LEVEL_PRIORITY[entry.level] < LEVEL_PRIORITY[minLevel]) return;
  const payload = {
    level: entry.level,
    message: entry.message,
    ...(entry.context ? { context: entry.context } : {}),
    ...(entry.error ? { error: serialize(entry.error) } : {}),
  };
  if (entry.level === "error") console.error(payload);
  else if (entry.level === "warn") console.warn(payload);
  else console.log(payload);
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    emit({ level: "debug", message, context });
  },
  info(message: string, context?: Record<string, unknown>) {
    emit({ level: "info", message, context });
  },
  warn(message: string, context?: Record<string, unknown>) {
    emit({ level: "warn", message, context });
  },
  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    emit({ level: "error", message, error, context });
  },
} as const;
