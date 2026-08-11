// Unit tests for reportService — verifies correct endpoint construction and warehouse param passing
jest.mock('@/services/api', () => ({
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
}));

import api from '@/services/api';
import { reportService } from '@/services/reportService';

const mockedGet = api.get as jest.Mock;

beforeEach(() => mockedGet.mockClear());

describe('reportService', () => {
  it('executive() passes warehouse param to the correct endpoint', async () => {
    await reportService.executive({ from: '2025-01-01', to: '2025-12-31', warehouse: 'Yamuna' });
    expect(mockedGet).toHaveBeenCalledWith('/api/reports/executive', {
      params: { from: '2025-01-01', to: '2025-12-31', warehouse: 'Yamuna' },
    });
  });

  it('sales() passes warehouse=Ganga when specified', async () => {
    await reportService.sales({ from: '2025-01-01', to: '2025-06-30', warehouse: 'Ganga' });
    expect(mockedGet).toHaveBeenCalledWith('/api/reports/sales', {
      params: { from: '2025-01-01', to: '2025-06-30', warehouse: 'Ganga' },
    });
  });

  it('inventory() calls correct report endpoint', async () => {
    await reportService.inventory({ warehouse: 'Ganga' });
    expect(mockedGet).toHaveBeenCalledWith('/api/reports/inventory', {
      params: { warehouse: 'Ganga' },
    });
  });

  it('fulfillment() calls correct report endpoint', async () => {
    await reportService.fulfillment({ warehouse: 'Yamuna' });
    expect(mockedGet).toHaveBeenCalledWith('/api/reports/fulfillment', {
      params: { warehouse: 'Yamuna' },
    });
  });

  it('shipments() calls correct report endpoint', async () => {
    await reportService.shipments({ from: '2025-03-01', to: '2025-03-31', warehouse: 'Ganga' });
    expect(mockedGet).toHaveBeenCalledWith('/api/reports/shipments', {
      params: { from: '2025-03-01', to: '2025-03-31', warehouse: 'Ganga' },
    });
  });
});
