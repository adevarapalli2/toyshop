import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@toyshop.com';
const ADMIN_PASSWORD = 'Admin@123';

test.describe('Authentication E2E', () => {
  test('login page renders branding and form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('ToyShop WMS').first()).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows error for wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill(ADMIN_EMAIL);
    await page.getByPlaceholder(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    // After failed login, user stays on /login — that itself confirms the error
    await expect(page).toHaveURL(/login/, { timeout: 8000 });
    // Check for any visible error-like element (Alert, message, or form validation)
    await expect(
      page.locator('.ant-alert, .ant-message-error, [role="alert"]').first()
        .or(page.getByText(/invalid|error|failed|credentials/i).first())
    ).toBeVisible({ timeout: 8000 });
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill(ADMIN_EMAIL);
    await page.getByPlaceholder(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  });

  test('Forgot password link navigates to forgot password page', async ({ page }) => {
    await page.goto('/login');
    await page.getByText(/forgot password/i).click();
    await expect(page).toHaveURL(/forgot-password/);
  });

  test('unauthenticated user is redirected from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/, { timeout: 8000 });
  });
});
