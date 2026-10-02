import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261002141059 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "wms_bin" ("id" text not null, "warehouse_id" text not null, "code" text not null, "kind" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "wms_bin_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wms_bin_deleted_at" ON "wms_bin" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "wms_pick_task" ("id" text not null, "warehouse_id" text not null, "order_id" text not null, "packing_bin_id" text null, "status" text not null, "completed_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "wms_pick_task_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wms_pick_task_deleted_at" ON "wms_pick_task" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "wms_pick_task_line" ("id" text not null, "pick_task_id" text not null, "sku" text not null, "quantity" integer not null, "bin_id" text null, "picked_bin_id" text null, "expected_barcode" text null, "scanned_barcode" text null, "picked_quantity" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "wms_pick_task_line_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wms_pick_task_line_deleted_at" ON "wms_pick_task_line" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "wms_stock_movement" ("id" text not null, "warehouse_id" text not null, "bin_id" text not null, "sku" text not null, "kind" text not null, "delta" integer not null, "quantity_before" integer not null, "quantity_after" integer not null, "reason" text null, "actor" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "wms_stock_movement_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wms_stock_movement_deleted_at" ON "wms_stock_movement" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "wms_stocktake" ("id" text not null, "warehouse_id" text not null, "bin_id" text not null, "sku" text not null, "system_quantity" integer not null, "counted_quantity" integer null, "variance" integer null, "status" text not null, "counted_by" text null, "applied_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "wms_stocktake_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wms_stocktake_deleted_at" ON "wms_stocktake" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "wms_warehouse" ("id" text not null, "tenant_id" text not null, "name" text not null, "stock_location_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "wms_warehouse_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wms_warehouse_deleted_at" ON "wms_warehouse" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "wms_bin" cascade;`);

    this.addSql(`drop table if exists "wms_pick_task" cascade;`);

    this.addSql(`drop table if exists "wms_pick_task_line" cascade;`);

    this.addSql(`drop table if exists "wms_stock_movement" cascade;`);

    this.addSql(`drop table if exists "wms_stocktake" cascade;`);

    this.addSql(`drop table if exists "wms_warehouse" cascade;`);
  }

}
