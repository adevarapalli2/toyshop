/**
 * Backfill 90 days of historical inventory snapshots by anchoring on the
 * current (ground-truth) quantity and rolling backwards through the
 * stock_movements ledger, undoing each movement's delta. Quantities are
 * clamped at 0 to absorb any stale/inconsistent ledger entries.
 * Run: npm run db:seed:snapshots
 */
import 'dotenv/config';
import { db, pool } from './index';
import { products } from './schema/products';
import { inventory } from './schema/inventory';
import { stockMovements } from './schema/stockMovements';
import { inventorySnapshots } from './schema/inventorySnapshots';
import { eq, and, desc, sql } from 'drizzle-orm';

const DAYS = 90;

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function seed() {
  console.log(`Backfilling ${DAYS} days of inventory snapshots...\n`);

  const rows = await db
    .select({
      productId: inventory.productId,
      warehouse: inventory.warehouse,
      quantity: inventory.quantity,
      minStock: inventory.minStock,
      maxStock: inventory.maxStock,
      costPrice: products.costPrice,
      category: products.category,
    })
    .from(inventory)
    .innerJoin(products, eq(products.id, inventory.productId))
    .where(eq(products.isActive, true));

  const today = new Date();
  let totalInserted = 0;

  for (const row of rows) {
    const movements = await db
      .select({
        createdAt: stockMovements.createdAt,
        quantityBefore: stockMovements.quantityBefore,
        quantityAfter: stockMovements.quantityAfter,
      })
      .from(stockMovements)
      .where(and(eq(stockMovements.productId, row.productId), eq(stockMovements.warehouse, row.warehouse)))
      .orderBy(desc(stockMovements.createdAt));

    let runningQty = row.quantity; // anchor on current (ground-truth) quantity
    let movIdx = 0;
    const snapshotRows: (typeof inventorySnapshots.$inferInsert)[] = [];

    for (let d = 0; d < DAYS; d++) {
      const day = new Date(today);
      day.setDate(day.getDate() - d);
      const eod = endOfDay(day);

      while (movIdx < movements.length && movements[movIdx].createdAt > eod) {
        const delta = movements[movIdx].quantityAfter - movements[movIdx].quantityBefore;
        runningQty -= delta;
        movIdx++;
      }

      snapshotRows.push({
        productId: row.productId,
        warehouse: row.warehouse,
        snapshotDate: toDateString(day),
        quantity: Math.max(0, runningQty),
        minStock: row.minStock,
        maxStock: row.maxStock,
        costPrice: row.costPrice,
        category: row.category,
      });
    }

    await db.insert(inventorySnapshots).values(snapshotRows)
      .onConflictDoUpdate({
        target: [inventorySnapshots.productId, inventorySnapshots.warehouse, inventorySnapshots.snapshotDate],
        set: {
          quantity: sql`excluded.quantity`,
          minStock: sql`excluded.min_stock`,
          maxStock: sql`excluded.max_stock`,
          costPrice: sql`excluded.cost_price`,
          category: sql`excluded.category`,
        },
      });
    totalInserted += snapshotRows.length;
    console.log(`  ✓ product ${row.productId} / ${row.warehouse} — ${snapshotRows.length} days backfilled`);
  }

  console.log(`\nDone. ${totalInserted} snapshot rows processed.`);
  await pool.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
