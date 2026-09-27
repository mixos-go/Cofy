# ADR 0008 — Service-to-service calls use bearer service tokens, not shared imports

- **Status:** Accepted
- **Date:** 2026-09-26
- **Deciders:** Platform engineering

## Context

The control plane and the integration plane are separate runtimes. The control plane will need to
ask the integration plane to begin an OAuth flow, and later to trigger work; the integration plane
holds seller credentials and the marketplace connectors and must not expose tenant data.

AGENTS.md §3 already forbids one `service:*` from importing another — they must talk over HTTP.
That rule stopped imports but said nothing about how the HTTP call is authenticated. Left open,
each service would invent its own scheme, and the integration plane — the one service reachable
from the public internet via OAuth callbacks — is exactly where an under-specified auth scheme is
most dangerous.

Two kinds of caller exist, with different trust:

- The control plane and worker (internal, trusted, hold no seller secret).
- A seller's browser, which arrives at the OAuth callback after the marketplace redirects it
  (untrusted, but must be allowed to complete a flow it started).

## Decision

We will authenticate service-to-service calls with a **bearer service token** and mark every route
as either `service` or `public` explicitly, with no default.

- `service` routes (`/v1/channels/:channel/authorize`, `/probe`) require a token from the
  configured `INTEGRATION_SERVICE_TOKENS` list.
- `public` routes (`/health`, the OAuth `callback`) are reachable without a token. The callback is
  protected by the single-use, expiring OAuth `state`, which is the correct control for a
  browser-redirected request — a token would be meaningless to the browser and wrong to embed.
- The service **fails closed**: with no configured token it refuses to start rather than accepting
  every caller.

Tokens are read from the environment, compared in constant time, and never logged. The token list
is a stopgap for a real service identity; when one exists, only this check changes.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Mutual TLS between services | Correct long-term, but needs a certificate authority and rotation tooling before it earns its keep at this stage. The seam it would replace is one function; we will adopt mTLS behind the same route declarations later. |
| A shared JWT signed with a platform secret | Adds key management and expiry/refresh handling for no benefit over an opaque token when both ends are ours and the call is inside the cluster. |
| No auth, network-isolated by deployment | Relies entirely on an external boundary we do not control yet (E0 egress is undecided). One misconfigured ingress exposes seller credentials. |
| Public callback behind a token | Impossible: the callback is a browser redirect. The OAuth `state` is the right mechanism, and using a token here would tempt callers to leak it into a URL. |

## Consequences

**What becomes easier:**

- Every route's trust level is declared in one place and visible in review; a new route cannot
  silently be public.
- The integration plane can be called by any future internal service without a new import edge.

**What becomes harder / technical debt we accept:**

- Token rotation is manual (edit the environment, restart). Acceptable while the caller set is
  small; mTLS removes it.
- Tokens are a shared secret in the environment, the kind of thing we otherwise push into the KMS.
  Mitigated by short-lived deployment environments and by never logging the header.

**How we would reverse this later:** when a service mesh or platform identity service is in place,
replace the token check inside the route dispatcher with a caller-identity check. Route
declarations (`service` / `public`) do not change, so the blast radius is one function.
