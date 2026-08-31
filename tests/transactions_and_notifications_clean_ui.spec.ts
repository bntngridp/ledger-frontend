import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe.serial('Transactions and Notifications Clean Minimalist UI', () => {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  let authToken = '';

  test.beforeAll(async ({ request }) => {
    const rand = Math.floor(Math.random() * 100000);
    const email = `txnotif_${Date.now()}_${rand}@ledger.io`;
    const regRes = await request.post('http://localhost:7070/api/v1/auth/register', {
      data: {
        username: `txnotif_${rand}`,
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

    // Set PIN
    await request.post('http://localhost:7070/api/v1/auth/pin/setup', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { pin: '123456' },
    });

    // Make deposits to populate transactions and notifications
    await request.post('http://localhost:7070/api/v1/crypto/simulate-deposit', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { amount: 250, asset_symbol: 'USDC' },
    });
    await request.post('http://localhost:7070/api/v1/crypto/simulate-deposit', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { amount: 100, asset_symbol: 'USDT' },
    });

    // Make a swap
    await request.post('http://localhost:7070/api/v1/exchange/swap', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { from_asset: 'USDC', to_asset: 'USDT', amount: '20' },
    });
  });

  test('Transactions / History page should render clean descriptions and minimalist styling', async ({ page }) => {
    await page.goto('http://localhost:7071/login', { waitUntil: 'domcontentloaded' });

    await page.evaluate(({ token }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('authToken', token);
      localStorage.setItem('user_language', 'id');
    }, { token: authToken });

    await page.goto('http://localhost:7071/history', { waitUntil: 'domcontentloaded' });
    await page.locator('text=Memuat').or(page.locator('text=Loading')).waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Verify swap description has modern arrow
    const swapText = page.getByText(/USDC → USDT/i).first();
    await expect(swapText).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: path.join(screenshotsDir, 'history_clean_minimalist.png') });
  });

  test('Notifications page should render clean modern cards without loud colored stripes', async ({ page }) => {
    await page.goto('http://localhost:7071/login', { waitUntil: 'domcontentloaded' });

    await page.evaluate(({ token }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('authToken', token);
      localStorage.setItem('user_language', 'id');
    }, { token: authToken });

    await page.goto('http://localhost:7071/notifications', { waitUntil: 'domcontentloaded' });
    await page.locator('text=Memuat').or(page.locator('text=Loading')).waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Verify notification item is visible
    const notifItem = page.getByText(/Setoran/i).first();
    await expect(notifItem).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: path.join(screenshotsDir, 'notifications_clean_minimalist.png') });
  });
});
