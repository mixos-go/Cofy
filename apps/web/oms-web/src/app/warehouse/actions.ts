/**
 * Server actions for the warehouse screens (docs/PLAN.md M6, ADR 0017).
 *
 * Each action is the *whole* submit path: it validates the form, calls the control plane with the
 * cookie's session token, and redirects. The M5 channel actions are form posts to a route handler
 * because connecting a channel ends in a marketplace redirect; a warehouse write ends on the page
 * the seller is already on, so an action is the shorter path.
 *
 * A failure is not thrown: it comes back as `?error=` on the redirect, because a seller who mistyped
 * a quantity needs the message *and* the form they were looking at. Throwing would replace the page
 * with an error boundary and lose the values they entered.
 *
 * The write capabilities are the control plane's to enforce; these actions do not re-check the role.
 * A `seller_viewer` who posts one gets the control plane's 403 and sees its message, which is the one
 * place the rule lives.
 */

"use server";

import { redirect } from "next/navigation";
import {
  applyStocktake,
  createBin,
  createPickTask,
  createPurchaseOrder,
  createWarehouse,
  openStocktake,
  putAway,
  receivePurchaseOrder,
  scanPickLine
} from "@/control-plane";
import type { ApiResult } from "@/control-plane";
import { readSessionToken } from "@/session";

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function fields(form: FormData, name: string): string[] {
  return form.getAll(name).map((value) => String(value).trim());
}

/**
 * A positive integer from a form field, or `null`.
 *
 * An empty or non-numeric field becomes `NaN`, which JSON would send as `null` and the control plane
 * would reject with a message that does not say which field was wrong — so the field is named here
 * instead.
 */
function positiveQuantity(form: FormData, name: string): number | null {
  const raw = field(form, name);
  if (raw === "") return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Send the seller back to the page they were on, with the outcome attached. */
function back(backTo: string, result: ApiResult<unknown>): never {
  if (!result.ok) {
    if (result.kind === "unauthenticated") redirect("/login");
    redirect(`${backTo}?error=${encodeURIComponent(result.message)}`);
  }
  redirect(`${backTo}?ok=1`);
}

function backWithError(backTo: string, message: string): never {
  redirect(`${backTo}?error=${encodeURIComponent(message)}`);
}

export async function createWarehouseAction(formData: FormData): Promise<void> {
  const token = await readSessionToken();
  if (token === null) redirect("/login");

  const name = field(formData, "name");
  const stockLocationId = field(formData, "stockLocationId");
  if (name === "") backWithError("/warehouse", "Nama gudang wajib diisi.");

  back(
    "/warehouse",
    await createWarehouse(token, { name, stockLocationId: stockLocationId === "" ? null : stockLocationId })
  );
}

export async function createBinAction(formData: FormData): Promise<void> {
  const token = await readSessionToken();
  if (token === null) redirect("/login");

  const warehouseId = field(formData, "warehouseId");
  const code = field(formData, "code");
  const kind = field(formData, "kind");
  if (warehouseId === "" || code === "") backWithError("/warehouse", "Gudang dan kode rak wajib diisi.");

  back(
    "/warehouse",
    await createBin(token, {
      warehouseId,
      code,
      kind: kind === "staging" || kind === "packing" ? kind : "storage"
    })
  );
}

/**
 * A purchase order with its lines.
 *
 * The form posts parallel arrays (`lineSku`, `lineTitle`, `lineQuantity`), which is what a repeated
 * group of inputs gives without JavaScript. They are zipped here, and a row is skipped only when all
 * three of its fields are empty — a half-filled row is an error, not a silently dropped line.
 */
export async function createPurchaseOrderAction(formData: FormData): Promise<void> {
  const token = await readSessionToken();
  if (token === null) redirect("/login");

  const warehouseId = field(formData, "warehouseId");
  const supplierReference = field(formData, "supplierReference");
  const skus = fields(formData, "lineSku");
  const titles = fields(formData, "lineTitle");
  const quantities = fields(formData, "lineQuantity");

  const lines: { sku: string; title: string; orderedQuantity: number }[] = [];
  for (let index = 0; index < skus.length; index += 1) {
    const sku = skus[index] ?? "";
    const title = titles[index] ?? "";
    const rawQuantity = quantities[index] ?? "";
    if (sku === "" && title === "" && rawQuantity === "") continue;

    const orderedQuantity = Number(rawQuantity);
    if (sku === "" || title === "" || !Number.isInteger(orderedQuantity) || orderedQuantity <= 0) {
      backWithError("/warehouse/inbound", "Setiap baris butuh SKU, nama, dan jumlah bulat positif.");
    }
    lines.push({ sku, title, orderedQuantity });
  }

  if (warehouseId === "" || lines.length === 0) {
    backWithError("/warehouse/inbound", "Pilih gudang dan isi minimal satu baris.");
  }

  back(
    "/warehouse/inbound",
    await createPurchaseOrder(token, {
      warehouseId,
      supplierReference: supplierReference === "" ? null : supplierReference,
      lines
    })
  );
}

export async function receivePurchaseOrderAction(formData: FormData): Promise<void> {
  const token = await readSessionToken();
  if (token === null) redirect("/login");

  const purchaseOrderId = field(formData, "purchaseOrderId");
  const skus = fields(formData, "lineSku");
  const quantities = fields(formData, "lineQuantity");

  const lines: { sku: string; quantity: number }[] = [];
  for (let index = 0; index < skus.length; index += 1) {
    const sku = skus[index] ?? "";
    const rawQuantity = quantities[index] ?? "";
    if (sku === "" || rawQuantity === "") continue;

    const parsed = Number(rawQuantity);
    if (!Number.isInteger(parsed) || parsed <= 0) backWithError("/warehouse/inbound", "Jumlah terima harus bilangan bulat positif.");
    lines.push({ sku, quantity: parsed });
  }

  if (purchaseOrderId === "" || lines.length === 0) {
    backWithError("/warehouse/inbound", "Isi jumlah yang diterima untuk minimal satu baris.");
  }

  back("/warehouse/inbound", await receivePurchaseOrder(token, purchaseOrderId, lines));
}

export async function putAwayAction(formData: FormData): Promise<void> {
  const token = await readSessionToken();
  if (token === null) redirect("/login");

  const warehouseId = field(formData, "warehouseId");
  const fromBinId = field(formData, "fromBinId");
  const toBinId = field(formData, "toBinId");
  const sku = field(formData, "sku");
  const quantity = positiveQuantity(formData, "quantity");
  if (warehouseId === "" || fromBinId === "" || toBinId === "" || sku === "" || quantity === null) {
    backWithError("/warehouse/inbound", "Lengkapi gudang, rak asal, rak tujuan, SKU, dan jumlah.");
  }

  back("/warehouse/inbound", await putAway(token, { warehouseId, fromBinId, toBinId, sku, quantity }));
}

export async function createPickTaskAction(formData: FormData): Promise<void> {
  const token = await readSessionToken();
  if (token === null) redirect("/login");

  const warehouseId = field(formData, "warehouseId");
  const orderId = field(formData, "orderId");
  const packingBinId = field(formData, "packingBinId");
  const skus = fields(formData, "lineSku");
  const quantities = fields(formData, "lineQuantity");

  const lines: { sku: string; quantity: number }[] = [];
  for (let index = 0; index < skus.length; index += 1) {
    const sku = skus[index] ?? "";
    const rawQuantity = quantities[index] ?? "";
    if (sku === "" && rawQuantity === "") continue;

    const parsed = Number(rawQuantity);
    if (sku === "" || !Number.isInteger(parsed) || parsed <= 0) {
      backWithError("/warehouse/pick-tasks", "Setiap baris butuh SKU dan jumlah bulat positif.");
    }
    lines.push({ sku, quantity: parsed });
  }

  if (warehouseId === "" || orderId === "" || packingBinId === "" || lines.length === 0) {
    backWithError("/warehouse/pick-tasks", "Lengkapi gudang, pesanan, rak kemas, dan minimal satu baris.");
  }

  back("/warehouse/pick-tasks", await createPickTask(token, { warehouseId, orderId, packingBinId, lines }));
}

export async function scanPickLineAction(formData: FormData): Promise<void> {
  const token = await readSessionToken();
  if (token === null) redirect("/login");

  const pickTaskId = field(formData, "pickTaskId");
  const sku = field(formData, "sku");
  const barcode = field(formData, "barcode");
  const quantity = positiveQuantity(formData, "quantity");
  if (pickTaskId === "" || sku === "" || barcode === "" || quantity === null) {
    backWithError("/warehouse/pick-tasks", "Isi barcode dan jumlah yang diambil.");
  }

  back("/warehouse/pick-tasks", await scanPickLine(token, pickTaskId, { sku, barcode, quantity }));
}

export async function openStocktakeAction(formData: FormData): Promise<void> {
  const token = await readSessionToken();
  if (token === null) redirect("/login");

  const warehouseId = field(formData, "warehouseId");
  const binId = field(formData, "binId");
  const sku = field(formData, "sku");
  if (warehouseId === "" || binId === "" || sku === "") {
    backWithError("/warehouse/stocktakes", "Pilih gudang dan rak, lalu isi SKU.");
  }

  back("/warehouse/stocktakes", await openStocktake(token, { warehouseId, binId, sku }));
}

/**
 * Apply a count.
 *
 * `countedQuantity` may be `0`: an empty shelf is a real result, and saying so is the whole point of
 * a stocktake. That is why this does not go through `positiveQuantity`, which refuses zero.
 */
export async function applyStocktakeAction(formData: FormData): Promise<void> {
  const token = await readSessionToken();
  if (token === null) redirect("/login");

  const stocktakeId = field(formData, "stocktakeId");
  const raw = field(formData, "countedQuantity");
  const counted = Number(raw);
  if (stocktakeId === "" || raw === "" || !Number.isInteger(counted) || counted < 0) {
    backWithError("/warehouse/stocktakes", "Jumlah hitung harus bilangan bulat nol atau lebih.");
  }

  back("/warehouse/stocktakes", await applyStocktake(token, stocktakeId, counted));
}
