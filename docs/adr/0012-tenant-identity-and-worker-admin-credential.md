# ADR 0012 — Tenant identity is the instance, and the worker authenticates with a Medusa secret API key

- **Status:** Accepted (approved 2026-09-28). Transport section amended the same day: payload signing rejected, and "the network is internal, so plaintext is fine" rejected — see Decision points 4 and 6.
- **Date:** 2026-09-28
- **Deciders:** Platform engineering

## Context

ADR 0010 decided that commerce writes go through **the tenant's own Medusa Admin API**, and that
the worker resolves a tenant to its Medusa base URL and a scoped admin token. It left two things
unspecified, and both turned out to be the same hole: **the worker has no way to say which tenant
a call is for.**

The current code makes this concrete:

- `HttpCommerceClient` (`apps/services/worker/src/ports.ts`) takes a single `baseUrl` and
  `serviceToken` from the environment (`apps/services/worker/src/main.ts`), and every port method
  receives a `tenantId` that it **never uses to select a target**. Under ADR 0001's
  instance/schema-per-tenant model, one base URL cannot be correct for more than one tenant.
- The token is sent as `authorization: Bearer <token>`. Medusa's admin routes are authenticated by
  `authenticate("user", ["bearer", "session", "api-key"])` (verified in
  `@medusajs/framework@2.21.1`, `dist/http/router.js`), which does **not** accept a secret API key
  as a Bearer token; the middleware detects that case and answers 401 with a hint to use Basic.

So two questions were open:

1. **How does a tenant-scoped call identify its tenant** — a caller-supplied header, or something
   the instance already knows?
2. **What credential does the worker present**, and who validates it?

ADR 0001 constrains the answer to (1): isolation is a property of the *instance and schema*, not of
a column, and the document explicitly rejects schemes that depend on setting a tenant scope on
every path ("one missed path = a data leak"). A `tenant_id` header would do exactly that for the
tenant's own Admin API: it would turn a structural impossibility (instance A cannot read schema B)
into a runtime check that every route must remember to perform.

## Decision

**We will treat the tenant as a property of the Medusa instance, and authenticate the worker with a
Medusa secret API key.**

Concretely:

1. **The instance owns its tenant id.** It is passed to the tenant process as configuration
   (`TENANT_ID`, alongside `DATABASE_SCHEMA`). A project route reads it from configuration and
   never from a request header, body, or query parameter. Anyone who reaches a tenant's Admin API
   is, by construction, operating on that one tenant.
2. **`tenant_id` stays in the worker's port contract but never travels as a header.** The
   `CommerceClient` method signatures keep `tenantId`; `HttpCommerceClient` uses it to *select* a
   target (base URL + credential) via a resolver, and does not forward it. No header named
   `x-tenant-id` (or similar) is sent or read.
3. **Target resolution is a control-plane concern.** Per ADR 0001, per-tenant configuration lives
   in the control plane. The worker resolves `tenantId` to `{ baseUrl, credentialRef }` through the
   control plane it already calls for sync state, then reads the credential through
   `packages/secrets`. This finally gives `tenant-client` and `secrets` a real caller on the write
   path without the worker touching a tenant database.
4. **The credential is a Medusa secret API key (`sk_...`), presented over HTTP Basic** and
   validated by Medusa's own admin auth. We do not write a token verifier, we do not set
   `AUTHENTICATE = false` on any route, and we do not create a synthetic admin *user* for the
   worker.
5. **The project routes under `/admin` keep the default authentication.** Nothing in our routes
   opts out of auth, so an unauthenticated caller is rejected by the framework before our handler
   runs.
6. **The worker→tenant hop is encrypted with TLS, and its authenticity is established at the
   transport layer, not merely assumed from network location.** "The network is internal" is not
   treated as a security control: the tenant Admin API is a write surface that carries order,
   customer and stock data, so a single compromised pod or a mutated service endpoint must not be
   able to read credentials off the wire or serve a tenant's calls from an attacker's process. Two
   sub-decisions:
   - **No payload signing.** Signing each request body is rejected: it costs the worker a signing
     key and a canonicalization scheme for every call, adds a verification step inside every
     tenant instance, and duplicates a guarantee TLS already provides. It buys authenticity that
     the credential and the certificate already establish.
   - **TLS with server identity, plus a client credential.** Server side: the worker verifies the
     tenant endpoint's certificate against a CA bundle pinned in configuration (no
     `rejectUnauthorized: false` as a default), so a substituted endpoint fails the handshake
     rather than receiving a secret key. Client side: the secret key remains the credential, and
     because it is sent in an `Authorization` header its exposure is bounded to one request header
     and never to a URL or a log line.

## Evidence

Verified against a real vanilla Medusa 2.21.1 booted in-process against Postgres, with a project
route at `medusa-config/src/api/admin/tenant-probe/route.ts` (a throwaway probe, since removed):

- Anonymous `GET` to a project route under `/admin` → **401** `{"message":"Unauthorized"}`. The
  default applies to our routes, not only to core routes.
- The same request with `Authorization: Basic base64(<sk_...>:)` → **200**, and
  `req.auth_context.actor_type` was `api-key`. No `AUTHENTICATE = false` anywhere.
- The handler reported `tenantId: "tnt_probe_a"` from `process.env.TENANT_ID` and echoed that an
  `x-tenant-id: tnt_evil` header arrived but was ignored. The instance answers as itself.
- The key was created through the `api_key` module service as `{ type: "secret", created_by:
  "platform-provisioner" }`, which is how a provisioner would mint one.

Source facts for the mechanism (Medusa `2.21.1`):

- `routes-loader.js`: `shouldAuthenticate = AUTHENTICATE in routeExports ? !!routeExports.AUTHENTICATE : true`.
- `router.js`: `/admin` applies `authenticate("user", ["bearer", "session", "api-key"])`.
- `authenticate-middleware.js`: secret keys arrive over Basic, resolve to `actor_type: "api-key"`,
  and a Bearer-formatted secret key gets a dedicated 401 hint.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Caller-supplied `x-tenant-id` header, validated per route | Degrades a structural guarantee into a per-route check. ADR 0001 rejected this class of scheme for exactly this reason; one forgotten check is a cross-tenant read. |
| One shared base URL with `?tenant=` routing | Contradicts instance/schema-per-tenant: a single Medusa process serves one schema. Reinvents tenancy the engine does not have. |
| A hand-written service-token verifier (the ADR 0008 pattern applied inside Medusa) | Duplicates an auth mechanism Medusa already ships, and puts the platform's trust logic inside every tenant. A bug there is a bug in N tenants. |
| A synthetic admin **user** per tenant that the worker logs in as | Masks a machine as a human, destroys the `created_by` audit trail ADR 0010 relies on, and forces session/JWT lifecycle management that a long-lived key avoids. |
| `AUTHENTICATE = false` on the project routes, with our own bearer check | Fails open if the check is ever misplaced, and is indistinguishable from an accidentally-public route in review. |
| Plain HTTP, relying on the network being internal | Rejected. "Internal" is a location, not a control. Order, customer and stock payloads plus a tenant admin credential would cross the wire in cleartext, readable by anything on the path; and without server identity the worker cannot tell a tenant from something impersonating one, so it would hand a secret key to a substituted endpoint. Cheap to avoid with TLS, expensive to discover late. |
| Signing each request payload (HMAC per request) | Rejected. Duplicates TLS authenticity at the application layer, needs a signing key and a canonicalization scheme everywhere, and adds a verification step inside every tenant. The protection it adds over TLS plus a per-tenant credential is marginal; the cost and the new failure modes are not. |
| JWT signed with the platform secret, per ADR 0008's rejected option | Adds key management and expiry handling for a caller that is a single long-lived worker; the same trade ADR 0008 already declined between services. |

## Consequences

### Implementation status

| Piece | Where | State |
|---|---|---|
| Tenant → target contract | `packages/contracts/src/medusa-target.ts` (`MedusaTarget`, `MedusaTargetStore`) | Done |
| Target read route, service-token only | `apps/services/control-plane/src/http.ts` — `GET /v1/tenants/:tenantId/medusa-target` | Done |
| Target store + provisioning wiring | `apps/services/control-plane/src/medusa-target.ts`; `steps.ts` `medusaAdmin?` hook on `seed_defaults` | Done |
| Per-tenant admin key minting | `apps/services/control-plane/src/medusa-provisioner.ts` (`HttpMedusaAdminProvisioner`) | Done |
| Worker resolver | `apps/services/worker/src/ports.ts` (`HttpMedusaTargetResolver`), wired in `main.ts` | Done |
| TLS transport (no `undici`, no `rejectUnauthorized: false`) | `apps/services/worker/src/transport.ts` (`createTlsTransport`) | Done |
| Credential revocation on termination | `apps/services/control-plane/src/termination.ts` (`medusaAdminKeys`, `medusaTargets`) | Done |

The target route returns `{ tenantId, baseUrl }` and nothing else — asserted by shape, not by absence
of a field name, in `test/http.test.ts`. A missing target is a 404 from `TENANT_NOT_FOUND`, which is
the worker's signal to fail the tenant rather than fall back.

The transport is deliberately two functions, not one with a flag: `createTlsTransport` refuses a
non-`https` URL outright and takes an optional pinned CA, while `createPlainTransport` exists for the
non-secret control-plane hop. A credential cannot reach the plain transport by accident.

**What becomes easier:**

- Tenant identity is correct by construction: no route can be reached for the wrong tenant because
  no route takes a tenant as input.
- The broker of trust is Medusa's own auth, so a Medusa security fix reaches every tenant, and our
  routes carry no crypto.
- Credentials can be revoked and rotated per tenant through the API key module, and
  `last_used_at`/`created_by` give an audit trail for free.
- `packages/secrets` and `tenant-client` stop being boundary-only; they gain their first real
  caller on the ADR 0010 write path.

**What becomes harder / technical debt we accept:**

- **A secret API key is not scope-limited.** Medusa scopes only *publishable* keys to sales
  channels; `POST /admin/api-keys/{id}/sales-channels` rejects a secret key outright ("Sales
  channels can only be associated with publishable API keys"). A secret key therefore carries full
  admin authority **within its own tenant**. Blast radius is bounded by the instance, not by the
  key, so the control plane must not store one key for many tenants and must treat the credential
  as tenant-critical.
- **Basic auth does not sign the request.** The credential does not protect an order payload's
  integrity. This is covered by TLS at the transport layer (Decision point 6), not by the
  credential, and the two must not be confused: the key proves *who* the worker is, TLS proves
  *where* it is talking and keeps the content unreadable in transit.
- **TLS now hardens a hop the earlier design left implicit.** The worker must verify the tenant
  endpoint's certificate against a configured CA bundle, which means certificate provisioning and
  rotation for tenant instances becomes real operational work rather than a detail deferred to
  deployment. The alternative — plaintext on the internal network — was rejected because the cost
  lands on payloads and credentials at rest in transit, and because we could not name an owner for
  the retry when it is discovered after the fact.
- **Key rotation is a control-plane responsibility.** There is no built-in expiry; a rotation
  policy (and revocation on tenant termination) must exist before a durable deployment. Tenant
  termination already revokes credentials (M1); this extends the same path to the Medusa key.
- **The resolver adds a hop.** The worker asks the control plane for a target before its first
  call. Cacheable per process, but it is one more thing that can be unavailable, and the failure
  must be explicit rather than a fallback to a default base URL.

**How we would reverse this later:** if Medusa gains scoped admin credentials, only the credential
type in the resolver and the auth header in `HttpCommerceClient` change; the route code reads the
tenant from configuration either way. If tenants ever share a Medusa instance, the whole of ADR
0001 is reopened first — this decision is downstream of it.
