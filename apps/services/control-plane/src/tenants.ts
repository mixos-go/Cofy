/**
 * Tenant registry service.
 *
 * The API surface the rest of the platform (and the ops console) uses to manage tenants. It owns
 * validation and lifecycle transitions; storage is delegated to `TenantStore` so the same rules
 * are enforced regardless of backend.
 */

import { randomUUID } from "node:crypto";
import { PlatformError } from "@platform/contracts";
import type {
  ProvisioningRun,
  RegionCode,
  TenantDetail,
  TenantId,
  TenantLifecycleState,
  TenantPlan,
  TenantRecord
} from "@platform/contracts";
import { TENANT_PLANS } from "@platform/contracts";
import { assertTenantTransition } from "./state.ts";
import type { Logger } from "./logging.ts";
import { assertValidSlug } from "./tenant-store.ts";
import type { TenantStore } from "./tenant-store.ts";
import type { TenantDirectory, TenantRoute } from "@platform/tenant-client";

const REGIONS: readonly RegionCode[] = ["id-jkt", "sg-sin"];

export interface CreateTenantRequest {
  readonly slug: string;
  readonly displayName: string;
  readonly plan: TenantPlan;
  readonly region: RegionCode;
}

export interface TenantRegistryOptions {
  readonly store: TenantStore;
  readonly logger: Logger;
  readonly now?: () => string;
  /** Injected so ids are deterministic in tests. */
  readonly generateId?: () => string;
}

export class TenantRegistry {
  readonly #store: TenantStore;
  readonly #logger: Logger;
  readonly #now: () => string;
  readonly #generateId: () => string;

  constructor(options: TenantRegistryOptions) {
    this.#store = options.store;
    this.#logger = options.logger;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#generateId = options.generateId ?? (() => randomUUID());
  }

  async create(request: CreateTenantRequest): Promise<TenantRecord> {
    assertValidSlug(request.slug);
    if (!TENANT_PLANS.includes(request.plan)) {
      throw new PlatformError("VALIDATION_FAILED", "Unknown plan.", {
        details: { plan: request.plan }
      });
    }
    if (!REGIONS.includes(request.region)) {
      throw new PlatformError("VALIDATION_FAILED", "Unknown region.", {
        details: { region: request.region }
      });
    }

    const tenant = await this.#store.createTenant({
      id: this.#generateId(),
      slug: request.slug,
      displayName: request.displayName,
      plan: request.plan,
      region: request.region,
      now: this.#now()
    });

    this.#logger.info("tenant.created", { tenantId: tenant.id, plan: tenant.plan });
    return tenant;
  }

  async get(tenantId: TenantId): Promise<TenantRecord> {
    const tenant = await this.#store.getTenant(tenantId);
    if (tenant === null) {
      throw new PlatformError("TENANT_NOT_FOUND", "No such tenant.", { details: { tenantId } });
    }
    return tenant;
  }

  async getDetail(tenantId: TenantId): Promise<TenantDetail> {
    const tenant = await this.get(tenantId);
    const provisioning = await this.#store.getProvisioningRun(tenantId);
    return { tenant, provisioning };
  }

  async list(): Promise<readonly TenantRecord[]> {
    return this.#store.listTenants();
  }

  async getProvisioningRun(tenantId: TenantId): Promise<ProvisioningRun> {
    await this.get(tenantId);
    return this.#store.getProvisioningRun(tenantId);
  }

  async setState(tenantId: TenantId, next: TenantLifecycleState): Promise<TenantRecord> {
    const tenant = await this.get(tenantId);
    assertTenantTransition(tenant.state, next);
    const updated = await this.#store.setTenantState(tenantId, next, this.#now());
    this.#logger.info("tenant.state_changed", { state: next });
    return updated;
  }
}

/**
 * Adapts the registry to the `TenantDirectory` that `packages/tenant-client` depends on.
 *
 * This lives in the control plane, not in `tenant-client`, because the client must not know how
 * routes are stored — that is the whole point of the injected directory. Only `active` tenants are
 * resolved to a route; anything else is treated as absent so a caller gets a clean 404/503 rather
 * than a connection error.
 */
export function createTenantDirectory(store: TenantStore): TenantDirectory {
  return {
    async resolve(tenantId: TenantId): Promise<TenantRoute | null> {
      const tenant = await store.getTenant(tenantId);
      if (tenant === null) return null;
      return {
        tenantId: tenant.id,
        schemaName: tenant.schemaName,
        state: tenant.state
      };
    }
  };
}

/** Re-exported so callers do not need to reach into `tenant-store` for the directory adapter. */
export type { TenantDirectory } from "@platform/tenant-client";
