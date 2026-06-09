import { Router, Response } from 'express';
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { db } from '../db/index';
import { orders } from '../db/schema/orders';
import { orderItems } from '../db/schema/orderItems';
import { orderTimeline } from '../db/schema/orderTimeline';
import { products } from '../db/schema/products';
import { inventory } from '../db/schema/inventory';
import { stockMovements } from '../db/schema/stockMovements';
import { shipments } from '../db/schema/shipments';
import { customers } from '../db/schema/customers';
import { users } from '../db/schema/users';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ─── helpers ─────────────────────────────────────────────────────────────────
function parseDates(req: AuthRequest) {
  const { from, to, warehouse } = req.query as Record<string, string>;
  const dateFrom = from ? new Date(from) : new Date(Date.now() - 90 * 86400000);
  const dateTo   = to   ? new Date(to)   : new Date();
  dateTo.setHours(23, 59, 59, 999);
  const wh = warehouse || 'Ganga';
  return { dateFrom, dateTo, wh };
}

function navyStyle(ws: ExcelJS.Worksheet, row: number, cols: number, text: string) {
  const cell = ws.getCell(row, 1);
  cell.value = text;
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.mergeCells(row, 1, row, cols);
  ws.getRow(row).height = 22;
}

function headerRow(ws: ExcelJS.Worksheet, row: number, headers: string[]) {
  const r = ws.getRow(row);
  headers.forEach((h, i) => {
    const cell = r.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FF1E293B' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF93C5FD' } } };
    cell.alignment = { horizontal: 'center' };
  });
  r.height = 18;
}

function dataRow(ws: ExcelJS.Worksheet, row: number, values: (string|number|null)[], alt: boolean) {
  const r = ws.getRow(row);
  values.forEach((v, i) => {
    const cell = r.getCell(i + 1);
    cell.value = v;
    if (alt) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    if (typeof v === 'number' && String(v).includes('.')) cell.numFmt = '#,##0.00';
  });
}

function autoWidth(ws: ExcelJS.Worksheet) {
  ws.columns.forEach(col => {
    let max = 10;
    col.eachCell?.({ includeEmpty: false }, cell => {
      const len = String(cell.value ?? '').length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 40);
  });
}

function pdfHeader(doc: PDFKit.PDFDocument, title: string, from: Date, to: Date) {
  doc.rect(0, 0, doc.page.width, 60).fill('#1e3a5f');
  doc.fillColor('white').fontSize(18).font('Helvetica-Bold').text('🏭 ToyShop WMS', 40, 15);
  doc.fontSize(13).font('Helvetica').text(title, 40, 38);
  const period = `${from.toLocaleDateString('en-IN')} – ${to.toLocaleDateString('en-IN')}`;
  doc.fontSize(10).text(`Period: ${period}  |  Generated: ${new Date().toLocaleString('en-IN')}`, { align: 'right' }).moveDown(0.5);
  doc.fillColor('#0f172a');
}

function pdfTable(doc: PDFKit.PDFDocument, headers: string[], rows: (string|number)[][], y: number) {
  const colW = (doc.page.width - 80) / headers.length;
  let curY = y;

  // header
  doc.rect(40, curY, doc.page.width - 80, 20).fill('#e0e7ff');
  doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold');
  headers.forEach((h, i) => doc.text(h, 40 + i * colW, curY + 5, { width: colW, align: 'center' }));
  curY += 22;

  // rows
  rows.forEach((row, ri) => {
    if (ri % 2 === 1) doc.rect(40, curY, doc.page.width - 80, 18).fill('#f8fafc');
    doc.fillColor('#374151').fontSize(8).font('Helvetica');
    row.forEach((cell, ci) => {
      const align = typeof cell === 'number' ? 'right' : 'left';
      doc.text(String(cell ?? '—'), 40 + ci * colW, curY + 4, { width: colW - 4, align });
    });
    curY += 20;
    if (curY > doc.page.height - 80) { doc.addPage(); curY = 60; }
  });
  return curY;
}

function pdfFooter(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
      .text(`Page ${i - range.start + 1} of ${range.count}  |  Confidential — ToyShop WMS`, 40, doc.page.height - 30, { align: 'center' });
  }
}

// ─── GET /api/reports/executive ───────────────────────────────────────────────
router.get('/executive', async (req: AuthRequest, res: Response): Promise<void> => {
  const { dateFrom, dateTo, wh } = parseDates(req);
  try {
    const orderFilter = and(gte(orders.createdAt, dateFrom), lte(orders.createdAt, dateTo), eq(orders.warehouse, wh));

    const allOrders = await db.select({ status: orders.status, totalAmount: orders.totalAmount }).from(orders).where(orderFilter);
    const revenue = allOrders.filter(o => !['cancelled','returned'].includes(o.status)).reduce((s, o) => s + parseFloat(String(o.totalAmount)), 0);
    const delivered = allOrders.filter(o => o.status === 'delivered').length;
    const fulfillmentRate = allOrders.length > 0 ? parseFloat(((delivered / allOrders.length) * 100).toFixed(1)) : 0;

    const invRows = await db.select({ quantity: inventory.quantity, costPrice: products.costPrice, isActive: products.isActive, minStock: inventory.minStock })
      .from(inventory).innerJoin(products, eq(products.id, inventory.productId))
      .where(and(eq(products.isActive, true), eq(inventory.warehouse, wh)));
    const totalSkus = invRows.length;
    const inventoryValue = invRows.reduce((s, r) => s + (r.quantity ?? 0) * parseFloat(String(r.costPrice)), 0);
    const lowStockCount = invRows.filter(r => (r.quantity ?? 0) <= (r.minStock ?? 5)).length;

    const allShipments = await db.select({ status: shipments.status, estimatedDelivery: shipments.estimatedDelivery, actualDelivery: shipments.actualDelivery })
      .from(shipments).where(and(gte(shipments.createdAt, dateFrom), lte(shipments.createdAt, dateTo), eq(shipments.warehouse, wh)));
    const deliveredShips = allShipments.filter(s => s.status === 'delivered' && s.estimatedDelivery && s.actualDelivery);
    const onTime = deliveredShips.filter(s => new Date(s.actualDelivery!) <= new Date(s.estimatedDelivery!)).length;
    const onTimeRate = deliveredShips.length > 0 ? parseFloat(((onTime / deliveredShips.length) * 100).toFixed(1)) : 0;

    const activeCustomers = await db.select({ cnt: sql<number>`count(*)` }).from(customers).where(eq(customers.isActive, true));

    // Top product
    const [topProduct] = await db.select({ name: products.name, total: sql<number>`sum(${orderItems.totalPrice})` })
      .from(orderItems).innerJoin(products, eq(products.id, orderItems.productId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId)).where(orderFilter)
      .groupBy(products.id, products.name).orderBy(desc(sql`sum(${orderItems.totalPrice})`)).limit(1);

    // Revenue trend (last 7 data points)
    const trendMap: Record<string, { revenue: number; orders: number }> = {};
    for (const o of allOrders) { /* simplified — just use allOrders */ }
    // Pull revenue by day for chart
    const revTrend = await db.select({
      day: sql<string>`date_trunc('day', ${orders.createdAt})::date::text`,
      revenue: sql<number>`sum(${orders.totalAmount})`,
      count: sql<number>`count(*)`
    }).from(orders).where(and(orderFilter, sql`${orders.status} NOT IN ('cancelled','returned')`))
      .groupBy(sql`date_trunc('day', ${orders.createdAt})::date`).orderBy(sql`date_trunc('day', ${orders.createdAt})::date`);

    res.json({
      success: true,
      kpi: {
        totalRevenue: parseFloat(revenue.toFixed(2)),
        totalOrders: allOrders.length,
        fulfillmentRate,
        onTimeDeliveryRate: onTimeRate,
        activeSkus: totalSkus,
        inventoryValue: parseFloat(inventoryValue.toFixed(2)),
        lowStockItems: lowStockCount,
        activeCustomers: Number(activeCustomers[0]?.cnt ?? 0),
        topProduct: topProduct?.name ?? '—',
        totalShipments: allShipments.length,
      },
      revenueTrend: revTrend.map(r => ({ date: r.day, revenue: parseFloat(String(r.revenue ?? 0)), orders: Number(r.count) })),
    });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// ─── GET /api/reports/sales ───────────────────────────────────────────────────
router.get('/sales', async (req: AuthRequest, res: Response): Promise<void> => {
  const { dateFrom, dateTo, wh } = parseDates(req);
  try {
    const orderFilter = and(gte(orders.createdAt, dateFrom), lte(orders.createdAt, dateTo), eq(orders.warehouse, wh));
    const activeFilter = and(orderFilter, sql`${orders.status} NOT IN ('cancelled','returned')`);

    // KPIs
    const allOrders = await db.select({ status: orders.status, totalAmount: orders.totalAmount, createdAt: orders.createdAt }).from(orders).where(orderFilter);
    const activeOrders = allOrders.filter(o => !['cancelled','returned'].includes(o.status));
    const revenue = activeOrders.reduce((s, o) => s + parseFloat(String(o.totalAmount)), 0);
    const avgOrderValue = activeOrders.length > 0 ? revenue / activeOrders.length : 0;

    // Revenue trend
    const trend = await db.select({
      date: sql<string>`date_trunc('day', ${orders.createdAt})::date::text`,
      revenue: sql<number>`coalesce(sum(${orders.totalAmount}),0)`,
      orderCount: sql<number>`count(*)`
    }).from(orders).where(activeFilter)
      .groupBy(sql`date_trunc('day', ${orders.createdAt})::date`)
      .orderBy(sql`date_trunc('day', ${orders.createdAt})::date`);

    // Top products
    const topProducts = await db.select({
      name: products.name, sku: products.sku, category: products.category,
      totalQty: sql<number>`sum(${orderItems.quantity})`,
      revenue: sql<number>`sum(${orderItems.totalPrice})`,
    }).from(orderItems).innerJoin(products, eq(products.id, orderItems.productId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId)).where(activeFilter)
      .groupBy(products.id, products.name, products.sku, products.category)
      .orderBy(desc(sql`sum(${orderItems.totalPrice})`)).limit(10);

    // Top customers
    const topCustomers = await db.select({
      name: customers.name, city: customers.city,
      orderCount: sql<number>`count(*)`,
      totalSpend: sql<number>`sum(${orders.totalAmount})`,
    }).from(orders).innerJoin(customers, eq(customers.id, orders.customerId)).where(activeFilter)
      .groupBy(customers.id, customers.name, customers.city)
      .orderBy(desc(sql`sum(${orders.totalAmount})`)).limit(10);

    // By category
    const byCategory = await db.select({
      category: products.category,
      revenue: sql<number>`sum(${orderItems.totalPrice})`,
      qty: sql<number>`sum(${orderItems.quantity})`,
    }).from(orderItems).innerJoin(products, eq(products.id, orderItems.productId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId)).where(activeFilter)
      .groupBy(products.category).orderBy(desc(sql`sum(${orderItems.totalPrice})`));

    // By day of week
    const byDow = await db.select({
      dow: sql<number>`extract(dow from ${orders.createdAt})`,
      count: sql<number>`count(*)`,
    }).from(orders).where(activeFilter).groupBy(sql`extract(dow from ${orders.createdAt})`);
    const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const ordersByDow = DAYS.map((day, i) => ({ day, count: Number(byDow.find(r => Number(r.dow) === i)?.count ?? 0) }));

    // Value distribution
    const ranges = [{ label:'< ₹500', min:0, max:500 },{ label:'₹500–2K', min:500, max:2000 },{ label:'₹2K–5K', min:2000, max:5000 },{ label:'> ₹5K', min:5000, max:999999 }];
    const valueDistribution = ranges.map(r => ({ label: r.label, count: activeOrders.filter(o => { const v = parseFloat(String(o.totalAmount)); return v >= r.min && v < r.max; }).length }));

    // Status distribution
    const statusMap: Record<string,number> = {};
    allOrders.forEach(o => { statusMap[o.status] = (statusMap[o.status] ?? 0) + 1; });
    const statusDistribution = Object.entries(statusMap).map(([status,count]) => ({ status, count }));

    res.json({ success: true,
      kpi: { revenue: parseFloat(revenue.toFixed(2)), totalOrders: allOrders.length, activeOrders: activeOrders.length, avgOrderValue: parseFloat(avgOrderValue.toFixed(2)) },
      revenueTrend: trend.map(r => ({ date: r.date, revenue: parseFloat(String(r.revenue)), orders: Number(r.orderCount) })),
      topProducts: topProducts.map(p => ({ ...p, revenue: parseFloat(String(p.revenue)), totalQty: Number(p.totalQty) })),
      topCustomers: topCustomers.map(c => ({ ...c, totalSpend: parseFloat(String(c.totalSpend)), orderCount: Number(c.orderCount) })),
      byCategory: byCategory.map(c => ({ ...c, revenue: parseFloat(String(c.revenue)), qty: Number(c.qty) })),
      ordersByDayOfWeek: ordersByDow,
      valueDistribution,
      statusDistribution,
    });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// ─── GET /api/reports/inventory ───────────────────────────────────────────────
router.get('/inventory', async (req: AuthRequest, res: Response): Promise<void> => {
  const { dateFrom, dateTo, wh } = parseDates(req);
  try {
    // Stock valuation
    const allInv = await db.select({
      id: products.id, sku: products.sku, name: products.name, category: products.category,
      quantity: inventory.quantity, minStock: inventory.minStock, maxStock: inventory.maxStock,
      costPrice: products.costPrice, sellPrice: products.sellPrice, isActive: products.isActive,
      binLocation: inventory.binLocation, warehouseZone: inventory.warehouseZone,
    }).from(products).leftJoin(inventory, and(eq(inventory.productId, products.id), eq(inventory.warehouse, wh))).where(eq(products.isActive, true));

    const totalCost = allInv.reduce((s, r) => s + (r.quantity ?? 0) * parseFloat(String(r.costPrice)), 0);
    const totalSell = allInv.reduce((s, r) => s + (r.quantity ?? 0) * parseFloat(String(r.sellPrice)), 0);
    const lowStock = allInv.filter(r => (r.quantity ?? 0) > 0 && (r.quantity ?? 0) <= (r.minStock ?? 5)).length;
    const outOfStock = allInv.filter(r => (r.quantity ?? 0) === 0).length;
    const inStock = allInv.filter(r => (r.quantity ?? 0) > (r.minStock ?? 5) && (r.quantity ?? 0) <= (r.maxStock ?? 100)).length;
    const overstock = allInv.filter(r => (r.quantity ?? 0) > (r.maxStock ?? 100)).length;
    const toReorder = lowStock + outOfStock;

    // Stock health by category
    const catMap: Record<string, { cost: number; sell: number }> = {};
    for (const r of allInv) {
      if (!catMap[r.category]) catMap[r.category] = { cost: 0, sell: 0 };
      catMap[r.category].cost += (r.quantity ?? 0) * parseFloat(String(r.costPrice));
      catMap[r.category].sell += (r.quantity ?? 0) * parseFloat(String(r.sellPrice));
    }
    const byCategoryValue = Object.entries(catMap).map(([category, v]) => ({ category, costValue: parseFloat(v.cost.toFixed(2)), sellValue: parseFloat(v.sell.toFixed(2)) })).sort((a,b) => b.sellValue - a.sellValue);

    // Movement trend by day
    const movTrend = await db.select({
      date: sql<string>`date_trunc('day', ${stockMovements.createdAt})::date::text`,
      type: stockMovements.movementType,
      qty: sql<number>`sum(${stockMovements.quantity})`,
    }).from(stockMovements).where(and(gte(stockMovements.createdAt, dateFrom), lte(stockMovements.createdAt, dateTo), eq(stockMovements.warehouse, wh)))
      .groupBy(sql`date_trunc('day', ${stockMovements.createdAt})::date`, stockMovements.movementType)
      .orderBy(sql`date_trunc('day', ${stockMovements.createdAt})::date`);

    const trendDays: Record<string, { IN: number; OUT: number; ADJUSTMENT: number }> = {};
    movTrend.forEach(r => {
      if (!trendDays[r.date]) trendDays[r.date] = { IN: 0, OUT: 0, ADJUSTMENT: 0 };
      if (r.type in trendDays[r.date]) (trendDays[r.date] as Record<string,number>)[r.type] += Number(r.qty);
    });
    const movementTrend = Object.entries(trendDays).map(([date, v]) => ({ date, ...v }));

    // Fast movers (most OUT qty in period)
    const fastMovers = await db.select({
      productId: stockMovements.productId, name: products.name, sku: products.sku,
      outQty: sql<number>`sum(${stockMovements.quantity})`,
      moveCount: sql<number>`count(*)`,
    }).from(stockMovements).innerJoin(products, eq(products.id, stockMovements.productId))
      .where(and(eq(stockMovements.movementType, 'OUT'), gte(stockMovements.createdAt, dateFrom), lte(stockMovements.createdAt, dateTo), eq(stockMovements.warehouse, wh)))
      .groupBy(stockMovements.productId, products.name, products.sku)
      .orderBy(desc(sql`sum(${stockMovements.quantity})`)).limit(15);

    // Slow movers (active products with no movements in period)
    const fastMoverIds = fastMovers.map(f => f.productId);
    const slowMovers = allInv.filter(p => !fastMoverIds.includes(p.id)).slice(0, 15)
      .map(p => ({ sku: p.sku, name: p.name, category: p.category, quantity: p.quantity ?? 0, value: parseFloat(((p.quantity ?? 0) * parseFloat(String(p.costPrice))).toFixed(2)) }));

    // Reorder list
    const reorderList = allInv.filter(r => (r.quantity ?? 0) <= (r.minStock ?? 5))
      .map(r => ({ sku: r.sku, name: r.name, category: r.category, current: r.quantity ?? 0, min: r.minStock ?? 5, max: r.maxStock ?? 100, shortage: (r.minStock ?? 5) - (r.quantity ?? 0), location: `${r.warehouseZone}-${r.binLocation}` }))
      .sort((a, b) => a.current - b.current);

    res.json({ success: true,
      kpi: { totalSkus: allInv.length, totalCostValue: parseFloat(totalCost.toFixed(2)), totalSellValue: parseFloat(totalSell.toFixed(2)), potentialMargin: parseFloat((totalSell - totalCost).toFixed(2)), itemsToReorder: toReorder },
      stockHealth: { inStock, lowStock, outOfStock, overstock },
      byCategoryValue, movementTrend,
      fastMovers: fastMovers.map(f => ({ ...f, outQty: Number(f.outQty), moveCount: Number(f.moveCount) })),
      slowMovers, reorderList,
    });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// ─── GET /api/reports/fulfillment ────────────────────────────────────────────
router.get('/fulfillment', async (req: AuthRequest, res: Response): Promise<void> => {
  const { dateFrom, dateTo, wh } = parseDates(req);
  try {
    const orderFilter = and(gte(orders.createdAt, dateFrom), lte(orders.createdAt, dateTo), eq(orders.warehouse, wh));
    const allOrders = await db.select({
      id: orders.id, status: orders.status, priority: orders.priority,
      createdAt: orders.createdAt, updatedAt: orders.updatedAt, shippedAt: orders.shippedAt,
    }).from(orders).where(orderFilter);

    const delivered = allOrders.filter(o => o.status === 'delivered').length;
    const cancelled = allOrders.filter(o => o.status === 'cancelled').length;
    const fulfillmentRate = allOrders.length > 0 ? parseFloat(((delivered / allOrders.length) * 100).toFixed(1)) : 0;
    const cancellationRate = allOrders.length > 0 ? parseFloat(((cancelled / allOrders.length) * 100).toFixed(1)) : 0;

    // Avg order-to-ship (hours)
    const shippedOrders = allOrders.filter(o => o.shippedAt && o.createdAt);
    const avgShipHours = shippedOrders.length > 0
      ? parseFloat((shippedOrders.reduce((s, o) => s + (new Date(o.shippedAt!).getTime() - new Date(o.createdAt).getTime()) / 3600000, 0) / shippedOrders.length).toFixed(1))
      : 0;

    // Items picked
    const [pickedResult] = await db.select({ total: sql<number>`coalesce(sum(${orderItems.pickedQty}),0)` })
      .from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(orderFilter);

    // Pending orders age
    const pendingOrders = allOrders.filter(o => ['pending','confirmed'].includes(o.status));
    const avgPendingAge = pendingOrders.length > 0
      ? parseFloat((pendingOrders.reduce((s, o) => s + (Date.now() - new Date(o.createdAt).getTime()) / 3600000, 0) / pendingOrders.length).toFixed(1))
      : 0;

    // Pipeline funnel
    const statusOrder = ['pending','confirmed','picking','packed','shipped','delivered'];
    const pipeline = statusOrder.map(status => ({ status, count: allOrders.filter(o => o.status === status || statusOrder.indexOf(o.status) > statusOrder.indexOf(status)).length }));

    // By priority
    const priorityCounts = ['urgent','high','normal'].map(p => ({
      priority: p,
      count: allOrders.filter(o => o.priority === p).length,
      delivered: allOrders.filter(o => o.priority === p && o.status === 'delivered').length,
    }));

    // Staff performance
    const staffPerf = await db.select({
      name: users.name, role: users.role,
      orderCount: sql<number>`count(distinct ${orderTimeline.orderId})`,
    }).from(orderTimeline).innerJoin(users, eq(users.id, orderTimeline.changedBy))
      .innerJoin(orders, eq(orders.id, orderTimeline.orderId))
      .where(and(gte(orderTimeline.createdAt, dateFrom), lte(orderTimeline.createdAt, dateTo)))
      .groupBy(users.id, users.name, users.role)
      .orderBy(desc(sql`count(distinct ${orderTimeline.orderId})`)).limit(10);

    // Daily processing
    const dailyProc = await db.select({
      date: sql<string>`date_trunc('day', ${orders.createdAt})::date::text`,
      created: sql<number>`count(*)`,
    }).from(orders).where(orderFilter)
      .groupBy(sql`date_trunc('day', ${orders.createdAt})::date`)
      .orderBy(sql`date_trunc('day', ${orders.createdAt})::date`);

    // Pending orders detail
    const pendingDetail = await db.select({
      id: orders.id, orderNumber: orders.orderNumber, status: orders.status,
      priority: orders.priority, createdAt: orders.createdAt, customerName: customers.name,
    }).from(orders).leftJoin(customers, eq(customers.id, orders.customerId))
      .where(and(orderFilter, inArray(orders.status, ['pending','confirmed'])))
      .orderBy(orders.createdAt);
    const pendingWithAge = pendingDetail.map(o => ({
      ...o, ageHours: parseFloat(((Date.now() - new Date(o.createdAt).getTime()) / 3600000).toFixed(1)),
    }));

    res.json({ success: true,
      kpi: { fulfillmentRate, avgShipHours, itemsPicked: Number(pickedResult?.total ?? 0), cancellationRate, avgPendingAgeHours: avgPendingAge, totalOrders: allOrders.length, delivered, cancelled },
      pipeline, priorityCounts,
      staffPerformance: staffPerf.map(s => ({ ...s, orderCount: Number(s.orderCount) })),
      dailyProcessing: dailyProc.map(d => ({ date: d.date, created: Number(d.created) })),
      pendingOrders: pendingWithAge,
    });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// ─── GET /api/reports/shipments ───────────────────────────────────────────────
router.get('/shipments', async (req: AuthRequest, res: Response): Promise<void> => {
  const { dateFrom, dateTo, wh } = parseDates(req);
  try {
    const allShips = await db.select({
      carrier: shipments.carrier, serviceType: shipments.serviceType, status: shipments.status,
      shippingCost: shipments.shippingCost, estimatedDelivery: shipments.estimatedDelivery,
      actualDelivery: shipments.actualDelivery, shippedAt: shipments.shippedAt,
    }).from(shipments).where(and(gte(shipments.createdAt, dateFrom), lte(shipments.createdAt, dateTo), eq(shipments.warehouse, wh)));

    const today = new Date(); today.setHours(0,0,0,0);
    const delivered = allShips.filter(s => s.status === 'delivered');
    const onTime = delivered.filter(s => s.estimatedDelivery && s.actualDelivery && new Date(s.actualDelivery) <= new Date(s.estimatedDelivery)).length;
    const onTimeRate = delivered.length > 0 ? parseFloat(((onTime / delivered.length) * 100).toFixed(1)) : 0;
    const avgDays = delivered.filter(s => s.shippedAt && s.actualDelivery).length > 0
      ? parseFloat((delivered.filter(s => s.shippedAt && s.actualDelivery).reduce((s, sh) => s + (new Date(sh.actualDelivery!).getTime() - new Date(sh.shippedAt!).getTime()) / 86400000, 0) / delivered.filter(s => s.shippedAt && s.actualDelivery).length).toFixed(1))
      : 0;
    const totalCost = allShips.reduce((s, sh) => s + parseFloat(String(sh.shippingCost ?? 0)), 0);
    const failedRate = allShips.length > 0 ? parseFloat(((allShips.filter(s => s.status === 'failed_delivery').length / allShips.length) * 100).toFixed(1)) : 0;

    // Carrier scorecard
    const carrierMap: Record<string, { total: number; delivered: number; onTime: number; cost: number; days: number; daysCount: number }> = {};
    for (const s of allShips) {
      if (!carrierMap[s.carrier]) carrierMap[s.carrier] = { total: 0, delivered: 0, onTime: 0, cost: 0, days: 0, daysCount: 0 };
      const c = carrierMap[s.carrier];
      c.total++; c.cost += parseFloat(String(s.shippingCost ?? 0));
      if (s.status === 'delivered') {
        c.delivered++;
        if (s.estimatedDelivery && s.actualDelivery && new Date(s.actualDelivery) <= new Date(s.estimatedDelivery)) c.onTime++;
        if (s.shippedAt && s.actualDelivery) { c.days += (new Date(s.actualDelivery).getTime() - new Date(s.shippedAt).getTime()) / 86400000; c.daysCount++; }
      }
    }
    const carrierScorecard = Object.entries(carrierMap).map(([carrier, v]) => ({
      carrier, total: v.total, delivered: v.delivered,
      onTimeRate: v.delivered > 0 ? parseFloat(((v.onTime / v.delivered) * 100).toFixed(1)) : 0,
      avgDays: v.daysCount > 0 ? parseFloat((v.days / v.daysCount).toFixed(1)) : 0,
      totalCost: parseFloat(v.cost.toFixed(2)),
      avgCost: v.total > 0 ? parseFloat((v.cost / v.total).toFixed(2)) : 0,
    })).sort((a, b) => b.total - a.total);

    // Service type distribution
    const svcMap: Record<string,number> = {};
    allShips.forEach(s => { svcMap[s.serviceType] = (svcMap[s.serviceType] ?? 0) + 1; });
    const byServiceType = Object.entries(svcMap).map(([type, count]) => ({ type, count }));

    // Delivery trend
    const trendMap: Record<string, { shipped: number; delivered: number }> = {};
    allShips.forEach(s => {
      if (s.shippedAt) { const d = new Date(s.shippedAt).toISOString().slice(0,10); if (!trendMap[d]) trendMap[d] = { shipped:0, delivered:0 }; trendMap[d].shipped++; if (s.status === 'delivered') trendMap[d].delivered++; }
    });
    const deliveryTrend = Object.entries(trendMap).sort(([a],[b])=>a.localeCompare(b)).map(([date,v])=>({date,...v}));

    res.json({ success: true,
      kpi: { total: allShips.length, delivered: delivered.length, onTimeRate, avgDeliveryDays: avgDays, totalShippingCost: parseFloat(totalCost.toFixed(2)), failedRate },
      carrierScorecard, byServiceType, deliveryTrend,
    });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
});

// ─── EXPORT: Sales Excel ───────────────────────────────────────────────────────
router.get('/export/sales/excel', async (req: AuthRequest, res: Response): Promise<void> => {
  const { dateFrom, dateTo, wh } = parseDates(req);
  try {
    // Reuse sales data
    const orderFilter = and(gte(orders.createdAt, dateFrom), lte(orders.createdAt, dateTo), eq(orders.warehouse, wh));
    const activeFilter = and(orderFilter, sql`${orders.status} NOT IN ('cancelled','returned')`);

    const allOrders = await db.select({ status: orders.status, totalAmount: orders.totalAmount }).from(orders).where(orderFilter);
    const revenue = allOrders.filter(o=>!['cancelled','returned'].includes(o.status)).reduce((s,o)=>s+parseFloat(String(o.totalAmount)),0);

    const topProducts = await db.select({
      name: products.name, sku: products.sku, category: products.category,
      totalQty: sql<number>`sum(${orderItems.quantity})`,
      revenue: sql<number>`sum(${orderItems.totalPrice})`,
    }).from(orderItems).innerJoin(products, eq(products.id, orderItems.productId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId)).where(activeFilter)
      .groupBy(products.id, products.name, products.sku, products.category)
      .orderBy(desc(sql`sum(${orderItems.totalPrice})`)).limit(50);

    const topCustomers = await db.select({
      name: customers.name, city: customers.city,
      orderCount: sql<number>`count(*)`, totalSpend: sql<number>`sum(${orders.totalAmount})`,
    }).from(orders).innerJoin(customers, eq(customers.id, orders.customerId)).where(activeFilter)
      .groupBy(customers.id, customers.name, customers.city)
      .orderBy(desc(sql`sum(${orders.totalAmount})`)).limit(50);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ToyShop WMS'; wb.created = new Date();

    // Sheet 1: Summary
    const ws1 = wb.addWorksheet('Summary');
    navyStyle(ws1, 1, 3, `ToyShop WMS — Sales Report  |  ${dateFrom.toLocaleDateString('en-IN')} to ${dateTo.toLocaleDateString('en-IN')}`);
    ws1.addRow([]);
    headerRow(ws1, 3, ['Metric', 'Value', 'Notes']);
    const summaryData = [
      ['Total Revenue', `₹${revenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 'Excluding cancelled/returned'],
      ['Total Orders', allOrders.length, 'All orders in period'],
      ['Active Orders', allOrders.filter(o=>!['cancelled','returned'].includes(o.status)).length, 'Non-cancelled'],
      ['Avg Order Value', `₹${allOrders.filter(o=>!['cancelled','returned'].includes(o.status)).length > 0 ? (revenue / allOrders.filter(o=>!['cancelled','returned'].includes(o.status)).length).toFixed(2) : 0}`, ''],
      ['Cancelled Orders', allOrders.filter(o=>o.status==='cancelled').length, ''],
      ['Generated', new Date().toLocaleString('en-IN'), ''],
    ];
    summaryData.forEach((row, i) => dataRow(ws1, i + 4, row as (string|number|null)[], i % 2 === 1));
    autoWidth(ws1);

    // Sheet 2: Top Products
    const ws2 = wb.addWorksheet('Top Products');
    navyStyle(ws2, 1, 6, 'Top Products by Revenue');
    ws2.addRow([]);
    headerRow(ws2, 3, ['Rank', 'SKU', 'Product Name', 'Category', 'Qty Sold', 'Revenue (₹)']);
    topProducts.forEach((p, i) => dataRow(ws2, i + 4, [i+1, p.sku, p.name, p.category.replace(/-/g,' '), Number(p.totalQty), parseFloat(String(p.revenue))], i % 2 === 1));
    autoWidth(ws2);

    // Sheet 3: Top Customers
    const ws3 = wb.addWorksheet('Top Customers');
    navyStyle(ws3, 1, 5, 'Top Customers by Spend');
    ws3.addRow([]);
    headerRow(ws3, 3, ['Rank', 'Customer', 'City', 'Orders', 'Total Spend (₹)']);
    topCustomers.forEach((c, i) => dataRow(ws3, i + 4, [i+1, c.name, c.city, Number(c.orderCount), parseFloat(String(c.totalSpend))], i % 2 === 1));
    autoWidth(ws3);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=sales-report-${dateFrom.toISOString().slice(0,10)}.xlsx`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Export failed' }); }
});

// ─── EXPORT: Sales PDF ────────────────────────────────────────────────────────
router.get('/export/sales/pdf', async (req: AuthRequest, res: Response): Promise<void> => {
  const { dateFrom, dateTo, wh } = parseDates(req);
  try {
    const orderFilter = and(gte(orders.createdAt, dateFrom), lte(orders.createdAt, dateTo), eq(orders.warehouse, wh));
    const activeFilter = and(orderFilter, sql`${orders.status} NOT IN ('cancelled','returned')`);
    const allOrders = await db.select({ status: orders.status, totalAmount: orders.totalAmount }).from(orders).where(orderFilter);
    const revenue = allOrders.filter(o=>!['cancelled','returned'].includes(o.status)).reduce((s,o)=>s+parseFloat(String(o.totalAmount)),0);
    const topProducts = await db.select({ name: products.name, sku: products.sku, totalQty: sql<number>`sum(${orderItems.quantity})`, revenue: sql<number>`sum(${orderItems.totalPrice})` })
      .from(orderItems).innerJoin(products, eq(products.id, orderItems.productId)).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(activeFilter)
      .groupBy(products.id, products.name, products.sku).orderBy(desc(sql`sum(${orderItems.totalPrice})`)).limit(20);

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=sales-report-${dateFrom.toISOString().slice(0,10)}.pdf`);
    doc.pipe(res);

    pdfHeader(doc, 'Sales Report', dateFrom, dateTo);
    doc.moveDown(2);

    // KPI summary
    doc.fillColor('#1e3a5f').fontSize(12).font('Helvetica-Bold').text('Key Performance Indicators').moveDown(0.3);
    pdfTable(doc, ['Metric', 'Value'], [
      ['Total Revenue', `₹${revenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`],
      ['Total Orders', allOrders.length],
      ['Active Orders', allOrders.filter(o=>!['cancelled','returned'].includes(o.status)).length],
      ['Cancellations', allOrders.filter(o=>o.status==='cancelled').length],
    ], doc.y);

    doc.addPage();
    pdfHeader(doc, 'Sales Report — Top Products', dateFrom, dateTo);
    doc.moveDown(2);
    doc.fillColor('#1e3a5f').fontSize(12).font('Helvetica-Bold').text('Top Products by Revenue (Top 20)').moveDown(0.3);
    pdfTable(doc, ['Rank','SKU','Product Name','Qty Sold','Revenue (₹)'],
      topProducts.map((p, i) => [i+1, p.sku, p.name.slice(0,25), Number(p.totalQty), `₹${parseFloat(String(p.revenue)).toLocaleString('en-IN')}`]),
      doc.y);

    pdfFooter(doc);
    doc.end();
  } catch (err) { console.error(err); if (!res.headersSent) res.status(500).json({ success: false, message: 'Export failed' }); }
});

// ─── EXPORT: Inventory Excel ──────────────────────────────────────────────────
router.get('/export/inventory/excel', async (req: AuthRequest, res: Response): Promise<void> => {
  const { dateFrom, dateTo, wh } = parseDates(req);
  try {
    const allInv = await db.select({
      sku: products.sku, name: products.name, category: products.category, unit: products.unit,
      costPrice: products.costPrice, sellPrice: products.sellPrice,
      quantity: inventory.quantity, minStock: inventory.minStock, maxStock: inventory.maxStock,
      warehouseZone: inventory.warehouseZone, binLocation: inventory.binLocation,
    }).from(products).leftJoin(inventory, and(eq(inventory.productId, products.id), eq(inventory.warehouse, wh))).where(eq(products.isActive, true));

    const fastMovers = await db.select({ sku: products.sku, name: products.name, outQty: sql<number>`sum(${stockMovements.quantity})`, moveCount: sql<number>`count(*)` })
      .from(stockMovements).innerJoin(products, eq(products.id, stockMovements.productId))
      .where(and(eq(stockMovements.movementType,'OUT'), gte(stockMovements.createdAt,dateFrom), lte(stockMovements.createdAt,dateTo), eq(stockMovements.warehouse, wh)))
      .groupBy(products.id, products.sku, products.name).orderBy(desc(sql`sum(${stockMovements.quantity})`)).limit(50);

    const wb = new ExcelJS.Workbook(); wb.creator = 'ToyShop WMS'; wb.created = new Date();

    const ws1 = wb.addWorksheet('Stock Overview');
    navyStyle(ws1, 1, 8, `ToyShop WMS — Inventory Report  |  Generated: ${new Date().toLocaleString('en-IN')}`);
    ws1.addRow([]);
    headerRow(ws1, 3, ['SKU','Product Name','Category','Zone-Bin','Qty','Min','Max','Status','Cost Value (₹)','Sell Value (₹)']);
    allInv.forEach((r, i) => {
      const qty = r.quantity ?? 0; const min = r.minStock ?? 5; const max = r.maxStock ?? 100;
      const status = qty === 0 ? 'Out of Stock' : qty <= min ? 'Low Stock' : qty > max ? 'Overstock' : 'In Stock';
      dataRow(ws1, i+4, [r.sku, r.name, r.category.replace(/-/g,' '), `${r.warehouseZone}-${r.binLocation}`, qty, min, max, status, parseFloat((qty * parseFloat(String(r.costPrice))).toFixed(2)), parseFloat((qty * parseFloat(String(r.sellPrice))).toFixed(2))], i%2===1);
    });
    autoWidth(ws1);

    const ws2 = wb.addWorksheet('Fast Movers');
    navyStyle(ws2, 1, 4, 'Fast Moving Products (Most OUT movements in period)');
    ws2.addRow([]);
    headerRow(ws2, 3, ['Rank','SKU','Product Name','Qty Out','Movement Count']);
    fastMovers.forEach((f,i) => dataRow(ws2, i+4, [i+1, f.sku, f.name, Number(f.outQty), Number(f.moveCount)], i%2===1));
    autoWidth(ws2);

    const ws3 = wb.addWorksheet('Reorder List');
    navyStyle(ws3, 1, 6, 'Items Requiring Reorder');
    ws3.addRow([]);
    headerRow(ws3, 3, ['SKU','Product Name','Category','Current Qty','Min Required','Shortage','Location']);
    const reorderList = allInv.filter(r=>(r.quantity??0)<=(r.minStock??5)).sort((a,b)=>(a.quantity??0)-(b.quantity??0));
    reorderList.forEach((r,i) => dataRow(ws3, i+4, [r.sku, r.name, r.category.replace(/-/g,' '), r.quantity??0, r.minStock??5, (r.minStock??5)-(r.quantity??0), `${r.warehouseZone}-${r.binLocation}`], i%2===1));
    autoWidth(ws3);

    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',`attachment; filename=inventory-report-${new Date().toISOString().slice(0,10)}.xlsx`);
    await wb.xlsx.write(res); res.end();
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Export failed' }); }
});

// ─── EXPORT: Inventory PDF ────────────────────────────────────────────────────
router.get('/export/inventory/pdf', async (req: AuthRequest, res: Response): Promise<void> => {
  const { dateFrom, dateTo, wh } = parseDates(req);
  try {
    const allInv = await db.select({
      sku: products.sku, name: products.name, category: products.category,
      costPrice: products.costPrice, sellPrice: products.sellPrice,
      quantity: inventory.quantity, minStock: inventory.minStock, maxStock: inventory.maxStock,
    }).from(products).leftJoin(inventory, and(eq(inventory.productId, products.id), eq(inventory.warehouse, wh))).where(eq(products.isActive, true));

    const totalCost = allInv.reduce((s,r)=>s+(r.quantity??0)*parseFloat(String(r.costPrice)),0);
    const totalSell = allInv.reduce((s,r)=>s+(r.quantity??0)*parseFloat(String(r.sellPrice)),0);

    const doc = new PDFDocument({ size:'A4', layout:'landscape', margin:40, bufferPages:true });
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`attachment; filename=inventory-report-${new Date().toISOString().slice(0,10)}.pdf`);
    doc.pipe(res);

    pdfHeader(doc, 'Inventory Report', dateFrom, dateTo);
    doc.moveDown(2);
    doc.fillColor('#1e3a5f').fontSize(12).font('Helvetica-Bold').text('Stock Valuation Summary').moveDown(0.3);
    pdfTable(doc, ['Metric','Value'], [
      ['Total Active SKUs', allInv.length],
      ['Total Stock (Cost Value)', `₹${totalCost.toLocaleString('en-IN',{maximumFractionDigits:2})}`],
      ['Total Stock (Sell Value)', `₹${totalSell.toLocaleString('en-IN',{maximumFractionDigits:2})}`],
      ['Potential Gross Margin', `₹${(totalSell-totalCost).toLocaleString('en-IN',{maximumFractionDigits:2})}`],
      ['Out of Stock Items', allInv.filter(r=>(r.quantity??0)===0).length],
      ['Low Stock Items', allInv.filter(r=>(r.quantity??0)>0&&(r.quantity??0)<=(r.minStock??5)).length],
    ], doc.y);

    doc.addPage();
    pdfHeader(doc, 'Inventory Report — Stock Levels', dateFrom, dateTo);
    doc.moveDown(2);
    doc.fillColor('#1e3a5f').fontSize(12).font('Helvetica-Bold').text('Stock Levels (All Products)').moveDown(0.3);
    pdfTable(doc, ['SKU','Product','Category','Qty','Min','Status'],
      allInv.slice(0,40).map(r => { const qty=r.quantity??0; const min=r.minStock??5; return [r.sku, r.name.slice(0,22), r.category, qty, min, qty===0?'OOS':qty<=min?'Low':'OK']; }),
      doc.y);

    pdfFooter(doc);
    doc.end();
  } catch (err) { console.error(err); if(!res.headersSent) res.status(500).json({ success:false, message:'Export failed' }); }
});

// ─── EXPORT: Fulfillment Excel ────────────────────────────────────────────────
router.get('/export/fulfillment/excel', async (req: AuthRequest, res: Response): Promise<void> => {
  const { dateFrom, dateTo, wh } = parseDates(req);
  try {
    const orderFilter = and(gte(orders.createdAt, dateFrom), lte(orders.createdAt, dateTo), eq(orders.warehouse, wh));
    const allOrders = await db.select({
      orderNumber: orders.orderNumber, status: orders.status, priority: orders.priority,
      totalAmount: orders.totalAmount, createdAt: orders.createdAt, shippedAt: orders.shippedAt,
      customerName: customers.name,
    }).from(orders).leftJoin(customers, eq(customers.id, orders.customerId)).where(orderFilter)
      .orderBy(desc(orders.createdAt));

    const staffPerf = await db.select({ name: users.name, role: users.role, orderCount: sql<number>`count(distinct ${orderTimeline.orderId})` })
      .from(orderTimeline).innerJoin(users, eq(users.id, orderTimeline.changedBy)).innerJoin(orders, eq(orders.id, orderTimeline.orderId))
      .where(and(gte(orderTimeline.createdAt,dateFrom), lte(orderTimeline.createdAt,dateTo)))
      .groupBy(users.id, users.name, users.role).orderBy(desc(sql`count(distinct ${orderTimeline.orderId})`));

    const wb = new ExcelJS.Workbook(); wb.creator='ToyShop WMS'; wb.created=new Date();
    const ws1 = wb.addWorksheet('Orders');
    navyStyle(ws1,1,8,`ToyShop WMS — Fulfillment Report  |  ${dateFrom.toLocaleDateString('en-IN')} to ${dateTo.toLocaleDateString('en-IN')}`);
    ws1.addRow([]);
    headerRow(ws1,3,['Order #','Customer','Status','Priority','Total (₹)','Created','Shipped','Hours to Ship']);
    allOrders.forEach((o,i)=>{
      const hrs = o.shippedAt ? parseFloat(((new Date(o.shippedAt).getTime()-new Date(o.createdAt).getTime())/3600000).toFixed(1)) : null;
      dataRow(ws1,i+4,[o.orderNumber,o.customerName??'Walk-in',o.status,o.priority,parseFloat(String(o.totalAmount)),new Date(o.createdAt).toLocaleDateString('en-IN'),o.shippedAt?new Date(o.shippedAt).toLocaleDateString('en-IN'):'—',hrs??'—'],i%2===1);
    });
    autoWidth(ws1);

    const ws2 = wb.addWorksheet('Staff Performance');
    navyStyle(ws2,1,3,'Staff Performance');
    ws2.addRow([]);
    headerRow(ws2,3,['Name','Role','Orders Handled']);
    staffPerf.forEach((s,i)=>dataRow(ws2,i+4,[s.name,s.role,Number(s.orderCount)],i%2===1));
    autoWidth(ws2);

    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',`attachment; filename=fulfillment-report-${dateFrom.toISOString().slice(0,10)}.xlsx`);
    await wb.xlsx.write(res); res.end();
  } catch(err){ console.error(err); res.status(500).json({success:false,message:'Export failed'}); }
});

// ─── EXPORT: Fulfillment PDF ──────────────────────────────────────────────────
router.get('/export/fulfillment/pdf', async (req: AuthRequest, res: Response): Promise<void> => {
  const { dateFrom, dateTo, wh } = parseDates(req);
  try {
    const orderFilter = and(gte(orders.createdAt, dateFrom), lte(orders.createdAt, dateTo), eq(orders.warehouse, wh));
    const allOrders = await db.select({
      id: orders.id, status: orders.status, priority: orders.priority,
      createdAt: orders.createdAt, shippedAt: orders.shippedAt,
    }).from(orders).where(orderFilter);

    const delivered = allOrders.filter(o => o.status === 'delivered').length;
    const cancelled = allOrders.filter(o => o.status === 'cancelled').length;
    const fulfillmentRate = allOrders.length > 0 ? ((delivered / allOrders.length) * 100).toFixed(1) : '0';
    const cancellationRate = allOrders.length > 0 ? ((cancelled / allOrders.length) * 100).toFixed(1) : '0';
    const shippedOrders = allOrders.filter(o => o.shippedAt && o.createdAt);
    const avgShipHours = shippedOrders.length > 0
      ? (shippedOrders.reduce((s, o) => s + (new Date(o.shippedAt!).getTime() - new Date(o.createdAt).getTime()) / 3600000, 0) / shippedOrders.length).toFixed(1)
      : '0';

    const statusOrder = ['pending','confirmed','picking','packed','shipped','delivered'];
    const pipeline = statusOrder.map(status => ({ status, count: allOrders.filter(o => o.status === status).length }));

    const staffPerf = await db.select({
      name: users.name, role: users.role,
      orderCount: sql<number>`count(distinct ${orderTimeline.orderId})`,
    }).from(orderTimeline).innerJoin(users, eq(users.id, orderTimeline.changedBy))
      .innerJoin(orders, eq(orders.id, orderTimeline.orderId))
      .where(and(gte(orderTimeline.createdAt, dateFrom), lte(orderTimeline.createdAt, dateTo)))
      .groupBy(users.id, users.name, users.role)
      .orderBy(desc(sql`count(distinct ${orderTimeline.orderId})`)).limit(15);

    const pendingDetail = await db.select({
      orderNumber: orders.orderNumber, status: orders.status, priority: orders.priority,
      createdAt: orders.createdAt, customerName: customers.name,
    }).from(orders).leftJoin(customers, eq(customers.id, orders.customerId))
      .where(and(orderFilter, inArray(orders.status, ['pending','confirmed'])))
      .orderBy(orders.createdAt).limit(30);

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=fulfillment-report-${dateFrom.toISOString().slice(0,10)}.pdf`);
    doc.pipe(res);

    pdfHeader(doc, 'Fulfillment Report', dateFrom, dateTo);
    doc.moveDown(2);
    doc.fillColor('#1e3a5f').fontSize(12).font('Helvetica-Bold').text('Key Performance Indicators').moveDown(0.3);
    pdfTable(doc, ['Metric', 'Value'], [
      ['Total Orders', allOrders.length],
      ['Delivered', delivered],
      ['Cancelled', cancelled],
      ['Fulfillment Rate', `${fulfillmentRate}%`],
      ['Cancellation Rate', `${cancellationRate}%`],
      ['Avg Hours to Ship', `${avgShipHours}h`],
    ], doc.y);

    doc.addPage();
    pdfHeader(doc, 'Fulfillment Report — Pipeline & Staff', dateFrom, dateTo);
    doc.moveDown(2);
    doc.fillColor('#1e3a5f').fontSize(12).font('Helvetica-Bold').text('Order Pipeline').moveDown(0.3);
    pdfTable(doc, ['Status', 'Count'], pipeline.map(p => [p.status.charAt(0).toUpperCase()+p.status.slice(1), p.count]), doc.y);

    doc.moveDown(1);
    doc.fillColor('#1e3a5f').fontSize(12).font('Helvetica-Bold').text('Staff Performance').moveDown(0.3);
    pdfTable(doc, ['Name', 'Role', 'Orders Handled'],
      staffPerf.map(s => [s.name, s.role, Number(s.orderCount)]), doc.y);

    if (pendingDetail.length > 0) {
      doc.addPage();
      pdfHeader(doc, 'Fulfillment Report — Pending Orders', dateFrom, dateTo);
      doc.moveDown(2);
      doc.fillColor('#1e3a5f').fontSize(12).font('Helvetica-Bold').text('Pending & Confirmed Orders').moveDown(0.3);
      pdfTable(doc, ['Order #', 'Customer', 'Status', 'Priority', 'Created'],
        pendingDetail.map(o => [o.orderNumber, o.customerName??'Walk-in', o.status, o.priority, new Date(o.createdAt).toLocaleDateString('en-IN')]), doc.y);
    }

    pdfFooter(doc);
    doc.end();
  } catch (err) { console.error(err); if (!res.headersSent) res.status(500).json({ success: false, message: 'Export failed' }); }
});

// ─── EXPORT: Shipments Excel ──────────────────────────────────────────────────
router.get('/export/shipments/excel', async (req: AuthRequest, res: Response): Promise<void> => {
  const { dateFrom, dateTo, wh } = parseDates(req);
  try {
    const allShips = await db.select({
      carrier: shipments.carrier, serviceType: shipments.serviceType, status: shipments.status,
      shippingCost: shipments.shippingCost, trackingNumber: shipments.trackingNumber,
      estimatedDelivery: shipments.estimatedDelivery, actualDelivery: shipments.actualDelivery,
      shippedAt: shipments.shippedAt, createdAt: shipments.createdAt,
    }).from(shipments).where(and(gte(shipments.createdAt, dateFrom), lte(shipments.createdAt, dateTo), eq(shipments.warehouse, wh)))
      .orderBy(desc(shipments.createdAt));

    const delivered = allShips.filter(s => s.status === 'delivered');
    const onTime = delivered.filter(s => s.estimatedDelivery && s.actualDelivery && new Date(s.actualDelivery) <= new Date(s.estimatedDelivery)).length;
    const onTimeRate = delivered.length > 0 ? ((onTime / delivered.length) * 100).toFixed(1) : '0';
    const totalCost = allShips.reduce((s, sh) => s + parseFloat(String(sh.shippingCost ?? 0)), 0);

    const carrierMap: Record<string, { total: number; delivered: number; onTime: number; cost: number; days: number; daysCount: number }> = {};
    for (const s of allShips) {
      if (!carrierMap[s.carrier]) carrierMap[s.carrier] = { total: 0, delivered: 0, onTime: 0, cost: 0, days: 0, daysCount: 0 };
      const c = carrierMap[s.carrier];
      c.total++; c.cost += parseFloat(String(s.shippingCost ?? 0));
      if (s.status === 'delivered') {
        c.delivered++;
        if (s.estimatedDelivery && s.actualDelivery && new Date(s.actualDelivery) <= new Date(s.estimatedDelivery)) c.onTime++;
        if (s.shippedAt && s.actualDelivery) { c.days += (new Date(s.actualDelivery).getTime() - new Date(s.shippedAt).getTime()) / 86400000; c.daysCount++; }
      }
    }

    const wb = new ExcelJS.Workbook(); wb.creator = 'ToyShop WMS'; wb.created = new Date();

    // Sheet 1: Summary
    const ws1 = wb.addWorksheet('Summary');
    navyStyle(ws1, 1, 3, `ToyShop WMS — Shipments Report  |  ${dateFrom.toLocaleDateString('en-IN')} to ${dateTo.toLocaleDateString('en-IN')}`);
    ws1.addRow([]);
    headerRow(ws1, 3, ['Metric', 'Value', 'Notes']);
    const summary = [
      ['Total Shipments', allShips.length, ''],
      ['Delivered', delivered.length, ''],
      ['On-Time Rate', `${onTimeRate}%`, 'Of delivered shipments'],
      ['Failed Deliveries', allShips.filter(s => s.status === 'failed_delivery').length, ''],
      ['Total Shipping Cost', `₹${totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, ''],
      ['Generated', new Date().toLocaleString('en-IN'), ''],
    ];
    summary.forEach((row, i) => dataRow(ws1, i + 4, row as (string|number|null)[], i % 2 === 1));
    autoWidth(ws1);

    // Sheet 2: Carrier Scorecard
    const ws2 = wb.addWorksheet('Carrier Scorecard');
    navyStyle(ws2, 1, 7, 'Carrier Performance Scorecard');
    ws2.addRow([]);
    headerRow(ws2, 3, ['Carrier', 'Total', 'Delivered', 'On-Time %', 'Avg Days', 'Total Cost (₹)', 'Avg Cost (₹)']);
    Object.entries(carrierMap).sort(([,a],[,b])=>b.total-a.total).forEach(([carrier, v], i) => {
      dataRow(ws2, i + 4, [
        carrier, v.total, v.delivered,
        v.delivered > 0 ? parseFloat(((v.onTime/v.delivered)*100).toFixed(1)) : 0,
        v.daysCount > 0 ? parseFloat((v.days/v.daysCount).toFixed(1)) : 0,
        parseFloat(v.cost.toFixed(2)),
        v.total > 0 ? parseFloat((v.cost/v.total).toFixed(2)) : 0,
      ], i % 2 === 1);
    });
    autoWidth(ws2);

    // Sheet 3: All Shipments
    const ws3 = wb.addWorksheet('All Shipments');
    navyStyle(ws3, 1, 8, 'All Shipments Detail');
    ws3.addRow([]);
    headerRow(ws3, 3, ['Tracking #', 'Carrier', 'Service', 'Status', 'Cost (₹)', 'Shipped', 'Est. Delivery', 'Actual Delivery']);
    allShips.forEach((s, i) => dataRow(ws3, i + 4, [
      s.trackingNumber ?? '—', s.carrier, s.serviceType, s.status,
      parseFloat(String(s.shippingCost ?? 0)),
      s.shippedAt ? new Date(s.shippedAt).toLocaleDateString('en-IN') : '—',
      s.estimatedDelivery ? new Date(s.estimatedDelivery).toLocaleDateString('en-IN') : '—',
      s.actualDelivery ? new Date(s.actualDelivery).toLocaleDateString('en-IN') : '—',
    ], i % 2 === 1));
    autoWidth(ws3);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=shipments-report-${dateFrom.toISOString().slice(0,10)}.xlsx`);
    await wb.xlsx.write(res); res.end();
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Export failed' }); }
});

// ─── EXPORT: Shipments PDF ────────────────────────────────────────────────────
router.get('/export/shipments/pdf', async (req: AuthRequest, res: Response): Promise<void> => {
  const { dateFrom, dateTo, wh } = parseDates(req);
  try {
    const allShips = await db.select({
      carrier: shipments.carrier, serviceType: shipments.serviceType, status: shipments.status,
      shippingCost: shipments.shippingCost, estimatedDelivery: shipments.estimatedDelivery,
      actualDelivery: shipments.actualDelivery, shippedAt: shipments.shippedAt,
    }).from(shipments).where(and(gte(shipments.createdAt, dateFrom), lte(shipments.createdAt, dateTo), eq(shipments.warehouse, wh)));

    const delivered = allShips.filter(s => s.status === 'delivered');
    const onTime = delivered.filter(s => s.estimatedDelivery && s.actualDelivery && new Date(s.actualDelivery) <= new Date(s.estimatedDelivery)).length;
    const onTimeRate = delivered.length > 0 ? ((onTime / delivered.length) * 100).toFixed(1) : '0';
    const totalCost = allShips.reduce((s, sh) => s + parseFloat(String(sh.shippingCost ?? 0)), 0);
    const avgDays = delivered.filter(s => s.shippedAt && s.actualDelivery).length > 0
      ? (delivered.filter(s => s.shippedAt && s.actualDelivery).reduce((s, sh) => s + (new Date(sh.actualDelivery!).getTime() - new Date(sh.shippedAt!).getTime()) / 86400000, 0) / delivered.filter(s => s.shippedAt && s.actualDelivery).length).toFixed(1)
      : '0';

    const carrierMap: Record<string, { total: number; delivered: number; onTime: number; cost: number; days: number; daysCount: number }> = {};
    for (const s of allShips) {
      if (!carrierMap[s.carrier]) carrierMap[s.carrier] = { total: 0, delivered: 0, onTime: 0, cost: 0, days: 0, daysCount: 0 };
      const c = carrierMap[s.carrier];
      c.total++; c.cost += parseFloat(String(s.shippingCost ?? 0));
      if (s.status === 'delivered') {
        c.delivered++;
        if (s.estimatedDelivery && s.actualDelivery && new Date(s.actualDelivery) <= new Date(s.estimatedDelivery)) c.onTime++;
        if (s.shippedAt && s.actualDelivery) { c.days += (new Date(s.actualDelivery).getTime() - new Date(s.shippedAt).getTime()) / 86400000; c.daysCount++; }
      }
    }

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=shipments-report-${dateFrom.toISOString().slice(0,10)}.pdf`);
    doc.pipe(res);

    pdfHeader(doc, 'Shipments Report', dateFrom, dateTo);
    doc.moveDown(2);
    doc.fillColor('#1e3a5f').fontSize(12).font('Helvetica-Bold').text('Key Performance Indicators').moveDown(0.3);
    pdfTable(doc, ['Metric', 'Value'], [
      ['Total Shipments', allShips.length],
      ['Delivered', delivered.length],
      ['On-Time Delivery Rate', `${onTimeRate}%`],
      ['Avg Delivery Days', `${avgDays}d`],
      ['Failed Deliveries', allShips.filter(s => s.status === 'failed_delivery').length],
      ['Total Shipping Cost', `₹${totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`],
    ], doc.y);

    doc.addPage();
    pdfHeader(doc, 'Shipments Report — Carrier Scorecard', dateFrom, dateTo);
    doc.moveDown(2);
    doc.fillColor('#1e3a5f').fontSize(12).font('Helvetica-Bold').text('Carrier Performance Scorecard').moveDown(0.3);
    pdfTable(doc, ['Carrier', 'Total', 'Delivered', 'On-Time %', 'Avg Days', 'Total Cost (₹)', 'Avg Cost (₹)'],
      Object.entries(carrierMap).sort(([,a],[,b])=>b.total-a.total).map(([carrier, v]) => [
        carrier, v.total, v.delivered,
        v.delivered > 0 ? `${((v.onTime/v.delivered)*100).toFixed(1)}%` : '—',
        v.daysCount > 0 ? `${(v.days/v.daysCount).toFixed(1)}d` : '—',
        `₹${v.cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
        `₹${v.total > 0 ? (v.cost/v.total).toFixed(0) : 0}`,
      ]), doc.y);

    pdfFooter(doc);
    doc.end();
  } catch (err) { console.error(err); if (!res.headersSent) res.status(500).json({ success: false, message: 'Export failed' }); }
});

export default router;
