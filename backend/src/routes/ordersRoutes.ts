import { Router, Response } from 'express';
import { eq, desc, ilike, and, gte, lte, or, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { orders } from '../db/schema/orders';
import { orderItems } from '../db/schema/orderItems';
import { orderTimeline } from '../db/schema/orderTimeline';
import { customers } from '../db/schema/customers';
import { products } from '../db/schema/products';
import { inventory } from '../db/schema/inventory';
import { stockMovements } from '../db/schema/stockMovements';
import { users } from '../db/schema/users';
import { authenticate, AuthRequest } from '../middleware/auth';
import { managerOrAdmin } from '../middleware/managerOrAdmin';

const router = Router();
router.use(authenticate);

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['picking',   'cancelled'],
  picking:   ['packed',    'cancelled'],
  packed:    ['shipped',   'cancelled'],
  shipped:   ['delivered'],
  delivered: ['returned'],
  cancelled: [],
  returned:  [],
};

// GET /api/orders/analytics
router.get('/analytics', async (req: AuthRequest, res: Response): Promise<void> => {
  const { from, to } = req.query as Record<string, string>;
  const dateFrom = from ? new Date(from) : new Date(Date.now() - 90 * 86400000);
  const dateTo   = to   ? new Date(to)   : new Date();
  dateTo.setHours(23, 59, 59, 999);

  // Previous period for comparison
  const diffMs = dateTo.getTime() - dateFrom.getTime();
  const prevFrom = new Date(dateFrom.getTime() - diffMs);
  const prevTo   = new Date(dateFrom.getTime() - 1);

  try {
    const periodFilter = and(gte(orders.createdAt, dateFrom), lte(orders.createdAt, dateTo));
    const prevFilter   = and(gte(orders.createdAt, prevFrom), lte(orders.createdAt, prevTo));

    // KPIs
    const allOrders = await db.select({
      status: orders.status, totalAmount: orders.totalAmount, createdAt: orders.createdAt,
    }).from(orders).where(periodFilter);

    const prevOrders = await db.select({ totalAmount: orders.totalAmount }).from(orders).where(prevFilter);

    const revenue     = allOrders.filter(o => !['cancelled','returned'].includes(o.status)).reduce((s, o) => s + parseFloat(String(o.totalAmount)), 0);
    const prevRevenue = prevOrders.reduce((s, o) => s + parseFloat(String(o.totalAmount)), 0);
    const delivered   = allOrders.filter(o => o.status === 'delivered').length;
    const cancelled   = allOrders.filter(o => o.status === 'cancelled').length;
    const inProgress  = allOrders.filter(o => ['confirmed','picking','packed'].includes(o.status)).length;
    const shipped     = allOrders.filter(o => o.status === 'shipped').length;
    const pending     = allOrders.filter(o => o.status === 'pending').length;

    const kpi = {
      total: allOrders.length,
      pending, inProgress, shipped, delivered, cancelled,
      revenue: parseFloat(revenue.toFixed(2)),
      prevRevenue: parseFloat(prevRevenue.toFixed(2)),
      avgOrderValue: allOrders.length > 0 ? parseFloat((revenue / allOrders.length).toFixed(2)) : 0,
      fulfillmentRate: allOrders.length > 0 ? parseFloat(((delivered / allOrders.length) * 100).toFixed(1)) : 0,
      cancellationRate: allOrders.length > 0 ? parseFloat(((cancelled / allOrders.length) * 100).toFixed(1)) : 0,
    };

    // Revenue trend by day
    const trendMap: Record<string, { revenue: number; orders: number }> = {};
    for (const o of allOrders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      if (!trendMap[day]) trendMap[day] = { revenue: 0, orders: 0 };
      if (!['cancelled','returned'].includes(o.status)) trendMap[day].revenue += parseFloat(String(o.totalAmount));
      trendMap[day].orders++;
    }
    const revenueTrend = Object.entries(trendMap).sort(([a],[b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, revenue: parseFloat(v.revenue.toFixed(2)), orders: v.orders }));

    // Status distribution
    const statusMap: Record<string, { count: number; value: number }> = {};
    for (const o of allOrders) {
      if (!statusMap[o.status]) statusMap[o.status] = { count: 0, value: 0 };
      statusMap[o.status].count++;
      statusMap[o.status].value += parseFloat(String(o.totalAmount));
    }
    const statusDistribution = Object.entries(statusMap).map(([status, v]) => ({
      status, count: v.count, value: parseFloat(v.value.toFixed(2)),
    }));

    // Top products by revenue
    const topProducts = await db
      .select({
        name: products.name, sku: products.sku,
        totalOrdered: sql<number>`sum(${orderItems.quantity})`,
        revenue: sql<number>`sum(${orderItems.totalPrice})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(and(periodFilter, sql`${orders.status} NOT IN ('cancelled','returned')`))
      .groupBy(products.id, products.name, products.sku)
      .orderBy(desc(sql`sum(${orderItems.totalPrice})`))
      .limit(8);

    // Orders by day of week
    const dowMap: Record<number, number> = {0:0,1:0,2:0,3:0,4:0,5:0,6:0};
    for (const o of allOrders) dowMap[o.createdAt.getDay()]++;
    const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const ordersByDayOfWeek = DAYS.map((day, i) => ({ day, count: dowMap[i] }));

    // Category revenue
    const catRevenue = await db
      .select({
        category: products.category,
        revenue: sql<number>`sum(${orderItems.totalPrice})`,
        orderCount: sql<number>`count(distinct ${orders.id})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(and(periodFilter, sql`${orders.status} NOT IN ('cancelled','returned')`))
      .groupBy(products.category)
      .orderBy(desc(sql`sum(${orderItems.totalPrice})`));

    // Status funnel
    const funnelStatuses = ['pending','confirmed','picking','packed','shipped','delivered'];
    const statusFunnel = funnelStatuses.map(s => ({
      status: s, count: allOrders.filter(o => o.status === s || funnelStatuses.indexOf(o.status) > funnelStatuses.indexOf(s)).length,
    }));

    res.json({ success: true, kpi, revenueTrend, statusDistribution, topProducts, ordersByDayOfWeek, categoryRevenue: catRevenue, statusFunnel });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// GET /api/orders
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, priority, search, from, to, page = '1', limit: lim = '20' } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(lim);
  const dateFrom = from ? new Date(from) : undefined;
  const dateTo   = to   ? (() => { const d = new Date(to); d.setHours(23,59,59,999); return d; })() : undefined;

  try {
    // handle in_progress as multiple statuses
    const statusFilter = status === 'in_progress'
      ? sql`${orders.status} IN ('confirmed','picking','packed')`
      : status ? eq(orders.status, status) : undefined;

    const rows = await db
      .select({
        id: orders.id, orderNumber: orders.orderNumber, status: orders.status,
        priority: orders.priority, totalAmount: orders.totalAmount,
        createdAt: orders.createdAt, updatedAt: orders.updatedAt,
        customerName: customers.name, customerCity: customers.city,
        assignedToName: users.name,
      })
      .from(orders)
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .leftJoin(users, eq(users.id, orders.assignedTo))
      .where(and(
        statusFilter,
        priority ? eq(orders.priority, priority) : undefined,
        dateFrom ? gte(orders.createdAt, dateFrom) : undefined,
        dateTo   ? lte(orders.createdAt, dateTo)   : undefined,
        search   ? or(ilike(orders.orderNumber, `%${search}%`), ilike(customers.name, `%${search}%`)) : undefined,
      ))
      .orderBy(desc(orders.createdAt))
      .limit(parseInt(lim))
      .offset(offset);

    // item counts per order
    const ids = rows.map(r => r.id);
    const counts = ids.length > 0
      ? await db.select({ orderId: orderItems.orderId, count: sql<number>`count(*)` })
          .from(orderItems).where(sql`${orderItems.orderId} = ANY(${ids})`).groupBy(orderItems.orderId)
      : [];
    const countMap = new Map(counts.map(c => [c.orderId, Number(c.count)]));

    const data = rows.map(r => ({ ...r, itemCount: countMap.get(r.id) ?? 0 }));
    res.json({ success: true, data, page: parseInt(page), limit: parseInt(lim) });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// POST /api/orders
router.post('/', managerOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { customerId, priority, notes, shippingAddress, estimatedDelivery, items } = req.body;
  if (!items?.length) { res.status(422).json({ success: false, message: 'Order must have at least one item' }); return; }

  try {
    // Validate stock
    for (const item of items) {
      const [inv] = await db.select().from(inventory).where(eq(inventory.productId, item.productId));
      if (!inv || inv.quantity - inv.reservedQty < item.quantity) {
        const [prod] = await db.select({ name: products.name }).from(products).where(eq(products.id, item.productId));
        res.status(422).json({ success: false, message: `Insufficient stock for ${prod?.name ?? 'product'}` });
        return;
      }
    }

    // Count existing orders for number generation
    const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)` }).from(orders);
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(Number(cnt) + 1).padStart(3,'0')}`;

    // Calculate totals
    let subtotal = 0;
    const enrichedItems: { productId: number; quantity: number; unitPrice: number; totalPrice: number }[] = [];
    for (const item of items) {
      const [prod] = await db.select({ sellPrice: products.sellPrice }).from(products).where(eq(products.id, item.productId));
      const price = parseFloat(String(prod.sellPrice));
      subtotal += item.quantity * price;
      enrichedItems.push({ productId: item.productId, quantity: item.quantity, unitPrice: price, totalPrice: item.quantity * price });
    }
    const tax = parseFloat((subtotal * 0.18).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    // Atomic: order + items + reserved qty + timeline
    const [order] = await db.insert(orders).values({
      orderNumber, customerId: customerId || null,
      status: 'pending', priority: priority || 'normal',
      subtotal: subtotal.toFixed(2), taxAmount: tax.toFixed(2), totalAmount: total.toFixed(2),
      shippingAddress, notes,
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
      createdBy: req.user!.id,
    }).returning({ id: orders.id, orderNumber: orders.orderNumber });

    for (const item of enrichedItems) {
      await db.insert(orderItems).values({ orderId: order.id, ...item, unitPrice: item.unitPrice.toFixed(2), totalPrice: item.totalPrice.toFixed(2) });
      await db.update(inventory).set({ reservedQty: sql`reserved_qty + ${item.quantity}` }).where(eq(inventory.productId, item.productId));
    }

    await db.insert(orderTimeline).values({ orderId: order.id, fromStatus: null, toStatus: 'pending', notes: 'Order placed', changedBy: req.user!.id });

    res.status(201).json({ success: true, order });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// GET /api/orders/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id));
  try {
    const [order] = await db.select({
      id: orders.id, orderNumber: orders.orderNumber, status: orders.status, priority: orders.priority,
      subtotal: orders.subtotal, discountAmount: orders.discountAmount, taxAmount: orders.taxAmount,
      totalAmount: orders.totalAmount, shippingAddress: orders.shippingAddress, notes: orders.notes,
      estimatedDelivery: orders.estimatedDelivery, actualDelivery: orders.actualDelivery,
      createdAt: orders.createdAt, updatedAt: orders.updatedAt,
      customerName: customers.name, customerEmail: customers.email,
      customerPhone: customers.phone, customerCity: customers.city,
      customerAddress: customers.address, customerId: customers.id,
      assignedToName: users.name,
    }).from(orders)
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .leftJoin(users, eq(users.id, orders.assignedTo))
      .where(eq(orders.id, id));

    if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return; }

    const items = await db.select({
      id: orderItems.id, quantity: orderItems.quantity, pickedQty: orderItems.pickedQty,
      unitPrice: orderItems.unitPrice, totalPrice: orderItems.totalPrice, status: orderItems.status,
      productId: products.id, productName: products.name, productSku: products.sku,
      category: products.category, binLocation: inventory.binLocation, warehouseZone: inventory.warehouseZone,
      currentStock: inventory.quantity, minStock: inventory.minStock, maxStock: inventory.maxStock,
    }).from(orderItems)
      .innerJoin(products, eq(products.id, orderItems.productId))
      .leftJoin(inventory, eq(inventory.productId, products.id))
      .where(eq(orderItems.orderId, id));

    const timeline = await db.select({
      id: orderTimeline.id, fromStatus: orderTimeline.fromStatus, toStatus: orderTimeline.toStatus,
      notes: orderTimeline.notes, createdAt: orderTimeline.createdAt, changedByName: users.name,
    }).from(orderTimeline)
      .leftJoin(users, eq(users.id, orderTimeline.changedBy))
      .where(eq(orderTimeline.orderId, id))
      .orderBy(orderTimeline.createdAt);

    res.json({ success: true, order, items, timeline });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// PUT /api/orders/:id/status
router.put('/:id/status', managerOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id));
  const { status, notes, trackingNumber } = req.body;
  if (!status) { res.status(422).json({ success: false, message: 'Status required' }); return; }

  try {
    const [order] = await db.select({ status: orders.status }).from(orders).where(eq(orders.id, id));
    if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return; }

    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      res.status(422).json({ success: false, message: `Cannot transition from ${order.status} to ${status}` }); return;
    }

    const updates: Partial<typeof orders.$inferInsert> = { status, updatedAt: new Date() };
    if (status === 'delivered') updates.actualDelivery = new Date();
    if (notes) updates.notes = notes;

    await db.update(orders).set(updates).where(eq(orders.id, id));

    // Side effects
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    const [ord] = await db.select({ orderNumber: orders.orderNumber }).from(orders).where(eq(orders.id, id));

    if (status === 'confirmed') {
      // Deduct actual stock, clear reservedQty
      for (const item of items) {
        const [inv] = await db.select().from(inventory).where(eq(inventory.productId, item.productId));
        if (inv) {
          const newQty = Math.max(0, inv.quantity - item.quantity);
          await db.update(inventory).set({ quantity: newQty, reservedQty: Math.max(0, inv.reservedQty - item.quantity), updatedAt: new Date() }).where(eq(inventory.productId, item.productId));
          await db.insert(stockMovements).values({ productId: item.productId, movementType: 'OUT', quantity: item.quantity, quantityBefore: inv.quantity, quantityAfter: newQty, referenceNo: ord.orderNumber, notes: 'Order confirmed', performedBy: req.user!.id });
        }
      }
    } else if (status === 'cancelled') {
      // Restore reserved qty
      for (const item of items) {
        await db.update(inventory).set({ reservedQty: sql`greatest(0, reserved_qty - ${item.quantity})`, updatedAt: new Date() }).where(eq(inventory.productId, item.productId));
      }
      await db.update(orderItems).set({ status: 'cancelled' }).where(eq(orderItems.orderId, id));
    }

    // Timeline entry
    await db.insert(orderTimeline).values({ orderId: id, fromStatus: order.status, toStatus: status, notes: notes || `Status updated to ${status}`, changedBy: req.user!.id });

    res.json({ success: true, message: `Order ${status}` });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// PUT /api/orders/:id
router.put('/:id', managerOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id));
  const { notes, priority, assignedTo } = req.body;
  try {
    const updates: Partial<typeof orders.$inferInsert> = { updatedAt: new Date() };
    if (notes !== undefined) updates.notes = notes;
    if (priority) updates.priority = priority;
    if (assignedTo) updates.assignedTo = parseInt(assignedTo);
    await db.update(orders).set(updates).where(eq(orders.id, id));
    res.json({ success: true, message: 'Order updated' });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// DELETE /api/orders/:id — cancel
router.delete('/:id', managerOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id));
  try {
    const [order] = await db.select({ status: orders.status }).from(orders).where(eq(orders.id, id));
    if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return; }
    if (['shipped','delivered','cancelled','returned'].includes(order.status)) {
      res.status(422).json({ success: false, message: 'Cannot cancel order at this stage' }); return;
    }
    await db.update(orders).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(orders.id, id));
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    for (const item of items) {
      await db.update(inventory).set({ reservedQty: sql`greatest(0, reserved_qty - ${item.quantity})`, updatedAt: new Date() }).where(eq(inventory.productId, item.productId));
    }
    await db.update(orderItems).set({ status: 'cancelled' }).where(eq(orderItems.orderId, id));
    await db.insert(orderTimeline).values({ orderId: id, fromStatus: order.status, toStatus: 'cancelled', notes: 'Order cancelled', changedBy: req.user!.id });
    res.json({ success: true, message: 'Order cancelled' });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

export default router;
