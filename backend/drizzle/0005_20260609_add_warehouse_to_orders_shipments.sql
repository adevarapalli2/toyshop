-- Add warehouse column to orders (all existing orders default to Ganga)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "warehouse" varchar(50) NOT NULL DEFAULT 'Ganga';
--> statement-breakpoint

-- Add warehouse column to shipments (all existing shipments default to Ganga)
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "warehouse" varchar(50) NOT NULL DEFAULT 'Ganga';
--> statement-breakpoint

-- Assign every 3rd order to Yamuna to create realistic split data
UPDATE "orders" SET "warehouse" = 'Yamuna' WHERE mod("id", 3) = 0;
--> statement-breakpoint

-- Mirror same split for shipments
UPDATE "shipments" SET "warehouse" = 'Yamuna' WHERE "order_id" IN (SELECT "id" FROM "orders" WHERE "warehouse" = 'Yamuna');
