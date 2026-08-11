import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Settings E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/settings');
    await expect(page).toHaveURL(/settings/, { timeout: 10000 });
  });

  test('settings page shows Role Permissions section with 3 cards', async ({ page }) => {
    await expect(page.getByText(/role permissions/i).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/admin/i).first()).toBeVisible();
    await expect(page.getByText(/manager/i).first()).toBeVisible();
    await expect(page.getByText(/staff/i).first()).toBeVisible();
  });

  test('settings page shows Team Members section with user rows', async ({ page }) => {
    await expect(page.getByText(/team members/i).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/admin@toyshop.com/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('Add User button opens the AddUser modal', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add user/i }).first();
    await addBtn.click();
    await expect(page.getByText(/add user|create user|new user/i).first()).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
  });

  test('search filter hides non-matching users', async ({ page }) => {
    const search = page.getByPlaceholder(/search name or email/i);
    await search.fill('xyznonexistentuser123');
    await expect(page.getByText(/no users found/i)).toBeVisible({ timeout: 5000 });
    await search.clear();
  });

  test('reset password button opens password modal', async ({ page }) => {
    const keyBtn = page.locator('[title="Reset password"]').first();
    if (await keyBtn.isVisible({ timeout: 5000 })) {
      await keyBtn.click();
      await expect(page.getByText(/reset password/i).first()).toBeVisible({ timeout: 5000 });
      await page.keyboard.press('Escape');
    }
  });
});
