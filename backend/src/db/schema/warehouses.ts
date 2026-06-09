import { pgTable, serial, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const warehouses = pgTable('warehouses', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  code: varchar('code', { length: 10 }).notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Warehouse = typeof warehouses.$inferSelect;
export type NewWarehouse = typeof warehouses.$inferInsert;
