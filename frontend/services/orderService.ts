import api from './api';

export type OrderStatus = 'pending'|'confirmed'|'picking'|'packed'|'shipped'|'delivered'|'cancelled'|'returned';
export type Priority = 'normal'|'high'|'urgent';

export interface CustomerRow { id:number; name:string; email:string; phone:string; city:string; state:string; address:string; pincode:string; isActive:boolean; createdAt:string; }
export interface OrderRow {
  id:number; orderNumber:string; status:OrderStatus; priority:Priority;
  totalAmount:string; subtotal:string; taxAmount:string; discountAmount:string;
  createdAt:string; updatedAt:string; itemCount:number; notes?:string;
  shippingAddress?:string; estimatedDelivery?:string; actualDelivery?:string;
  customerName:string; customerCity:string; assignedToName:string;
}
export interface OrderItem {
  id:number; quantity:number; pickedQty:number; unitPrice:string; totalPrice:string; status:string;
  productId:number; productName:string; productSku:string; category:string;
  binLocation:string; warehouseZone:string;
  currentStock:number; minStock:number; maxStock:number;
}
export interface TimelineEvent { id:number; fromStatus:string|null; toStatus:string; notes:string; createdAt:string; changedByName:string; }
export interface OrderDetail extends OrderRow {
  customerId:number; customerEmail:string; customerPhone:string; customerAddress:string;
}
export interface OrderAnalytics {
  kpi: { total:number; pending:number; inProgress:number; shipped:number; delivered:number; cancelled:number; revenue:number; prevRevenue:number; avgOrderValue:number; fulfillmentRate:number; cancellationRate:number; };
  revenueTrend: { date:string; revenue:number; orders:number }[];
  statusDistribution: { status:string; count:number; value:number }[];
  topProducts: { name:string; sku:string; totalOrdered:number; revenue:number }[];
  ordersByDayOfWeek: { day:string; count:number }[];
  categoryRevenue: { category:string; revenue:number; orderCount:number }[];
  statusFunnel: { status:string; count:number }[];
}

export const STATUS_META: Record<OrderStatus, { label:string; color:string; bg:string; icon:string }> = {
  pending:   { label:'Pending',   color:'#64748b', bg:'#f1f5f9', icon:'⏳' },
  confirmed: { label:'Confirmed', color:'#1d4ed8', bg:'#dbeafe', icon:'✅' },
  picking:   { label:'Picking',   color:'#d97706', bg:'#fef3c7', icon:'📦' },
  packed:    { label:'Packed',    color:'#7c3aed', bg:'#ede9fe', icon:'📫' },
  shipped:   { label:'Shipped',   color:'#0891b2', bg:'#cffafe', icon:'🚚' },
  delivered: { label:'Delivered', color:'#059669', bg:'#d1fae5', icon:'✅' },
  cancelled: { label:'Cancelled', color:'#dc2626', bg:'#fee2e2', icon:'❌' },
  returned:  { label:'Returned',  color:'#9333ea', bg:'#f3e8ff', icon:'↩️' },
};
export const PRIORITY_META: Record<Priority, { label:string; color:string; bg:string }> = {
  normal:  { label:'Normal',  color:'#059669', bg:'#d1fae5' },
  high:    { label:'High',    color:'#d97706', bg:'#fef3c7' },
  urgent:  { label:'Urgent',  color:'#dc2626', bg:'#fee2e2' },
};

export const customerService = {
  list: (p?:{search?:string}) => api.get<{success:boolean;data:CustomerRow[]}>('/api/customers',{params:p}),
  create: (body:Record<string,unknown>) => api.post('/api/customers',body),
  getById: (id:number) => api.get<{success:boolean;customer:CustomerRow;orders:OrderRow[]}>(`/api/customers/${id}`),
};

export const orderService = {
  list: (p?:{status?:string;priority?:string;search?:string;from?:string;to?:string;page?:number}) =>
    api.get<{success:boolean;data:OrderRow[]}>('/api/orders',{params:p}),
  getById: (id:number) =>
    api.get<{success:boolean;order:OrderDetail;items:OrderItem[];timeline:TimelineEvent[]}>(`/api/orders/${id}`),
  create: (body:Record<string,unknown>) => api.post<{success:boolean;order:{id:number;orderNumber:string}}>('/api/orders',body),
  updateStatus: (id:number, status:string, notes?:string) => api.put(`/api/orders/${id}/status`,{status,notes}),
  update: (id:number, body:Record<string,unknown>) => api.put(`/api/orders/${id}`,body),
  cancel: (id:number) => api.delete(`/api/orders/${id}`),
  analytics: (p?:{from?:string;to?:string}) => api.get<{success:boolean}&OrderAnalytics>('/api/orders/analytics',{params:p}),
};
