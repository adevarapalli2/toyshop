import { Router, Response } from 'express';
import { eq, desc, ilike, and, gte, lte, or, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { shipments } from '../db/schema/shipments';
import { shipmentEvents } from '../db/schema/shipmentEvents';
import { orders } from '../db/schema/orders';
import { orderItems } from '../db/schema/orderItems';
import { orderTimeline } from '../db/schema/orderTimeline';
import { customers } from '../db/schema/customers';
import { products } from '../db/schema/products';
import { users } from '../db/schema/users';
import { authenticate, AuthRequest } from '../middleware/auth';
import { managerOrAdmin } from '../middleware/managerOrAdmin';

const router = Router();
router.use(authenticate);

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_pickup:    ['picked_up'],
  picked_up:         ['in_transit'],
  in_transit:        ['out_for_delivery'],
  out_for_delivery:  ['delivered', 'failed_delivery'],
  failed_delivery:   ['out_for_delivery', 'returned'],
  delivered:         [],
  returned:          [],
};

const EVENT_FOR_STATUS: Record<string, { eventType: string; description: string }> = {
  picked_up:        { eventType: 'picked_up',        description: 'Package picked up by carrier' },
  in_transit:       { eventType: 'location_scan',    description: 'Package in transit — scanned at facility' },
  out_for_delivery: { eventType: 'out_for_delivery', description: 'Package out for delivery with courier' },
  delivered:        { eventType: 'delivered',        description: 'Package delivered successfully' },
  failed_delivery:  { eventType: 'failed_attempt',   description: 'Delivery attempted — recipient not available' },
  returned:         { eventType: 'returned',         description: 'Package returned to sender' },
};

// GET /api/shipments/analytics
router.get('/analytics', async (req: AuthRequest, res: Response): Promise<void> => {
  const { from, to, warehouse = 'Ganga' } = req.query as Record<string, string>;
  const dateFrom = from ? new Date(from) : new Date(Date.now() - 90 * 86400000);
  const dateTo   = to   ? new Date(to)   : new Date();
  dateTo.setHours(23, 59, 59, 999);
  const wh = warehouse;

  try {
    const allShipments = await db.select({
      status: shipments.status, carrier: shipments.carrier,
      shippingCost: shipments.shippingCost, estimatedDelivery: shipments.estimatedDelivery,
      actualDelivery: shipments.actualDelivery, shippedAt: shipments.shippedAt, createdAt: shipments.createdAt,
    }).from(shipments).where(and(eq(shipments.warehouse, wh), gte(shipments.createdAt, dateFrom), lte(shipments.createdAt, dateTo)));

    const today = new Date(); today.setHours(0,0,0,0);
    const total = allShipments.length;
    const inTransit = allShipments.filter(s => ['picked_up','in_transit','out_for_delivery'].includes(s.status)).length;
    const deliveredToday = allShipments.filter(s => s.status === 'delivered' && s.actualDelivery && new Date(s.actualDelivery) >= today).length;
    const failed = allShipments.filter(s => s.status === 'failed_delivery').length;
    const pending = allShipments.filter(s => s.status === 'pending_pickup').length;
    const returned = allShipments.filter(s => s.status === 'returned').length;
    const delivered = allShipments.filter(s => s.status === 'delivered').length;

    // On-time rate: delivered before or on estimated delivery
    const deliveredShipments = allShipments.filter(s => s.status === 'delivered' && s.actualDelivery && s.estimatedDelivery);
    const onTime = deliveredShipments.filter(s => new Date(s.actualDelivery!) <= new Date(s.estimatedDelivery!)).length;
    const onTimeRate = deliveredShipments.length > 0 ? parseFloat(((onTime / deliveredShipments.length) * 100).toFixed(1)) : 0;

    // Avg delivery days
    const deliveryDays = deliveredShipments
      .filter(s => s.shippedAt && s.actualDelivery)
      .map(s => (new Date(s.actualDelivery!).getTime() - new Date(s.shippedAt!).getTime()) / 86400000);
    const avgDeliveryDays = deliveryDays.length > 0
      ? parseFloat((deliveryDays.reduce((a, b) => a + b, 0) / deliveryDays.length).toFixed(1))
      : 0;

    const totalShippingCost = allShipments.reduce((s, sh) => s + parseFloat(String(sh.shippingCost ?? 0)), 0);

    const kpi = { total, inTransit, deliveredToday, delayed: failed, pending, failed, returned, delivered, onTimeRate, avgDeliveryDays, totalShippingCost: parseFloat(totalShippingCost.toFixed(2)) };

    // Carrier breakdown
    const carrierMap: Record<string, { count: number; delivered: number; onTime: number; totalDays: number; daysCount: number }> = {};
    for (const s of allShipments) {
      if (!carrierMap[s.carrier]) carrierMap[s.carrier] = { count: 0, delivered: 0, onTime: 0, totalDays: 0, daysCount: 0 };
      const c = carrierMap[s.carrier];
      c.count++;
      if (s.status === 'delivered') {
        c.delivered++;
        if (s.estimatedDelivery && s.actualDelivery && new Date(s.actualDelivery) <= new Date(s.estimatedDelivery)) c.onTime++;
        if (s.shippedAt && s.actualDelivery) { c.totalDays += (new Date(s.actualDelivery).getTime() - new Date(s.shippedAt).getTime()) / 86400000; c.daysCount++; }
      }
    }
    const carrierBreakdown = Object.entries(carrierMap).map(([carrier, v]) => ({
      carrier, count: v.count, delivered: v.delivered,
      onTimeRate: v.delivered > 0 ? parseFloat(((v.onTime / v.delivered) * 100).toFixed(1)) : 0,
      avgDays: v.daysCount > 0 ? parseFloat((v.totalDays / v.daysCount).toFixed(1)) : 0,
    })).sort((a, b) => b.count - a.count);

    // Delivery trend by day
    const trendMap: Record<string, { shipped: number; delivered: number }> = {};
    for (const s of allShipments) {
      if (s.shippedAt) {
        const day = new Date(s.shippedAt).toISOString().slice(0, 10);
        if (!trendMap[day]) trendMap[day] = { shipped: 0, delivered: 0 };
        trendMap[day].shipped++;
        if (s.status === 'delivered') trendMap[day].delivered++;
      }
    }
    const deliveryTrend = Object.entries(trendMap).sort(([a],[b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    // Status distribution
    const statusMap: Record<string, number> = {};
    for (const s of allShipments) { statusMap[s.status] = (statusMap[s.status] ?? 0) + 1; }
    const statusDistribution = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

    res.json({ success: true, kpi, carrierBreakdown, deliveryTrend, statusDistribution });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// GET /api/shipments
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, carrier, search, from, to, warehouse = 'Ganga' } = req.query as Record<string, string>;
  const dateFrom = from ? new Date(from) : undefined;
  const dateTo   = to   ? (() => { const d = new Date(to); d.setHours(23,59,59,999); return d; })() : undefined;
  const wh = warehouse;

  try {
    const rows = await db.select({
      id: shipments.id, shipmentNumber: shipments.shipmentNumber, status: shipments.status,
      carrier: shipments.carrier, serviceType: shipments.serviceType, trackingNumber: shipments.trackingNumber,
      estimatedDelivery: shipments.estimatedDelivery, actualDelivery: shipments.actualDelivery,
      shippingCost: shipments.shippingCost, shippedAt: shipments.shippedAt, createdAt: shipments.createdAt,
      orderId: orders.id, orderNumber: orders.orderNumber,
      customerName: customers.name, customerCity: customers.city,
    })
    .from(shipments)
    .innerJoin(orders, eq(orders.id, shipments.orderId))
    .leftJoin(customers, eq(customers.id, shipments.customerId))
    .where(and(
      eq(shipments.warehouse, wh),
      status ? eq(shipments.status, status) : undefined,
      carrier ? eq(shipments.carrier, carrier) : undefined,
      dateFrom ? gte(shipments.createdAt, dateFrom) : undefined,
      dateTo   ? lte(shipments.createdAt, dateTo)   : undefined,
      search   ? or(ilike(shipments.trackingNumber, `%${search}%`), ilike(customers.name, `%${search}%`), ilike(shipments.shipmentNumber, `%${search}%`)) : undefined,
    ))
    .orderBy(desc(shipments.createdAt));

    res.json({ success: true, data: rows });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// POST /api/shipments
router.post('/', managerOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { orderId, carrier, serviceType, trackingNumber, weightKg, lengthCm, widthCm, heightCm,
    shippingCost, insuranceValue, signatureRequired, estimatedDelivery, destinationAddress, notes } = req.body;

  if (!orderId || !carrier) { res.status(422).json({ success: false, message: 'orderId and carrier required' }); return; }

  try {
    const [order] = await db.select({ id: orders.id, status: orders.status, customerId: orders.customerId, shippingAddress: orders.shippingAddress, warehouse: orders.warehouse }).from(orders).where(eq(orders.id, orderId));
    if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return; }
    if (!['packed','shipped'].includes(order.status)) {
      res.status(422).json({ success: false, message: 'Order must be in packed status to create shipment' }); return;
    }

    const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)` }).from(shipments);
    const shipmentNumber = `SHIP-${new Date().getFullYear()}-${String(Number(cnt) + 1).padStart(3,'0')}`;

    const [ship] = await db.insert(shipments).values({
      shipmentNumber, orderId, customerId: order.customerId ?? null,
      warehouse: order.warehouse || 'Ganga',
      carrier, serviceType: serviceType || 'standard', trackingNumber: trackingNumber || null,
      status: 'pending_pickup',
      originAddress: 'ToyShop Warehouse, Andheri East, Mumbai - 400069',
      destinationAddress: destinationAddress || order.shippingAddress || null,
      weightKg: weightKg || null, lengthCm: lengthCm || null, widthCm: widthCm || null, heightCm: heightCm || null,
      shippingCost: shippingCost || '0', insuranceValue: insuranceValue || '0',
      signatureRequired: signatureRequired || false,
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
      shippedAt: new Date(), notes: notes || null,
      createdBy: req.user!.id,
    }).returning({ id: shipments.id, shipmentNumber: shipments.shipmentNumber });

    await db.insert(shipmentEvents).values({
      shipmentId: ship.id, eventType: 'shipment_created',
      location: 'ToyShop Warehouse, Mumbai', description: 'Shipment created and ready for pickup',
      eventTime: new Date(),
    });

    // Update order
    await db.update(orders).set({
      status: 'shipped', trackingNumber: trackingNumber || null, shippedAt: new Date(), updatedAt: new Date(),
    }).where(eq(orders.id, orderId));

    await db.insert(orderTimeline).values({
      orderId, fromStatus: order.status, toStatus: 'shipped',
      notes: `Shipment ${ship.shipmentNumber} created via ${carrier}`, changedBy: req.user!.id,
    });

    res.status(201).json({ success: true, shipment: ship });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// GET /api/shipments/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id));
  try {
    const [shipment] = await db.select({
      id: shipments.id, shipmentNumber: shipments.shipmentNumber, status: shipments.status,
      carrier: shipments.carrier, serviceType: shipments.serviceType, trackingNumber: shipments.trackingNumber,
      originAddress: shipments.originAddress, destinationAddress: shipments.destinationAddress,
      weightKg: shipments.weightKg, lengthCm: shipments.lengthCm, widthCm: shipments.widthCm, heightCm: shipments.heightCm,
      shippingCost: shipments.shippingCost, insuranceValue: shipments.insuranceValue,
      signatureRequired: shipments.signatureRequired, estimatedDelivery: shipments.estimatedDelivery,
      actualDelivery: shipments.actualDelivery, shippedAt: shipments.shippedAt, notes: shipments.notes,
      createdAt: shipments.createdAt, updatedAt: shipments.updatedAt,
      orderId: orders.id, orderNumber: orders.orderNumber, orderStatus: orders.status, orderTotal: orders.totalAmount,
      customerName: customers.name, customerEmail: customers.email, customerPhone: customers.phone,
      customerCity: customers.city, customerAddress: customers.address,
    })
    .from(shipments)
    .innerJoin(orders, eq(orders.id, shipments.orderId))
    .leftJoin(customers, eq(customers.id, shipments.customerId))
    .where(eq(shipments.id, id));

    if (!shipment) { res.status(404).json({ success: false, message: 'Shipment not found' }); return; }

    const events = await db.select().from(shipmentEvents)
      .where(eq(shipmentEvents.shipmentId, id)).orderBy(desc(shipmentEvents.eventTime));

    const items = await db.select({
      id: orderItems.id, quantity: orderItems.quantity, pickedQty: orderItems.pickedQty,
      productName: products.name, productSku: products.sku, category: products.category,
    }).from(orderItems)
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(eq(orderItems.orderId, shipment.orderId));

    res.json({ success: true, shipment, events, items });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// PUT /api/shipments/:id/status
router.put('/:id/status', managerOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id));
  const { status, location, notes } = req.body;
  if (!status) { res.status(422).json({ success: false, message: 'Status required' }); return; }

  try {
    const [ship] = await db.select({ status: shipments.status, orderId: shipments.orderId }).from(shipments).where(eq(shipments.id, id));
    if (!ship) { res.status(404).json({ success: false, message: 'Shipment not found' }); return; }

    const allowed = VALID_TRANSITIONS[ship.status] ?? [];
    if (!allowed.includes(status)) {
      res.status(422).json({ success: false, message: `Cannot transition from ${ship.status} to ${status}` }); return;
    }

    const updates: Partial<typeof shipments.$inferInsert> = { status, updatedAt: new Date() };
    if (status === 'delivered') updates.actualDelivery = new Date();

    await db.update(shipments).set(updates).where(eq(shipments.id, id));

    const evtMeta = EVENT_FOR_STATUS[status];
    await db.insert(shipmentEvents).values({
      shipmentId: id, eventType: evtMeta.eventType,
      location: location || 'In Transit',
      description: notes || evtMeta.description,
      eventTime: new Date(),
    });

    // Sync order status
    if (status === 'delivered') {
      await db.update(orders).set({ status: 'delivered', actualDelivery: new Date(), updatedAt: new Date() }).where(eq(orders.id, ship.orderId));
      await db.insert(orderTimeline).values({ orderId: ship.orderId, fromStatus: 'shipped', toStatus: 'delivered', notes: 'Delivered via shipment', changedBy: req.user!.id });
    } else if (status === 'returned') {
      await db.update(orders).set({ status: 'returned', updatedAt: new Date() }).where(eq(orders.id, ship.orderId));
      await db.insert(orderTimeline).values({ orderId: ship.orderId, fromStatus: 'shipped', toStatus: 'returned', notes: 'Returned via shipment', changedBy: req.user!.id });
    }

    res.json({ success: true, message: `Shipment ${status}` });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// POST /api/shipments/:id/events
router.post('/:id/events', managerOrAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id));
  const { eventType, location, description } = req.body;
  if (!eventType || !description) { res.status(422).json({ success: false, message: 'eventType and description required' }); return; }
  try {
    await db.insert(shipmentEvents).values({ shipmentId: id, eventType, location: location || '', description, eventTime: new Date() });
    res.status(201).json({ success: true, message: 'Event added' });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

export default router;
