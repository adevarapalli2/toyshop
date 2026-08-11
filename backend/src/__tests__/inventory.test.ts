import { api, getAdminToken, authHeader } from './helpers';

describe('Inventory API', () => {
  it('GET /api/inventory/overview?warehouse=Ganga — returns KPI and category chart', async () => {
    const token = await getAdminToken();
    const res = await api.get('/api/inventory/overview?warehouse=Ganga').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('kpi');
    expect(res.body.kpi).toMatchObject({
      totalSkus: expect.any(Number),
    });
  });

  it('GET /api/inventory/overview?warehouse=Yamuna — returns Yamuna-specific KPI', async () => {
    const token = await getAdminToken();
    const res = await api.get('/api/inventory/overview?warehouse=Yamuna').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('kpi');
  });

  it('GET /api/inventory/movements — returns data array and pagination', async () => {
    const token = await getAdminToken();
    const res = await api.get('/api/inventory/movements?page=1&limit=10&warehouse=Ganga').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('page');
    expect(res.body).toHaveProperty('limit');
  });

  it('POST /api/inventory/adjust — adjusts stock IN for a product', async () => {
    const token = await getAdminToken();
    const prodRes = await api.get('/api/products?page=1&limit=1&warehouse=Ganga').set(authHeader(token));
    const product = prodRes.body.data?.[0];
    expect(product).toBeDefined();

    const res = await api.post('/api/inventory/adjust').set(authHeader(token)).send({
      productId: product.id,
      warehouse: 'Ganga',
      movementType: 'IN',
      quantity: 5,
      reason: 'Jest test stock adjustment',
    });
    expect(res.status).toBe(200);
  });

  it('GET /api/inventory/alerts?warehouse=Ganga — returns outOfStock and lowStock arrays', async () => {
    const token = await getAdminToken();
    const res = await api.get('/api/inventory/alerts?warehouse=Ganga').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.outOfStock)).toBe(true);
    expect(Array.isArray(res.body.lowStock)).toBe(true);
  });
});
