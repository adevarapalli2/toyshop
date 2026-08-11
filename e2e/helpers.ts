import { Page } from '@playwright/test';

export async function login(page: Page, email = 'admin@toyshop.com', password = 'Admin@123') {
  await page.goto('/login');
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 10000 });
}
