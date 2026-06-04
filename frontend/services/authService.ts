import api from './api';

export const authService = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),

  forgotPassword: (email: string) =>
    api.post('/api/auth/forgot-password', { email }),

  getMe: () => api.get('/api/auth/me'),
};
