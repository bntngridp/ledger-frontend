import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Swap Modern Minimalist Rate Banner Verification', () => {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  let authToken = '';

  test.beforeAll(async ({ request }) => {
    const rand = Math.floor(Math.random() * 100000);
    const email = `swap_tester_${Date.now()}_${rand}@ledger.io`;
    const regRes = await request.post('http://localhost:7070/api/v1/auth/register', {
      data: {
        username: `swapuser_${rand}`,
        email,
        password: 'Password123!',
      },
    });
    const regData = await regRes.json();
    authToken = regData.data?.token || '';

    if (!authToken) {
      const logRes = await request.post('http://localhost:7070/api/v1/auth/login', {
        data: {
          email,
          password: 'Password123!',
        },
      });
      const logData = await logRes.json();
      authToken = logData.data?.token || '';
    }
  });

  test('Should render clean minimalist rate banner and update on flip', async ({ page }) => {
    await page.addInitScript((token) => {
      window.localStorage.setItem('auth_token', token);
      window.localStorage.setItem('authToken', token);
    }, authToken);

    await page.goto('http://localhost:7071/swap');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Verify "Current Asset Pairing" is NOT present
    await expect(page.getByText('Current Asset Pairing')).not.toBeVisible();
    await expect(page.getByText('Nilai Tukar Saat Ini')).not.toBeVisible();

    // Verify Rate text is visible
    const rateText = page.getByText(/1 IDR =|1 USDT =/i).first();
    await expect(rateText).toBeVisible();

    // Screenshot initial Swap page with clean rate banner
    await page.screenshot({ path: path.join(screenshotsDir, 'swap_modern_rate_banner_dark.png') });

    // Click flip button
    const flipBtn = page.locator('#swap-flip-btn');
    await expect(flipBtn).toBeVisible();
    await flipBtn.click();
    await page.waitForTimeout(600);

    // Screenshot flipped state
    await page.screenshot({ path: path.join(screenshotsDir, 'swap_modern_rate_banner_flipped.png') });
  });
});
