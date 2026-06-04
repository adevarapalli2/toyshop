import { pgTable, serial, integer, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { products } from './products';
import { users } from './users';

export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  movementType: varchar('movement_type', { length: 20 }).notNull(),
  quantity: integer('quantity').notNull(),
  quantityBefore: integer('quantity_before').notNull(),
  quantityAfter: integer('quantity_after').notNull(),
  referenceNo: varchar('reference_no', { length: 100 }),
  notes: text('notes'),
  performedBy: integer('performed_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;
