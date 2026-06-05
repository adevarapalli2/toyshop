import { pgTable, serial, integer, varchar, timestamp } from 'drizzle-orm/pg-core';
import { products } from './products';

export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().unique().references(() => products.id),
  quantity: integer('quantity').notNull().default(0),
  reservedQty: integer('reserved_qty').notNull().default(0),
  minStock: integer('min_stock').notNull().default(5),
  maxStock: integer('max_stock').notNull().default(100),
  warehouseZone: varchar('warehouse_zone', { length: 10 }).default('A'),
  binLocation: varchar('bin_location', { length: 20 }),
  lastCountedAt: timestamp('last_counted_at'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
