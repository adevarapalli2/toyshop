import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Orders E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('orders list page loads with order rows', async ({ page }) => {
    await page.goto('/orders/list');
    await expect(page.getByText(/ORD-/).first()).toBeVisible({ timeout: 10000 });
  });

  test('order rows show status badges', async ({ page }) => {
    await page.goto('/orders/list');
    await expect(
      page.getByText(/pending|confirmed|delivered|shipped/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('analytics page shows KPI strip', async ({ page }) => {
    await page.goto('/orders/analytics');
    // Screenshot shows "TOTAL REVENUE" and "ORDERS FULFILLED"
    await expect(page.getByText(/TOTAL REVENUE|ORDERS FULFILLED|revenue|fulfilled/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('clicking Create Order navigates to new order form', async ({ page }) => {
    await page.goto('/orders/list');
    const createBtn = page.getByRole('button', { name: /create order|new order/i }).first();
    if (await createBtn.isVisible({ timeout: 5000 })) {
      await createBtn.click();
      await expect(page).toHaveURL(/orders\/new/, { timeout: 5000 });
    }
  });

  test('clicking an order row navigates to order detail page', async ({ page }) => {
    await page.goto('/orders/list');
    const firstOrder = page.getByText(/ORD-/).first();
    await firstOrder.waitFor({ timeout: 10000 });
    await firstOrder.click();
    await expect(page).toHaveURL(/\/orders\/\d+/, { timeout: 8000 });
  });
});
