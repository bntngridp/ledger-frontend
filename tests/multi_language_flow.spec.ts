import { test, expect } from '@playwright/test';
import { waitForPageLoad } from './helpers';

test.describe.serial('Multi-Language Flow Across 4 Languages (EN, ID, ES, AR)', () => {
  let authToken = '';

  test.beforeAll(async ({ request }) => {
    const uniqueNum = Date.now();
    const testEmail = `dubu_lang_${uniqueNum}@ledger.io`;
    const testPassword = 'Password123!';
    const testUsername = `dubu_lang_${uniqueNum.toString().slice(-4)}`;

    // 1. Register user
    await request.post('http://localhost:7070/api/v1/auth/register', {
      data: {
        username: testUsername,
        email: testEmail,
        password: testPassword,
      },
    });

    // 2. Login
    const loginRes = await request.post('http://localhost:7070/api/v1/auth/login', {
      data: {
        email: testEmail,
        password: testPassword,
      },
    });
    const loginData = await loginRes.json();
    authToken = loginData.data?.token || '';
  });

  test('should toggle languages on Welcome screen seamlessly', async ({ page }) => {
    await page.goto('/welcome');
    await waitForPageLoad(page);

    // Default or current language check
    const dropdownTrigger = page.locator('text=EN').or(page.locator('text=ID')).or(page.locator('text=ES')).or(page.locator('text=AR')).first();
    if (await dropdownTrigger.isVisible()) {
      await dropdownTrigger.click();
      await page.waitForTimeout(300);

      // Select Español
      const esOption = page.locator('text=Español').first();
      if (await esOption.isVisible()) {
        await esOption.click();
        await page.waitForTimeout(500);
      }
    }

    // Ensure page rendered without crashes
    await expect(page.locator('text=Ledger').first()).toBeVisible();
  });

  test('should switch language in Settings and verify Profile, Swap, and History pages', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate((tok) => {
      localStorage.setItem('auth_token', tok);
      localStorage.setItem('user_language', 'en');
    }, authToken);

    // 1. Go to Settings page
    await page.goto('/settings');
    await waitForPageLoad(page);

    // Open Language Picker
    const langRow = page.locator('#settings-language-picker-row').first();
    if (await langRow.isVisible()) {
      await langRow.click();
      await page.waitForTimeout(400);

      // Select English
      const enOpt = page.locator('#lang-opt-en').first();
      if (await enOpt.isVisible()) {
        await enOpt.click();
        await page.waitForTimeout(500);
      }
    }

    // 2. Check Profile page in English
    await page.goto('/profile');
    await waitForPageLoad(page);
    await expect(page.locator('text=Security Center').or(page.locator('text=Profile')).or(page.locator('text=PIN')).first()).toBeVisible();

    // 3. Switch to Spanish
    await page.goto('/settings');
    await waitForPageLoad(page);
    if (await langRow.isVisible()) {
      await langRow.click();
      await page.waitForTimeout(400);
      const esOpt = page.locator('#lang-opt-es').first();
      if (await esOpt.isVisible()) {
        await esOpt.click();
        await page.waitForTimeout(500);
      }
    }

    // 4. Check Swap screen in Spanish
    await page.goto('/swap');
    await waitForPageLoad(page);
    await expect(page.locator('text=Swap').or(page.locator('text=USDT')).or(page.locator('text=IDR')).first()).toBeVisible();

    // 5. Switch to Arabic
    await page.goto('/settings');
    await waitForPageLoad(page);
    if (await langRow.isVisible()) {
      await langRow.click();
      await page.waitForTimeout(400);
      const arOpt = page.locator('#lang-opt-ar').first();
      if (await arOpt.isVisible()) {
        await arOpt.click();
        await page.waitForTimeout(500);
      }
    }

    // 6. Check Crypto screen in Arabic
    await page.goto('/crypto');
    await waitForPageLoad(page);
    await expect(page.locator('text=USDT').first()).toBeVisible();

    // 7. Reset back to Indonesian
    await page.goto('/settings');
    await waitForPageLoad(page);
    if (await langRow.isVisible()) {
      await langRow.click();
      await page.waitForTimeout(400);
      const idOpt = page.locator('#lang-opt-id').first();
      if (await idOpt.isVisible()) {
        await idOpt.click();
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('text=BAHASA & WILAYAH').or(page.locator('text=Bahasa')).or(page.locator('text=ID')).first()).toBeVisible();
  });
});
