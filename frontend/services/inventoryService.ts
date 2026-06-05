import api from './api';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';
export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN' | 'TRANSFER';

export interface ProductRow {
  id: number; sku: string; name: string; category: string; unit: string;
  costPrice: string; sellPrice: string; isActive: boolean; createdAt: string;
  quantity: number; reservedQty: number; available: number;
  minStock: number; maxStock: number;
  warehouseZone: string; binLocation: string;
  stockStatus: StockStatus;
  description?: string;
}

export interface MovementRow {
  id: number; movementType: MovementType; quantity: number;
  quantityBefore: number; quantityAfter: number;
  referenceNo: string; notes: string; createdAt: string;
  productId: number; productSku: string; productName: string; category: string;
  performedByName: string;
}

export interface InventoryKpi {
  totalSkus: number; inStock: number; lowStock: number;
  outOfStock: number; overstock: number; totalValue: number;
}

export interface AlertRow {
  id: number; sku: string; name: string; category: string;
  quantity: number; minStock: number; binLocation: string; warehouseZone: string;
}

export const productService = {
  list: (p?: { search?: string; category?: string; status?: string; stock?: string }) =>
    api.get<{ success: boolean; data: ProductRow[]; summary: Record<string, number> }>('/api/products', { params: p }),
  getById: (id: number) => api.get<{ success: boolean; product: ProductRow & { movements: MovementRow[] } }>(`/api/products/${id}`),
  create: (body: Record<string, unknown>) => api.post('/api/products', body),
  update: (id: number, body: Record<string, unknown>) => api.put(`/api/products/${id}`, body),
  deactivate: (id: number) => api.delete(`/api/products/${id}`),
};

export const inventoryService = {
  overview: (params?: { from?: string; to?: string }) => api.get<{
    success: boolean; kpi: InventoryKpi;
    categoryChart: { category: string; inStock: number; lowStock: number; outOfStock: number }[];
    alerts: AlertRow[]; recentMovements: MovementRow[];
    periodSummary: { totalIn: number; totalOut: number; totalAdj: number; count: number };
  }>('/api/inventory/overview', { params }),

  movements: (p?: { search?: string; type?: string; page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: MovementRow[] }>('/api/inventory/movements', { params: p }),

  alerts: () => api.get<{ success: boolean; outOfStock: AlertRow[]; lowStock: AlertRow[] }>('/api/inventory/alerts'),

  adjust: (body: { productId: number; movementType: MovementType; quantity: number; referenceNo?: string; notes?: string }) =>
    api.post('/api/inventory/adjust', body),
};
