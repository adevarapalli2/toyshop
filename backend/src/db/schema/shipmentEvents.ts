import { pgTable, serial, integer, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { shipments } from './shipments';

export const shipmentEvents = pgTable('shipment_events', {
  id: serial('id').primaryKey(),
  shipmentId: integer('shipment_id').notNull().references(() => shipments.id),
  eventType: varchar('event_type', { length: 40 }).notNull(),
  location: varchar('location', { length: 200 }),
  description: text('description'),
  eventTime: timestamp('event_time').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type ShipmentEvent = typeof shipmentEvents.$inferSelect;
export type NewShipmentEvent = typeof shipmentEvents.$inferInsert;
