-- Create warehouses lookup table
CREATE TABLE IF NOT EXISTS "warehouses" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(50) NOT NULL UNIQUE,
  "code" varchar(10) NOT NULL UNIQUE,
  "description" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- Seed initial warehouses
INSERT INTO "warehouses" ("name", "code", "description") VALUES
  ('Ganga', 'GA', 'Primary warehouse — Ganga'),
  ('Yamuna', 'YA', 'Secondary warehouse — Yamuna')
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Drop old single-column unique constraint on inventory
ALTER TABLE "inventory" DROP CONSTRAINT IF EXISTS "inventory_product_id_unique";
--> statement-breakpoint

-- Add warehouse column to inventory (existing rows default to Ganga)
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "warehouse" varchar(50) NOT NULL DEFAULT 'Ganga';
--> statement-breakpoint

-- Add composite unique index
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_product_warehouse_uniq" ON "inventory" ("product_id", "warehouse");
--> statement-breakpoint

-- Add warehouse column to stock_movements (existing rows default to Ganga)
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "warehouse" varchar(50) NOT NULL DEFAULT 'Ganga';
