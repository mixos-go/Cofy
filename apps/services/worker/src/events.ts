/**
 * Event publication from the worker.
 *
 * Events go on the queue and are consumed by other layers (AGENTS.md §2.5 forbids fire-and-forget
 * for anything touching a marketplace, and `setTimeout`/in-process cron are not a workflow engine).
 * The workflows here are the *units* the engine runs; this interface is how they emit, so the unit
 * is testable without a broker and the engine's delivery semantics stay in one place.
 */

import type { Logger } from "@platform/observability";
import type { EventPublisher } from "./order-import.ts";

/** Records published events. Used by tests and local runs; the queue adapter is wired in `main.ts`. */
export class InMemoryEventPublisher implements EventPublisher {
  readonly published: { readonly event: string; readonly payload: Readonly<Record<string, unknown>> }[] = [];
  readonly #logger: Logger | undefined;

  constructor(logger?: Logger) {
    this.#logger = logger;
  }

  async publish(event: string, payload: Readonly<Record<string, unknown>>): Promise<void> {
    this.published.push({ event, payload });
    this.#logger?.info("event.published", { event, ...payload });
  }
}
