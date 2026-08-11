import * as dotenv from 'dotenv';
import path from 'path';

export default async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ||
    'postgresql://postgres:admin123@localhost:5432/toyshop_db';
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || 'toyshop_jwt_secret_2024_warehouse';
  process.env.PORT = '5099';
}
