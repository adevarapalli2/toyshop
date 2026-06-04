import * as dotenv from 'dotenv';
dotenv.config();

import { db, pool } from './index';
import { users } from './schema/users';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('Seeding toyshop_db...');

  const seedUsers = [
    { email: 'admin@toyshop.com', name: 'Admin User', password: 'Admin@123', role: 'admin' },
    { email: 'manager@toyshop.com', name: 'Warehouse Manager', password: 'Manager@123', role: 'manager' },
    { email: 'staff@toyshop.com', name: 'Staff Member', password: 'Staff@123', role: 'staff' },
  ];

  for (const u of seedUsers) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await db.insert(users).values({
      email: u.email,
      name: u.name,
      passwordHash,
      role: u.role,
    }).onConflictDoNothing();
    console.log(`  ✓ ${u.role}: ${u.email}`);
  }

  console.log('Done.');
  await pool.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
