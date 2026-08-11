import { api, getAdminToken, authHeader } from './helpers';

let createdProductId: number;

describe('Products API', () => {
  it('GET /api/products — returns paginated product list with data array', async () => {
    const token = await getAdminToken();
    const res = await api.get('/api/products?page=1&limit=10').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('summary');
    expect(res.body.data[0]).toMatchObject({ name: expect.any(String), sku: expect.any(String) });
  });

  it('GET /api/products — filters by search term', async () => {
    const token = await getAdminToken();
    const res = await api.get('/api/products?search=Lego').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      res.body.data.forEach((p: { name: string }) =>
        expect(p.name.toLowerCase()).toContain('lego')
      );
    }
  });

  it('POST /api/products — creates a new product with inventory', async () => {
    const token = await getAdminToken();
    const payload = {
      name: 'Jest Test Toy',
      sku: `TEST-JEST-${Date.now()}`,
      category: 'Action Figures',
      price: 299,
      costPrice: 150,
      minStock: 5,
      zone: 'A',
      quantity: 10,
      warehouse: 'Ganga',
    };
    const res = await api.post('/api/products').set(authHeader(token)).send(payload);
    expect(res.status).toBe(201);
    expect(res.body.product).toMatchObject({ name: 'Jest Test Toy', sku: payload.sku });
    createdProductId = res.body.product.id;
  });

  it('GET /api/products/:id — returns product with inventory', async () => {
    const token = await getAdminToken();
    expect(createdProductId).toBeDefined();
    const res = await api.get(`/api/products/${createdProductId}`).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.product.id).toBe(createdProductId);
  });

  it('PUT /api/products/:id — updates product price', async () => {
    const token = await getAdminToken();
    expect(createdProductId).toBeDefined();
    const res = await api
      .put(`/api/products/${createdProductId}`)
      .set(authHeader(token))
      .send({ price: 349 });
    expect(res.status).toBe(200);
  });
});
