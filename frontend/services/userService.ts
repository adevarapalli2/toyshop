import api from './api';

export interface UserRow {
  id: number;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserSummary {
  total: number;
  active: number;
  admin: number;
  manager: number;
  staff: number;
}

export const userService = {
  list: (params?: { search?: string; role?: string; status?: string }) =>
    api.get<{ success: boolean; data: UserRow[]; summary: UserSummary }>('/api/users', { params }),

  create: (body: { email: string; name: string; password: string; role: string }) =>
    api.post('/api/users', body),

  update: (id: number, body: { name?: string; role?: string; isActive?: boolean }) =>
    api.put(`/api/users/${id}`, body),

  resetPassword: (id: number, password: string) =>
    api.put(`/api/users/${id}/password`, { password }),

  deactivate: (id: number) => api.delete(`/api/users/${id}`),
};
