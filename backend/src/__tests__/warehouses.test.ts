import { api, getAdminToken, authHeader } from './helpers';

let createdWarehouseId: number;

describe('Warehouses API', () => {
  it('GET /api/warehouses — returns list of active warehouses', async () => {
    const token = await getAdminToken();
    const res = await api.get('/api/warehouses').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.warehouses)).toBe(true);
    const names = res.body.warehouses.map((w: { name: string }) => w.name);
    expect(names).toContain('Ganga');
    expect(names).toContain('Yamuna');
  });

  it('GET /api/warehouses — returns 401 without token', async () => {
    const res = await api.get('/api/warehouses');
    expect(res.status).toBe(401);
  });

  it('POST /api/warehouses — admin can create a new warehouse', async () => {
    const token = await getAdminToken();
    const uniqueCode = `T${Date.now().toString().slice(-4)}`;
    const payload = { name: `TestWH_Jest_${Date.now()}`, code: uniqueCode, description: 'Jest test warehouse' };
    const res = await api.post('/api/warehouses').set(authHeader(token)).send(payload);
    expect(res.status).toBe(201);
    expect(res.body.warehouse).toMatchObject({ name: payload.name });
    createdWarehouseId = res.body.warehouse.id;
  });

  it('POST /api/warehouses — rejects duplicate name', async () => {
    const token = await getAdminToken();
    const res = await api.post('/api/warehouses').set(authHeader(token)).send({ name: 'Ganga', code: 'GA2' });
    expect(res.status).toBe(409);
  });

  it('POST /api/warehouses — requires name and code (returns 4xx)', async () => {
    const token = await getAdminToken();
    const res = await api.post('/api/warehouses').set(authHeader(token)).send({ name: 'OnlyName' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  afterAll(async () => {
    if (createdWarehouseId) {
      const token = await getAdminToken();
      await api.delete(`/api/warehouses/${createdWarehouseId}`).set(authHeader(token));
    }
  });
});
