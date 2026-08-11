import { pgTable, serial, integer, varchar, numeric, date, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { products } from './products';

export const inventorySnapshots = pgTable('inventory_snapshots', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  warehouse: varchar('warehouse', { length: 50 }).notNull(),
  snapshotDate: date('snapshot_date').notNull(),
  quantity: integer('quantity').notNull(),
  minStock: integer('min_stock').notNull(),
  maxStock: integer('max_stock').notNull(),
  costPrice: numeric('cost_price', { precision: 10, scale: 2 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  productWarehouseDateUniq: uniqueIndex('inv_snap_product_wh_date_uniq').on(t.productId, t.warehouse, t.snapshotDate),
  dateWarehouseIdx: index('inv_snap_date_wh_idx').on(t.snapshotDate, t.warehouse),
}));

export type InventorySnapshot = typeof inventorySnapshots.$inferSelect;
export type NewInventorySnapshot = typeof inventorySnapshots.$inferInsert;
