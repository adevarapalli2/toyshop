/**
 * Add rich order + shipment data for both Ganga and Yamuna warehouses.
 * Existing 26 orders stay; this adds 25 Ganga + 15 Yamuna orders with proper
 * warehouse column and corresponding shipments.
 *
 * Run: npx tsx src/db/seedMoreOrders.ts
 */
import 'dotenv/config';
import { db } from './index';
import { orders } from './schema/orders';
import { orderItems } from './schema/orderItems';
import { shipments } from './schema/shipments';
import { sql } from 'drizzle-orm';

// ─── helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number, hourOffset = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9 + (hourOffset % 8), (hourOffset * 13) % 60, 0, 0);
  return d;
}
function addDays(base: Date, n: number): Date {
  const d = new Date(base); d.setDate(d.getDate() + n); return d;
}

const CARRIERS = ['FedEx','DHL','BlueDart','Delhivery','IndiaPost','DTDC','Ecom Express'];
const SERVICES = ['standard','express','overnight'];

function carrier(seed: number) { return CARRIERS[seed % CARRIERS.length]; }
function service(seed: number) { return SERVICES[seed % SERVICES.length]; }
function tracking(c: string, n: number) {
  const pfx: Record<string,string> = {FedEx:'FX',DHL:'DH',BlueDart:'BD',Delhivery:'DL',IndiaPost:'IP',DTDC:'DT','Ecom Express':'EC'};
  return (pfx[c]??'XX') + String(n*7+5000000).slice(-9);
}
function ordNum(n: number) { return `ORD-2026-${String(n).padStart(3,'0')}`; }
function shipNum(n: number) { return `SHIP-2026-${String(n).padStart(3,'0')}`; }

// product list [id, price]
const PRODS: [number, number][] = [
  [1,79.99],[2,99.99],[3,54.99],[4,24.99],[5,18.99],
  [6,14.99],[7,21.99],[8,29.99],[9,19.99],[10,44.99],
  [11,27.99],[12,22.99],[13,34.99],[14,115.00],[15,64.99],
  [16,18.99],[17,149.99],[18,9.99],[19,34.99],[20,24.99],
];
// Yamuna-exclusive products (may or may not exist)
const YAMUNA_EXTRA: [number, number][] = [[21,39.99],[22,54.99],[23,12.99]];

function price(id: number) {
  return ([...PRODS,...YAMUNA_EXTRA].find(p=>p[0]===id)?.[1] ?? 29.99);
}

const ADDRESSES: Record<number, string> = {
  1:'12 Marine Lines, Mumbai 400001',
  2:'45 MG Road, Bangalore 560001',
  3:'8 CG Road, Ahmedabad 380001',
  4:'22 Banjara Hills, Hyderabad 500001',
  5:'5 Anna Salai, Chennai 600001',
  6:'17 Connaught Place, Delhi 110001',
  7:'3 FC Road, Pune 411001',
  8:'9 MI Road, Jaipur 302001',
  9:'14 MG Road, Kochi 682001',
  10:'6 Hazratganj, Lucknow 226001',
  11:'11 Ring Road, Surat 395001',
  12:'7 Hampankatta, Mangalore 575001',
};

interface Def {
  wh: 'Ganga'|'Yamuna';
  cust: number;          // customer id 1-12
  status: string;
  priority: string;
  ago: number;           // days ago created
  items: [number, number][];  // [productId, qty]
}

const DEFS: Def[] = [
  // ── Ganga — 25 orders ────────────────────────────────────────
  {wh:'Ganga',cust:1,  status:'delivered', priority:'normal', ago:89, items:[[1,2],[5,1],[6,3]]},
  {wh:'Ganga',cust:3,  status:'delivered', priority:'high',   ago:83, items:[[2,1],[14,1]]},
  {wh:'Ganga',cust:6,  status:'delivered', priority:'urgent', ago:76, items:[[17,1],[3,2]]},
  {wh:'Ganga',cust:2,  status:'delivered', priority:'normal', ago:71, items:[[4,3],[7,2],[8,1]]},
  {wh:'Ganga',cust:9,  status:'delivered', priority:'low',    ago:66, items:[[6,4],[9,2],[12,1]]},
  {wh:'Ganga',cust:5,  status:'delivered', priority:'high',   ago:61, items:[[10,1],[15,1]]},
  {wh:'Ganga',cust:12, status:'delivered', priority:'normal', ago:55, items:[[1,1],[8,2],[11,1]]},
  {wh:'Ganga',cust:4,  status:'shipped',   priority:'normal', ago:48, items:[[2,1],[13,2],[14,1]]},
  {wh:'Ganga',cust:7,  status:'shipped',   priority:'high',   ago:42, items:[[17,1],[3,1]]},
  {wh:'Ganga',cust:10, status:'shipped',   priority:'urgent', ago:38, items:[[5,3],[9,1],[18,2]]},
  {wh:'Ganga',cust:1,  status:'shipped',   priority:'normal', ago:32, items:[[4,2],[7,1],[16,2]]},
  {wh:'Ganga',cust:8,  status:'packed',    priority:'normal', ago:26, items:[[1,1],[15,1]]},
  {wh:'Ganga',cust:2,  status:'packed',    priority:'high',   ago:21, items:[[6,2],[12,3],[19,1]]},
  {wh:'Ganga',cust:11, status:'picking',   priority:'normal', ago:16, items:[[2,1],[17,1]]},
  {wh:'Ganga',cust:3,  status:'picking',   priority:'urgent', ago:14, items:[[8,2],[11,1],[13,1]]},
  {wh:'Ganga',cust:6,  status:'picking',   priority:'high',   ago:12, items:[[3,2],[10,1],[20,2]]},
  {wh:'Ganga',cust:5,  status:'confirmed', priority:'normal', ago:10, items:[[4,3],[7,1],[9,2]]},
  {wh:'Ganga',cust:12, status:'confirmed', priority:'low',    ago:8,  items:[[1,2],[14,1]]},
  {wh:'Ganga',cust:9,  status:'confirmed', priority:'high',   ago:7,  items:[[5,2],[16,1],[18,3]]},
  {wh:'Ganga',cust:7,  status:'confirmed', priority:'normal', ago:6,  items:[[6,4],[12,2]]},
  {wh:'Ganga',cust:4,  status:'pending',   priority:'normal', ago:5,  items:[[15,1],[8,1]]},
  {wh:'Ganga',cust:10, status:'pending',   priority:'urgent', ago:4,  items:[[17,1],[2,1]]},
  {wh:'Ganga',cust:1,  status:'pending',   priority:'high',   ago:3,  items:[[11,2],[12,1],[13,2]]},
  {wh:'Ganga',cust:3,  status:'cancelled', priority:'normal', ago:53, items:[[1,1],[3,2]]},
  {wh:'Ganga',cust:8,  status:'cancelled', priority:'high',   ago:24, items:[[14,1],[17,1]]},

  // ── Yamuna — 15 orders ───────────────────────────────────────
  {wh:'Yamuna',cust:2,  status:'delivered', priority:'normal', ago:86, items:[[1,2],[4,1],[7,2]]},
  {wh:'Yamuna',cust:6,  status:'delivered', priority:'high',   ago:79, items:[[10,2],[18,3]]},
  {wh:'Yamuna',cust:3,  status:'delivered', priority:'normal', ago:63, items:[[7,1],[9,2],[21,1]]},
  {wh:'Yamuna',cust:8,  status:'delivered', priority:'urgent', ago:55, items:[[1,1],[22,1]]},
  {wh:'Yamuna',cust:4,  status:'shipped',   priority:'high',   ago:47, items:[[4,2],[23,3],[10,1]]},
  {wh:'Yamuna',cust:5,  status:'shipped',   priority:'normal', ago:39, items:[[7,1],[18,2],[21,2]]},
  {wh:'Yamuna',cust:1,  status:'shipped',   priority:'urgent', ago:29, items:[[1,1],[4,2]]},
  {wh:'Yamuna',cust:7,  status:'packed',    priority:'normal', ago:23, items:[[22,1],[23,2],[7,1]]},
  {wh:'Yamuna',cust:9,  status:'picking',   priority:'high',   ago:18, items:[[10,2],[21,1],[4,1]]},
  {wh:'Yamuna',cust:2,  status:'picking',   priority:'normal', ago:13, items:[[1,2],[18,3]]},
  {wh:'Yamuna',cust:6,  status:'confirmed', priority:'normal', ago:9,  items:[[23,2],[7,1],[10,1]]},
  {wh:'Yamuna',cust:10, status:'confirmed', priority:'low',    ago:7,  items:[[4,3],[21,1],[22,1]]},
  {wh:'Yamuna',cust:3,  status:'pending',   priority:'high',   ago:4,  items:[[1,1],[7,2]]},
  {wh:'Yamuna',cust:5,  status:'pending',   priority:'normal', ago:2,  items:[[22,2],[23,1],[18,4]]},
  {wh:'Yamuna',cust:8,  status:'cancelled', priority:'normal', ago:36, items:[[10,2],[21,1]]},
];

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const maxOrdRes = await db.execute(sql`SELECT COALESCE(MAX(id),0) as max_id FROM orders`);
  const maxShipRes = await db.execute(sql`SELECT COALESCE(MAX(id),0) as max_id FROM shipments`);

  const maxOrd = Number((maxOrdRes.rows ?? maxOrdRes)[0]?.max_id ?? 0);
  const maxShip = Number((maxShipRes.rows ?? maxShipRes)[0]?.max_id ?? 0);

  let oSeq = maxOrd + 1;
  let sSeq = maxShip + 1;
  console.log(`Starting at order=${oSeq}, shipment=${sSeq}`);

  for (const def of DEFS) {
    const createdAt = daysAgo(def.ago, oSeq % 8);
    const estDelivery = addDays(createdAt, 5 + (oSeq % 4));

    let shippedAt: Date | null = null;
    let actualDelivery: Date | null = null;
    if (def.status === 'shipped' || def.status === 'delivered') {
      shippedAt = addDays(createdAt, 2);
    }
    if (def.status === 'delivered') {
      actualDelivery = addDays(createdAt, 4 + (oSeq % 3));
    }

    const itemRows = def.items.map(([pid, qty]) => ({
      productId: pid,
      quantity:  qty,
      unitPrice: price(pid),
      totalPrice: parseFloat((qty * price(pid)).toFixed(2)),
    }));

    const subtotal = parseFloat(itemRows.reduce((s, r) => s + r.totalPrice, 0).toFixed(2));
    const tax      = parseFloat((subtotal * 0.05).toFixed(2));
    const total    = parseFloat((subtotal + tax).toFixed(2));

    const [order] = await db.insert(orders).values({
      orderNumber:       ordNum(oSeq),
      customerId:        def.cust,
      status:            def.status,
      priority:          def.priority,
      subtotal:          String(subtotal),
      discountAmount:    '0',
      taxAmount:         String(tax),
      totalAmount:       String(total),
      shippingAddress:   ADDRESSES[def.cust] ?? '1 Main St, India',
      estimatedDelivery: estDelivery,
      actualDelivery,
      shippedAt,
      warehouse:         def.wh,
      createdBy:         1,
      createdAt,
      updatedAt:         createdAt,
    }).returning({ id: orders.id });

    await db.insert(orderItems).values(
      itemRows.map(r => ({
        orderId:    order.id,
        productId:  r.productId,
        quantity:   r.quantity,
        unitPrice:  String(r.unitPrice),
        totalPrice: String(r.totalPrice),
      }))
    );

    const icon = {delivered:'✅',shipped:'🚚',packed:'📦',picking:'🔍',confirmed:'✓',pending:'⏳',cancelled:'❌'}[def.status] ?? '·';
    console.log(`  ${icon} ${ordNum(oSeq)} [${def.wh}/${def.status}] ₹${total} — ${def.items.length} item(s)`);
    oSeq++;

    // shipment for shipped/delivered
    if (def.status === 'shipped' || def.status === 'delivered') {
      const c = carrier(sSeq);
      const s = service(sSeq);
      await db.insert(shipments).values({
        shipmentNumber:    shipNum(sSeq),
        orderId:           order.id,
        customerId:        def.cust,
        carrier:           c,
        serviceType:       s,
        trackingNumber:    tracking(c, sSeq),
        status:            def.status === 'delivered' ? 'delivered' : 'in_transit',
        originAddress:     `${def.wh} Warehouse, India`,
        destinationAddress: ADDRESSES[def.cust] ?? '1 Main St, India',
        weightKg:          String((1 + (sSeq % 4)).toFixed(1)),
        shippingCost:      String((80 + (sSeq % 5) * 25).toFixed(2)),
        estimatedDelivery: estDelivery,
        actualDelivery:    def.status === 'delivered' ? actualDelivery : null,
        shippedAt,
        warehouse:         def.wh,
        createdBy:         1,
        createdAt,
        updatedAt:         createdAt,
      });
      console.log(`      ↳ ${shipNum(sSeq)} via ${c}`);
      sSeq++;
    }
  }

  // Update sequences
  await db.execute(sql`SELECT setval('orders_id_seq'::regclass, ${oSeq - 1})`);
  await db.execute(sql`SELECT setval('shipments_id_seq'::regclass, ${sSeq - 1})`);

  const gangas = DEFS.filter(d => d.wh === 'Ganga').length;
  const yamunas = DEFS.filter(d => d.wh === 'Yamuna').length;
  const ships = DEFS.filter(d => d.status === 'shipped' || d.status === 'delivered').length;
  console.log(`\nDone. ${gangas} Ganga orders + ${yamunas} Yamuna orders + ${ships} shipments.`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
