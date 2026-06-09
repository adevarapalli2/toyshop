import api from './api';
import type { WarehouseItem } from '@/store/slices/warehouseSlice';

export const warehouseService = {
  list: () =>
    api.get<{ success: boolean; warehouses: WarehouseItem[] }>('/api/warehouses'),
  create: (body: { name: string; code: string; description?: string }) =>
    api.post<{ success: boolean; warehouse: WarehouseItem }>('/api/warehouses', body),
};
