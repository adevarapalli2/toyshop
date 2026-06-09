import 'dotenv/config';
import { db } from './index';
import { products } from './schema/products';
import { inventory } from './schema/inventory';
import { stockMovements } from './schema/stockMovements';
import { eq } from 'drizzle-orm';

const WAREHOUSE = 'Yamuna';

// 5 existing SKUs to replicate in Yamuna + 3 new products exclusive to Yamuna
const existingSkus = ['TOY-001', 'TOY-004', 'TOY-007', 'TOY-010', 'TOY-018'];

const yamunaStock: Record<string, { qty: number; zone: string; min: number; max: number }> = {
  'TOY-001': { qty: 120, zone: 'A', min: 20, max: 200 },
  'TOY-004': { qty: 85,  zone: 'B', min: 15, max: 150 },
  'TOY-007': { qty: 60,  zone: 'A', min: 10, max: 100 },
  'TOY-010': { qty: 40,  zone: 'C', min: 8,  max: 80  },
  'TOY-018': { qty: 30,  zone: 'B', min: 5,  max: 60  },
};

const newProducts = [
  {
    sku: 'TOY-021', name: 'Magnetic Tiles Set (64 pcs)', category: 'Educational',
    unit: 'set', costPrice: '18.50', sellPrice: '34.99',
    description: 'Colourful magnetic construction tiles for creative building',
    qty: 75, zone: 'A', min: 15, max: 120,
  },
  {
    sku: 'TOY-022', name: 'Wooden Train Set', category: 'Vehicles',
    unit: 'set', costPrice: '22.00', sellPrice: '44.99',
    description: 'Classic wooden train set with tracks, bridges and carriages',
    qty: 50, zone: 'B', min: 10, max: 100,
  },
  {
    sku: 'TOY-023', name: 'Play-Doh Mega Pack', category: 'Arts & Crafts',
    unit: 'pack', costPrice: '12.00', sellPrice: '24.99',
    description: '36-colour modelling compound set with tools and moulds',
    qty: 90, zone: 'C', min: 20, max: 150,
  },
];

async function seed() {
  console.log('Seeding Yamuna warehouse...');

  // ── Existing SKUs ──────────────────────────────────────────────────────
  for (const sku of existingSkus) {
    const [prod] = await db.select({ id: products.id }).from(products).where(eq(products.sku, sku));
    if (!prod) { console.warn(`SKU ${sku} not found, skipping`); continue; }

    const cfg = yamunaStock[sku];
    // Insert inventory row (skip if already exists)
    await db.insert(inventory).values({
      productId: prod.id, warehouse: WAREHOUSE,
      quantity: cfg.qty, minStock: cfg.min, maxStock: cfg.max,
      warehouseZone: cfg.zone,
    }).onConflictDoNothing();

    await db.insert(stockMovements).values({
      productId: prod.id, warehouse: WAREHOUSE,
      movementType: 'IN', quantity: cfg.qty,
      quantityBefore: 0, quantityAfter: cfg.qty,
      referenceNo: 'YAMUNA-INIT', notes: 'Yamuna warehouse initial stock',
      performedBy: null,
    });

    console.log(`  ✓ ${sku} — ${cfg.qty} units in Yamuna/${cfg.zone}`);
  }

  // ── New products exclusive to Yamuna ───────────────────────────────────
  for (const p of newProducts) {
    const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.sku, p.sku));
    let prodId: number;

    if (existing) {
      prodId = existing.id;
      console.log(`  ~ ${p.sku} already exists, adding Yamuna inventory only`);
    } else {
      const [prod] = await db.insert(products).values({
        sku: p.sku, name: p.name, category: p.category,
        unit: p.unit, costPrice: p.costPrice, sellPrice: p.sellPrice,
        description: p.description,
      }).returning({ id: products.id });
      prodId = prod.id;
      console.log(`  + ${p.sku} created`);
    }

    await db.insert(inventory).values({
      productId: prodId, warehouse: WAREHOUSE,
      quantity: p.qty, minStock: p.min, maxStock: p.max,
      warehouseZone: p.zone,
    }).onConflictDoNothing();

    await db.insert(stockMovements).values({
      productId: prodId, warehouse: WAREHOUSE,
      movementType: 'IN', quantity: p.qty,
      quantityBefore: 0, quantityAfter: p.qty,
      referenceNo: 'YAMUNA-INIT', notes: 'Yamuna warehouse initial stock',
      performedBy: null,
    });

    console.log(`  ✓ ${p.sku} — ${p.qty} units in Yamuna/${p.zone}`);
  }

  console.log('\nYamuna seed complete.');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
