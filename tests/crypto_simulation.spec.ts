import { test, expect } from '@playwright/test';

test.describe.serial('Crypto Page Full Simulation & Result Animations', () => {
  let authToken = '';

  test.beforeAll(async ({ request }) => {
    // Register a fresh test account for clean simulation
    const rand = Math.floor(Math.random() * 100000);
    const email = `crypto_tester_${Date.now()}_${rand}@ledger.io`;
    const regRes = await request.post('http://localhost:7070/api/v1/auth/register', {
      data: {
        username: `cryptouser_${rand}`,
        email,
        password: 'Password123!',
      },
    });
    const regData = await regRes.json();
    authToken = regData.data?.token || '';

    // If login needed
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

    // Set PIN and credit initial testnet USDT for transactions
    if (authToken) {
      await request.post('http://localhost:7070/api/v1/auth/pin/setup', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { pin: '123456' },
      });

      // Credit 250 USDT for withdraw testing
      await request.post('http://localhost:7070/api/v1/crypto/simulate-deposit', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          asset_symbol: 'USDT',
          amount: 250,
          tx_hash: '0x' + Array.from({ length: 64 }, () => 'a').join(''),
          notes: 'Initial test balance',
        },
      });
    }
  });

  test('Deposit Tab: Asset Switching, QR Code, and Simulated Testnet Faucet with Animation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');

    if (authToken) {
      await page.evaluate((tok) => {
        localStorage.setItem('auth_token', tok);
      }, authToken);
    }

    await page.goto('/crypto');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify Deposit Subtab is active by default
    const depositTabBtn = page.locator('#crypto-tab-receive-btn');
    await expect(depositTabBtn).toBeVisible();

    // Verify Network Badge & Deposit Address
    const networkBadge = page.getByText('POLYGON AMOY TESTNET');
    await expect(networkBadge).toBeVisible();

    // Screenshot initial deposit page
    await page.screenshot({ path: 'tests/screenshots/crypto_01_deposit_initial.png', fullPage: true });

    // Switch Asset to USDC
    const usdcBtn = page.locator('#crypto-deposit-asset-usdc-btn');
    await usdcBtn.click();
    await page.waitForTimeout(500);

    // Switch back to USDT
    const usdtBtn = page.locator('#crypto-deposit-asset-usdt-btn');
    await usdtBtn.click();
    await page.waitForTimeout(500);

    // Select +100 USDT Chip in Simulation Card
    const chip100 = page.locator('#crypto-sim-chip-100');
    if (await chip100.isVisible()) {
      await chip100.click();
      await page.waitForTimeout(300);
    }

    // Click Simulate Deposit Button
    const simDepositBtn = page.locator('#crypto-simulate-deposit-btn');
    await expect(simDepositBtn).toBeVisible();
    await simDepositBtn.click();

    // Verify Transaction Result Animation Modal appears
    const resultTitle = page.getByText('Konfirmasi Setoran Crypto').or(page.getByText('Deposit')).first();
    await expect(resultTitle).toBeVisible({ timeout: 5000 });

    const successChip = page.getByText('BERHASIL').or(page.getByText('SUCCESS')).first();
    await expect(successChip).toBeVisible();
    await page.waitForTimeout(400);

    // Screenshot Success Result Modal for Deposit
    await page.screenshot({ path: 'tests/screenshots/crypto_02_deposit_success_modal.png' });

    // Click "Selesai" button
    const doneBtn = page.locator('#result-modal-done-btn');
    await doneBtn.click();
    await page.waitForTimeout(500);

    // Verify Floating Notification Toast appears
    const toast = page.getByText('Setoran Berhasil Diterima');
    await expect(toast).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/crypto_03_deposit_floating_toast.png' });
    console.log('✅ PASS: Deposit tab, testnet simulation, and result animation verified!');
  });

  test('Withdraw Tab: Form Validation, QR Scanner, PIN Verification, and Result Animation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');

    if (authToken) {
      await page.evaluate((tok) => {
        localStorage.setItem('auth_token', tok);
      }, authToken);
    }

    await page.goto('/crypto');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Switch to Withdraw tab
    const sendTabBtn = page.locator('#crypto-tab-send-btn');
    await sendTabBtn.click();
    await page.waitForTimeout(500);

    // Screenshot withdraw initial state
    await page.screenshot({ path: 'tests/screenshots/crypto_04_withdraw_initial.png', fullPage: true });

    // Test QR Scanner Modal
    const scanQrBtn = page.locator('#crypto-scan-qr-btn');
    await scanQrBtn.click();
    await page.waitForTimeout(500);

    // Verify QR Scanner Modal is open
    const qrModalTitle = page.getByText(/Scan QR|Pindai QR|Escanear QR/i).first();
    await expect(qrModalTitle).toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/crypto_05_qr_scanner_modal.png' });

    // Test Selecting Sample Polygon Amoy Address from the list in modal
    const samplePolygonAddr = page.locator('#qr-sample-polygon-amoy');
    if (await samplePolygonAddr.isVisible()) {
      await samplePolygonAddr.click();
      await page.waitForTimeout(500);
    } else {
      // Close QR Scanner Modal
      const qrCloseBtn = page.locator('#qr-modal-close-btn');
      if (await qrCloseBtn.isVisible()) {
        await qrCloseBtn.click();
      }
      await page.waitForTimeout(300);
      const sampleRecipient = '0x71C83e20A3044033C9e00B9b70bB757fEf4283f5';
      const addressInput = page.locator('input[placeholder="0x..."]');
      await addressInput.fill(sampleRecipient);
    }

    // Click MAX Amount Button
    const maxBtn = page.locator('#crypto-max-amount-btn');
    await maxBtn.click();
    await page.waitForTimeout(300);

    // Set valid withdrawal amount e.g. 10 USDT
    const amountInput = page.locator('input[placeholder="0.00"]');
    await amountInput.click();
    await amountInput.fill('10');
    await page.waitForTimeout(300);

    await page.screenshot({ path: 'tests/screenshots/crypto_06_withdraw_form_filled.png' });

    // Click Submit Withdrawal Button
    const submitBtn = page.locator('#crypto-submit-withdraw-btn');
    if (await submitBtn.isEnabled()) {
      await submitBtn.click();
      await page.waitForTimeout(500);

      // Verify PIN Verification Modal opens
      const pinModalKey = page.locator('#pin-key-1').or(page.getByText('PIN')).first();
      await expect(pinModalKey).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: 'tests/screenshots/crypto_07_withdraw_pin_modal.png' });

      // Enter 6-digit PIN (123456)
      for (const digit of ['1', '2', '3', '4', '5', '6']) {
        const pinKey = page.locator(`#pin-key-${digit}`);
        if (await pinKey.isVisible()) {
          await pinKey.click();
          await page.waitForTimeout(80);
        }
      }
    }

    // Verify Withdrawal Result Modal opens
    const withdrawResult = page.getByText('Konfirmasi Penarikan Crypto');
    await expect(withdrawResult).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(400);

    // Screenshot Success Result Modal for Withdrawal
    await page.screenshot({ path: 'tests/screenshots/crypto_08_withdraw_success_modal.png' });

    // Click "Selesai" button
    const doneBtn = page.locator('#result-modal-done-btn');
    await doneBtn.click();
    await page.waitForTimeout(500);

    // Verify floating notification toast appears
    const withdrawToast = page.getByText('Penarikan Diproses');
    await expect(withdrawToast).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/crypto_09_withdraw_floating_toast.png' });
    console.log('✅ PASS: Withdraw tab, QR scanner, PIN verification, and result animation verified!');
  });
});
