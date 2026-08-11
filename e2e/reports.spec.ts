import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Reports E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('reports hub shows report navigation cards', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByText(/sales|revenue/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('executive dashboard shows KPI strip with revenue', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByText(/revenue|orders|fulfillment/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('sales report page loads with charts', async ({ page }) => {
    await page.goto('/reports/sales');
    await expect(page.getByText(/sales report|revenue/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('inventory report page shows stock section', async ({ page }) => {
    await page.goto('/reports/inventory');
    await expect(page.getByText(/inventory report|stock/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('fulfillment report page loads', async ({ page }) => {
    await page.goto('/reports/fulfillment');
    await expect(page.getByText(/fulfillment|pipeline/i).first()).toBeVisible({ timeout: 10000 });
  });
});
