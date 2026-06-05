import * as dotenv from 'dotenv';
dotenv.config();
import { db, pool } from './index';
import { shipments } from './schema/shipments';
import { shipmentEvents } from './schema/shipmentEvents';
import { orders } from './schema/orders';
import { customers } from './schema/customers';
import { users } from './schema/users';
import { eq, inArray } from 'drizzle-orm';

type ShipStatus = 'pending_pickup'|'picked_up'|'in_transit'|'out_for_delivery'|'delivered'|'failed_delivery'|'returned';

const CARRIERS = ['FedEx','DHL','UPS','BlueDart','Delhivery','DTDC','IndiaPost'];
const EVENT_ICONS: Record<string,string> = {
  shipment_created:'📋', picked_up:'📦', location_scan:'📍',
  out_for_delivery:'🚐', delivered:'✅', failed_attempt:'❌', returned:'↩️', in_transit:'✈️',
};

function hoursAgo(h:number){ const d=new Date(); d.setHours(d.getHours()-h); return d; }
function daysFromNow(d:number){ const dt=new Date(); dt.setDate(dt.getDate()+d); return dt; }

const CARRIER_ROUTES: Record<string,string[][]> = {
  FedEx:     [['Mumbai FedEx Hub'],['Delhi Gateway'],['Hyderabad Hub'],['Customer Door']],
  DHL:       [['Mumbai DHL Depot'],['Bangalore DHL Hub'],['Chennai DHL'],['Doorstep']],
  UPS:       [['Mumbai UPS Center'],['Pune UPS Hub'],['Kolkata UPS'],['Delivery Address']],
  BlueDart:  [['ToyShop Warehouse, Mumbai'],['BlueDart Mumbai Sort'],['Hyderabad BlueDart Hub'],['Customer Location']],
  Delhivery: [['Delhivery Mumbai'],['Delhivery Bangalore FC'],['Last Mile Hub'],['Customer Address']],
  DTDC:      [['DTDC Mumbai'],['DTDC Pune Hub'],['DTDC Local Branch'],['Delivery Point']],
  IndiaPost: [['GPO Mumbai'],['RMS Mumbai'],['GPO Destination'],['Post Office Delivery']],
};

async function buildEvents(shipId:number, carrier:string, status:ShipStatus, hoursOffset:number) {
  const route = CARRIER_ROUTES[carrier] ?? CARRIER_ROUTES['FedEx'];
  const flow: ShipStatus[] = ['pending_pickup','picked_up','in_transit','out_for_delivery','delivered'];
  const statusIdx = flow.indexOf(status);
  const actualStatuses = status==='failed_delivery'
    ? ['pending_pickup','picked_up','in_transit','out_for_delivery','failed_delivery']
    : status==='returned'
    ? ['pending_pickup','picked_up','in_transit','out_for_delivery','failed_delivery','returned']
    : flow.slice(0, statusIdx+1);

  const evtTypeMap: Record<string,string> = {
    pending_pickup:'shipment_created', picked_up:'picked_up',
    in_transit:'location_scan', out_for_delivery:'out_for_delivery',
    delivered:'delivered', failed_delivery:'failed_attempt', returned:'returned',
  };
  const descMap: Record<string,string> = {
    shipment_created: 'Shipment registered and ready for pickup',
    picked_up: `Shipment picked up by ${carrier}`,
    location_scan: `Package in transit — scanned at facility`,
    out_for_delivery: 'Out for delivery with courier',
    delivered: 'Package delivered successfully',
    failed_attempt: 'Delivery attempted — recipient not available',
    returned: 'Package returned to sender',
  };

  for (let i=0; i<actualStatuses.length; i++) {
    const s = actualStatuses[i];
    const loc = route[Math.min(i, route.length-1)][0];
    const evtTime = hoursAgo(hoursOffset - i*4);
    await db.insert(shipmentEvents).values({
      shipmentId: shipId, eventType: evtTypeMap[s]??'location_scan',
      location: loc, description: descMap[evtTypeMap[s]??'location_scan'],
      eventTime: evtTime,
    });
  }
}

async function seed() {
  console.log('Seeding shipments...');
  const [admin] = await db.select({id:users.id}).from(users).where(eq(users.role,'admin'));

  // Get shipped and delivered orders
  const eligibleOrders = await db.select({
    id:orders.id, orderNumber:orders.orderNumber, customerId:orders.customerId,
    status:orders.status, shippingAddress:orders.shippingAddress,
  }).from(orders).where(inArray(orders.status,['shipped','delivered','cancelled']));

  const shippedOrders = eligibleOrders.filter(o=>['shipped','delivered'].includes(o.status));
  console.log(`  Found ${shippedOrders.length} shipped/delivered orders`);

  const SHIP_DEFS: {carrierIdx:number; svcType:string; status:ShipStatus; hoursAgo:number; weight:number; cost:number; delayed?:boolean}[] = [
    {carrierIdx:0,svcType:'express',    status:'delivered',        hoursAgo:96,  weight:1.2, cost:350},
    {carrierIdx:1,svcType:'standard',   status:'delivered',        hoursAgo:120, weight:2.5, cost:220},
    {carrierIdx:2,svcType:'overnight',  status:'delivered',        hoursAgo:48,  weight:0.8, cost:580},
    {carrierIdx:3,svcType:'express',    status:'delivered',        hoursAgo:72,  weight:3.0, cost:410},
    {carrierIdx:4,svcType:'standard',   status:'delivered',        hoursAgo:144, weight:1.5, cost:180},
    {carrierIdx:5,svcType:'economy',    status:'delivered',        hoursAgo:200, weight:4.0, cost:120},
    {carrierIdx:6,svcType:'standard',   status:'delivered',        hoursAgo:160, weight:1.0, cost:95},
    {carrierIdx:0,svcType:'express',    status:'delivered',        hoursAgo:80,  weight:2.2, cost:370},
    {carrierIdx:1,svcType:'standard',   status:'delivered',        hoursAgo:110, weight:1.8, cost:240},
    {carrierIdx:2,svcType:'express',    status:'delivered',        hoursAgo:55,  weight:0.6, cost:490},
    {carrierIdx:3,svcType:'standard',   status:'in_transit',       hoursAgo:18,  weight:2.8, cost:280, delayed:true},
    {carrierIdx:4,svcType:'express',    status:'in_transit',       hoursAgo:12,  weight:1.1, cost:310},
    {carrierIdx:0,svcType:'overnight',  status:'out_for_delivery', hoursAgo:6,   weight:0.9, cost:550},
    {carrierIdx:1,svcType:'standard',   status:'failed_delivery',  hoursAgo:36,  weight:3.5, cost:200, delayed:true},
    {carrierIdx:3,svcType:'express',    status:'in_transit',       hoursAgo:24,  weight:1.6, cost:390},
  ];

  let counter = 1;
  for (let i=0; i<SHIP_DEFS.length && i<shippedOrders.length; i++) {
    const def = SHIP_DEFS[i];
    const order = shippedOrders[i];
    const carrier = CARRIERS[def.carrierIdx];
    const shipmentNumber = `SHIP-${new Date().getFullYear()}-${String(counter++).padStart(3,'0')}`;
    const trackingPfx: Record<string,string> = {FedEx:'FX',DHL:'DHL',UPS:'1Z',BlueDart:'BD',Delhivery:'DL',DTDC:'DT',IndiaPost:'IP'};
    const trackingNumber = `${trackingPfx[carrier]??'TK'}${Math.floor(Math.random()*900000000+100000000)}`;
    const shippedAt = hoursAgo(def.hoursAgo);
    const estDays = def.svcType==='overnight'?1:def.svcType==='express'?3:def.svcType==='economy'?10:5;
    const estimatedDelivery = def.status==='delivered'
      ? new Date(shippedAt.getTime() + estDays*86400000 - (def.delayed?0:3600000))
      : def.delayed
      ? hoursAgo(12) // past estimated = delayed
      : daysFromNow(estDays-1);
    const actualDelivery = def.status==='delivered' ? hoursAgo(def.hoursAgo - estDays*24 + 2) : null;

    const [ship] = await db.insert(shipments).values({
      shipmentNumber, orderId:order.id, customerId:order.customerId??null,
      carrier, serviceType:def.svcType, trackingNumber, status:def.status,
      originAddress:'ToyShop Warehouse, Andheri East, Mumbai - 400069',
      destinationAddress: order.shippingAddress??'Customer Address',
      weightKg:def.weight.toFixed(2), lengthCm:'30.0', widthCm:'20.0', heightCm:'15.0',
      shippingCost:def.cost.toFixed(2), insuranceValue:(def.cost*2).toFixed(2),
      signatureRequired: def.svcType==='overnight',
      estimatedDelivery, actualDelivery, shippedAt,
      createdBy:admin?.id, createdAt:shippedAt, updatedAt:new Date(),
    }).returning({id:shipments.id});

    // Update order tracking_number
    await db.update(orders).set({trackingNumber, shippedAt}).where(eq(orders.id, order.id));

    await buildEvents(ship.id, carrier, def.status, def.hoursAgo);

    const icon = def.status==='delivered'?'✅':def.status==='failed_delivery'?'❌':def.status==='in_transit'?'✈️':'🚐';
    console.log(`  ${icon} ${shipmentNumber} [${carrier}/${def.svcType}/${def.status}] ₹${def.cost}`);
  }

  console.log(`\nDone. ${counter-1} shipments seeded.`);
  await pool.end();
}

seed().catch(e=>{ console.error(e); process.exit(1); });
