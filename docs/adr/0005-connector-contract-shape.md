# ADR 0005 — Connector contract: authorization is two steps, and credentials are explicit

- **Status:** Accepted
- **Date:** 2026-09-26
- **Deciders:** Platform team

## Context

`AGENTS.md` §4 sketched the `ChannelConnector` interface as a design sketch. M0 turned that
sketch into a real, typechecked contract in `packages/channel-sdk`, and three parts of the sketch
did not survive contact with the way these marketplaces actually work.

1. **Authorization cannot be one method.** The sketch had
   `authorize(ctx: OAuthContext): Promise<Credential>`. Every marketplace we target splits the
   flow in two: our backend returns a redirect URL, the seller is sent to the marketplace, and
   only later does the marketplace call us back with a code. A single method that returns a
   `Credential` implies the credential exists before the seller has done anything. That is
   incorrect, and encoding it would force every connector to fake a two-step flow inside a
   one-step signature.
2. **Handing the credential to every call is a feature, not noise.** The sketch passed a
   `Credential` to every method. That is correct, and worth stating explicitly: a connector must
   never read credentials from the database, ambient context, or a module-level cache. Passing
   them in keeps the connector a pure function of its inputs, which is what makes it testable
   against recorded fixtures with no network and no tenant state.
3. **Capability declarations need to carry the TikTok/Tokopedia split.** ADR 0003 established that
   one connector fronts two upstream APIs, with order history in Tokopedia and current operations
   in TikTok Shop. The sketch's `ChannelCapabilities` had no way to express "order history is
   read from a second API", so reconciliation would have had to special-case this channel by name.

## Decision

**We will keep `ChannelConnector` in `packages/channel-sdk` as frozen in M0, with authorization
split into `beginAuthorization`/`completeAuthorization`, an explicit `Credential` argument on
every operation, and a `capabilities()` declaration that can express a split order history.**

Concretely:

- `beginAuthorization` returns a redirect URL plus the tenant-scoped `state` to persist.
  `completeAuthorization` consumes the callback parameters and returns the `Credential`.
- `refreshCredential` is separate and mandatory, because seller tokens expire and proactive
  refresh is the difference between a working integration and random hourly failures.
- Every operation that touches a marketplace takes a `Credential`. Connectors receive credentials;
  they never look them up. Storage stays in `packages/secrets` (ADR 0003).
- `ChannelCapabilities.splitsOrderHistory` is `true` for `tiktok_tokopedia` and `false` elsewhere.
  Reconciliation reads this flag instead of matching on channel name.
- `AGENTS.md` §4 is updated to match. This ADR is the reason it changed.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Keep `authorize()` and let connectors fake the two steps | The signature would lie. Every connector would need its own workaround, and the fake would leak into tests as unrepresentable states. |
| Let a connector resolve its own credential from `packages/secrets` | Makes the connector impure and untestable without tenant state, and puts secret access in the least-trusted zone. Violates the direction in `AGENTS.md` §3. |
| `capabilities().orderHistorySource: "second_api" \| "same_api"` | A named source is a worse abstraction than a boolean flag for the one question the system actually asks, and invites workflows to branch on channel-specific string values. |
| Detect the TikTok/Tokopedia split by channel name in reconciliation | Reintroduces marketplace-specific knowledge outside the connector. This is exactly what ADR 0003 rejected. |

## Consequences

**What becomes easier:**

- Connectors are pure: given a `Credential` and a cursor, output is deterministic. Contract tests
  need no tenant database and no network.
- Re-authorization and token refresh are first-class operations rather than edge cases bolted onto
  a single authorize method.
- The TikTok/Tokopedia split is queryable through the interface, so nothing downstream needs to
  know the channel exists.

**What becomes harder / technical debt we accept:**

- Two-step authorization means the integration plane must persist `state` between the redirect and
  the callback, and validate it on return. That is real work and a real attack surface; it is
  scheduled in M2.
- Adding a capability means adding a field to a shared interface, which every connector then
  carries. We accept fields that are `false` for most channels as long as they answer a question
  the platform actually asks.
- The interface is intentionally small. Anything a single marketplace needs beyond it should live
  inside that connector, not in the shared contract.

**How we would reverse this later:**

If a future channel's authorization is genuinely one-step (for example, a static API key the
seller pastes in), we would add an optional capability and a dedicated credential-exchange path,
not collapse the two-step methods. Collapsing them would be a breaking change to every connector
and is not worth revisiting.
