import { model } from "@medusajs/framework/utils";

/**
 * Maps a marketplace order to the Medusa order it was imported into.
 *
 * Medusa v2 forbids adding columns to the core `order` table (AGENTS.md §2.2), so the external
 * reference lives here and is attached to the Order module with a module link instead of a foreign
 * key. `(tenant_id, channel, external_order_id)` is unique so a duplicate delivery resolves to the
 * existing row rather than creating a second order (ADR 0002, ADR 0010).
 *
 * `tenant_id` is carried even though a tenant is isolated by schema: the same row shape is read
 * across tenants during reconciliation (M4), and the column keeps that query explicit.
 */
const ChannelOrderLink = model.define("channel_order_link", {
  id: model.id().primaryKey(),
  channel: model.text(),
  external_order_id: model.text(),
  tenant_id: model.text()
}).indexes([
  {
    // Partial in Postgres terms: the generated index excludes soft-deleted rows, so a dismissed
    // link does not block re-importing the same external order.
    on: ["tenant_id", "channel", "external_order_id"],
    unique: true
  }
]);

export default ChannelOrderLink;
