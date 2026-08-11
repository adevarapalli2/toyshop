import { pool } from '../db';

export default async function globalTeardown() {
  await pool.end();
}
