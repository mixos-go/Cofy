import { PlatformError } from "@platform/contracts";
import type { MedusaTargetStore, RegionCode, TenantId } from "@platform/contracts";
import type { MedusaAdminKeyStore } from "@platform/secrets";
import type { Logger } from "./logging.ts";
import type { TenantSeeder } from "./steps.ts";

/**
 * The commerce defaults a freshly provisioned tenant needs before the worker can import an order.
 *
 * A Medusa order is priced and reserved against a region and a stock location; with neither, the
 * first import fails and the tenant looks provisioned while being unusable (the same class of gap
 * as a tenant with no admin key). Seeding here rather than in the worker keeps the worker's
 * contract to "create an order", which is what ADR 0010 scoped it to.
 */
export const TENANT_DEFAULTS: Readonly<Record<RegionCode, TenantRegionDefault>> = {
  "id-jkt": { name: "Indonesia", currencyCode: "idr", countries: ["id"] },
  "sg-sin": { name: "Singapore", currencyCode: "sgd", countries: ["sg"] }
};

export interface TenantRegionDefault {
  readonly name: string;
  readonly currencyCode: string;
  readonly countries: readonly string[];
}

/**
 * Seeds a tenant's Medusa instance over its Admin API (ADR 0010: the control plane reaches a tenant
 * through its API, never its database). Idempotent per the step contract: every create is preceded
 * by a read of the same natural key, so a resumed provisioning run converges rather than
 * duplicating. A duplicated region is not merely untidy — `id` can belong to one region only, so a
 * blind retry fails the step and leaves the tenant stuck in `provisioning`.
 */
export class HttpTenantSeeder implements TenantSeeder {
  readonly #options: {
    readonly keys: MedusaAdminKeyStore;
    readonly targets: MedusaTargetStore;
    /** The tenant's platform region, from the registry — the target carries only a URL. */
    readonly regionFor: (tenantId: TenantId) => Promise<RegionCode>;
    readonly logger: Logger;
    readonly transport?: typeof fetch;
  };

  constructor(options: {
    readonly keys: MedusaAdminKeyStore;
    readonly targets: MedusaTargetStore;
    readonly regionFor: (tenantId: TenantId) => Promise<RegionCode>;
    readonly logger: Logger;
    readonly transport?: typeof fetch;
  }) {
    this.#options = options;
  }

  async seed(input: { readonly tenantId: TenantId; readonly schemaName: string }): Promise<void> {
    const region = TENANT_DEFAULTS[await this.#options.regionFor(input.tenantId)];
    const baseUrl = (await this.#options.targets.get(input.tenantId))?.baseUrl;
    if (baseUrl === undefined) {
      // The target is written by the admin-key step, which must run first. Seeding before it has
      // no address at all, so fail with that as the cause rather than a request to `undefined`.
      throw new PlatformError("PROVISIONING_FAILED", "Cannot seed a tenant whose Medusa target is not registered.", {
        details: { tenantId: input.tenantId }
      });
    }
    const credential = await this.#credential(input.tenantId);
    const call = (path: string, init: RequestInit): Promise<HttpResult> =>
      this.#request(baseUrl, credential, path, init);

    const existingRegion = await call(`/admin/regions?currency_code=${region.currencyCode}&fields=id`, {
      method: "GET"
    });
    if (readId(existingRegion, "regions", "region") === null) {
      await call("/admin/regions", {
        method: "POST",
        body: JSON.stringify({ name: region.name, currency_code: region.currencyCode, countries: [...region.countries] })
      });
    }

    // A stock location is what a reservation draws from. It is created here even though the
    // marketplace-location mapping is a later milestone: without one, every import's reservation
    // fails, and an order that imports without holding stock is an oversell.
    const stockLocations = await call("/admin/stock-locations?fields=id", { method: "GET" });
    if (readId(stockLocations, "stock_locations", "stock location") === null) {
      await call("/admin/stock-locations", {
        method: "POST",
        body: JSON.stringify({ name: "Default" })
      });
    }

    this.#options.logger.info("provisioning.seed.medusa_done", { tenantId: input.tenantId });
  }

  async #credential(tenantId: TenantId): Promise<string> {
    const key = await this.#options.keys.get(tenantId);
    if (key === null) {
      throw new PlatformError("PROVISIONING_FAILED", "Cannot seed a tenant with no admin credential.", {
        details: { tenantId }
      });
    }
    return key;
  }

  async #request(
    baseUrl: string,
    credential: string,
    path: string,
    init: RequestInit
  ): Promise<HttpResult> {
    const transport = this.#options.transport ?? fetch;
    const response = await transport(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        // A Medusa secret API key is presented over Basic; Bearer is rejected (ADR 0012).
        authorization: `Basic ${Buffer.from(`${credential}:`, "utf8").toString("base64")}`,
        ...(init.headers ?? {})
      }
    });
    const text = await response.text();
    if (!response.ok) {
      throw new PlatformError("PROVISIONING_FAILED", "Medusa rejected a seeding request.", {
        retryable: response.status >= 500,
        details: { path, status: response.status }
      });
    }
    return text === "" ? {} : (JSON.parse(text) as HttpResult);
  }
}

type HttpResult = Record<string, unknown>;

function readId(body: HttpResult, listKey: string, label: string): string | null {
  const list = body[listKey];
  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }
  const first = list[0] as { id?: unknown };
  if (typeof first.id !== "string" || first.id === "") {
    throw new PlatformError("PROVISIONING_FAILED", `Medusa returned a ${label} with no id.`, {
      details: { listKey }
    });
  }
  return first.id;
}

/**
 * Builds the HTTP seeder when the tenant engine is reachable, otherwise `undefined`.
 *
 * Keyed on `MEDUSA_TENANT_URL_TEMPLATE` — the same switch as the admin-key provisioner — so a run
 * without a reachable engine (local development, unit tests) keeps the in-memory seeder and does
 * not attempt a network call.
 */
export function tenantSeederFromEnv(input: {
  readonly keys: MedusaAdminKeyStore;
  readonly targets: MedusaTargetStore;
  readonly regionFor: (tenantId: TenantId) => Promise<RegionCode>;
  readonly logger: Logger;
}): TenantSeeder | undefined {
  if (process.env.MEDUSA_TENANT_URL_TEMPLATE === undefined) {
    return undefined;
  }
  return new HttpTenantSeeder(input);
}

