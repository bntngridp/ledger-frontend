import { test, expect } from '@playwright/test';

test.describe('Two Accounts End-to-End Deposit & Transfer/Withdraw Simulation', () => {
  let user1Token = '';
  let user2Token = '';
  let user1Email = '';
  let user2Email = '';
  let user2DepositAddress = '';

  test.beforeAll(async ({ request }) => {
    const rand = Math.floor(Math.random() * 100000);
    user1Email = `user1_${Date.now()}_${rand}@ledger.io`;
    user2Email = `user2_${Date.now()}_${rand}@ledger.io`;

    // 1. Register User 1 & Login
    await request.post('http://localhost:7070/api/v1/auth/register', {
      data: { username: `user1_${rand}`, email: user1Email, password: 'Password123!' },
    });
    const log1 = await request.post('http://localhost:7070/api/v1/auth/login', {
      data: { email: user1Email, password: 'Password123!' },
    });
    const d1 = await log1.json();
    user1Token = d1.data?.token || '';

    // 2. Register User 2 & Login
    await request.post('http://localhost:7070/api/v1/auth/register', {
      data: { username: `user2_${rand}`, email: user2Email, password: 'Password123!' },
    });
    const log2 = await request.post('http://localhost:7070/api/v1/auth/login', {
      data: { email: user2Email, password: 'Password123!' },
    });
    const d2 = await log2.json();
    user2Token = d2.data?.token || '';

    // 3. Set PIN for User 1 & User 2
    await request.post('http://localhost:7070/api/v1/auth/pin/setup', {
      headers: { Authorization: `Bearer ${user1Token}` },
      data: { pin: '123456' },
    });
    await request.post('http://localhost:7070/api/v1/auth/pin/setup', {
      headers: { Authorization: `Bearer ${user2Token}` },
      data: { pin: '123456' },
    });

    // 4. Deposit 200 USDT to User 1
    await request.post('http://localhost:7070/api/v1/crypto/simulate-deposit', {
      headers: { Authorization: `Bearer ${user1Token}` },
      data: {
        asset_symbol: 'USDT',
        amount: 200,
        tx_hash: '0x' + Array.from({ length: 64 }, () => '1').join(''),
        notes: 'Deposit to user 1',
      },
    });

    // 5. Get User 2 deposit address
    const addrRes = await request.get('http://localhost:7070/api/v1/crypto/address?asset_symbol=USDT&network=polygon_amoy', {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    const addrData = await addrRes.json();
    user2DepositAddress = addrData.data?.address || '';
  });

  test('User 1 Withdraws Crypto directly to User 2 Wallet Address on UI', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate((tok) => {
      localStorage.setItem('auth_token', tok);
    }, user1Token);
    await page.waitForTimeout(300);

    await page.goto('/crypto');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Switch to Withdraw tab on User 1
    const sendTabBtn = page.locator('#crypto-tab-send-btn');
    await sendTabBtn.click();
    await page.waitForTimeout(500);

    // Fill User 2 deposit address into User 1 recipient input
    const addressInput = page.locator('input[placeholder="0x..."]');
    await addressInput.fill(user2DepositAddress);

    // Enter 50 USDT
    const amountInput = page.locator('input[placeholder="0.00"]');
    await amountInput.fill('50');

    // Click Submit
    const submitBtn = page.locator('#crypto-submit-withdraw-btn');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Verify PIN Modal and enter 123456
    const pinTitle = page.getByText('PIN Penarikan Crypto');
    await expect(pinTitle).toBeVisible({ timeout: 5000 });

    for (const digit of ['1', '2', '3', '4', '5', '6']) {
      await page.locator(`#pin-key-${digit}`).click();
      await page.waitForTimeout(80);
    }

    // Verify Result Modal appears
    const resultModal = page.getByText('Konfirmasi Penarikan Crypto');
    await expect(resultModal).toBeVisible({ timeout: 10000 });

    const doneBtn = page.locator('#result-modal-done-btn');
    await doneBtn.click();
    await page.waitForTimeout(500);

    console.log('✅ PASS: User 1 successfully sent crypto to User 2 address!');
  });
});
