import * as dotenv from 'dotenv';
dotenv.config();
import { db, pool } from './index';
import { customers } from './schema/customers';
import { orders } from './schema/orders';
import { orderItems } from './schema/orderItems';
import { orderTimeline } from './schema/orderTimeline';
import { inventory } from './schema/inventory';
import { stockMovements } from './schema/stockMovements';
import { products } from './schema/products';
import { users } from './schema/users';
import { eq } from 'drizzle-orm';

const CUSTOMERS = [
  { name: 'Priya Sharma', email: 'priya.s@gmail.com', phone: '9876543210', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', address: '12 Marine Lines, Mumbai' },
  { name: 'Ravi Kumar', email: 'ravi.k@yahoo.com', phone: '9123456789', city: 'Bangalore', state: 'Karnataka', pincode: '560001', address: '45 MG Road, Bangalore' },
  { name: 'Ananya Patel', email: 'ananya.p@gmail.com', phone: '9988776655', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001', address: '8 CG Road, Ahmedabad' },
  { name: 'Suresh Reddy', email: 'suresh.r@outlook.com', phone: '9765432100', city: 'Hyderabad', state: 'Telangana', pincode: '500001', address: '22 Banjara Hills, Hyderabad' },
  { name: 'Deepa Nair', email: 'deepa.n@gmail.com', phone: '9654321098', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', address: '5 Anna Salai, Chennai' },
  { name: 'Arjun Mehta', email: 'arjun.m@gmail.com', phone: '9543210987', city: 'Delhi', state: 'Delhi', pincode: '110001', address: '17 Connaught Place, Delhi' },
  { name: 'Kavitha Rao', email: 'kavitha.r@gmail.com', phone: '9432109876', city: 'Pune', state: 'Maharashtra', pincode: '411001', address: '3 FC Road, Pune' },
  { name: 'Vikram Singh', email: 'vikram.s@hotmail.com', phone: '9321098765', city: 'Jaipur', state: 'Rajasthan', pincode: '302001', address: '9 MI Road, Jaipur' },
  { name: 'Meena Krishnan', email: 'meena.k@gmail.com', phone: '9210987654', city: 'Kochi', state: 'Kerala', pincode: '682001', address: '14 MG Road, Kochi' },
  { name: 'Rahul Gupta', email: 'rahul.g@gmail.com', phone: '9109876543', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001', address: '6 Hazratganj, Lucknow' },
  { name: 'Sunita Desai', email: 'sunita.d@gmail.com', phone: '9876012345', city: 'Surat', state: 'Gujarat', pincode: '395001', address: '11 Ring Road, Surat' },
  { name: 'Kiran Bhat', email: 'kiran.b@gmail.com', phone: '9765901234', city: 'Mangalore', state: 'Karnataka', pincode: '575001', address: '7 Hampankatta, Mangalore' },
];

const STATUSES = ['pending','confirmed','picking','packed','shipped','delivered','cancelled'];
const PRIORITIES = ['normal','normal','normal','normal','normal','high','high','high','urgent','urgent','urgent'];

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d;
}
function hoursLater(base: Date, h: number) {
  return new Date(base.getTime() + h * 3600000);
}

async function seed() {
  console.log('Seeding orders data...');

  const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'));
  const [manager] = await db.select({ id: users.id }).from(users).where(eq(users.role, 'manager'));
  const allProducts = await db.select({ id: products.id, sellPrice: products.sellPrice, sku: products.sku }).from(products);
  const allInventory = await db.select().from(inventory);
  const invMap = new Map(allInventory.map(i => [i.productId, i]));

  // Insert customers
  const insertedCustomers = await db.insert(customers).values(CUSTOMERS).returning({ id: customers.id });
  console.log(`  ✓ ${insertedCustomers.length} customers`);

  // 25 orders spread over last 90 days
  const ORDER_DEFS = [
    // delivered (6)
    { daysAgo: 85, custIdx: 0, status: 'delivered', priority: 'normal', prodIdxs: [0,4], quantities: [2,1] },
    { daysAgo: 72, custIdx: 1, status: 'delivered', priority: 'high', prodIdxs: [3,7], quantities: [1,3] },
    { daysAgo: 60, custIdx: 2, status: 'delivered', priority: 'normal', prodIdxs: [1,9], quantities: [1,2] },
    { daysAgo: 45, custIdx: 3, status: 'delivered', priority: 'urgent', prodIdxs: [6,13,17], quantities: [2,1,4] },
    { daysAgo: 30, custIdx: 4, status: 'delivered', priority: 'normal', prodIdxs: [4,18], quantities: [3,2] },
    { daysAgo: 15, custIdx: 5, status: 'delivered', priority: 'high', prodIdxs: [0,8,15], quantities: [1,2,1] },
    // shipped (4)
    { daysAgo: 6, custIdx: 6, status: 'shipped', priority: 'high', prodIdxs: [2,5], quantities: [2,1] },
    { daysAgo: 5, custIdx: 7, status: 'shipped', priority: 'normal', prodIdxs: [11,17], quantities: [1,5] },
    { daysAgo: 4, custIdx: 8, status: 'shipped', priority: 'urgent', prodIdxs: [0,1,3], quantities: [1,1,2] },
    { daysAgo: 3, custIdx: 9, status: 'shipped', priority: 'normal', prodIdxs: [9,19], quantities: [2,3] },
    // packed (2)
    { daysAgo: 2, custIdx: 10, status: 'packed', priority: 'high', prodIdxs: [4,12], quantities: [1,2] },
    { daysAgo: 2, custIdx: 11, status: 'packed', priority: 'normal', prodIdxs: [6,14], quantities: [2,1] },
    // picking (3)
    { daysAgo: 1, custIdx: 0, status: 'picking', priority: 'urgent', prodIdxs: [1,7,16], quantities: [3,1,2] },
    { daysAgo: 1, custIdx: 2, status: 'picking', priority: 'high', prodIdxs: [0,9], quantities: [2,1] },
    { daysAgo: 1, custIdx: 4, status: 'picking', priority: 'normal', prodIdxs: [13,18,19], quantities: [1,2,1] },
    // confirmed (3)
    { daysAgo: 1, custIdx: 6, status: 'confirmed', priority: 'high', prodIdxs: [3,8], quantities: [1,3] },
    { daysAgo: 0, custIdx: 8, status: 'confirmed', priority: 'normal', prodIdxs: [5,17], quantities: [2,2] },
    { daysAgo: 0, custIdx: 10, status: 'confirmed', priority: 'urgent', prodIdxs: [0,4,6], quantities: [1,1,1] },
    // pending (5)
    { daysAgo: 0, custIdx: 1, status: 'pending', priority: 'normal', prodIdxs: [15], quantities: [3] },
    { daysAgo: 0, custIdx: 3, status: 'pending', priority: 'high', prodIdxs: [7,12], quantities: [2,1] },
    { daysAgo: 0, custIdx: 5, status: 'pending', priority: 'normal', prodIdxs: [1,9,14], quantities: [1,2,1] },
    { daysAgo: 0, custIdx: 7, status: 'pending', priority: 'urgent', prodIdxs: [0,16], quantities: [3,2] },
    { daysAgo: 0, custIdx: 9, status: 'pending', priority: 'normal', prodIdxs: [18], quantities: [4] },
    // cancelled (2)
    { daysAgo: 20, custIdx: 11, status: 'cancelled', priority: 'normal', prodIdxs: [2,6], quantities: [1,2] },
    { daysAgo: 10, custIdx: 0, status: 'cancelled', priority: 'high', prodIdxs: [4], quantities: [3] },
  ];

  const STATUS_FLOW = ['pending','confirmed','picking','packed','shipped','delivered'];

  let orderCounter = 1;

  for (const def of ORDER_DEFS) {
    const custId = insertedCustomers[def.custIdx % insertedCustomers.length].id;
    const createdAt = daysAgo(def.daysAgo);
    const orderNumber = `ORD-2026-${String(orderCounter++).padStart(3,'0')}`;

    // Calculate totals
    let subtotal = 0;
    const items = def.prodIdxs.map((pi, i) => {
      const prod = allProducts[pi % allProducts.length];
      const qty = def.quantities[i];
      const price = parseFloat(String(prod.sellPrice));
      subtotal += qty * price;
      return { productId: prod.id, quantity: qty, unitPrice: price, totalPrice: qty * price };
    });
    const tax = parseFloat((subtotal * 0.18).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    const estDelivery = hoursLater(createdAt, 72);
    const actualDelivery = def.status === 'delivered' ? hoursLater(createdAt, 60 + Math.random() * 24) : null;

    const [order] = await db.insert(orders).values({
      orderNumber,
      customerId: custId,
      status: def.status,
      priority: def.priority,
      subtotal: subtotal.toFixed(2),
      taxAmount: tax.toFixed(2),
      totalAmount: total.toFixed(2),
      shippingAddress: CUSTOMERS[def.custIdx % CUSTOMERS.length].address,
      estimatedDelivery: estDelivery,
      actualDelivery: actualDelivery,
      createdBy: admin?.id,
      assignedTo: manager?.id,
      createdAt,
      updatedAt: createdAt,
    }).returning({ id: orders.id });

    // Insert items
    for (const item of items) {
      const picked = ['picking','packed','shipped','delivered'].includes(def.status) ? item.quantity : 0;
      const itemStatus = ['shipped','delivered'].includes(def.status) ? 'packed' : def.status === 'picking' ? 'picked' : 'pending';
      await db.insert(orderItems).values({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        pickedQty: picked,
        unitPrice: item.unitPrice.toFixed(2),
        totalPrice: item.totalPrice.toFixed(2),
        status: def.status === 'cancelled' ? 'cancelled' : itemStatus,
      });
    }

    // Insert timeline events
    const statusIdx = STATUS_FLOW.indexOf(def.status);
    const flowStatuses = def.status === 'cancelled'
      ? ['pending', 'cancelled']
      : STATUS_FLOW.slice(0, statusIdx + 1);

    for (let s = 0; s < flowStatuses.length; s++) {
      const eventTime = hoursLater(createdAt, s * 2);
      await db.insert(orderTimeline).values({
        orderId: order.id,
        fromStatus: s === 0 ? null : flowStatuses[s - 1],
        toStatus: flowStatuses[s],
        notes: s === 0 ? 'Order placed' : `Status updated to ${flowStatuses[s]}`,
        changedBy: s === 0 ? admin?.id : manager?.id,
        createdAt: eventTime,
      });
    }

    // For confirmed+ orders: log OUT stock movements
    if (['confirmed','picking','packed','shipped','delivered'].includes(def.status)) {
      for (const item of items) {
        const inv = invMap.get(item.productId);
        if (inv) {
          await db.insert(stockMovements).values({
            productId: item.productId,
            movementType: 'OUT',
            quantity: item.quantity,
            quantityBefore: inv.quantity,
            quantityAfter: Math.max(0, inv.quantity - item.quantity),
            referenceNo: orderNumber,
            notes: `Order fulfillment`,
            performedBy: manager?.id ?? null,
            createdAt,
          });
        }
      }
    }

    const icon = def.status === 'delivered' ? '✅' : def.status === 'cancelled' ? '❌' : def.status === 'shipped' ? '🚚' : '📦';
    console.log(`  ${icon} ${orderNumber} [${def.priority}/${def.status}] ₹${total.toFixed(0)} — ${items.length} item(s)`);
  }

  console.log(`\nDone. 25 orders seeded.`);
  await pool.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
