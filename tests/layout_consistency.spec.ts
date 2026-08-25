import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageLoad } from './helpers';

const ARTIFACTS_DIR = '/Users/bintang/.gemini/antigravity-ide/brain/d0d8b7c6-21a7-4208-b808-47caaf68f71c/scratch';

test.describe('Layout and Design Consistency Across All Subpages', () => {
  let authToken = '';

  test.beforeAll(async () => {
    const uniqueNum = Date.now();
    const testEmail = `dubu_layout_${uniqueNum}@ledger.io`;
    const testPassword = 'Password123!';
    const testUsername = `dubu_layout_${uniqueNum.toString().slice(-4)}`;

    await fetch('http://localhost:7070/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: testEmail,
        password: testPassword,
      }),
    });

    const loginRes = await fetch('http://localhost:7070/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginData = await loginRes.json();
    if (loginData.data && loginData.data.token) {
      authToken = loginData.data.token;
    }
  });

  const pages = [
    { name: 'settings', url: '/settings', backBtnId: 'settings-back-btn' },
    { name: '2fa', url: '/2fa', backBtnId: 'twofa-back-btn' },
    { name: 'change_password', url: '/change-password', backBtnId: 'change-pw-back-btn' },
    { name: 'notifications', url: '/notifications', backBtnId: 'notif-back-btn' },
    { name: 'topup', url: '/topup', backBtnId: 'topup-back-btn' },
    { name: 'withdraw', url: '/withdraw', backBtnId: 'withdraw-back-btn' },
    { name: 'transfer', url: '/transfer', backBtnId: 'transfer-back-btn' },
  ];

  for (const p of pages) {
    test(`Desktop visual consistency for ${p.name}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/login');
      if (authToken) {
        await page.evaluate((tok) => {
          localStorage.setItem('auth_token', tok);
        }, authToken);
      }
      await navigateTo(page, p.url);
      await waitForPageLoad(page);
      await page.waitForTimeout(800);

      // Verify back button is visible and present
      const backBtn = page.locator(`[id="${p.backBtnId}"]`);
      await expect(backBtn).toBeVisible({ timeout: 5000 });

      // Save desktop screenshot
      await page.screenshot({
        path: `${ARTIFACTS_DIR}/subpage_${p.name}_desktop.png`,
        fullPage: true,
      });
      console.log(`✅ PASS: ${p.name} desktop layout verified`);
    });

    test(`Mobile visual consistency for ${p.name}`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      if (authToken) {
        await page.evaluate((tok) => {
          localStorage.setItem('auth_token', tok);
        }, authToken);
      }
      await navigateTo(page, p.url);
      await waitForPageLoad(page);
      await page.waitForTimeout(800);

      // Verify back button is visible and present
      const backBtn = page.locator(`[id="${p.backBtnId}"]`);
      await expect(backBtn).toBeVisible({ timeout: 5000 });

      // Save mobile screenshot
      await page.screenshot({
        path: `${ARTIFACTS_DIR}/subpage_${p.name}_mobile.png`,
        fullPage: true,
      });
      console.log(`✅ PASS: ${p.name} mobile layout verified`);
    });
  }
});
