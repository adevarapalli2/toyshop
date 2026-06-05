import api from './api';

export interface ExecKpi {
  totalRevenue:number; totalOrders:number; fulfillmentRate:number; onTimeDeliveryRate:number;
  activeSkus:number; inventoryValue:number; lowStockItems:number; activeCustomers:number;
  topProduct:string; totalShipments:number;
}
export interface SalesData {
  kpi:{ revenue:number; totalOrders:number; activeOrders:number; avgOrderValue:number; };
  revenueTrend:{ date:string; revenue:number; orders:number }[];
  topProducts:{ name:string; sku:string; category:string; totalQty:number; revenue:number }[];
  topCustomers:{ name:string; city:string; orderCount:number; totalSpend:number }[];
  byCategory:{ category:string; revenue:number; qty:number }[];
  ordersByDayOfWeek:{ day:string; count:number }[];
  valueDistribution:{ label:string; count:number }[];
  statusDistribution:{ status:string; count:number }[];
}
export interface InventoryData {
  kpi:{ totalSkus:number; totalCostValue:number; totalSellValue:number; potentialMargin:number; itemsToReorder:number; };
  stockHealth:{ inStock:number; lowStock:number; outOfStock:number; overstock:number };
  byCategoryValue:{ category:string; costValue:number; sellValue:number }[];
  movementTrend:{ date:string; IN:number; OUT:number; ADJUSTMENT:number }[];
  fastMovers:{ sku:string; name:string; outQty:number; moveCount:number }[];
  slowMovers:{ sku:string; name:string; category:string; quantity:number; value:number }[];
  reorderList:{ sku:string; name:string; category:string; current:number; min:number; shortage:number; location:string }[];
}
export interface FulfillmentData {
  kpi:{ fulfillmentRate:number; avgShipHours:number; itemsPicked:number; cancellationRate:number; avgPendingAgeHours:number; totalOrders:number; delivered:number; cancelled:number; };
  pipeline:{ status:string; count:number }[];
  priorityCounts:{ priority:string; count:number; delivered:number }[];
  staffPerformance:{ name:string; role:string; orderCount:number }[];
  dailyProcessing:{ date:string; created:number }[];
  pendingOrders:{ id:number; orderNumber:string; status:string; priority:string; createdAt:string; customerName:string; ageHours:number }[];
}
export interface ShipmentsReportData {
  kpi:{ total:number; delivered:number; onTimeRate:number; avgDeliveryDays:number; totalShippingCost:number; failedRate:number; };
  carrierScorecard:{ carrier:string; total:number; delivered:number; onTimeRate:number; avgDays:number; totalCost:number; avgCost:number }[];
  byServiceType:{ type:string; count:number }[];
  deliveryTrend:{ date:string; shipped:number; delivered:number }[];
}

const BASE = '/api/reports';

async function downloadFile(url: string, filename: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('toyshop_token') : '';
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

export const reportService = {
  executive: (p?:{from?:string;to?:string}) => api.get<{success:boolean;kpi:ExecKpi;revenueTrend:{date:string;revenue:number;orders:number}[]}>(`${BASE}/executive`,{params:p}),
  sales: (p?:{from?:string;to?:string}) => api.get<{success:boolean}&SalesData>(`${BASE}/sales`,{params:p}),
  inventory: (p?:{from?:string;to?:string}) => api.get<{success:boolean}&InventoryData>(`${BASE}/inventory`,{params:p}),
  fulfillment: (p?:{from?:string;to?:string}) => api.get<{success:boolean}&FulfillmentData>(`${BASE}/fulfillment`,{params:p}),
  shipments: (p?:{from?:string;to?:string}) => api.get<{success:boolean}&ShipmentsReportData>(`${BASE}/shipments`,{params:p}),

  downloadSalesExcel:       (from:string,to:string) => downloadFile(`/api/reports/export/sales/excel?from=${from}&to=${to}`,       `sales-report-${from}.xlsx`),
  downloadSalesPdf:         (from:string,to:string) => downloadFile(`/api/reports/export/sales/pdf?from=${from}&to=${to}`,         `sales-report-${from}.pdf`),
  downloadInventoryExcel:   (from:string,to:string) => downloadFile(`/api/reports/export/inventory/excel?from=${from}&to=${to}`,   `inventory-report-${from}.xlsx`),
  downloadInventoryPdf:     (from:string,to:string) => downloadFile(`/api/reports/export/inventory/pdf?from=${from}&to=${to}`,     `inventory-report-${from}.pdf`),
  downloadFulfillmentExcel: (from:string,to:string) => downloadFile(`/api/reports/export/fulfillment/excel?from=${from}&to=${to}`, `fulfillment-report-${from}.xlsx`),
  downloadFulfillmentPdf:   (from:string,to:string) => downloadFile(`/api/reports/export/fulfillment/pdf?from=${from}&to=${to}`,   `fulfillment-report-${from}.pdf`),
  downloadShipmentsExcel:   (from:string,to:string) => downloadFile(`/api/reports/export/shipments/excel?from=${from}&to=${to}`,   `shipments-report-${from}.xlsx`),
  downloadShipmentsPdf:     (from:string,to:string) => downloadFile(`/api/reports/export/shipments/pdf?from=${from}&to=${to}`,     `shipments-report-${from}.pdf`),
};
