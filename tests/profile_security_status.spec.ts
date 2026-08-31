import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe.serial('Profile Security Center Initial Status & Activation Flow', () => {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  let authToken = '';
  let userEmail = '';

  test.beforeAll(async ({ request }) => {
    const rand = Math.floor(Math.random() * 100000);
    userEmail = `newsecuser_${Date.now()}_${rand}@ledger.io`;
    const regRes = await request.post('http://localhost:7070/api/v1/auth/register', {
      data: {
        username: `newsec_${rand}`,
        email: userEmail,
        password: 'Password123!',
      },
    });
    const regData = await regRes.json();
    authToken = regData.data?.token || '';

    if (!authToken) {
      const logRes = await request.post('http://localhost:7070/api/v1/auth/login', {
        data: {
          email: userEmail,
          password: 'Password123!',
        },
      });
      const logData = await logRes.json();
      authToken = logData.data?.token || '';
    }
  });

  test('New account should show Inactive for 2FA, Transaction PIN, and Biometrics in Profile', async ({ page }) => {
    // Clear any previous biometric/storage in browser
    await page.addInitScript(({ token, email }) => {
      window.localStorage.clear();
      window.localStorage.setItem('auth_token', token);
      window.localStorage.setItem('authToken', token);
      window.localStorage.setItem('user_email', email);
      window.localStorage.setItem('user_language', 'id');
    }, { token: authToken, email: userEmail });

    await page.goto('http://localhost:7071/profile');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // 1. Verify User Profile is displayed
    const usernameElement = page.getByText(/newsec_/i).first();
    await expect(usernameElement).toBeVisible({ timeout: 10000 });

    // 2. Locate the 3 Security Rows
    const pinRow = page.locator('#profile-pin-row-btn');
    const bioRow = page.locator('#profile-biometric-row-btn');
    const twoFaRow = page.locator('#profile-2fa-row-btn');

    await expect(pinRow).toBeVisible();
    await expect(bioRow).toBeVisible();
    await expect(twoFaRow).toBeVisible();

    // 3. Verify all 3 show "Nonaktif" / "Inactive" for a fresh new account
    await expect(pinRow.getByText(/Nonaktif|Inactive/i)).toBeVisible();
    await expect(bioRow.getByText(/Nonaktif|Inactive/i)).toBeVisible();
    await expect(twoFaRow.getByText(/Nonaktif|Inactive/i)).toBeVisible();

    // 4. Capture screenshot of fresh account profile
    await page.screenshot({ path: path.join(screenshotsDir, '01_fresh_account_profile_security.png') });
  });

  test('Setting up 6-digit PIN dynamically activates PIN status badge to Active', async ({ page }) => {
    await page.addInitScript(({ token, email }) => {
      window.localStorage.setItem('auth_token', token);
      window.localStorage.setItem('authToken', token);
      window.localStorage.setItem('user_email', email);
      window.localStorage.setItem('user_language', 'id');
    }, { token: authToken, email: userEmail });

    await page.goto('http://localhost:7071/profile');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Click PIN row
    const pinRow = page.locator('#profile-pin-row-btn');
    await pinRow.click();
    await page.waitForTimeout(500);

    // Type 6-digit PIN
    const pinInput = page.locator('input[placeholder="6 digit angka"]').or(page.locator('input[type="password"]')).first();
    await expect(pinInput).toBeVisible({ timeout: 5000 });
    await pinInput.fill('654321');
    await page.waitForTimeout(300);

    // Click Save PIN
    const saveBtn = page.locator('#save-new-pin-btn');
    await saveBtn.click();
    await page.waitForTimeout(1500);

    // Verify PIN status badge is now "Aktif" / "Active"
    await expect(pinRow.getByText(/Aktif|Active/i)).toBeVisible({ timeout: 5000 });

    // 2FA and Biometric should STILL remain Inactive
    const bioRow = page.locator('#profile-biometric-row-btn');
    const twoFaRow = page.locator('#profile-2fa-row-btn');
    await expect(bioRow.getByText(/Nonaktif|Inactive/i)).toBeVisible();
    await expect(twoFaRow.getByText(/Nonaktif|Inactive/i)).toBeVisible();

    // Capture screenshot of updated profile with active PIN
    await page.screenshot({ path: path.join(screenshotsDir, '02_profile_pin_activated.png') });
  });
});
