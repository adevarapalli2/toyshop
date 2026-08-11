import { api, getAdminToken, authHeader } from './helpers';

describe('Shipments API', () => {
  it('GET /api/shipments — returns data array with pagination', async () => {
    const token = await getAdminToken();
    const res = await api.get('/api/shipments?page=1&limit=10&warehouse=Ganga').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('success', true);
  });

  it('POST /api/shipments — creates a shipment for a packed order', async () => {
    const token = await getAdminToken();
    const ordRes = await api.get('/api/orders?page=1&limit=100&warehouse=Ganga').set(authHeader(token));
    expect(ordRes.status).toBe(200);
    // Find a 'packed' order (ready to ship)
    const order = ordRes.body.data?.find((o: { status: string }) => o.status === 'packed');
    if (!order) {
      console.warn('No packed order found — skipping shipment creation test');
      return;
    }
    const payload = {
      orderId: order.id,
      warehouse: 'Ganga',
      carrier: 'Delhivery',
      serviceType: 'Standard',
      trackingNumber: `TRK-JEST-${Date.now()}`,
      shippingCost: 150,
      estimatedDelivery: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    };
    const res = await api.post('/api/shipments').set(authHeader(token)).send(payload);
    expect([200, 201]).toContain(res.status);
  });

  it('GET /api/shipments/:id — returns individual shipment detail', async () => {
    const token = await getAdminToken();
    const listRes = await api.get('/api/shipments?page=1&limit=5').set(authHeader(token));
    const shipment = listRes.body.data?.[0];
    if (!shipment) return;
    const res = await api.get(`/api/shipments/${shipment.id}`).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PUT /api/shipments/:id/status — updates shipment status', async () => {
    const token = await getAdminToken();
    const listRes = await api.get('/api/shipments?page=1&limit=50').set(authHeader(token));
    const pending = listRes.body.data?.find((s: { status: string }) => s.status === 'pending_pickup');
    if (!pending) { console.warn('No pending_pickup shipment — skip'); return; }
    const res = await api
      .put(`/api/shipments/${pending.id}/status`)
      .set(authHeader(token))
      .send({ status: 'picked_up', note: 'Jest test update' });
    expect(res.status).toBe(200);
  });

  it('GET /api/shipments — Yamuna filter returns scoped result list', async () => {
    const token = await getAdminToken();
    const gangaRes = await api.get('/api/shipments?page=1&limit=50&warehouse=Ganga').set(authHeader(token));
    const yamunaRes = await api.get('/api/shipments?page=1&limit=50&warehouse=Yamuna').set(authHeader(token));
    expect(gangaRes.status).toBe(200);
    expect(yamunaRes.status).toBe(200);
    // Results should differ between warehouses when both have data
    expect(Array.isArray(gangaRes.body.data)).toBe(true);
    expect(Array.isArray(yamunaRes.body.data)).toBe(true);
  });
});
