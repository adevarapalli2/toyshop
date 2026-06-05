import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as usersSchema from './schema/users';
import * as productsSchema from './schema/products';
import * as inventorySchema from './schema/inventory';
import * as stockMovementsSchema from './schema/stockMovements';
const schema = { ...usersSchema, ...productsSchema, ...inventorySchema, ...stockMovementsSchema };

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });
export { pool };
