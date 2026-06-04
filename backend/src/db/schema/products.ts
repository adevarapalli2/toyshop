import { pgTable, serial, varchar, text, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: varchar('sku', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  description: text('description'),
  unit: varchar('unit', { length: 20 }).notNull().default('piece'),
  costPrice: numeric('cost_price', { precision: 10, scale: 2 }).notNull().default('0'),
  sellPrice: numeric('sell_price', { precision: 10, scale: 2 }).notNull().default('0'),
  imageUrl: varchar('image_url', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
