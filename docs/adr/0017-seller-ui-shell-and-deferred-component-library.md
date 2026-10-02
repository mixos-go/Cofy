# ADR 0017 — Seller UI: a server-rendered shell first, no component library yet

- **Status:** Accepted
- **Date:** 2026-09-26
- **Deciders:** Cofy platform team

## Context

M5 names `apps/web/oms-web` as a deliverable, and ADR 0004 already fixed its runtime: Next.js,
bundled for the browser, deployed separately from the services. M6 adds the WMS screens to the same
app. Until now nothing was built, so the *shape* of the UI had been decided only by implication.

Two questions had to be answered together, because the second only becomes real once the first is
settled:

1. **How much UI do we build now?** The backend is the critical path. M5's read API is delivered and
   tested against a real Medusa instance (ADR 0016), but the channel-connection flow, stock per
   location, the WMS modules and the ops console are not. A UI built ahead of those APIs would be
   built twice, and its screens would be guesses about endpoints that do not exist yet.
2. **Do we adopt a component library?** AGENTS.md §8 requires a human decision before adding a large
   runtime dependency. The candidates pull in opposite directions: a component library (Mantine,
   shadcn/ui) buys accessible, consistent primitives, but adds a dependency whose upgrade cadence,
   styling model and bundle cost we then own for the life of the product. Hand-written CSS keeps the
   surface small and the dependency count at zero, at the cost of re-implementing primitives that
   are genuinely hard to get right (focus management, comboboxes, date pickers).

The uncomfortable part is that we have **no real screens yet**, so a component-library decision made
now would be made on imagined requirements. That is the kind of decision that is cheap to make now
and expensive to reverse later, which is the wrong way round.

One further constraint shapes the answer: the control plane authenticates a session with a bearer
token (`POST /v1/auth/login` returns it; every other route reads `Authorization: Bearer`). Where that
token lives is a security decision, not a styling one, and it is easiest to get right before any
component exists.

## Decision

**We will build `oms-web` as a server-rendered Next.js shell that consumes only the API surface
already delivered and proven, with no component library. Component-library adoption is deferred
until real screens and their interaction requirements exist, and will be its own ADR.**

Concretely:

- **Next.js App Router, server-rendered, no client-side data fetching.** Every read is a Server
  Component that calls the control plane directly; the browser never talks to the control plane at
  all. Only login and logout are Route Handlers. The reason is authorization, not preference: the
  session token stays server-side, so there is no cross-origin browser hop to configure, no CORS
  policy to widen, and no token in reach of JavaScript.
- **The session token lives in an `httpOnly`, `SameSite=Lax`, `Secure`-in-production cookie.** The
  login Route Handler exchanges credentials at `POST /v1/auth/login` and stores the returned token in
  that cookie; Server Components read the cookie and forward it as a bearer header. Logout deletes
  the cookie. The token is never serialised into HTML, never put in `localStorage`, and never
  readable by client code.
- **The shell renders only endpoints that already exist and are tested:** `POST /v1/auth/login`,
  `GET /v1/seller/orders`, `GET /v1/seller/orders/:orderId`, `GET /v1/sync/health`. No screen is
  built against an endpoint that has not shipped.
- **Money crosses to the display boundary in one function and nowhere else** (AGENTS.md §5). The API
  returns integer sen; a single formatter turns it into rupiah for the screen.
- **No component library.** Styling is one hand-written stylesheet. The shell has no interactive
  widget that a library would meaningfully improve: it is forms, tables and definition lists.
- **The app is a workspace like any other.** It typechecks under the shared TypeScript base, is
  linted by the shared config (which already supplies browser globals for `apps/web/**`), and builds
  with `next build`.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Adopt Mantine now | It is the largest of the candidate dependencies and its styling model (CSS-in-JS, a provider, a theme object) is the hardest to remove once screens depend on it. Deciding it before a single screen exists means we cannot tell which of its components we actually need. |
| Adopt shadcn/ui now | Lighter and copy-in rather than imported, but it still commits us to Tailwind and Radix, which is two more decisions (utility CSS, a primitive layer) made on imagined requirements. It remains a strong candidate for the ADR that follows this one. |
| Client-side rendering with the token in `localStorage` | Any XSS becomes full session theft, and the token would then be sent from the browser to the control plane, forcing a CORS policy and a public origin for a service that currently needs neither. |
| Server-render but proxy the control plane through a Next rewrite, keeping the token in a cookie | Workable, but it adds a second network path and a rewrite configuration to serve the same reads that Server Components can already make server-side. It becomes worth revisiting only if a screen needs live client-side updates. |
| A separate BFF service in `apps/services/` | A whole deployable for what a Route Handler does, and it would put seller session handling in a service that has no other reason to exist. |
| Wait for the full M5/M6 API surface before starting the UI | The shell would then be built in one large step with no feedback from real usage, and M5 would stay open on the UI for the whole of M6. A shell that renders the proven reads is the smallest thing that makes M5's API visible to a seller. |
| No UI until the component library is decided | Treats a styling decision as a blocker for a correctness one. The token-handling and read-projection decisions are the parts that matter now, and neither depends on the library. |

## Consequences

**What becomes easier:**

- M5's proven read API is reachable by a seller, which is what the milestone is actually for.
- The token handling is settled once, in one place, and is the harder of the two decisions to get
  right.
- Adding a screen is adding a Server Component; there is no client state, no cache, and no data
  fetching library to reason about.
- The component-library decision gets made with real screens in hand, and the answer is not
  pre-committed by this shell: the reads are server-rendered and the styling is one stylesheet, so
  adopting a library later is additive rather than a rewrite.

**What becomes harder / technical debt we accept:**

- **No interactivity beyond navigation and forms.** Filtering, sorting and inline actions wait for
  either the component-library decision or a deliberate move to client components. A screen that
  needs live updates will force a second decision about a client-side data path, and that is
  expected, not accidental.
- **Primitives are hand-rolled.** Tables and forms are fine; anything with real focus management
  (a combobox, a date range picker) should wait for the library rather than be written badly here.
- **The shell has no automated UI test.** What it does have is a test for the one piece of real
  logic it owns — the sen-to-rupiah display conversion. The screens themselves are thin projections
  of already-tested endpoints, and browser-level tests would need a runner we have not chosen.
- **The UI depends on the control plane being up**, and on the tenant's Medusa being up behind it
  (ADR 0016). The error surface for both is a message, not a retry: retry policy belongs with the
  component-library decision, when there is a place to put it.
- **`next` and `react` are now runtime dependencies** (AGENTS.md §2.10 records the reason here).
  They are the framework ADR 0004 already chose, not a new architectural commitment.

**How we would reverse this later:** the component-library ADR is the intended follow-up and this
shell does not block it. If a screen needs client-side data, the move is to add a Route Handler that
proxies the control plane and call it from a client component, which is contained to that screen. If
Next.js itself proves wrong for this app, only `apps/web/oms-web` is affected: the control plane is
consumed over HTTP and has no knowledge of the UI.
