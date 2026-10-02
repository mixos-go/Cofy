import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import type { CreateWarehouseBody } from "../validators.ts";

interface WmsLayoutService {
  createWarehouses(input: Record<string, unknown>): Promise<{ id: string }>;
  listWarehouses(filters: Record<string, unknown>): Promise<{ id: string; name: string; stock_location_id: string | null }[]>;
}

/**
 * The warehouses of this tenant, and creating one.
 *
 * `tenant_id` comes from the instance environment, so a warehouse can only ever be created in the
 * tenant that is serving the request; a caller cannot address another tenant by putting an id in the
 * body. `stockLocationId` links the warehouse to the Medusa stock location whose inventory level is
 * the number channels see (docs/adr/0018).
 */
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const tenantId = process.env.TENANT_ID;
  if (!tenantId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "TENANT_ID is not set on this tenant instance; refusing to create a warehouse."
    );
  }

  const wms = req.scope.resolve<WmsLayoutService>("wms");
  const body = req.validatedBody as unknown as CreateWarehouseBody;

  const warehouse = await wms.createWarehouses({
    tenant_id: tenantId,
    name: body.name,
    stock_location_id: body.stockLocationId ?? null
  });

  res.status(201).json({
    warehouse: { id: warehouse.id, name: body.name, stockLocationId: body.stockLocationId ?? null }
  });
};

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const wms = req.scope.resolve<WmsLayoutService>("wms");
  const warehouses = await wms.listWarehouses({});

  res.status(200).json({
    warehouses: warehouses.map((warehouse) => ({
      id: warehouse.id,
      name: warehouse.name,
      stockLocationId: warehouse.stock_location_id
    }))
  });
};
