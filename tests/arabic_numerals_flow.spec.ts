import { test, expect } from '@playwright/test';

const ARTIFACTS_DIR = '/Users/bintang/.gemini/antigravity-ide/brain/d0d8b7c6-21a7-4208-b808-47caaf68f71c/scratch';

test.describe.serial('Arabic Numerals & Layout Flow', () => {
  let authToken = '';
  const testPin = '123456';

  test.beforeAll(async ({ request }) => {
    const uniqueNum = Date.now();
    const testEmail = `ar_num_${uniqueNum}@ledger.io`;
    const testPassword = 'Password123!';
    const testUsername = `ar_num_${uniqueNum.toString().slice(-4)}`;

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

    // 4. Settle IDR topup
    const topupRes = await request.post('http://localhost:7070/api/v1/topup', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        amount: 2500000,
        payment_method: 'bank_transfer',
      },
    });
    const topupData = await topupRes.json();
    const txnId = topupData.data?.transaction_id;

    if (txnId) {
      await request.post('http://localhost:7070/api/v1/topup/webhook', {
        data: {
          order_id: txnId,
          transaction_status: 'settlement',
          gross_amount: '2500000.00',
        },
      });
    }

    // 5. Simulate Deposit 100 USDT
    await request.post('http://localhost:7070/api/v1/crypto/simulate-deposit', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        asset_symbol: 'USDT',
        amount: 100,
      },
    });
  });

  test('Single Session: Capture all pages in Arabic with Eastern Arabic numerals', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('http://localhost:7071');
    await page.waitForLoadState('networkidle');

    await page.evaluate(({ token }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_language', 'ar');
    }, { token: authToken });

    // 1. Dashboard
    await page.goto('http://localhost:7071');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${ARTIFACTS_DIR}/142_dashboard_arabic_numerals.png`, fullPage: true });
    console.log('✅ Dashboard captured');

    // 2. History
    await page.goto('http://localhost:7071/history');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${ARTIFACTS_DIR}/140_history_arabic_numerals.png`, fullPage: true });
    console.log('✅ History captured');

    // 3. Swap
    await page.goto('http://localhost:7071/swap');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${ARTIFACTS_DIR}/141_swap_arabic_numerals.png`, fullPage: true });
    console.log('✅ Swap captured');

    // 4. Crypto
    await page.goto('http://localhost:7071/crypto');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${ARTIFACTS_DIR}/143_crypto_arabic_numerals.png`, fullPage: true });
    console.log('✅ Crypto captured');

    // 5. Profile
    await page.goto('http://localhost:7071/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${ARTIFACTS_DIR}/144_profile_arabic_numerals.png`, fullPage: true });
    console.log('✅ Profile captured');
  });
});
