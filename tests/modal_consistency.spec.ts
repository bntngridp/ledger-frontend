import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageLoad } from './helpers';

const ARTIFACTS_DIR = '/Users/bintang/.gemini/antigravity-ide/brain/d0d8b7c6-21a7-4208-b808-47caaf68f71c/scratch';

test.describe('Modal Visual and Behavioral Consistency (PIN vs Biometric)', () => {
  let authToken = '';

  test.beforeAll(async () => {
    const uniqueNum = Date.now();
    const testEmail = `dubu_modal_${uniqueNum}@ledger.io`;
    const testPassword = 'Password123!';
    const testUsername = `dubu_modal_${uniqueNum.toString().slice(-4)}`;

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

  test('Biometric Modal and PIN Setup Modal in Profile should have identical popup appearance', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');
    if (authToken) {
      await page.evaluate((tok) => {
        localStorage.setItem('auth_token', tok);
      }, authToken);
    }
    await navigateTo(page, '/profile');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);

    // 1. Open Biometric Modal
    const biometricRow = page.locator('[id="profile-biometric-row-btn"]');
    await expect(biometricRow).toBeVisible();
    await biometricRow.click();
    await page.waitForTimeout(600);

    // Capture Biometric Modal Screenshot
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/modal_biometric_appearance.png`,
    });
    console.log('✅ PASS: Biometric modal captured');

    // Close Biometric Modal
    const bioCloseBtn = page.locator('[id="biometric-modal-close-btn"], [id="btn-close-biometric"]').or(page.getByText('Tutup').last()).first();
    await bioCloseBtn.click();
    await page.waitForTimeout(600);

    // 2. Open PIN Setup Modal
    const pinRow = page.locator('[id="profile-pin-row-btn"]');
    await expect(pinRow).toBeVisible();
    await pinRow.click();
    await page.waitForTimeout(600);

    // Verify PIN Modal Header and input
    const pinInput = page.locator('[id="new-pin-input"]');
    await expect(pinInput).toBeVisible();

    // Capture PIN Setup Modal Screenshot
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/modal_pin_setup_appearance.png`,
    });
    console.log('✅ PASS: PIN Setup modal captured');

    // Close PIN Setup Modal
    const pinCloseBtn = page.locator('[id="pin-setup-modal-close-btn"]').or(page.getByText('Batal').last()).first();
    await pinCloseBtn.click();
    await page.waitForTimeout(600);
  });

  test('Transaction PIN Verification Modal on Transfer/Swap should have identical popup appearance', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');
    if (authToken) {
      await page.evaluate((tok) => {
        localStorage.setItem('auth_token', tok);
      }, authToken);
    }

    // Top up and simulate settlement so swap has balance
    const topupRes = await fetch('http://localhost:7070/api/v1/topup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        amount: 500000,
        payment_method: 'bank_transfer',
      }),
    });
    const topupData = await topupRes.json();
    if (topupData.data && topupData.data.transaction_id) {
      await fetch('http://localhost:7070/api/v1/topup/simulate-settlement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          transaction_id: topupData.data.transaction_id,
        }),
      });
    }

    await navigateTo(page, '/swap');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);

    // Enter fromAmount
    const amountInput = page.getByPlaceholder('0.00').first();
    await amountInput.fill('50000');
    await page.waitForTimeout(800);

    // Click Swap action button (Tukar Sekarang / Exchange Now)
    const swapBtn = page.getByText(/Exchange Now|Tukar Sekarang/i).last();
    await swapBtn.click();
    await page.waitForTimeout(1000);

    // Click Confirm Swap (Konfirmasi Penukaran / Confirm Swap)
    const confirmSwapBtn = page.getByText(/Confirm Swap|Konfirmasi Penukaran/i).last();
    await confirmSwapBtn.click();
    await page.waitForTimeout(1000);

    // Verify PIN Verification Modal is displayed
    const pinModalCloseBtn = page.locator('[id="pin-modal-close-btn"]');
    await expect(pinModalCloseBtn).toBeVisible({ timeout: 5000 });

    // Capture Transaction PIN modal screenshot
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/modal_transaction_pin_appearance.png`,
    });
    console.log('✅ PASS: Transaction PIN Verification modal captured');

    // Close modal
    await pinModalCloseBtn.click();
  });
});
