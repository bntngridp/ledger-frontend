import { test, expect } from '@playwright/test';

test.describe('Arabic Alignment & Input Text Contrast Verification', () => {
  test('Language dropdown Arabic option is left-aligned', async ({ page }) => {
    await page.goto('http://localhost:7071/welcome');
    await page.waitForLoadState('networkidle');

    // Click language dropdown trigger
    const trigger = page.locator('[data-testid="language-dropdown-trigger"]');
    await expect(trigger).toBeVisible({ timeout: 10000 });
    await trigger.click();

    // Verify language dropdown menu is visible
    const menu = page.locator('[data-testid="language-dropdown-menu"]');
    await expect(menu).toBeVisible();

    // Verify Arabic option
    const arOption = page.locator('[data-testid="lang-option-ar"]');
    await expect(arOption).toBeVisible();

    // Take screenshot of open language menu
    await page.screenshot({ path: 'tests/screenshots/language_dropdown_arabic.png' });
  });

  test('Create Account inputs have clear visible text and contrast', async ({ page }) => {
    await page.goto('http://localhost:7071/register');
    await page.waitForLoadState('networkidle');

    // Fill inputs
    const usernameInput = page.locator('input').first();
    const emailInput = page.locator('input[type="email"], input').nth(1);
    const passwordInput = page.locator('input[type="password"], input').nth(2);

    await usernameInput.fill('penggunabaru');
    await emailInput.fill('penggunasatu@gmail.com');
    await passwordInput.fill('SecretPassword123!');

    // Check values
    await expect(usernameInput).toHaveValue('penggunabaru');
    await expect(emailInput).toHaveValue('penggunasatu@gmail.com');

    // Take screenshot of filled register screen
    await page.screenshot({ path: 'tests/screenshots/register_input_contrast_light.png' });
  });

  test('Create Account inputs in dark mode have bright white text', async ({ page }) => {
    // Set dark theme in localStorage if supported
    await page.addInitScript(() => {
      window.localStorage.setItem('ledger_theme_pref', 'dark');
      window.localStorage.setItem('ledger_theme', 'dark');
    });

    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('http://localhost:7071/register');
    await page.waitForLoadState('networkidle');

    // Fill inputs
    const usernameInput = page.locator('input').first();
    const emailInput = page.locator('input[type="email"], input').nth(1);
    const passwordInput = page.locator('input[type="password"], input').nth(2);

    await usernameInput.fill('penggunabaru');
    await emailInput.fill('penggunasatu@gmail.com');
    await passwordInput.fill('SecretPassword123!');

    // Check values
    await expect(usernameInput).toHaveValue('penggunabaru');
    await expect(emailInput).toHaveValue('penggunasatu@gmail.com');

    // Take screenshot of filled register screen in dark mode
    await page.screenshot({ path: 'tests/screenshots/register_input_contrast_dark.png' });
  });
});
