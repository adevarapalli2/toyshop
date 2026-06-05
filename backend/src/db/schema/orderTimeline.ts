import { pgTable, serial, integer, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { orders } from './orders';
import { users } from './users';

export const orderTimeline = pgTable('order_timeline', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id),
  fromStatus: varchar('from_status', { length: 20 }),
  toStatus: varchar('to_status', { length: 20 }).notNull(),
  notes: text('notes'),
  changedBy: integer('changed_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type OrderTimeline = typeof orderTimeline.$inferSelect;
export type NewOrderTimeline = typeof orderTimeline.$inferInsert;
