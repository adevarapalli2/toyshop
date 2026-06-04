'use client';

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authService } from '@/services/authService';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  initializing: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  loading: false,
  error: null,
  initializing: true,
};

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await authService.login(email, password);
      return res.data as { token: string; user: User };
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const initializeAuth = createAsyncThunk('auth/initialize', async () => {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('toyshop_token');
  if (!token) return null;
  try {
    const res = await authService.getMe();
    return { token, user: res.data.user as User };
  } catch {
    localStorage.removeItem('toyshop_token');
    return null;
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      if (typeof window !== 'undefined') localStorage.removeItem('toyshop_token');
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<{ token: string; user: User }>) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        if (typeof window !== 'undefined') localStorage.setItem('toyshop_token', action.payload.token);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(initializeAuth.pending, (state) => {
        state.initializing = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.initializing = false;
        if (action.payload) {
          state.token = action.payload.token;
          state.user = action.payload.user;
        }
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.initializing = false;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
