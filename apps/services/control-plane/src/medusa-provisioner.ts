import { PlatformError } from "@platform/contracts";
import type { MedusaTargetStore, TenantId } from "@platform/contracts";
import type { MedusaAdminKeyStore } from "@platform/secrets";
import type { MedusaAdminProvisioner } from "./steps.ts";
import type { Logger } from "./logging.ts";

/**
 * Mints a tenant's Medusa admin key and records where the worker can reach it (ADR 0012).
 *
 * Two credentials are involved and they are not the same thing: a **provisioner** token that may
 * create API keys inside one tenant's instance, and the per-tenant **secret key** that the worker
 * then uses. This class only holds the former; the latter is written straight to
 * `MedusaAdminKeyStore` and never returned or logged.
 *
 * Convergence rule: if a key already exists for the tenant we do not mint another. A resumed
 * provisioning run must not leave a second live credential behind, and rotation is an explicit
 * operator action rather than a side effect of retrying provisioning.
 */
export class HttpMedusaAdminProvisioner implements MedusaAdminProvisioner {
  readonly #options: {
    readonly urlTemplate: string;
    readonly provisionerToken: string;
    readonly keys: MedusaAdminKeyStore;
    readonly targets: MedusaTargetStore;
    readonly logger: Logger;
    readonly transport?: typeof fetch;
  };

  constructor(options: {
    readonly urlTemplate: string;
    readonly provisionerToken: string;
    readonly keys: MedusaAdminKeyStore;
    readonly targets: MedusaTargetStore;
    readonly logger: Logger;
    readonly transport?: typeof fetch;
  }) {
    this.#options = options;
  }

  async ensureAdminKey(input: { readonly tenantId: TenantId; readonly schemaName: string }): Promise<void> {
    const baseUrl = this.#options.urlTemplate.replace("{tenantId}", encodeURIComponent(input.tenantId));
    await this.#options.targets.set({ tenantId: input.tenantId, baseUrl });

    if ((await this.#options.keys.get(input.tenantId)) !== null) {
      this.#options.logger.debug("medusa_admin.key_exists", { tenantId: input.tenantId });
      return;
    }

    const transport = this.#options.transport ?? fetch;
    const response = await transport(`${baseUrl}/admin/api-keys`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.#options.provisionerToken}`,
        // Provisioning is itself a repeatable write, so give Medusa a stable key for this one call.
        "idempotency-key": `provision-admin-key:${input.tenantId}`
      },
      body: JSON.stringify({ title: "worker", type: "secret" })
    });

    const text = await response.text();
    if (!response.ok) {
      throw new PlatformError("PROVISIONING_FAILED", "Could not mint a tenant Medusa admin key.", {
        retryable: response.status >= 500,
        details: { tenantId: input.tenantId, status: response.status }
      });
    }

    const token = (JSON.parse(text) as { api_key?: { token?: unknown } }).api_key?.token;
    if (typeof token !== "string" || token === "") {
      // Medusa returns the secret exactly once. If it is not in this response it is gone, so fail
      // rather than store an empty credential that looks usable.
      throw new PlatformError("PROVISIONING_FAILED", "Medusa did not return a secret key token.", {
        details: { tenantId: input.tenantId }
      });
    }
    await this.#options.keys.put(input.tenantId, token);
  }
}

/** Builds the provisioner when the environment is configured, otherwise `undefined` (skip). */
export function medusaAdminProvisionerFromEnv(input: {
  readonly keys: MedusaAdminKeyStore;
  readonly targets: MedusaTargetStore;
  readonly logger: Logger;
}): MedusaAdminProvisioner | undefined {
  const urlTemplate = process.env.MEDUSA_TENANT_URL_TEMPLATE;
  const provisionerToken = process.env.MEDUSA_PROVISIONER_TOKEN;
  if (urlTemplate === undefined || provisionerToken === undefined) {
    return undefined;
  }
  if (!urlTemplate.includes("{tenantId}")) {
    throw new PlatformError("VALIDATION_FAILED", "MEDUSA_TENANT_URL_TEMPLATE must contain {tenantId}.", {
      details: { urlTemplate }
    });
  }
  return new HttpMedusaAdminProvisioner({ urlTemplate, provisionerToken, ...input });
}
