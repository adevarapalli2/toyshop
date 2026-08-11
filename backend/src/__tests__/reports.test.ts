import { api, getAdminToken, authHeader } from './helpers';

const DATE_PARAMS = 'from=2025-01-01&to=2026-12-31';

describe('Reports API', () => {
  it('GET /api/reports/executive — returns executive KPI data for Ganga', async () => {
    const token = await getAdminToken();
    const res = await api.get(`/api/reports/executive?${DATE_PARAMS}&warehouse=Ganga`).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('kpi');
    expect(res.body.kpi).toMatchObject({
      totalRevenue: expect.any(Number),
      totalOrders: expect.any(Number),
    });
  });

  it('GET /api/reports/sales — returns sales breakdown with revenueTrend array', async () => {
    const token = await getAdminToken();
    const res = await api.get(`/api/reports/sales?${DATE_PARAMS}&warehouse=Ganga`).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('kpi');
    expect(Array.isArray(res.body.revenueTrend)).toBe(true);
  });

  it('GET /api/reports/inventory — returns inventory valuation with byCategoryValue', async () => {
    const token = await getAdminToken();
    const res = await api.get(`/api/reports/inventory?${DATE_PARAMS}&warehouse=Ganga`).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('kpi');
    expect(Array.isArray(res.body.byCategoryValue)).toBe(true);
  });

  it('GET /api/reports/fulfillment — returns fulfillment pipeline data', async () => {
    const token = await getAdminToken();
    const res = await api.get(`/api/reports/fulfillment?${DATE_PARAMS}&warehouse=Ganga`).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('kpi');
    expect(Array.isArray(res.body.pipeline)).toBe(true);
  });

  it('GET /api/reports/shipments — returns carrier scorecard for Yamuna', async () => {
    const token = await getAdminToken();
    const res = await api.get(`/api/reports/shipments?${DATE_PARAMS}&warehouse=Yamuna`).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('kpi');
    expect(Array.isArray(res.body.carrierScorecard)).toBe(true);
  });
});
