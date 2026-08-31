import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

function getTOTP(secretBase32: string): string {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (let i = 0; i < secretBase32.length; i++) {
    const val = base32chars.indexOf(secretBase32.charAt(i).toUpperCase());
    if (val >= 0) bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  const key = Buffer.from(bytes);
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(epoch / 30);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(timeStep));

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(timeBuffer);
  const digest = hmac.digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code =
    (((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff)) %
    1000000;
  return code.toString().padStart(6, '0');
}

test.describe('Dual 2FA & Email OTP Payment & Withdrawal Security Flow', () => {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  test('1. Should show PIN fallback modal when 2FA is not enabled on transfer', async ({ page }) => {
    const randomSuffix = Math.floor(Math.random() * 100000);
    const email = `testuser_nopk_${randomSuffix}@ledger.local`;
    const username = `user_nopk_${randomSuffix}`;
    const password = 'Password123!';

    // Register user via API
    const regRes = await page.request.post('http://localhost:7070/api/v1/auth/register', {
      data: { username, email, password },
    });
    expect(regRes.ok()).toBeTruthy();

    // Login via API to get token
    const loginRes = await page.request.post('http://localhost:7070/api/v1/auth/login', {
      data: { email, password },
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.token || loginData.token;
    expect(token).toBeTruthy();

    // Top up balance
    const topUpRes = await page.request.post('http://localhost:7070/api/v1/topup', {
      headers: { Authorization: `Bearer ${token}` },
      data: { amount: 500000, notes: 'Initial balance' },
    });
    expect(topUpRes.ok()).toBeTruthy();
    const topUpData = await topUpRes.json();
    const txId = topUpData.data?.transaction_id || topUpData.transaction_id;

    if (txId) {
      await page.request.post('http://localhost:7070/api/v1/topup/simulate-settlement', {
        headers: { Authorization: `Bearer ${token}` },
        data: { transaction_id: txId },
      });
    }

    // Set token in browser before page load
    await page.addInitScript((jwt) => {
      window.localStorage.setItem('auth_token', jwt);
      window.localStorage.setItem('authToken', jwt);
    }, token);

    await page.goto('http://localhost:7071/transfer');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Fill transfer inputs
    const recipientInput = page.locator('#transfer-recipient-input');
    await expect(recipientInput).toBeVisible({ timeout: 10000 });
    await recipientInput.fill('43f542bd-230a-4eda-a242-f0283e71ba5c');

    const amountInput = page.locator('#transfer-amount-input');
    await expect(amountInput).toBeVisible();
    await amountInput.fill('10000');

    // Click review button
    const reviewBtn = page.locator('#transfer-review-btn');
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();
    await page.waitForTimeout(500);

    // Click confirm in review modal
    const confirmSendBtn = page.locator('#transfer-confirm-send-btn');
    await expect(confirmSendBtn).toBeVisible();
    await confirmSendBtn.click();
    await page.waitForTimeout(500);

    // Verify PIN modal is displayed (since 2FA is not enabled)
    await expect(page.getByText(/PIN KEAMANAN|Verifikasi PIN Transaksi/i).first()).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, '01_transfer_pin_mode.png') });
  });

  test('2. Should show Dual 2FA & Email OTP Modal on Transfer & Withdraw when 2FA is active', async ({ page }) => {
    const randomSuffix = Math.floor(Math.random() * 100000);
    const email = `testuser_2fa_${randomSuffix}@ledger.local`;
    const username = `user_2fa_${randomSuffix}`;
    const password = 'Password123!';

    // Register user via API
    const regRes = await page.request.post('http://localhost:7070/api/v1/auth/register', {
      data: { username, email, password },
    });
    expect(regRes.ok()).toBeTruthy();

    // Login via API to get token
    const loginRes = await page.request.post('http://localhost:7070/api/v1/auth/login', {
      data: { email, password },
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.token || loginData.token;
    expect(token).toBeTruthy();

    // Top up balance
    const topUpRes = await page.request.post('http://localhost:7070/api/v1/topup', {
      headers: { Authorization: `Bearer ${token}` },
      data: { amount: 500000, notes: 'Initial balance' },
    });
    expect(topUpRes.ok()).toBeTruthy();
    const topUpData = await topUpRes.json();
    const txId = topUpData.data?.transaction_id || topUpData.transaction_id;

    if (txId) {
      await page.request.post('http://localhost:7070/api/v1/topup/simulate-settlement', {
        headers: { Authorization: `Bearer ${token}` },
        data: { transaction_id: txId },
      });
    }

    // Enable 2FA on this user via API
    const enableRes = await page.request.post('http://localhost:7070/api/v1/auth/2fa/enable', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(enableRes.ok()).toBeTruthy();
    const enableData = await enableRes.json();
    const secret = enableData.data.secret;

    // Verify 2FA to complete activation
    const totpCode = getTOTP(secret);
    const verifyRes = await page.request.post('http://localhost:7070/api/v1/auth/2fa/verify', {
      headers: { Authorization: `Bearer ${token}` },
      data: { code: totpCode },
    });
    expect(verifyRes.ok()).toBeTruthy();

    // Send payment OTP
    const otpSendRes = await page.request.post('http://localhost:7070/api/v1/auth/payment/email-otp/send', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(otpSendRes.ok()).toBeTruthy();

    // Set token in browser before page load
    await page.addInitScript((jwt) => {
      window.localStorage.setItem('auth_token', jwt);
      window.localStorage.setItem('authToken', jwt);
    }, token);

    await page.goto('http://localhost:7071/transfer');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Fill transfer inputs
    const recipientInput = page.locator('#transfer-recipient-input');
    await expect(recipientInput).toBeVisible({ timeout: 10000 });
    await recipientInput.fill('43f542bd-230a-4eda-a242-f0283e71ba5c');

    const amountInput = page.locator('#transfer-amount-input');
    await expect(amountInput).toBeVisible();
    await amountInput.fill('15000');

    // Click review button
    const reviewBtn = page.locator('#transfer-review-btn');
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();
    await page.waitForTimeout(500);

    // Click confirm in review modal
    const confirmSendBtn = page.locator('#transfer-confirm-send-btn');
    await expect(confirmSendBtn).toBeVisible();
    await confirmSendBtn.click();
    await page.waitForTimeout(600);

    // Verify that the Dual 2FA & Email OTP Modal is shown!
    await expect(page.getByText(/2FA \+ EMAIL OTP AKTIF/i).first()).toBeVisible();
    await expect(page.locator('#payment-2fa-code-input')).toBeVisible();
    await expect(page.locator('#payment-email-otp-input')).toBeVisible();
    await expect(page.locator('#payment-send-otp-btn')).toBeVisible();
    await expect(page.locator('#payment-security-confirm-btn')).toBeVisible();

    // Verify error validation when empty
    await page.locator('#payment-security-confirm-btn').click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/Kode 2FA Authenticator wajib diisi|2FA Authenticator code is required/i).first()).toBeVisible();

    // Take screenshot of Dual 2FA Modal on Transfer
    await page.screenshot({ path: path.join(screenshotsDir, '02_transfer_dual_2fa_modal.png') });

    // Close modal
    await page.locator('#payment-security-cancel-btn').click();
    await page.waitForTimeout(500);

    // Now test Withdraw Screen with 2FA
    await page.goto('http://localhost:7071/withdraw');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const accNumInput = page.locator('#withdraw-account-number-input');
    await expect(accNumInput).toBeVisible({ timeout: 10000 });
    await accNumInput.fill('1234567890');

    const accNameInput = page.locator('#withdraw-account-name-input');
    await expect(accNameInput).toBeVisible();
    await accNameInput.fill('Bintang Test');

    const withdrawAmtInput = page.locator('#withdraw-amount-input');
    await expect(withdrawAmtInput).toBeVisible();
    await withdrawAmtInput.fill('50000');

    const withdrawSubmitBtn = page.locator('#withdraw-submit-btn');
    await expect(withdrawSubmitBtn).toBeVisible();
    await withdrawSubmitBtn.click();
    await page.waitForTimeout(500);

    const withdrawConfirmBtn = page.locator('#withdraw-confirm-btn');
    await expect(withdrawConfirmBtn).toBeVisible();
    await withdrawConfirmBtn.click();
    await page.waitForTimeout(600);

    // Verify Dual 2FA & Email OTP Modal on Withdraw
    await expect(page.getByText(/2FA \+ EMAIL OTP AKTIF/i).first()).toBeVisible();
    await expect(page.locator('#payment-2fa-code-input')).toBeVisible();
    await expect(page.locator('#payment-email-otp-input')).toBeVisible();

    // Take screenshot of Dual 2FA Modal on Withdraw
    await page.screenshot({ path: path.join(screenshotsDir, '03_withdraw_dual_2fa_modal.png') });
  });
});
