import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Creates `channel_order_link`.
 *
 * Generated from the model in `src/models/channel-order-link.ts` with MikroORM's schema generator,
 * so the two cannot drift. The unique index is partial (`WHERE deleted_at IS NULL`): it is what
 * makes re-importing an external order idempotent, and it deliberately frees the key when a link is
 * dismissed, so a genuinely re-created channel order can be imported again.
 */
export class Migration20260928000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "channel_order_link" ("id" text not null, "channel" text not null, "external_order_id" text not null, "tenant_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "channel_order_link_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_channel_order_link_deleted_at" ON "channel_order_link" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_channel_order_link_tenant_id_channel_external_order_id_unique" ON "channel_order_link" ("tenant_id", "channel", "external_order_id") WHERE deleted_at IS NULL;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "channel_order_link" cascade;`);
  }
}
