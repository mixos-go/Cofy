# ADR 0003 — Marketplace apps are platform-owned; sellers only authorize

- **Status:** Accepted
- **Date:** 2026-09-26
- **Deciders:** Platform team

## Context

We are the platform company, not a seller. Sellers must never be asked to create developer
accounts, register apps, or understand OAuth mechanics. Their only action is "connect shop".

Two constraints shape this:

1. **TikTok Shop and Tokopedia are not one API.** The Seller Center is unified, which is what
   sellers see, but the developer surface is not. Per Tokopedia's own integration guide
   ([source](https://seller-id.tokopedia.com/university/essay?knowledge_id=7080056628725505&lang=en)):
   - developer accounts on both platforms must be **linked** via TikTok Shop Partner Center →
     My account → Link Tokopedia Account, and that account binding is **one-to-one**;
   - **apps** must be bound too: multiple Tokopedia Open Platform apps can link to a single
     TikTok Shop app;
   - after integration, all newly generated data is accessible **only via TikTok Shop APIs**,
     while some historical data (**orders, bills**) **remains in Tokopedia**.
2. **Marketplace rate limits are per app key.** If each seller registers their own app, we cannot
   reason about capacity, cannot batch, and cannot provide a uniform experience.

## Decision

**We will register and own the marketplace apps at platform level. Sellers only perform an OAuth
authorization; we store and manage the resulting per-seller credentials.**

Concretely:

- Our platform holds the app key/secret for each marketplace (Shopee, TikTok Shop, Tokopedia
  Open Platform, etc.) and manages the binding between the TikTok Shop app and Tokopedia app(s).
- Seller onboarding is an OAuth flow: seller clicks "connect", authorizes our app, done. We never
  expose app keys, binding steps, or API concepts to sellers.
- Per-seller credentials are stored in `packages/secrets` (KMS-backed), keyed by
  `(tenant_id, channel)`. They never enter logs or fixtures.
- The TikTok/Tokopedia connector is **one connector with two upstream APIs**: it reads order
  history from Tokopedia and current operations from TikTok Shop, and it hides that split from
  the rest of the system behind the `ChannelConnector` interface.
- Capacity is managed centrally by the rate-limit governor (see ADR 0002), per app key and per
  seller.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Seller registers their own marketplace app | Pushes developer work onto sellers, kills onboarding conversion, and destroys our ability to manage rate-limit budgets centrally. |
| Treat TikTok Shop + Tokopedia as one API | Factually wrong. Orders/bills history stays in Tokopedia; account binding is one-to-one; two app registrations are required. Would produce missing orders. |
| Two separate connectors the rest of the system must coordinate | Leaks marketplace-specific complexity into workflows and reconciliation. Better hidden behind one connector. |
| Store credentials in the tenant's Medusa instance | Puts secrets in the data plane where many components can read them, and couples credential lifecycle to Medusa. Control plane is the correct owner. |

## Consequences

**What becomes easier:**

- Seller onboarding is a single OAuth click — the actual product promise.
- We can batch, prioritize, and globally schedule API usage across all tenants.
- Credential rotation and re-authorization are handled once, centrally.
- The TikTok/Tokopedia split is contained in one place.

**What becomes harder / technical debt we accept:**

- **We are a single point of failure.** If our app key is suspended, every seller on that channel
  is affected. Requires careful compliance with marketplace policies.
- **Marketplace review and approval is on the critical path**, and changes to our app may require
  re-review.
- **Credential compromise blast radius is large.** Requires KMS, audit logging, and strict access
  control from day one.
- **Per-seller revocation handling**: when a seller revokes access, we must degrade gracefully and
  mark the channel as disconnected rather than retrying forever.

**How we would reverse/revisit this:**

We would not reverse this — it is core to the business model. We may later offer a
"bring your own app" option for enterprise sellers who require it, which would be an additional
path rather than a replacement.
