import { MedusaService } from "@medusajs/framework/utils";

import ChannelOrderLink from "../models/channel-order-link.ts";

/**
 * CRUD over `channel_order_link` plus the lookup the import path needs.
 *
 * `MedusaService` generates `createChannelOrderLinks`/`listChannelOrderLinks`/`retrieveChannelOrderLink`
 * and the soft-delete `dismissChannelOrderLinks` from the model. The one hand-written method is the
 * external-reference lookup, because `(tenant_id, channel, external_order_id)` is the key the
 * importer and M4 reconciliation actually address a link by, and it is not the primary key.
 */
class ChannelOrderLinkModuleService extends MedusaService({ ChannelOrderLink }) {
  /**
   * Find the link for a marketplace order, or `null` when it was never imported.
   *
   * Returns the soft-deleted row too: a dismissed link is still the record that this external
   * order was seen, and reconciliation needs to distinguish "dismissed" from "never imported".
   */
  async retrieveChannelOrderLinkByExternalRef(input: {
    tenantId: string;
    channel: string;
    externalOrderId: string;
  }) {
    const [link] = await this.listChannelOrderLinks(
      {
        tenant_id: input.tenantId,
        channel: input.channel,
        external_order_id: input.externalOrderId
      },
      { withDeleted: true }
    );

    return link ?? null;
  }
}

export default ChannelOrderLinkModuleService;
