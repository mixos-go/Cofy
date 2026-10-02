# ADR 0018 — WMS data model: bins subdivide a stock location, and every stock move is a ledger row

- **Status:** Accepted
- **Date:** 2026-09-26
- **Deciders:** Cofy platform team

## Context

M6 builds the warehouse operations Medusa does not provide: bin locations, put-away, pick tasks,
pack, stocktake, and inbound purchase orders. Four questions had to be answered before a table was
written, because each one is expensive to reverse once stock has moved through the wrong model.

1. **Is a bin a Medusa stock location?** Medusa's Stock Location module is the thing inventory
   levels attach to, and the reservation path chooses a location. A warehouse has shelves, and the
   naive mapping is one Medusa stock location per shelf.
2. **Where does the number Medusa believes live?** Medusa's `InventoryLevel` holds
   `stocked_quantity`, `reserved_quantity` and derives `available_quantity` per (inventory item,
   location). A WMS that keeps its own separate quantity is a second source of truth, and two
   sources of truth for stock is how a marketplace oversell happens.
3. **What is a stocktake variance?** The exit criterion is that it "produces an auditable
   adjustment, never a silent overwrite". A model that stores only the current quantity cannot
   answer "who changed this, from what, and why".
4. **How do we write stock without altering a core table?** AGENTS.md §2.2 forbids adding columns
   to core Medusa tables, and §2.1 forbids forking. The write has to go through the engine's own
   workflows.

One further constraint was discovered by running the engine rather than by reading it, and it
shapes the schema directly:

- **A Postgres enum type in a tenant schema is database-global, and it breaks the *second* tenant.**
  Medusa's own order migrations create enums behind a guard that queries
  `pg_type WHERE typname = ...` with no namespace filter. `pg_type` is database-global, so the
  first tenant's type satisfies the second tenant's guard, its `CREATE TYPE` is skipped, and the
  following `CREATE TABLE` fails with `type ... does not exist`. The control plane already works
  around this for Medusa's own enums by pre-creating them in every schema
  (`MEDUSA_GUARDED_ENUMS`). A custom module that declares `model.enum(...)` reintroduces exactly
  that trap for its own type, in a place the control plane's list does not know about. We confirmed
  the behaviour against a live database: a `pg_type` lookup with no namespace filter finds a type
  created in a different schema, from any `search_path`.

## Decision

**We will model the warehouse as `wms` and `purchase-order` modules in the tenant's data plane. A
bin subdivides one Medusa stock location rather than being one; the Medusa inventory level stays the
single number the engine and the channels see; and every quantity change writes an append-only
movement row before the number moves.**

Concretely:

- **One Medusa stock location per warehouse; bins live only in `wms`.** `wms_warehouse` carries a
  `stock_location_id` column naming the location its bins subdivide. One location per shelf was
  rejected: it multiplies the locations a reservation must choose between, changes what a sales
  channel is associated with, and makes the channel's single stock number a sum over shelves that
  the seller never asked to model. A bin is a *physical* address inside a location; the location is
  the *logical* one the engine reserves against. The reference is a plain column rather than a
  Medusa module link: nothing reads the warehouse and the location together in one query — a
  workflow resolves the id and calls the inventory module with it — so a link table would add a
  join and a second thing to keep in step without buying a query anyone makes.
- **The Medusa inventory level is the source of truth for stock the engine and channels see.** The
  sum of a variant's bin quantities equals that variant's `stocked_quantity` at the warehouse's
  location. Bins exist to say *where* the units are, never *how many* the seller has.
- **WMS writes stock through Medusa's own workflows, never SQL.** Receipt and stocktake variance
  call `adjustInventoryLevelsStep` (a signed `adjustment` against an inventory level), so the engine
  recomputes availability and the channel push that follows (M4) reads the real number. No core
  table is altered and nothing is forked.
- **Every quantity change is an append-only `wms_stock_movement` row.** It records the bin, the
  inventory item, the signed delta, `quantity_before`, `quantity_after`, a `kind`, a `reason`, and
  the actor. The movement row is written in the same workflow as the number change. This is what
  makes a stocktake variance auditable and is the reason a correction is a *delta*, not an
  assignment: "set the count to 7" is not reversible or attributable, "−3 because a stocktake
  counted 7 where the system held 10" is both.
- **Status and kind columns are `text` with values validated in the module service, not
  `model.enum`.** This is deliberate and is the direct consequence of the `pg_type` finding above:
  an enum type would be created in whichever schema migrated first and break every later tenant's
  migration. The allowed values live in one exported constant per module so the check is reviewable
  in one place, and a test asserts a bad value is rejected.
- **Picking moves units between bins and does not touch the Medusa level.** The reservation taken at
  order import (M3) already holds the units; decrementing `stocked_quantity` at pick time would
  decrement them twice once fulfillment ships the order. A pick moves the units from their storage
  bin to a packing bin, so the bin sum still equals the level. Shipping is fulfillment's write (M7).
- **Purchase order receipt makes stock available; put-away relocates it.** The exit criterion is
  that a received PO "increases available stock at a specific bin", so receipt posts the units into
  a staging bin and raises the Medusa level in one workflow. Put-away then moves them, bin to bin,
  with no further engine write.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| One Medusa stock location per bin | Multiplies the locations a reservation chooses between, changes sales-channel association, and makes the channel's single stock number a sum the seller never modelled. It also makes every shelf a first-class object the engine must keep consistent. |
| Keep stock only in WMS tables, push the total to channels ourselves | Two sources of truth for one number. The engine's reservation would be computed from a different quantity than the one we push, which is the oversell this platform exists to prevent. |
| `model.enum` for `kind`/`status` | Reintroduces the database-global `pg_type` trap for a custom type, breaking the second tenant's migration in a place the control plane's `MEDUSA_GUARDED_ENUMS` list does not cover. Confirmed against a live database. |
| A single `wms_stock` row per (bin, item) holding only the current quantity | Cannot answer who changed it, from what, or why, which is exactly the auditable adjustment the exit criterion requires. A stocktake would be a silent overwrite. |
| Decrement the Medusa level on pick | Double-decrements once fulfillment ships the order, because the reservation taken at import is separate from `stocked_quantity`. |
| Put-away through its own Medusa inventory adjustment | A pure relocation inside one location must not change the level; an adjustment would make the total drift by the moved quantity. |
| Write stock with direct SQL to `inventory_level` | Violates §2.2 (no core table writes) and skips the engine's own availability and eventing, so the channel push would not follow. |

## Consequences

**What becomes easier:**

- One number per variant is authoritative, so the M4 stock push and the WMS agree by construction
  rather than by reconciliation.
- A stocktake correction is attributable and reversible: the movement row is the audit record and
  the delta is what was applied.
- Bins are free to change without touching the engine, so warehouse layout is a WMS concern only.
- Adding a second warehouse is adding a stock location and bins under it, not a new concept.

**What becomes harder / technical debt we accept:**

- **Two tables must be kept consistent by one workflow.** A movement row and the Medusa level are
  written together; a crash between them is a drift the M4 reconciliation will eventually see. This
  is accepted because the alternative is a distributed transaction across the module and the engine.
- **The bin sum invariant is not enforced by a constraint.** `sum(bins) == stocked_quantity` is
  asserted by tests and repaired by stocktake, not by the database.
- **Picking has no wave/batch optimisation**, per the milestone's non-goals, so a pick task is one
  order.
- **No Postgres enum means the database will not reject a bad status**; the module service does. A
  direct SQL insert could still write an unknown status.

**How we would reverse this later:** if the engine ever gained a bin concept, `wms_bin` would link to
it instead of to the stock location and the movement ledger would be unchanged. If a second source of
truth were ever wanted, the movement ledger is what a migration would replay to rebuild it.
