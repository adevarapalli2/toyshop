import request from 'supertest';
import app from '../server';

export const api = request(app);

export const ADMIN_CREDS = { email: 'admin@toyshop.com', password: 'Admin@123' };
export const MANAGER_CREDS = { email: 'manager@toyshop.com', password: 'Manager@123' };

let _adminToken = '';

export async function getAdminToken(): Promise<string> {
  if (_adminToken) return _adminToken;
  const res = await api.post('/api/auth/login').send(ADMIN_CREDS);
  if (res.status !== 200) throw new Error(`Login failed: ${JSON.stringify(res.body)}`);
  _adminToken = res.body.token;
  return _adminToken;
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
