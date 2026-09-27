/**
 * Structured JSON logging (AGENTS.md §5).
 *
 * Every line carries `tenant_id` and `correlation_id` where they exist, so an operator can trace
 * one request across services and one tenant across the platform. No `console.log` elsewhere in
 * this service.
 *
 * Secrets must never reach a log line (AGENTS.md §2.6). `redact` is a safety net for fields we
 * already know are sensitive; the real protection is that secrets are never handed to a logger.
 */

import type { TenantId } from "@platform/contracts";

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

const LEVEL_ORDER: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

export interface LogFields {
  readonly tenantId?: TenantId;
  readonly correlationId?: string;
  readonly [key: string]: unknown;
}

export interface Logger {
  debug(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
  child(fields: LogFields): Logger;
}

const SECRET_KEY = /secret|token|password|credential|api_?key/i;

/** Replaces sensitive values with a marker, recursively. */
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = SECRET_KEY.test(key) ? "[redacted]" : redact(entry);
    }
    return out;
  }
  return value;
}

export function createLogger(
  level: LogLevel = "info",
  base: LogFields = {},
  sink: (line: string) => void = (line) => process.stdout.write(`${line}\n`)
): Logger {
  const threshold = LEVEL_ORDER[level];

  const emit = (entryLevel: LogLevel, event: string, fields: LogFields): void => {
    if (LEVEL_ORDER[entryLevel] < threshold) return;
    const record = {
      level: entryLevel,
      event,
      time: new Date().toISOString(),
      ...(redact({ ...base, ...fields }) as Record<string, unknown>)
    };
    sink(JSON.stringify(record));
  };

  return {
    debug: (event, fields = {}) => emit("debug", event, fields),
    info: (event, fields = {}) => emit("info", event, fields),
    warn: (event, fields = {}) => emit("warn", event, fields),
    error: (event, fields = {}) => emit("error", event, fields),
    child: (fields) => createLogger(level, { ...base, ...fields }, sink)
  };
}
