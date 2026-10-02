/**
 * Mints a secret API key for the WMS end-to-end test and prints it as a `SEED=` line.
 *
 * The key has to exist before the HTTP server starts, because the fixture that walks the WMS flow
 * authenticates with it. Minting it here — through Medusa's own API key module, the same way
 * provisioning does — keeps the test from reaching into the database to invent a credential.
 */

import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function mint({ container }: { container: MedusaContainer }): Promise<void> {
  const apiKey = await container
    .resolve(Modules.API_KEY)
    .createApiKeys({ title: "wms-itest", type: "secret", created_by: "platform-provisioner" });

  process.stdout.write(`SEED=${JSON.stringify({ secretKey: apiKey.token })}\n`);
}
