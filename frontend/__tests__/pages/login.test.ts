// Unit tests for auth slice logic — avoids jsdom/Ant Design rendering issues
import authReducer, { clearError } from '@/store/slices/authSlice';

describe('authSlice reducer', () => {
  const initialState = { user: null, token: null, loading: false, error: null, initializing: false };

  it('starts with null user and no error', () => {
    const state = authReducer(undefined, { type: '@@INIT' });
    expect(state.user).toBeNull();
    expect(state.error).toBeNull();
    expect(state.loading).toBe(false);
  });

  it('clearError action sets error to null', () => {
    const stateWithError = { ...initialState, error: 'Invalid credentials' };
    const state = authReducer(stateWithError, clearError());
    expect(state.error).toBeNull();
  });

  it('loginUser.pending sets loading=true', () => {
    const action = { type: 'auth/login/pending' };
    const state = authReducer(initialState, action);
    expect(state.loading).toBe(true);
  });

  it('loginUser.fulfilled stores user and token', () => {
    const payload = {
      user: { id: 1, name: 'Admin', email: 'admin@toyshop.com', role: 'admin', isActive: true },
      token: 'test.jwt.token',
    };
    const action = { type: 'auth/login/fulfilled', payload };
    const state = authReducer(initialState, action);
    expect(state.user).toMatchObject({ email: 'admin@toyshop.com' });
    expect(state.token).toBe('test.jwt.token');
    expect(state.loading).toBe(false);
  });

  it('loginUser.rejected stores error message', () => {
    const action = { type: 'auth/login/rejected', payload: 'Invalid credentials' };
    const state = authReducer(initialState, action);
    expect(state.error).toBe('Invalid credentials');
    expect(state.loading).toBe(false);
  });
});
