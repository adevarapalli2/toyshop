import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Shipments E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('shipments list page loads with shipment rows', async ({ page }) => {
    await page.goto('/shipments/list');
    // Screenshot shows format "SHIP-2026-034"
    await expect(page.getByText(/SHIP-/).first()).toBeVisible({ timeout: 10000 });
  });

  test('shipment rows show carrier names', async ({ page }) => {
    await page.goto('/shipments/list');
    await expect(
      page.getByText(/delhivery|bluedart|dtdc|fedex|ekart|ups|dhl|indiapost/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('shipment rows show status filter buttons', async ({ page }) => {
    await page.goto('/shipments/list');
    // Screenshot shows filter buttons: "Pending Pickup", "Picked Up", "In Transit", etc.
    await expect(
      page.getByText(/Pending Pickup|In Transit|Delivered|Out for Delivery/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('clicking a shipment row navigates to detail page', async ({ page }) => {
    await page.goto('/shipments/list');
    const firstShipment = page.getByText(/SHIP-/).first();
    await firstShipment.waitFor({ timeout: 10000 });
    await firstShipment.click();
    await expect(page).toHaveURL(/\/shipments\/\d+/, { timeout: 8000 });
  });

  test('shipment detail page shows tracking info', async ({ page }) => {
    await page.goto('/shipments/list');
    const firstShipment = page.getByText(/SHIP-/).first();
    await firstShipment.waitFor({ timeout: 10000 });
    await firstShipment.click();
    await expect(page).toHaveURL(/\/shipments\/\d+/, { timeout: 8000 });
    await expect(page.getByText(/tracking|carrier|status/i).first()).toBeVisible({ timeout: 8000 });
  });
});
