'use client';

import { useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { store } from './index';
import { initializeAuth } from './slices/authSlice';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      store.dispatch(initializeAuth());
    }
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
