import * as dotenv from 'dotenv';
dotenv.config();

import { db, pool } from './index';
import { products } from './schema/products';
import { inventory } from './schema/inventory';
import { stockMovements } from './schema/stockMovements';
import { users } from './schema/users';
import { eq } from 'drizzle-orm';

const SEED_PRODUCTS = [
  { sku: 'TOY-001', name: 'LEGO City Police Station', category: 'building-sets', unit: 'set', cost: '45.00', sell: '79.99', zone: 'A', bin: 'A1-01', qty: 48, min: 10, max: 80 },
  { sku: 'TOY-002', name: 'Barbie Dreamhouse Deluxe', category: 'dolls', unit: 'set', cost: '55.00', sell: '99.99', zone: 'A', bin: 'A1-02', qty: 3, min: 8, max: 40 },
  { sku: 'TOY-003', name: 'RC Monster Truck Pro', category: 'remote-control', unit: 'piece', cost: '28.00', sell: '54.99', zone: 'B', bin: 'B2-01', qty: 0, min: 6, max: 30 },
  { sku: 'TOY-004', name: 'Monopoly Classic Edition', category: 'board-games', unit: 'set', cost: '12.00', sell: '24.99', zone: 'A', bin: 'A2-01', qty: 130, min: 15, max: 80 },
  { sku: 'TOY-005', name: 'Marvel Spider-Man Figure', category: 'action-figures', unit: 'piece', cost: '9.00', sell: '18.99', zone: 'A', bin: 'A2-02', qty: 62, min: 20, max: 100 },
  { sku: 'TOY-006', name: 'Crayola 120 Color Set', category: 'arts-crafts', unit: 'set', cost: '6.50', sell: '14.99', zone: 'C', bin: 'C1-01', qty: 4, min: 10, max: 60 },
  { sku: 'TOY-007', name: '1000-Piece World Map Puzzle', category: 'puzzles', unit: 'set', cost: '10.00', sell: '21.99', zone: 'C', bin: 'C1-02', qty: 22, min: 8, max: 50 },
  { sku: 'TOY-008', name: 'Hot Wheels 20-Car Bundle', category: 'remote-control', unit: 'pack', cost: '15.00', sell: '29.99', zone: 'B', bin: 'B1-01', qty: 0, min: 12, max: 60 },
  { sku: 'TOY-009', name: 'Melissa & Doug Plush Elephant', category: 'plush', unit: 'piece', cost: '8.00', sell: '19.99', zone: 'C', bin: 'C2-01', qty: 35, min: 10, max: 70 },
  { sku: 'TOY-010', name: 'LeapFrog Learning Tablet', category: 'electronic', unit: 'piece', cost: '22.00', sell: '44.99', zone: 'B', bin: 'B3-01', qty: 7, min: 8, max: 35 },
  { sku: 'TOY-011', name: 'Nerf Elite Disruptor Blaster', category: 'outdoor', unit: 'piece', cost: '14.00', sell: '27.99', zone: 'B', bin: 'B2-02', qty: 19, min: 10, max: 50 },
  { sku: 'TOY-012', name: 'Fisher-Price Baby Piano', category: 'electronic', unit: 'piece', cost: '11.00', sell: '22.99', zone: 'B', bin: 'B3-02', qty: 0, min: 5, max: 25 },
  { sku: 'TOY-013', name: 'Jenga Giant Hardwood Game', category: 'board-games', unit: 'set', cost: '18.00', sell: '34.99', zone: 'A', bin: 'A3-01', qty: 11, min: 5, max: 30 },
  { sku: 'TOY-014', name: 'American Girl Doll Kit', category: 'dolls', unit: 'set', cost: '65.00', sell: '115.00', zone: 'A', bin: 'A1-03', qty: 5, min: 6, max: 20 },
  { sku: 'TOY-015', name: 'Razor A Kick Scooter', category: 'outdoor', unit: 'piece', cost: '35.00', sell: '64.99', zone: 'B', bin: 'B1-02', qty: 24, min: 8, max: 40 },
  { sku: 'TOY-016', name: 'Kinetic Sand Beach Set', category: 'arts-crafts', unit: 'set', cost: '9.00', sell: '18.99', zone: 'C', bin: 'C1-03', qty: 2, min: 10, max: 50 },
  { sku: 'TOY-017', name: 'Star Wars Millennium Falcon', category: 'building-sets', unit: 'set', cost: '85.00', sell: '149.99', zone: 'A', bin: 'A1-04', qty: 9, min: 5, max: 20 },
  { sku: 'TOY-018', name: 'Rubik\'s Cube 3x3', category: 'puzzles', unit: 'piece', cost: '4.00', sell: '9.99', zone: 'C', bin: 'C2-02', qty: 88, min: 20, max: 150 },
  { sku: 'TOY-019', name: 'Power Rangers Dino Fury Set', category: 'action-figures', unit: 'set', cost: '18.00', sell: '34.99', zone: 'A', bin: 'A2-03', qty: 0, min: 8, max: 40 },
  { sku: 'TOY-020', name: 'Teddy Bear Plush 50cm', category: 'plush', unit: 'piece', cost: '12.00', sell: '24.99', zone: 'C', bin: 'C2-03', qty: 41, min: 10, max: 60 },
];

async function seed() {
  console.log('Seeding inventory data...');

  const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'));

  for (const p of SEED_PRODUCTS) {
    const [prod] = await db.insert(products).values({
      sku: p.sku, name: p.name, category: p.category,
      unit: p.unit, costPrice: p.cost, sellPrice: p.sell,
    }).onConflictDoNothing().returning({ id: products.id });

    if (!prod) continue;

    await db.insert(inventory).values({
      productId: prod.id, quantity: p.qty,
      minStock: p.min, maxStock: p.max,
      warehouseZone: p.zone, binLocation: p.bin,
    }).onConflictDoNothing();

    if (p.qty > 0) {
      await db.insert(stockMovements).values({
        productId: prod.id, movementType: 'IN',
        quantity: p.qty, quantityBefore: 0, quantityAfter: p.qty,
        referenceNo: 'SEED-INIT', notes: 'Initial stock load',
        performedBy: admin?.id ?? null,
      });
    }

    const status = p.qty === 0 ? '🔴 OOS' : p.qty <= p.min ? '🟡 LOW' : p.qty > p.max ? '🔵 OVER' : '🟢 OK';
    console.log(`  ${status} ${p.sku} — ${p.name} (qty: ${p.qty})`);
  }

  console.log('\nDone. 20 products seeded.');
  await pool.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
