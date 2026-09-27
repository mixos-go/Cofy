/**
 * Provisioning orchestrator.
 *
 * Turns "create a tenant" into a sequence of independently recorded steps. Two properties matter
 * and are the reason this is not just a function that does five things in a row (docs/PLAN.md M1):
 *
 * 1. **Resumable.** Every step's status is persisted as it runs. If the process dies half-way —
 *    or a step fails — re-running provisioning picks up from the first step that is not
 *    `succeeded`. Nothing already done is redone.
 * 2. **Idempotent.** A step that was `running` when the process died is re-run on resume, because
 *    we cannot know how far it got. Handlers must therefore be safe to run twice. That is a
 *    contract on the handler, stated here, not an assumption about the handler.
 *
 * The tenant is marked `active` as the last step, so a tenant that is reachable is always one
 * whose migrations and seed have already finished.
 */

import { PlatformError } from "@platform/contracts";
import type {
  Instant,
  ProvisioningRun,
  ProvisioningStep,
  TenantId
} from "@platform/contracts";
import { PROVISIONING_STEPS } from "@platform/contracts";
import { assertTenantTransition } from "./state.ts";
import type { Logger } from "./logging.ts";
import type { TenantStore } from "./tenant-store.ts";

export type { ProvisioningStep } from "@platform/contracts";

export interface ProvisioningContext {
  readonly tenantId: TenantId;
  readonly schemaName: string;
  readonly logger: Logger;
}

/**
 * A provisioning step.
 *
 * MUST be idempotent: it may be invoked again for a tenant that already ran it, after a crash or
 * a retry. Implementations should converge on the desired state rather than assume a clean slate.
 */
export type ProvisioningStepHandler = (ctx: ProvisioningContext) => Promise<void>;

export interface ProvisioningOrchestratorOptions {
  readonly store: TenantStore;
  /** One handler per step. A missing handler is a wiring bug and fails loudly, not silently. */
  readonly handlers: Partial<Record<ProvisioningStep, ProvisioningStepHandler>>;
  readonly logger: Logger;
  /** Injectable clock, so tests do not depend on wall time. */
  readonly now?: () => Instant;
  /** Called once when the run completes. Used to publish `tenant.provisioned`. */
  readonly onProvisioned?: (tenantId: TenantId) => Promise<void>;
}

export class ProvisioningOrchestrator {
  readonly #store: TenantStore;
  readonly #handlers: Partial<Record<ProvisioningStep, ProvisioningStepHandler>>;
  readonly #logger: Logger;
  readonly #now: () => Instant;
  readonly #onProvisioned: ((tenantId: TenantId) => Promise<void>) | undefined;

  constructor(options: ProvisioningOrchestratorOptions) {
    this.#store = options.store;
    this.#handlers = options.handlers;
    this.#logger = options.logger;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#onProvisioned = options.onProvisioned;
  }

  /**
   * Runs every step that has not succeeded yet, in order.
   *
   * Returns the resulting run. Does not throw on step failure: the failure is recorded on the
   * step and returned, so an operator can inspect it through the API. It throws only when the
   * tenant itself does not exist.
   */
  async provision(tenantId: TenantId): Promise<ProvisioningRun> {
    const tenant = await this.#store.getTenant(tenantId);
    if (tenant === null) {
      throw new PlatformError("TENANT_NOT_FOUND", "No such tenant.", { details: { tenantId } });
    }

    const log = this.#logger.child({ tenantId, correlationId: `provision:${tenantId}` });

    if (tenant.state === "terminated") {
      throw new PlatformError("TENANT_STATE_INVALID", "Cannot provision a terminated tenant.", {
        details: { tenantId, state: tenant.state }
      });
    }

    const ctx: ProvisioningContext = {
      tenantId,
      schemaName: tenant.schemaName,
      logger: log
    };

    log.info("provisioning.start", { state: tenant.state, schemaName: tenant.schemaName });

    for (const step of PROVISIONING_STEPS) {
      const run = await this.#store.getProvisioningRun(tenantId);
      const record = run.steps.find((entry) => entry.step === step);

      if (record === undefined) {
        throw new PlatformError("PROVISIONING_FAILED", "Provisioning run is missing a step.", {
          details: { tenantId, step }
        });
      }

      // Already done on a previous attempt: skip. This is what makes resume cheap and safe.
      if (record.status === "succeeded") {
        log.debug("provisioning.step.skipped", { step, reason: "already_succeeded" });
        continue;
      }

      const handler = this.#handlers[step];
      if (handler === undefined) {
        const message = `No handler registered for provisioning step '${step}'.`;
        await this.#store.recordStep(tenantId, step, {
          status: "failed",
          now: this.#now(),
          errorMessage: message
        });
        log.error("provisioning.step.failed", { step, errorMessage: message });
        return this.#store.getProvisioningRun(tenantId);
      }

      await this.#store.recordStep(tenantId, step, { status: "running", now: this.#now() });

      try {
        await handler(ctx);
      } catch (error) {
        // Message only. A stack trace or a raw error object can carry secrets (AGENTS.md §2.6).
        const errorMessage = error instanceof Error ? error.message : "Step failed.";
        await this.#store.recordStep(tenantId, step, {
          status: "failed",
          now: this.#now(),
          errorMessage
        });
        log.error("provisioning.step.failed", { step, errorMessage });
        return this.#store.getProvisioningRun(tenantId);
      }

      await this.#store.recordStep(tenantId, step, { status: "succeeded", now: this.#now() });
      log.info("provisioning.step.succeeded", { step, attempt: record.attempt + 1 });

      if (step === "mark_active") {
        await this.#activate(tenantId, tenant.state);
      }
    }

    const finalRun = await this.#store.getProvisioningRun(tenantId);
    if (finalRun.complete) {
      log.info("provisioning.complete", {});
      await this.#onProvisioned?.(tenantId);
    }
    return finalRun;
  }

  async #activate(tenantId: TenantId, currentState: string): Promise<void> {
    if (currentState !== "provisioning") return;
    assertTenantTransition("provisioning", "active");
    await this.#store.setTenantState(tenantId, "active", this.#now());
    this.#logger.info("provisioning.activated", { tenantId });
  }
}
