/**
 * Sync-state store unit tests.
 *
 * These run the shared conformance suite (packages/sync-state/testing) against the in-memory store.
 * The control plane runs the *same* suite against the Postgres store, so the two implementations are
 * held to one set of rules rather than each having its own idea of what the store promises.
 *
 * The suite is a test of the rules ADR 0010 promises the rest of the system, not of the storage
 * mechanism: a redelivered order is a no-op, an idempotency key is bound to one request, a committed
 * ref is final, a claim is a stealable lease, and a cursor is stored faithfully.
 */

import { InMemorySyncStateStore } from "../src/store.ts";
import { runSyncStateStoreConformance } from "../testing/store-conformance.ts";

runSyncStateStoreConformance("in-memory", async () => new InMemorySyncStateStore());
