import { api, getAdminToken, authHeader } from './helpers';

let createdUserId: number;

describe('Users API', () => {
  it('GET /api/users — admin can list all users', async () => {
    const token = await getAdminToken();
    const res = await api.get('/api/users').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toMatchObject({ email: expect.any(String), role: expect.any(String) });
  });

  it('GET /api/users — returns 401 without token', async () => {
    const res = await api.get('/api/users');
    expect(res.status).toBe(401);
  });

  it('POST /api/users — admin can create a new user', async () => {
    const token = await getAdminToken();
    const payload = {
      name: 'Test User Jest',
      email: `jest_user_${Date.now()}@toyshop.com`,
      password: 'Testpass@123',
      role: 'staff',
    };
    const res = await api.post('/api/users').set(authHeader(token)).send(payload);
    expect(res.status).toBe(201);
    const user = res.body.user ?? res.body.data;
    expect(user).toMatchObject({ name: payload.name, role: 'staff' });
    createdUserId = user.id;
  });

  it('PUT /api/users/:id — admin can update user role', async () => {
    const token = await getAdminToken();
    expect(createdUserId).toBeDefined();
    const res = await api.put(`/api/users/${createdUserId}`).set(authHeader(token)).send({ role: 'manager' });
    expect(res.status).toBe(200);
    const updated = res.body.user ?? res.body.data;
    expect(updated.role).toBe('manager');
  });

  it('DELETE /api/users/:id — admin can deactivate user', async () => {
    const token = await getAdminToken();
    expect(createdUserId).toBeDefined();
    const res = await api.delete(`/api/users/${createdUserId}`).set(authHeader(token));
    expect(res.status).toBe(200);
  });
});
