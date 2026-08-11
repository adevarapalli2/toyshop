-- Historical daily inventory snapshots, used to power period-filtered KPIs
CREATE TABLE IF NOT EXISTS "inventory_snapshots" (
  "id" serial PRIMARY KEY NOT NULL,
  "product_id" integer NOT NULL,
  "warehouse" varchar(50) NOT NULL,
  "snapshot_date" date NOT NULL,
  "quantity" integer NOT NULL,
  "min_stock" integer NOT NULL,
  "max_stock" integer NOT NULL,
  "cost_price" numeric(10,2) NOT NULL,
  "category" varchar(50) NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint

ALTER TABLE "inventory_snapshots" ADD CONSTRAINT "inventory_snapshots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "inv_snap_product_wh_date_uniq" ON "inventory_snapshots" ("product_id","warehouse","snapshot_date");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "inv_snap_date_wh_idx" ON "inventory_snapshots" ("snapshot_date","warehouse");
