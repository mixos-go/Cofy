import type { TenantId } from "./ids.ts";
import type { RateShoppingRules } from "./fulfillment.ts";

/**
 * A tenant's rate-shopping rules, as stored and read back (docs/adr/0020).
 *
 * The rules themselves are the courier-neutral `RateShoppingRules` shape in `fulfillment.ts`; this
 * file is only about *where they live*. ADR 0020 puts them with the control plane's tenant record
 * rather than in the tenant data plane, because they are platform config about how the seller
 * ships, not commerce data.
 *
 * `updatedAt` is carried so the seller UI can show when a rule last changed and so a reviewer of
 * the audit knows which version of the rules produced a shipment's chosen courier. The rules
 * mutate rarely and are small, so no version history is kept; the shipment's own `selectCourier`
 * result is the audit of what applied at the time.
 */
export interface TenantRateShoppingRules {
  readonly tenantId: TenantId;
  readonly rules: RateShoppingRules;
  readonly updatedAt: string;
}

/**
 * What a tenant with no stored rules ships by.
 *
 * "Any courier, any service level, cheapest first" is the honest default: it constrains nothing the
 * seller did not ask to constrain, and the cheapest qualifying quote is the least surprising choice
 * a seller who never opened the settings screen would expect. It is a named function rather than an
 * inline literal so the store, the route and a test all agree on the same default.
 */
export function defaultRateShoppingRules(): RateShoppingRules {
  return {
    allowedCouriers: [],
    allowedServiceLevels: [],
    maxPrice: null,
    maxEstimatedDays: null,
    requiresInsurance: false,
    requiresCod: false,
    strategy: "cheapest",
    preferredCouriers: []
  };
}

/**
 * Reads and writes one tenant's rate-shopping rules.
 *
 * Deliberately two methods, not a query builder: the in-memory and Postgres adapters must not be
 * able to drift in behaviour (the same rule `TenantStore` follows). `get` returns the default when
 * a tenant has never saved rules, so a caller never has to distinguish "unset" from "no
 * constraints" — they mean the same thing here.
 */
export interface RateShoppingRulesStore {
  get(tenantId: TenantId): Promise<TenantRateShoppingRules>;
  set(input: {
    readonly tenantId: TenantId;
    readonly rules: RateShoppingRules;
    readonly now: string;
  }): Promise<TenantRateShoppingRules>;
  /** Drop a tenant's saved rules, so a terminated tenant leaves nothing behind. */
  delete(tenantId: TenantId): Promise<void>;
}
