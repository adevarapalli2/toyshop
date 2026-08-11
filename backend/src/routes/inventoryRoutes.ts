import { Router, Response } from 'express';
import { eq, desc, ilike, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { products } from '../db/schema/products';
import { inventory } from '../db/schema/inventory';
import { inventorySnapshots } from '../db/schema/inventorySnapshots';
import { stockMovements } from '../db/schema/stockMovements';
import { users } from '../db/schema/users';
import { authenticate, AuthRequest } from '../middleware/auth';
import { managerOrAdmin } from '../middleware/managerOrAdmin';

const router = Router();
router.use(authenticate);

// GET /api/inventory/overview
router.get('/overview', async (req: AuthRequest, res: Response): Promise<void> => {
  const { from, to, warehouse = 'Ganga' } = req.query as { from?: string; to?: string; warehouse?: string };
  const dateFrom = from ? new Date(from) : null;
  const dateTo = to ? new Date(to) : null;
  if (dateTo) dateTo.setHours(23, 59, 59, 999);
  const wh = warehouse;
  const todayStr = new Date().toISOString().slice(0, 10);
  const fromStr = dateFrom ? dateFrom.toISOString().slice(0, 10) : todayStr;
  const isHistorical = fromStr !== todayStr;
  try {
    const allRows = await db
      .select({
        productId: inventory.productId,
        quantity: inventory.quantity, minStock: inventory.minStock,
        maxStock: inventory.maxStock, costPrice: products.costPrice,
        category: products.category, isActive: products.isActive,
      })
      .from(inventory)
      .innerJoin(products, eq(products.id, inventory.productId))
      .where(and(eq(products.isActive, true), eq(inventory.warehouse, wh)));

    // Write-on-read: keep today's snapshot in sync with live inventory
    if (allRows.length > 0) {
      await db.insert(inventorySnapshots).values(allRows.map(r => ({
        productId: r.productId,
        warehouse: wh,
        snapshotDate: todayStr,
        quantity: r.quantity,
        minStock: r.minStock,
        maxStock: r.maxStock,
        costPrice: r.costPrice,
        category: r.category,
      }))).onConflictDoUpdate({
        target: [inventorySnapshots.productId, inventorySnapshots.warehouse, inventorySnapshots.snapshotDate],
        set: {
          quantity: sql`excluded.quantity`,
          minStock: sql`excluded.min_stock`,
          maxStock: sql`excluded.max_stock`,
          costPrice: sql`excluded.cost_price`,
          category: sql`excluded.category`,
        },
      });
    }

    let kpiRows: { quantity: number | null; minStock: number | null; maxStock: number | null; costPrice: string | null; category: string }[] = allRows;
    let asOfDate = todayStr;

    if (isHistorical) {
      const snapResult = await db.execute(sql`
        SELECT DISTINCT ON (product_id) product_id, quantity, min_stock, max_stock, cost_price, category, snapshot_date
        FROM inventory_snapshots
        WHERE warehouse = ${wh} AND snapshot_date <= ${fromStr}
        ORDER BY product_id, snapshot_date DESC
      `);
      let snapRows = snapResult.rows as Array<{ product_id: number; quantity: number; min_stock: number; max_stock: number; cost_price: string; category: string; snapshot_date: string | Date }>;

      if (snapRows.length === 0) {
        const earliestResult = await db.execute(sql`
          SELECT DISTINCT ON (product_id) product_id, quantity, min_stock, max_stock, cost_price, category, snapshot_date
          FROM inventory_snapshots
          WHERE warehouse = ${wh}
          ORDER BY product_id, snapshot_date ASC
        `);
        snapRows = earliestResult.rows as typeof snapRows;
      }

      if (snapRows.length > 0) {
        kpiRows = snapRows.map(r => ({
          quantity: r.quantity, minStock: r.min_stock, maxStock: r.max_stock,
          costPrice: r.cost_price, category: r.category,
        }));
        const d = new Date(snapRows[0].snapshot_date);
        asOfDate = d.toISOString().slice(0, 10);
      }
    }

    const kpi = kpiRows.reduce((acc, r) => {
      const qty = r.quantity ?? 0;
      acc.totalSkus++;
      acc.totalValue += qty * parseFloat(String(r.costPrice ?? 0));
      if (qty === 0) acc.outOfStock++;
      else if (qty <= (r.minStock ?? 5)) acc.lowStock++;
      else if (qty > (r.maxStock ?? 100)) acc.overstock++;
      else acc.inStock++;
      return acc;
    }, { totalSkus: 0, inStock: 0, lowStock: 0, outOfStock: 0, overstock: 0, totalValue: 0 });

    const catMap: Record<string, { inStock: number; lowStock: number; outOfStock: number }> = {};
    for (const r of kpiRows) {
      const cat = r.category;
      if (!catMap[cat]) catMap[cat] = { inStock: 0, lowStock: 0, outOfStock: 0 };
      const qty = r.quantity ?? 0;
      if (qty === 0) catMap[cat].outOfStock++;
      else if (qty <= (r.minStock ?? 5)) catMap[cat].lowStock++;
      else catMap[cat].inStock++;
    }
    const categoryChart = Object.entries(catMap).map(([cat, v]) => ({ category: cat, ...v }));

    const alerts = await db
      .select({
        id: products.id, sku: products.sku, name: products.name, category: products.category,
        quantity: inventory.quantity, minStock: inventory.minStock, binLocation: inventory.binLocation,
      })
      .from(inventory)
      .innerJoin(products, eq(products.id, inventory.productId))
      .where(and(
        eq(products.isActive, true),
        eq(inventory.warehouse, wh),
        sql`${inventory.quantity} <= ${inventory.minStock}`,
      ))
      .orderBy(inventory.quantity)
      .limit(8);

    const movDateFilter = and(
      eq(stockMovements.warehouse, wh),
      dateFrom ? gte(stockMovements.createdAt, dateFrom) : undefined,
      dateTo   ? lte(stockMovements.createdAt, dateTo)   : undefined,
    );

    const recent = await db
      .select({
        id: stockMovements.id, movementType: stockMovements.movementType,
        quantity: stockMovements.quantity, referenceNo: stockMovements.referenceNo,
        createdAt: stockMovements.createdAt,
        productName: products.name, productSku: products.sku,
        performedByName: users.name,
        quantityBefore: stockMovements.quantityBefore,
        quantityAfter: stockMovements.quantityAfter,
      })
      .from(stockMovements)
      .innerJoin(products, eq(products.id, stockMovements.productId))
      .leftJoin(users, eq(users.id, stockMovements.performedBy))
      .where(movDateFilter)
      .orderBy(desc(stockMovements.createdAt))
      .limit(15);

    const [periodSummary] = await db
      .select({
        totalIn:  sql<number>`coalesce(sum(case when movement_type='IN' then quantity else 0 end),0)`,
        totalOut: sql<number>`coalesce(sum(case when movement_type='OUT' then quantity else 0 end),0)`,
        totalAdj: sql<number>`coalesce(sum(case when movement_type='ADJUSTMENT' then 1 else 0 end),0)`,
        count:    sql<number>`count(*)`,
      })
      .from(stockMovements)
      .where(movDateFilter);

    res.json({ success: true, kpi, categoryChart, alerts, recentMovements: recent, periodSummary, asOfDate });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// GET /api/inventory/movements
router.get('/movements', async (req: AuthRequest, res: Response): Promise<void> => {
  const { search, type, page = '1', limit: lim = '20', warehouse = 'Ganga' } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(lim);
  const wh = warehouse;
  try {
    const rows = await db
      .select({
        id: stockMovements.id, movementType: stockMovements.movementType,
        quantity: stockMovements.quantity, quantityBefore: stockMovements.quantityBefore,
        quantityAfter: stockMovements.quantityAfter, referenceNo: stockMovements.referenceNo,
        notes: stockMovements.notes, createdAt: stockMovements.createdAt,
        productId: products.id, productSku: products.sku, productName: products.name,
        category: products.category, performedByName: users.name,
      })
      .from(stockMovements)
      .innerJoin(products, eq(products.id, stockMovements.productId))
      .leftJoin(users, eq(users.id, stockMovements.performedBy))
      .where(and(
        eq(stockMovements.warehouse, wh),
        search ? ilike(products.name, `%${search}%`) : undefined,
        type ? eq(stockMovements.movementType, type) : undefined,
      ))
      .orderBy(desc(stockMovements.createdAt))
      .limit(parseInt(lim))
      .offset(offset);

    res.json({ success: true, data: rows, page: parseInt(page), limit: parseInt(lim) });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// GET /api/inventory/alerts
router.get('/alerts', async (req: AuthRequest, res: Response): Promise<void> => {
  const { warehouse = 'Ganga' } = req.query as { warehouse?: string };
  const wh = warehouse;
  try {
    const rows = await db
      .select({
        id: products.id, sku: products.sku, name: products.name, category: products.category,
        quantity: inventory.quantity, minStock: inventory.minStock,
        maxStock: inventory.maxStock, binLocation: inventory.binLocation, warehouseZone: inventory.warehouseZone,
      })
      .from(inventory)
      .innerJoin(products, eq(products.id, inventory.productId))
      .where(and(
        eq(products.isActive, true),
        eq(inventory.warehouse, wh),
        sql`${inventory.quantity} <= ${inventory.minStock}`,
      ))
      .orderBy(inventory.quantity);

    const outOfStock = rows.filter(r => r.quantity === 0);
    const lowStock = rows.filter(r => (r.quantity ?? 0) > 0);
    res.json({ success: true, outOfStock, lowStock });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// POST /api/inventory/adjust
router.post('/adjust', managerOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { productId, warehouse = 'Ganga', movementType, quantity, referenceNo, notes } = req.body;
  if (!productId || !movementType || !quantity) {
    res.status(422).json({ success: false, message: 'productId, movementType, quantity required' }); return;
  }
  const validTypes = ['IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'TRANSFER'];
  if (!validTypes.includes(movementType)) {
    res.status(422).json({ success: false, message: `movementType must be one of ${validTypes.join(', ')}` }); return;
  }
  const wh = warehouse;
  try {
    const [inv] = await db.select().from(inventory)
      .where(and(eq(inventory.productId, productId), eq(inventory.warehouse, wh)));
    if (!inv) { res.status(404).json({ success: false, message: 'Product inventory not found for this warehouse' }); return; }

    const before = inv.quantity;
    const qty = Math.abs(parseInt(quantity));
    const after = ['OUT'].includes(movementType) ? Math.max(0, before - qty) : before + qty;

    await db.update(inventory).set({ quantity: after, updatedAt: new Date() })
      .where(and(eq(inventory.productId, productId), eq(inventory.warehouse, wh)));
    await db.insert(stockMovements).values({
      productId, warehouse: wh, movementType, quantity: qty,
      quantityBefore: before, quantityAfter: after,
      referenceNo: referenceNo || null, notes: notes || null,
      performedBy: req.user!.id,
    });

    res.json({ success: true, quantityBefore: before, quantityAfter: after });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

export default router;
