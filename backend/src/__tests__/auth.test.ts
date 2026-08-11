import { api, ADMIN_CREDS } from './helpers';

describe('POST /api/auth/login', () => {
  it('returns 200 with token for valid admin credentials', async () => {
    const res = await api.post('/api/auth/login').send(ADMIN_CREDS);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ email: ADMIN_CREDS.email, role: 'admin' });
  });

  it('returns 401 for wrong password', async () => {
    const res = await api.post('/api/auth/login').send({ email: ADMIN_CREDS.email, password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message');
  });

  it('returns 401 for non-existent email', async () => {
    const res = await api.post('/api/auth/login').send({ email: 'ghost@toyshop.com', password: 'anything' });
    expect(res.status).toBe(401);
  });

  it('returns 4xx when email is missing', async () => {
    const res = await api.post('/api/auth/login').send({ password: 'admin123' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('returns 4xx when password is missing', async () => {
    const res = await api.post('/api/auth/login').send({ email: ADMIN_CREDS.email });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
