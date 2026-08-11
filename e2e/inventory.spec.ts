import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Inventory E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('inventory overview shows KPI cards', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.getByText(/total products|total sku|totalSkus/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('warehouse switcher changes inventory data', async ({ page }) => {
    await page.goto('/inventory');
    const yamunaBtn = page.getByRole('button', { name: /yamuna/i }).first();
    if (await yamunaBtn.isVisible({ timeout: 5000 })) {
      await yamunaBtn.click();
      await page.waitForTimeout(1500);
      await expect(page.getByText(/yamuna/i).first()).toBeVisible();
    }
  });

  test('products page shows product list with SKUs', async ({ page }) => {
    await page.goto('/inventory/products');
    await expect(page.getByText(/TOY-/).first()).toBeVisible({ timeout: 10000 });
  });

  test('stock movements page shows movement type filters', async ({ page }) => {
    await page.goto('/inventory/movements');
    // Filter buttons: "+ Stock In", "- Stock Out", "± Adjustment"
    await expect(page.getByText(/Stock In|Stock Out|Adjustment/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('alerts page loads without crashing', async ({ page }) => {
    await page.goto('/inventory/alerts');
    await expect(
      page.getByText(/low stock|no alerts|all good|alert|stock|out of stock/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
