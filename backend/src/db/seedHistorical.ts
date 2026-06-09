/**
 * Backfill 90 days of realistic stock movements for Ganga and Yamuna.
 * Also adjusts current quantities to create low-stock / out-of-stock situations.
 * Run: npm run db:seed:historical
 */
import 'dotenv/config';
import { db } from './index';
import { products } from './schema/products';
import { inventory } from './schema/inventory';
import { stockMovements } from './schema/stockMovements';
import { users } from './schema/users';
import { eq, and } from 'drizzle-orm';

const DAYS = 90;
const NOW = new Date();

function daysAgo(d: number, hour = 10, minute = 0) {
  const dt = new Date(NOW);
  dt.setDate(dt.getDate() - d);
  dt.setHours(hour, minute, 0, 0);
  return dt;
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Movement plans per product — array of { daysAgo, type, qty, ref }
type MvPlan = { d: number; h: number; type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN'; qty: number; ref?: string };

function buildGangaMovements(): Record<string, MvPlan[]> {
  const plans: Record<string, MvPlan[]> = {};

  // TOY-001 - high velocity product
  plans['TOY-001'] = [
    { d: 85, h: 9,  type: 'IN',  qty: 200, ref: 'PO-2026-001' },
    { d: 80, h: 14, type: 'OUT', qty: 35, ref: 'SO-2026-001' },
    { d: 75, h: 11, type: 'OUT', qty: 28, ref: 'SO-2026-012' },
    { d: 70, h: 9,  type: 'IN',  qty: 150, ref: 'PO-2026-008' },
    { d: 65, h: 16, type: 'OUT', qty: 40, ref: 'SO-2026-025' },
    { d: 60, h: 10, type: 'OUT', qty: 22, ref: 'SO-2026-031' },
    { d: 55, h: 13, type: 'RETURN', qty: 5, ref: 'RET-001' },
    { d: 50, h: 9,  type: 'IN',  qty: 100, ref: 'PO-2026-015' },
    { d: 45, h: 14, type: 'OUT', qty: 50, ref: 'SO-2026-048' },
    { d: 40, h: 11, type: 'OUT', qty: 33, ref: 'SO-2026-055' },
    { d: 35, h: 9,  type: 'IN',  qty: 120, ref: 'PO-2026-022' },
    { d: 30, h: 15, type: 'OUT', qty: 45, ref: 'SO-2026-067' },
    { d: 25, h: 10, type: 'OUT', qty: 38, ref: 'SO-2026-078' },
    { d: 20, h: 9,  type: 'IN',  qty: 80,  ref: 'PO-2026-031' },
    { d: 15, h: 14, type: 'OUT', qty: 25, ref: 'SO-2026-090' },
    { d: 10, h: 11, type: 'OUT', qty: 18, ref: 'SO-2026-102' },
    { d: 7,  h: 9,  type: 'IN',  qty: 60,  ref: 'PO-2026-038' },
    { d: 5,  h: 14, type: 'OUT', qty: 20, ref: 'SO-2026-115' },
    { d: 3,  h: 10, type: 'OUT', qty: 15, ref: 'SO-2026-122' },
    { d: 1,  h: 9,  type: 'OUT', qty: 10, ref: 'SO-2026-130' },
    { d: 0,  h: 11, type: 'OUT', qty: 8,  ref: 'SO-2026-135' },
  ];

  // TOY-002 - steady mover
  plans['TOY-002'] = [
    { d: 88, h: 10, type: 'IN',  qty: 80, ref: 'PO-2026-002' },
    { d: 82, h: 14, type: 'OUT', qty: 20, ref: 'SO-2026-003' },
    { d: 75, h: 9,  type: 'OUT', qty: 15, ref: 'SO-2026-018' },
    { d: 68, h: 10, type: 'IN',  qty: 60, ref: 'PO-2026-010' },
    { d: 60, h: 15, type: 'OUT', qty: 25, ref: 'SO-2026-033' },
    { d: 52, h: 10, type: 'OUT', qty: 18, ref: 'SO-2026-044' },
    { d: 45, h: 9,  type: 'IN',  qty: 50, ref: 'PO-2026-017' },
    { d: 38, h: 14, type: 'OUT', qty: 22, ref: 'SO-2026-060' },
    { d: 30, h: 10, type: 'ADJUSTMENT', qty: 3, ref: 'ADJ-001' },
    { d: 22, h: 9,  type: 'IN',  qty: 40, ref: 'PO-2026-028' },
    { d: 15, h: 14, type: 'OUT', qty: 18, ref: 'SO-2026-088' },
    { d: 8,  h: 10, type: 'OUT', qty: 12, ref: 'SO-2026-108' },
    { d: 3,  h: 9,  type: 'OUT', qty: 8,  ref: 'SO-2026-128' },
    { d: 1,  h: 14, type: 'OUT', qty: 5,  ref: 'SO-2026-133' },
  ];

  // TOY-003 — low stock situation
  plans['TOY-003'] = [
    { d: 87, h: 9,  type: 'IN',  qty: 60, ref: 'PO-2026-003' },
    { d: 80, h: 14, type: 'OUT', qty: 18, ref: 'SO-2026-005' },
    { d: 72, h: 10, type: 'OUT', qty: 15, ref: 'SO-2026-019' },
    { d: 65, h: 9,  type: 'OUT', qty: 12, ref: 'SO-2026-028' },
    { d: 55, h: 14, type: 'OUT', qty: 10, ref: 'SO-2026-042' },
    { d: 45, h: 10, type: 'OUT', qty: 8,  ref: 'SO-2026-056' },
    { d: 35, h: 9,  type: 'OUT', qty: 6,  ref: 'SO-2026-070' },
    { d: 25, h: 14, type: 'OUT', qty: 5,  ref: 'SO-2026-082' },
    { d: 15, h: 10, type: 'OUT', qty: 4,  ref: 'SO-2026-095' },
    { d: 5,  h: 9,  type: 'OUT', qty: 3,  ref: 'SO-2026-119' },
  ];

  // TOY-004 — consistent restocks
  plans['TOY-004'] = [
    { d: 86, h: 9,  type: 'IN',  qty: 120, ref: 'PO-2026-004' },
    { d: 78, h: 14, type: 'OUT', qty: 30, ref: 'SO-2026-008' },
    { d: 70, h: 10, type: 'OUT', qty: 25, ref: 'SO-2026-022' },
    { d: 62, h: 9,  type: 'IN',  qty: 100, ref: 'PO-2026-012' },
    { d: 55, h: 14, type: 'OUT', qty: 35, ref: 'SO-2026-038' },
    { d: 47, h: 10, type: 'OUT', qty: 28, ref: 'SO-2026-052' },
    { d: 40, h: 9,  type: 'IN',  qty: 80,  ref: 'PO-2026-019' },
    { d: 32, h: 14, type: 'OUT', qty: 22, ref: 'SO-2026-068' },
    { d: 24, h: 10, type: 'OUT', qty: 18, ref: 'SO-2026-080' },
    { d: 16, h: 9,  type: 'IN',  qty: 60,  ref: 'PO-2026-030' },
    { d: 10, h: 14, type: 'OUT', qty: 15, ref: 'SO-2026-098' },
    { d: 5,  h: 10, type: 'OUT', qty: 12, ref: 'SO-2026-114' },
    { d: 2,  h: 9,  type: 'OUT', qty: 8,  ref: 'SO-2026-129' },
    { d: 0,  h: 14, type: 'OUT', qty: 5,  ref: 'SO-2026-136' },
  ];

  // TOY-005 — seasonal, mostly recent
  plans['TOY-005'] = [
    { d: 60, h: 9,  type: 'IN',  qty: 90, ref: 'PO-2026-016' },
    { d: 50, h: 14, type: 'OUT', qty: 20, ref: 'SO-2026-046' },
    { d: 40, h: 10, type: 'OUT', qty: 18, ref: 'SO-2026-062' },
    { d: 30, h: 9,  type: 'IN',  qty: 70,  ref: 'PO-2026-024' },
    { d: 20, h: 14, type: 'OUT', qty: 25, ref: 'SO-2026-083' },
    { d: 14, h: 10, type: 'OUT', qty: 20, ref: 'SO-2026-094' },
    { d: 7,  h: 9,  type: 'IN',  qty: 50,  ref: 'PO-2026-037' },
    { d: 4,  h: 14, type: 'OUT', qty: 12, ref: 'SO-2026-116' },
    { d: 2,  h: 10, type: 'OUT', qty: 10, ref: 'SO-2026-127' },
    { d: 0,  h: 9,  type: 'OUT', qty: 8,  ref: 'SO-2026-134' },
  ];

  // TOY-006 — out of stock situation
  plans['TOY-006'] = [
    { d: 89, h: 9,  type: 'IN',  qty: 50, ref: 'PO-2026-005' },
    { d: 80, h: 14, type: 'OUT', qty: 15, ref: 'SO-2026-009' },
    { d: 70, h: 10, type: 'OUT', qty: 12, ref: 'SO-2026-021' },
    { d: 60, h: 9,  type: 'OUT', qty: 10, ref: 'SO-2026-035' },
    { d: 50, h: 14, type: 'OUT', qty: 8,  ref: 'SO-2026-049' },
    { d: 40, h: 10, type: 'OUT', qty: 5,  ref: 'SO-2026-063' },
    { d: 30, h: 9,  type: 'RETURN', qty: 2, ref: 'RET-006' },
    { d: 20, h: 14, type: 'OUT', qty: 2,  ref: 'SO-2026-084' },
  ];

  // TOY-007 — adjustment heavy
  plans['TOY-007'] = [
    { d: 85, h: 9,  type: 'IN',  qty: 100, ref: 'PO-2026-006' },
    { d: 76, h: 14, type: 'OUT', qty: 22, ref: 'SO-2026-011' },
    { d: 68, h: 10, type: 'ADJUSTMENT', qty: 5, ref: 'ADJ-007-A' },
    { d: 60, h: 9,  type: 'OUT', qty: 18, ref: 'SO-2026-036' },
    { d: 52, h: 14, type: 'IN',  qty: 80,  ref: 'PO-2026-018' },
    { d: 44, h: 10, type: 'OUT', qty: 25, ref: 'SO-2026-058' },
    { d: 36, h: 9,  type: 'ADJUSTMENT', qty: 3, ref: 'ADJ-007-B' },
    { d: 28, h: 14, type: 'OUT', qty: 20, ref: 'SO-2026-074' },
    { d: 20, h: 10, type: 'IN',  qty: 60,  ref: 'PO-2026-029' },
    { d: 13, h: 9,  type: 'OUT', qty: 15, ref: 'SO-2026-096' },
    { d: 6,  h: 14, type: 'OUT', qty: 12, ref: 'SO-2026-111' },
    { d: 2,  h: 10, type: 'ADJUSTMENT', qty: 2, ref: 'ADJ-007-C' },
    { d: 0,  h: 14, type: 'OUT', qty: 8,  ref: 'SO-2026-137' },
  ];

  // TOY-008 — weekly pattern
  plans['TOY-008'] = [
    { d: 84, h: 9,  type: 'IN',  qty: 70, ref: 'PO-2026-007' },
    { d: 77, h: 14, type: 'OUT', qty: 10, ref: 'SO-2026-013' },
    { d: 70, h: 9,  type: 'OUT', qty: 10, ref: 'SO-2026-023' },
    { d: 63, h: 14, type: 'OUT', qty: 10, ref: 'SO-2026-034' },
    { d: 56, h: 9,  type: 'IN',  qty: 50,  ref: 'PO-2026-020' },
    { d: 49, h: 14, type: 'OUT', qty: 12, ref: 'SO-2026-050' },
    { d: 42, h: 9,  type: 'OUT', qty: 12, ref: 'SO-2026-061' },
    { d: 35, h: 14, type: 'OUT', qty: 10, ref: 'SO-2026-071' },
    { d: 28, h: 9,  type: 'IN',  qty: 40,  ref: 'PO-2026-026' },
    { d: 21, h: 14, type: 'OUT', qty: 8,  ref: 'SO-2026-085' },
    { d: 14, h: 9,  type: 'OUT', qty: 8,  ref: 'SO-2026-097' },
    { d: 7,  h: 14, type: 'OUT', qty: 6,  ref: 'SO-2026-109' },
    { d: 3,  h: 9,  type: 'OUT', qty: 5,  ref: 'SO-2026-124' },
    { d: 1,  h: 14, type: 'OUT', qty: 4,  ref: 'SO-2026-132' },
    { d: 0,  h: 9,  type: 'OUT', qty: 3,  ref: 'SO-2026-138' },
  ];

  // TOY-009 — bulk buyer
  plans['TOY-009'] = [
    { d: 83, h: 9,  type: 'IN',  qty: 150, ref: 'PO-2026-009' },
    { d: 74, h: 14, type: 'OUT', qty: 50, ref: 'SO-2026-015' },
    { d: 65, h: 9,  type: 'OUT', qty: 40, ref: 'SO-2026-029' },
    { d: 56, h: 14, type: 'IN',  qty: 100, ref: 'PO-2026-021' },
    { d: 47, h: 9,  type: 'OUT', qty: 45, ref: 'SO-2026-053' },
    { d: 38, h: 14, type: 'OUT', qty: 35, ref: 'SO-2026-066' },
    { d: 29, h: 9,  type: 'IN',  qty: 80,  ref: 'PO-2026-027' },
    { d: 20, h: 14, type: 'OUT', qty: 30, ref: 'SO-2026-086' },
    { d: 12, h: 9,  type: 'OUT', qty: 25, ref: 'SO-2026-100' },
    { d: 5,  h: 14, type: 'OUT', qty: 20, ref: 'SO-2026-118' },
    { d: 1,  h: 9,  type: 'OUT', qty: 15, ref: 'SO-2026-131' },
    { d: 0,  h: 14, type: 'OUT', qty: 10, ref: 'SO-2026-139' },
  ];

  // TOY-010 — returns heavy
  plans['TOY-010'] = [
    { d: 82, h: 9,  type: 'IN',  qty: 90, ref: 'PO-2026-011' },
    { d: 73, h: 14, type: 'OUT', qty: 25, ref: 'SO-2026-016' },
    { d: 63, h: 10, type: 'RETURN', qty: 4, ref: 'RET-010-A' },
    { d: 54, h: 9,  type: 'OUT', qty: 20, ref: 'SO-2026-040' },
    { d: 45, h: 14, type: 'RETURN', qty: 3, ref: 'RET-010-B' },
    { d: 36, h: 10, type: 'OUT', qty: 18, ref: 'SO-2026-064' },
    { d: 27, h: 9,  type: 'IN',  qty: 70,  ref: 'PO-2026-025' },
    { d: 18, h: 14, type: 'OUT', qty: 22, ref: 'SO-2026-087' },
    { d: 11, h: 10, type: 'RETURN', qty: 2, ref: 'RET-010-C' },
    { d: 4,  h: 9,  type: 'OUT', qty: 15, ref: 'SO-2026-117' },
    { d: 1,  h: 14, type: 'OUT', qty: 8,  ref: 'SO-2026-132' },
  ];

  return plans;
}

// Final inventory quantities we want (to create interesting stock states)
const GANGA_FINAL_QTY: Record<string, number> = {
  'TOY-001': 38,   // good stock
  'TOY-002': 22,   // moderate
  'TOY-003': 4,    // LOW STOCK (min is 5)
  'TOY-004': 45,   // good stock
  'TOY-005': 55,   // good stock
  'TOY-006': 0,    // OUT OF STOCK
  'TOY-007': 60,   // good stock
  'TOY-008': 15,   // LOW STOCK
  'TOY-009': 35,   // moderate
  'TOY-010': 22,   // moderate
};

async function seed() {
  console.log('Seeding historical stock movements (90 days)...\n');

  const [adminUser] = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'));
  const adminId = adminUser?.id ?? null;

  const gangaPlans = buildGangaMovements();

  for (const [sku, mvs] of Object.entries(gangaPlans)) {
    const [prod] = await db.select({ id: products.id }).from(products).where(eq(products.sku, sku));
    if (!prod) { console.warn(`  SKIP ${sku} — not found`); continue; }

    // Delete existing movements so we can rebuild cleanly (keeps initial seed movement)
    // Actually just insert additional historical movements on top
    let runningQty = 0;

    // Get current qty to figure out a starting quantity
    const [inv] = await db.select({ quantity: inventory.quantity }).from(inventory)
      .where(and(eq(inventory.productId, prod.id), eq(inventory.warehouse, 'Ganga')));
    runningQty = inv?.quantity ?? 0;

    // Sort movements oldest first
    const sorted = [...mvs].sort((a, b) => b.d - a.d);

    // Reconstruct: work backwards from target final qty
    // We'll just insert the movements with the timestamps and let runningQty flow through
    // Start from an assumed opening quantity
    const targetFinal = GANGA_FINAL_QTY[sku];
    const totalIn = sorted.filter(m => ['IN','RETURN'].includes(m.type)).reduce((s, m) => s + m.qty, 0);
    const totalOut = sorted.filter(m => m.type === 'OUT').reduce((s, m) => s + m.qty, 0);
    const totalAdj = sorted.filter(m => m.type === 'ADJUSTMENT').reduce((s, m) => s + m.qty, 0);
    const openingQty = (targetFinal ?? 0) + totalOut - totalIn + totalAdj;
    runningQty = Math.max(openingQty, 0);

    const movRows = sorted.map(m => {
      const before = runningQty;
      const qty = m.qty;
      let after: number;
      if (m.type === 'OUT') {
        after = Math.max(0, before - qty);
      } else {
        after = before + qty;
      }
      runningQty = after;
      return {
        productId: prod.id,
        warehouse: 'Ganga' as string,
        movementType: m.type,
        quantity: qty,
        quantityBefore: before,
        quantityAfter: after,
        referenceNo: m.ref ?? null,
        notes: null as string | null,
        performedBy: adminId,
        createdAt: daysAgo(m.d, m.h, rand(0, 59)),
      };
    });

    await db.insert(stockMovements).values(movRows);

    // Set final inventory qty
    if (targetFinal !== undefined && inv) {
      await db.update(inventory)
        .set({ quantity: targetFinal, updatedAt: new Date() })
        .where(and(eq(inventory.productId, prod.id), eq(inventory.warehouse, 'Ganga')));
    }

    console.log(`  ✓ ${sku} — ${mvs.length} movements → qty ${targetFinal ?? runningQty}`);
  }

  // Yamuna — add lighter movement history (last 30 days)
  console.log('\n  Adding Yamuna movements (30 days)...');
  const yamunaMovements: Array<{ sku: string; mvs: MvPlan[] }> = [
    { sku: 'TOY-001', mvs: [
      { d: 28, h: 9, type: 'OUT', qty: 30, ref: 'YA-SO-001' },
      { d: 21, h: 14, type: 'OUT', qty: 25, ref: 'YA-SO-008' },
      { d: 14, h: 9,  type: 'IN',  qty: 80, ref: 'YA-PO-003' },
      { d: 7,  h: 14, type: 'OUT', qty: 20, ref: 'YA-SO-015' },
      { d: 3,  h: 9,  type: 'OUT', qty: 15, ref: 'YA-SO-022' },
      { d: 1,  h: 14, type: 'OUT', qty: 10, ref: 'YA-SO-028' },
      { d: 0,  h: 9,  type: 'OUT', qty: 10, ref: 'YA-SO-031' },
    ]},
    { sku: 'TOY-004', mvs: [
      { d: 25, h: 10, type: 'OUT', qty: 20, ref: 'YA-SO-003' },
      { d: 18, h: 14, type: 'OUT', qty: 15, ref: 'YA-SO-010' },
      { d: 10, h: 9,  type: 'IN',  qty: 50, ref: 'YA-PO-005' },
      { d: 5,  h: 14, type: 'OUT', qty: 18, ref: 'YA-SO-019' },
      { d: 2,  h: 9,  type: 'OUT', qty: 12, ref: 'YA-SO-026' },
      { d: 0,  h: 14, type: 'OUT', qty: 5,  ref: 'YA-SO-033' },
    ]},
    { sku: 'TOY-007', mvs: [
      { d: 22, h: 10, type: 'OUT', qty: 15, ref: 'YA-SO-005' },
      { d: 15, h: 14, type: 'OUT', qty: 10, ref: 'YA-SO-012' },
      { d: 8,  h: 9,  type: 'IN',  qty: 40, ref: 'YA-PO-007' },
      { d: 3,  h: 14, type: 'OUT', qty: 12, ref: 'YA-SO-023' },
      { d: 0,  h: 9,  type: 'OUT', qty: 8,  ref: 'YA-SO-032' },
    ]},
    { sku: 'TOY-021', mvs: [
      { d: 20, h: 9,  type: 'OUT', qty: 12, ref: 'YA-SO-007' },
      { d: 12, h: 14, type: 'OUT', qty: 10, ref: 'YA-SO-014' },
      { d: 5,  h: 9,  type: 'OUT', qty: 8,  ref: 'YA-SO-021' },
      { d: 1,  h: 14, type: 'OUT', qty: 5,  ref: 'YA-SO-029' },
      { d: 0,  h: 9,  type: 'OUT', qty: 4,  ref: 'YA-SO-034' },
    ]},
    { sku: 'TOY-022', mvs: [
      { d: 18, h: 10, type: 'OUT', qty: 8,  ref: 'YA-SO-009' },
      { d: 10, h: 14, type: 'OUT', qty: 6,  ref: 'YA-SO-016' },
      { d: 4,  h: 9,  type: 'OUT', qty: 5,  ref: 'YA-SO-024' },
      { d: 1,  h: 14, type: 'RETURN', qty: 1, ref: 'YA-RET-001' },
      { d: 0,  h: 9,  type: 'OUT', qty: 4,  ref: 'YA-SO-035' },
    ]},
  ];

  for (const { sku, mvs } of yamunaMovements) {
    const [prod] = await db.select({ id: products.id }).from(products).where(eq(products.sku, sku));
    if (!prod) continue;
    const [inv] = await db.select({ quantity: inventory.quantity }).from(inventory)
      .where(and(eq(inventory.productId, prod.id), eq(inventory.warehouse, 'Yamuna')));
    let running = inv?.quantity ?? 50;

    const sorted = [...mvs].sort((a, b) => b.d - a.d);
    const totalIn = sorted.filter(m => ['IN','RETURN'].includes(m.type)).reduce((s, m) => s + m.qty, 0);
    const totalOut = sorted.filter(m => m.type === 'OUT').reduce((s, m) => s + m.qty, 0);
    running = Math.max(0, (inv?.quantity ?? 0) + totalOut - totalIn);

    const movRows = sorted.map(m => {
      const before = running;
      const after = m.type === 'OUT' ? Math.max(0, before - m.qty) : before + m.qty;
      running = after;
      return {
        productId: prod.id,
        warehouse: 'Yamuna' as string,
        movementType: m.type,
        quantity: m.qty,
        quantityBefore: before,
        quantityAfter: after,
        referenceNo: m.ref ?? null,
        notes: null as string | null,
        performedBy: adminId,
        createdAt: daysAgo(m.d, m.h, rand(0, 59)),
      };
    });

    await db.insert(stockMovements).values(movRows);
    console.log(`  ✓ Yamuna/${sku} — ${mvs.length} movements`);
  }

  // Ensure TOY-003 and TOY-006 hit their low/OOS state
  for (const { sku, qty } of [{ sku: 'TOY-003', qty: 4 }, { sku: 'TOY-006', qty: 0 }, { sku: 'TOY-008', qty: 3 }]) {
    const [prod] = await db.select({ id: products.id }).from(products).where(eq(products.sku, sku));
    if (!prod) continue;
    await db.update(inventory).set({ quantity: qty, updatedAt: new Date() })
      .where(and(eq(inventory.productId, prod.id), eq(inventory.warehouse, 'Ganga')));
  }

  console.log('\nHistorical seed complete. DB summary:');
  console.log('  Ganga: TOY-003 → 4 (low), TOY-006 → 0 (OOS), TOY-008 → 3 (low)');
  console.log('  All warehouses now have 90/30 days of rich movement history.\n');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
