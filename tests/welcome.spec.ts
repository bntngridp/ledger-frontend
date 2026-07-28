import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageLoad } from './helpers';

test.describe('Welcome Screen - Logo and Language Dropdown', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/welcome');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);
  });

  test('Should render Ledger brand logo and title proportionally', async ({ page }) => {
    // 🧪 Test: Verify brand logo image and title text are visible
    const logoImage = page.locator('img[src*="logo-leder"]').first();
    await expect(logoImage).toBeVisible({ timeout: 5000 });

    const brandTitle = page.getByText('Ledger', { exact: true }).first();
    await expect(brandTitle).toBeVisible();

    console.log('✅ PASS: Brand logo and title rendered correctly');
  });

  test('Should open language dropdown menu on trigger click', async ({ page }) => {
    // 🧪 Test: Verify clicking language badge opens the dropdown menu
    const dropdownTrigger = page.locator('[data-testid="language-dropdown-trigger"]').first();
    await dropdownTrigger.waitFor({ state: 'visible', timeout: 5000 });
    await dropdownTrigger.click();

    // Verify dropdown menu options appear
    const dropdownMenu = page.locator('[data-testid="language-dropdown-menu"]').first();
    await expect(dropdownMenu).toBeVisible({ timeout: 5000 });

    // Check language options are present
    await expect(page.getByText('English')).toBeVisible();
    await expect(page.getByText('Bahasa Indonesia')).toBeVisible();
    await expect(page.getByText('Español')).toBeVisible();

    console.log('✅ PASS: Language dropdown menu opens and displays all options');
  });

  test('Should change language directly when selecting an option from dropdown', async ({ page }) => {
    // 🧪 Test: Open dropdown and select 'Bahasa Indonesia'
    const dropdownTrigger = page.locator('[data-testid="language-dropdown-trigger"]').first();
    await dropdownTrigger.click();

    const idOption = page.locator('[data-testid="lang-option-id"]').first();
    await idOption.waitFor({ state: 'visible', timeout: 5000 });
    await idOption.click();

    // Verify trigger text updates to "ID"
    await expect(dropdownTrigger).toContainText('ID');

    // Verify UI translated text updates to Bahasa Indonesia
    const getStartedText = page.getByText('Mulai Sekarang').first();
    await expect(getStartedText).toBeVisible({ timeout: 5000 });

    const createAccountText = page.getByText('Buat Akun Baru').first();
    await expect(createAccountText).toBeVisible({ timeout: 5000 });

    console.log('✅ PASS: Language successfully switched to Bahasa Indonesia via dropdown picker and UI strings updated');
  });
});
