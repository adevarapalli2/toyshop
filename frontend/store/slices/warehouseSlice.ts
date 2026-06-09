'use client';

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/services/api';

export interface WarehouseItem {
  id: number;
  name: string;
  code: string;
  description: string | null;
}

interface WarehouseState {
  list: WarehouseItem[];
  selected: string;
  loading: boolean;
}

const STORAGE_KEY = 'toyshop_warehouse';

function getStoredWarehouse(): string {
  if (typeof window === 'undefined') return 'Ganga';
  return localStorage.getItem(STORAGE_KEY) || 'Ganga';
}

const initialState: WarehouseState = {
  list: [],
  selected: 'Ganga',
  loading: false,
};

export const fetchWarehouses = createAsyncThunk('warehouse/fetchAll', async () => {
  const res = await api.get<{ success: boolean; warehouses: WarehouseItem[] }>('/api/warehouses');
  return res.data.warehouses;
});

export const initWarehouse = createAsyncThunk('warehouse/init', async () => {
  return getStoredWarehouse();
});

const warehouseSlice = createSlice({
  name: 'warehouse',
  initialState,
  reducers: {
    setWarehouse(state, action: PayloadAction<string>) {
      state.selected = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWarehouses.pending, (state) => { state.loading = true; })
      .addCase(fetchWarehouses.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchWarehouses.rejected, (state) => { state.loading = false; })
      .addCase(initWarehouse.fulfilled, (state, action) => {
        state.selected = action.payload;
      });
  },
});

export const { setWarehouse } = warehouseSlice.actions;
export default warehouseSlice.reducer;
