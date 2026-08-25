import { test, expect } from '@playwright/test';
import { waitForPageLoad } from './helpers';

const ARTIFACTS_DIR = '/Users/bintang/.gemini/antigravity-ide/brain/d0d8b7c6-21a7-4208-b808-47caaf68f71c/scratch';

test.describe.serial('Swap Equity Flow & Confirmation Modals', () => {
  let authToken = '';
  const testPin = '123456';

  test.beforeAll(async ({ request }) => {
    const uniqueNum = Date.now();
    const testEmail = `dubu_swap_${uniqueNum}@ledger.io`;
    const testPassword = 'Password123!';
    const testUsername = `dubu_swap_${uniqueNum.toString().slice(-4)}`;

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

    // 3. Setup PIN via /auth/pin/setup
    await request.post('http://localhost:7070/api/v1/auth/pin/setup', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { pin: testPin },
    });

    // 4. Settle IDR 1,000,000 topup
    const topupRes = await request.post('http://localhost:7070/api/v1/topup', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        amount: 1000000,
        payment_method: 'bank_transfer',
      },
    });
    const topupData = await topupRes.json();
    const txnId = topupData.data?.transaction_id;

    if (txnId) {
      await request.post('http://localhost:7070/api/v1/topup/simulate-settlement', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { transaction_id: txnId },
      });
    }

    // 5. Deposit 250 USDT to user
    const randTxHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    await request.post('http://localhost:7070/api/v1/crypto/simulate-deposit', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        asset_symbol: 'USDT',
        amount: 250,
        tx_hash: randTxHash,
        notes: 'Initial USDT seed for swap testing',
      },
    });
  });

  test('Swap IDR to USDT with full review confirmation modal, PIN verification, and result modal', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');
    await page.evaluate((tok) => {
      localStorage.setItem('auth_token', tok);
      localStorage.setItem('authToken', tok);
    }, authToken);

    await page.goto('/swap');
    await waitForPageLoad(page);
    await page.waitForTimeout(1500);

    // 1. Verify on Swap page and wait for balance to be loaded
    const fromInput = page.locator('[id="swap-from-amount-input"]').first();
    await expect(fromInput).toBeVisible();

    // Fill 100,000 IDR explicitly
    await fromInput.fill('100000');
    await page.waitForTimeout(800);

    // 2. Click Initiate Swap
    const submitBtn = page.locator('[id="swap-submit-btn"]');
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();
    await page.waitForTimeout(800);

    // 3. Verify Review Confirmation Modal is visible
    const reviewTitle = page.getByText('Konfirmasi Penukaran Aset').first();
    await expect(reviewTitle).toBeVisible();

    // Capture screenshot of Review Confirmation Modal
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/swap_01_review_modal_idr_to_usdt.png`,
    });
    console.log('✅ PASS: Swap review confirmation modal captured');

    // 4. Click "Konfirmasi & Lanjutkan"
    const confirmBtn = page.locator('[id="swap-review-confirm-btn"]');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();
    await page.waitForTimeout(800);

    // 5. Enter PIN in PinVerificationModal
    for (const digit of testPin) {
      const keyBtn = page.locator(`[id="pin-key-${digit}"]`);
      await keyBtn.click();
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(2000);

    // 6. Verify TransactionResultModal appears with Success
    const resultSuccess = page.getByText('Penukaran Aset Berhasil!').or(page.getByText('Transaksi Berhasil')).first();
    await expect(resultSuccess).toBeVisible();

    // Capture screenshot of Transaction Result Modal
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/swap_02_result_success_idr_to_usdt.png`,
    });
    console.log('✅ PASS: TransactionResultModal captured');

    // Close result modal
    const closeBtn = page.locator('[id="result-modal-close-btn"]').or(page.getByText('Tutup').first());
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
    await page.waitForTimeout(1000);
  });

  test('Swap USDT to USDC equity conversion', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');
    await page.evaluate((tok) => {
      localStorage.setItem('auth_token', tok);
      localStorage.setItem('authToken', tok);
    }, authToken);

    await page.goto('/swap');
    await waitForPageLoad(page);
    await page.waitForTimeout(1500);

    // 1. Select USDT as fromAsset
    const fromAssetBtn = page.locator('[id="swap-from-asset-btn"]');
    await fromAssetBtn.click();
    await page.waitForTimeout(400);

    const usdtOption = page.locator('[id="swap-asset-option-USDT"]');
    await usdtOption.click();
    await page.waitForTimeout(500);

    // 2. Select USDC as toAsset
    const toAssetBtn = page.locator('[id="swap-to-asset-btn"]');
    await toAssetBtn.click();
    await page.waitForTimeout(400);

    const usdcOption = page.locator('[id="swap-asset-option-USDC"]');
    await usdcOption.click();
    await page.waitForTimeout(500);

    // 3. Enter 10 USDT
    const fromInput = page.locator('[id="swap-from-amount-input"]').first();
    await fromInput.fill('10');
    await page.waitForTimeout(600);

    // 4. Initiate Swap
    const submitBtn = page.locator('[id="swap-submit-btn"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    await page.waitForTimeout(800);

    // 5. Verify Review Modal
    const reviewTitle = page.getByText('Konfirmasi Penukaran Aset').first();
    await expect(reviewTitle).toBeVisible();

    // 6. Proceed to PIN
    const confirmBtn = page.locator('[id="swap-review-confirm-btn"]');
    await confirmBtn.click();
    await page.waitForTimeout(800);

    // 7. Enter PIN
    for (const digit of testPin) {
      const keyBtn = page.locator(`[id="pin-key-${digit}"]`);
      await keyBtn.click();
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(2000);

    // 8. Verify Success
    const resultSuccess = page.getByText('Penukaran Aset Berhasil!').or(page.getByText('Transaksi Berhasil')).first();
    await expect(resultSuccess).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/swap_03_result_usdt_to_usdc.png`,
    });
    console.log('✅ PASS: USDT to USDC swap executed successfully');
  });
});
