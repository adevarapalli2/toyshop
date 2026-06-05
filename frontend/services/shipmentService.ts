import api from './api';

export type ShipStatus = 'pending_pickup'|'picked_up'|'in_transit'|'out_for_delivery'|'delivered'|'failed_delivery'|'returned';
export type Carrier = 'FedEx'|'DHL'|'UPS'|'BlueDart'|'Delhivery'|'DTDC'|'IndiaPost';

export interface ShipmentRow {
  id:number; shipmentNumber:string; status:ShipStatus; carrier:string; serviceType:string;
  trackingNumber:string; estimatedDelivery:string; actualDelivery:string;
  shippingCost:string; shippedAt:string; createdAt:string;
  orderId:number; orderNumber:string; customerName:string; customerCity:string;
}
export interface ShipmentEvent {
  id:number; eventType:string; location:string; description:string; eventTime:string; createdAt:string;
}
export interface ShipmentDetail extends ShipmentRow {
  originAddress:string; destinationAddress:string;
  weightKg:string; lengthCm:string; widthCm:string; heightCm:string;
  insuranceValue:string; signatureRequired:boolean; notes:string;
  updatedAt:string; orderStatus:string; orderTotal:string;
  customerEmail:string; customerPhone:string; customerAddress:string;
}
export interface ShipmentItem { id:number; quantity:number; pickedQty:number; productName:string; productSku:string; category:string; }

export interface ShipmentAnalytics {
  kpi: { total:number; inTransit:number; deliveredToday:number; delayed:number; pending:number; failed:number; delivered:number; onTimeRate:number; avgDeliveryDays:number; totalShippingCost:number; };
  carrierBreakdown: { carrier:string; count:number; delivered:number; onTimeRate:number; avgDays:number }[];
  deliveryTrend: { date:string; shipped:number; delivered:number }[];
  statusDistribution: { status:string; count:number }[];
}

export const STATUS_META: Record<ShipStatus, { label:string; color:string; bg:string; icon:string }> = {
  pending_pickup:   { label:'Pending Pickup',    color:'#64748b', bg:'#f1f5f9', icon:'📋' },
  picked_up:        { label:'Picked Up',         color:'#1d4ed8', bg:'#dbeafe', icon:'📦' },
  in_transit:       { label:'In Transit',        color:'#6366f1', bg:'#ede9fe', icon:'✈️' },
  out_for_delivery: { label:'Out for Delivery',  color:'#d97706', bg:'#fef3c7', icon:'🚐' },
  delivered:        { label:'Delivered',         color:'#059669', bg:'#d1fae5', icon:'✅' },
  failed_delivery:  { label:'Failed Delivery',   color:'#dc2626', bg:'#fee2e2', icon:'❌' },
  returned:         { label:'Returned',          color:'#9333ea', bg:'#f3e8ff', icon:'↩️' },
};

export const CARRIER_META: Record<string, { color:string; bg:string; abbr:string }> = {
  FedEx:     { color:'#7c3aed', bg:'#ede9fe', abbr:'FX' },
  DHL:       { color:'#dc2626', bg:'#fee2e2', abbr:'DHL' },
  UPS:       { color:'#92400e', bg:'#fef3c7', abbr:'UPS' },
  BlueDart:  { color:'#ea580c', bg:'#ffedd5', abbr:'BD' },
  Delhivery: { color:'#1d4ed8', bg:'#dbeafe', abbr:'DLV' },
  DTDC:      { color:'#0891b2', bg:'#cffafe', abbr:'DTC' },
  IndiaPost: { color:'#059669', bg:'#d1fae5', abbr:'IP' },
};

export const EVENT_ICONS: Record<string,string> = {
  shipment_created:'📋', picked_up:'📦', location_scan:'📍',
  out_for_delivery:'🚐', delivered:'✅', failed_attempt:'❌', returned:'↩️',
  in_transit:'✈️', customs_clearance:'🛃',
};

export const NEXT_ACTION: Partial<Record<ShipStatus, {label:string; color:string; next:ShipStatus; danger?:boolean}[]>> = {
  pending_pickup:   [{label:'Mark Picked Up',         color:'#1d4ed8', next:'picked_up'}],
  picked_up:        [{label:'Mark In Transit',         color:'#6366f1', next:'in_transit'}],
  in_transit:       [{label:'Mark Out for Delivery',   color:'#d97706', next:'out_for_delivery'}],
  out_for_delivery: [{label:'Mark Delivered',          color:'#059669', next:'delivered'}, {label:'Mark Failed Delivery', color:'#dc2626', next:'failed_delivery', danger:true}],
  failed_delivery:  [{label:'Retry Delivery',          color:'#d97706', next:'out_for_delivery'}, {label:'Mark Returned', color:'#9333ea', next:'returned', danger:true}],
};

export const CARRIERS: string[] = ['FedEx','DHL','UPS','BlueDart','Delhivery','DTDC','IndiaPost'];
export const STATUSES: ShipStatus[] = ['pending_pickup','picked_up','in_transit','out_for_delivery','delivered','failed_delivery','returned'];

export const shipmentService = {
  list: (p?:{status?:string;carrier?:string;search?:string;from?:string;to?:string}) =>
    api.get<{success:boolean;data:ShipmentRow[]}>('/api/shipments',{params:p}),
  getById: (id:number) =>
    api.get<{success:boolean;shipment:ShipmentDetail;events:ShipmentEvent[];items:ShipmentItem[]}>(`/api/shipments/${id}`),
  create: (body:Record<string,unknown>) =>
    api.post<{success:boolean;shipment:{id:number;shipmentNumber:string}}>('/api/shipments',body),
  updateStatus: (id:number, status:string, location?:string, notes?:string) =>
    api.put(`/api/shipments/${id}/status`,{status,location,notes}),
  addEvent: (id:number, body:{eventType:string;location?:string;description:string}) =>
    api.post(`/api/shipments/${id}/events`,body),
  analytics: (p?:{from?:string;to?:string}) =>
    api.get<{success:boolean}&ShipmentAnalytics>('/api/shipments/analytics',{params:p}),
};
