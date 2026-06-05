import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as usersSchema from './schema/users';
import * as productsSchema from './schema/products';
import * as inventorySchema from './schema/inventory';
import * as stockMovementsSchema from './schema/stockMovements';
import * as customersSchema from './schema/customers';
import * as ordersSchema from './schema/orders';
import * as orderItemsSchema from './schema/orderItems';
import * as orderTimelineSchema from './schema/orderTimeline';
import * as shipmentsSchema from './schema/shipments';
import * as shipmentEventsSchema from './schema/shipmentEvents';
const schema = { ...usersSchema, ...productsSchema, ...inventorySchema, ...stockMovementsSchema, ...customersSchema, ...ordersSchema, ...orderItemsSchema, ...orderTimelineSchema, ...shipmentsSchema, ...shipmentEventsSchema };

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });
export { pool };
