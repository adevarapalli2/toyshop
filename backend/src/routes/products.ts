import { Router, Response } from 'express';
import { eq, ilike, and, or, sql, desc } from 'drizzle-orm';
import { db } from '../db/index';
import { products } from '../db/schema/products';
import { inventory } from '../db/schema/inventory';
import { stockMovements } from '../db/schema/stockMovements';
import { users } from '../db/schema/users';
import { authenticate, AuthRequest } from '../middleware/auth';
import { managerOrAdmin } from '../middleware/managerOrAdmin';

const router = Router();
router.use(authenticate);

function stockStatus(qty: number, min: number, max: number): string {
  if (qty === 0) return 'out_of_stock';
  if (qty <= min) return 'low_stock';
  if (qty > max) return 'overstock';
  return 'in_stock';
}

// GET /api/products
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { search, category, status, stock } = req.query as Record<string, string>;
  try {
    const rows = await db
      .select({
        id: products.id, sku: products.sku, name: products.name,
        category: products.category, unit: products.unit,
        costPrice: products.costPrice, sellPrice: products.sellPrice,
        isActive: products.isActive, createdAt: products.createdAt,
        quantity: inventory.quantity, reservedQty: inventory.reservedQty,
        minStock: inventory.minStock, maxStock: inventory.maxStock,
        warehouseZone: inventory.warehouseZone, binLocation: inventory.binLocation,
        updatedAt: inventory.updatedAt,
      })
      .from(products)
      .leftJoin(inventory, eq(inventory.productId, products.id))
      .where(and(
        search ? or(ilike(products.name, `%${search}%`), ilike(products.sku, `%${search}%`)) : undefined,
        category ? eq(products.category, category) : undefined,
        status === 'active' ? eq(products.isActive, true) :
        status === 'inactive' ? eq(products.isActive, false) : undefined,
      ))
      .orderBy(products.sku);

    const enriched = rows.map(r => {
      const qty = r.quantity ?? 0;
      const min = r.minStock ?? 5;
      const max = r.maxStock ?? 100;
      const ss = stockStatus(qty, min, max);
      return { ...r, available: qty - (r.reservedQty ?? 0), stockStatus: ss };
    }).filter(r => !stock || r.stockStatus === stock);

    const summary = {
      total: enriched.length,
      inStock: enriched.filter(r => r.stockStatus === 'in_stock').length,
      lowStock: enriched.filter(r => r.stockStatus === 'low_stock').length,
      outOfStock: enriched.filter(r => r.stockStatus === 'out_of_stock').length,
      overstock: enriched.filter(r => r.stockStatus === 'overstock').length,
      totalValue: enriched.reduce((s, r) => s + (r.quantity ?? 0) * parseFloat(String(r.costPrice ?? 0)), 0),
    };

    res.json({ success: true, data: enriched, summary });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// POST /api/products
router.post('/', managerOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { sku, name, category, unit, costPrice, sellPrice, description, minStock, maxStock, warehouseZone, binLocation, initialQty } = req.body;
  if (!sku || !name || !category) {
    res.status(422).json({ success: false, message: 'sku, name, category required' }); return;
  }
  try {
    const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.sku, sku.toUpperCase()));
    if (existing) { res.status(422).json({ success: false, message: 'SKU already exists' }); return; }

    const [prod] = await db.insert(products).values({
      sku: sku.toUpperCase(), name, category, unit: unit || 'piece',
      costPrice: costPrice || '0', sellPrice: sellPrice || '0', description,
    }).returning();

    const qty = parseInt(initialQty) || 0;
    await db.insert(inventory).values({
      productId: prod.id, quantity: qty,
      minStock: parseInt(minStock) || 5,
      maxStock: parseInt(maxStock) || 100,
      warehouseZone: warehouseZone || 'A',
      binLocation: binLocation || null,
    });

    if (qty > 0) {
      await db.insert(stockMovements).values({
        productId: prod.id, movementType: 'IN',
        quantity: qty, quantityBefore: 0, quantityAfter: qty,
        referenceNo: 'INITIAL', notes: 'Initial stock', performedBy: req.user!.id,
      });
    }

    res.status(201).json({ success: true, product: prod });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// GET /api/products/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id));
  try {
    const [prod] = await db
      .select({
        id: products.id, sku: products.sku, name: products.name,
        category: products.category, unit: products.unit, description: products.description,
        costPrice: products.costPrice, sellPrice: products.sellPrice,
        isActive: products.isActive, createdAt: products.createdAt,
        quantity: inventory.quantity, reservedQty: inventory.reservedQty,
        minStock: inventory.minStock, maxStock: inventory.maxStock,
        warehouseZone: inventory.warehouseZone, binLocation: inventory.binLocation,
      })
      .from(products)
      .leftJoin(inventory, eq(inventory.productId, products.id))
      .where(eq(products.id, id));

    if (!prod) { res.status(404).json({ success: false, message: 'Product not found' }); return; }

    const movements = await db
      .select({
        id: stockMovements.id, movementType: stockMovements.movementType,
        quantity: stockMovements.quantity, quantityBefore: stockMovements.quantityBefore,
        quantityAfter: stockMovements.quantityAfter, referenceNo: stockMovements.referenceNo,
        notes: stockMovements.notes, createdAt: stockMovements.createdAt,
        performedByName: users.name,
      })
      .from(stockMovements)
      .leftJoin(users, eq(users.id, stockMovements.performedBy))
      .where(eq(stockMovements.productId, id))
      .orderBy(desc(stockMovements.createdAt))
      .limit(20);

    res.json({ success: true, product: { ...prod, movements } });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// PUT /api/products/:id
router.put('/:id', managerOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id));
  const { name, category, unit, costPrice, sellPrice, description, isActive, minStock, maxStock, warehouseZone, binLocation } = req.body;
  try {
    const productUpdates: Partial<typeof products.$inferInsert> = {};
    if (name !== undefined) productUpdates.name = name;
    if (category !== undefined) productUpdates.category = category;
    if (unit !== undefined) productUpdates.unit = unit;
    if (costPrice !== undefined) productUpdates.costPrice = costPrice;
    if (sellPrice !== undefined) productUpdates.sellPrice = sellPrice;
    if (description !== undefined) productUpdates.description = description;
    if (isActive !== undefined) productUpdates.isActive = isActive;

    if (Object.keys(productUpdates).length > 0) {
      await db.update(products).set(productUpdates).where(eq(products.id, id));
    }

    const invUpdates: Partial<typeof inventory.$inferInsert> = {};
    if (minStock !== undefined) invUpdates.minStock = parseInt(minStock);
    if (maxStock !== undefined) invUpdates.maxStock = parseInt(maxStock);
    if (warehouseZone !== undefined) invUpdates.warehouseZone = warehouseZone;
    if (binLocation !== undefined) invUpdates.binLocation = binLocation;

    if (Object.keys(invUpdates).length > 0) {
      await db.update(inventory).set(invUpdates).where(eq(inventory.productId, id));
    }

    res.json({ success: true, message: 'Product updated' });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// DELETE /api/products/:id — soft delete
router.delete('/:id', managerOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id));
  try {
    await db.update(products).set({ isActive: false }).where(eq(products.id, id));
    res.json({ success: true, message: 'Product deactivated' });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

export default router;
