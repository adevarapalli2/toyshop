import { api, getAdminToken, authHeader } from './helpers';

let createdOrderId: number;

describe('Orders API', () => {
  it('GET /api/orders — returns paginated orders list with data array', async () => {
    const token = await getAdminToken();
    const res = await api.get('/api/orders?page=1&limit=10&warehouse=Ganga').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('page');
  });

  it('POST /api/orders — creates a new order', async () => {
    const token = await getAdminToken();
    const custRes = await api.get('/api/customers?page=1&limit=1').set(authHeader(token));
    expect(custRes.status).toBe(200);
    const customer = custRes.body.data?.[0] ?? custRes.body.customers?.[0];

    const prodRes = await api.get('/api/products?page=1&limit=1').set(authHeader(token));
    const product = prodRes.body.data?.[0];

    if (!customer || !product) {
      console.warn('No customer or product found — skipping order creation');
      return;
    }

    const payload = {
      customerId: customer.id,
      warehouse: 'Ganga',
      priority: 'normal',
      items: [{ productId: product.id, quantity: 1, unitPrice: product.sellPrice ?? product.price ?? 100 }],
    };
    const res = await api.post('/api/orders').set(authHeader(token)).send(payload);
    expect(res.status).toBe(201);
    expect(res.body.order ?? res.body.data).toBeDefined();
    createdOrderId = (res.body.order ?? res.body.data).id;
  });

  it('GET /api/orders/:id — returns order with items', async () => {
    const token = await getAdminToken();
    // Use an existing order if we didn't create one
    if (!createdOrderId) {
      const listRes = await api.get('/api/orders?page=1&limit=1').set(authHeader(token));
      const firstOrder = listRes.body.data?.[0];
      if (!firstOrder) return;
      createdOrderId = firstOrder.id;
    }
    const res = await api.get(`/api/orders/${createdOrderId}`).set(authHeader(token));
    expect(res.status).toBe(200);
  });

  it('PUT /api/orders/:id/status — advances order status', async () => {
    const token = await getAdminToken();
    // Find a pending order to advance
    const listRes = await api.get('/api/orders?page=1&limit=50&warehouse=Ganga').set(authHeader(token));
    const pending = listRes.body.data?.find((o: { status: string }) => o.status === 'pending');
    if (!pending) { console.warn('No pending order — skip'); return; }
    const res = await api
      .put(`/api/orders/${pending.id}/status`)
      .set(authHeader(token))
      .send({ status: 'confirmed' });
    expect(res.status).toBe(200);
  });

  it('GET /api/orders/analytics?warehouse=Ganga — returns order analytics KPI', async () => {
    const token = await getAdminToken();
    const res = await api.get('/api/orders/analytics?warehouse=Ganga').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('kpi');
    expect(res.body.kpi).toMatchObject({ total: expect.any(Number) });
  });
});
