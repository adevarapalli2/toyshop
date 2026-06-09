import { pgTable, serial, integer, varchar, text, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';
import { orders } from './orders';
import { customers } from './customers';
import { users } from './users';

export const shipments = pgTable('shipments', {
  id: serial('id').primaryKey(),
  shipmentNumber: varchar('shipment_number', { length: 30 }).notNull().unique(),
  orderId: integer('order_id').notNull().references(() => orders.id),
  customerId: integer('customer_id').references(() => customers.id),
  carrier: varchar('carrier', { length: 50 }).notNull(),
  serviceType: varchar('service_type', { length: 30 }).notNull().default('standard'),
  trackingNumber: varchar('tracking_number', { length: 100 }).unique(),
  status: varchar('status', { length: 30 }).notNull().default('pending_pickup'),
  originAddress: text('origin_address'),
  destinationAddress: text('destination_address'),
  weightKg: numeric('weight_kg', { precision: 6, scale: 2 }),
  lengthCm: numeric('length_cm', { precision: 6, scale: 1 }),
  widthCm: numeric('width_cm', { precision: 6, scale: 1 }),
  heightCm: numeric('height_cm', { precision: 6, scale: 1 }),
  shippingCost: numeric('shipping_cost', { precision: 10, scale: 2 }).notNull().default('0'),
  insuranceValue: numeric('insurance_value', { precision: 10, scale: 2 }).notNull().default('0'),
  signatureRequired: boolean('signature_required').notNull().default(false),
  estimatedDelivery: timestamp('estimated_delivery'),
  actualDelivery: timestamp('actual_delivery'),
  shippedAt: timestamp('shipped_at'),
  notes: text('notes'),
  warehouse: varchar('warehouse', { length: 50 }).notNull().default('Ganga'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Shipment = typeof shipments.$inferSelect;
export type NewShipment = typeof shipments.$inferInsert;
