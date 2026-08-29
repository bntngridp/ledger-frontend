import { test, expect } from '@playwright/test';

const ARTIFACTS_DIR = '/Users/bintang/.gemini/antigravity-ide/brain/d0d8b7c6-21a7-4208-b808-47caaf68f71c/scratch';

test.describe('Modern Swap & Crypto UI Verification', () => {
  let authToken = '';

  test.beforeAll(async ({ request }) => {
    const uniqueNum = Date.now();
    const testEmail = `modern_${uniqueNum}@ledger.io`;
    const testPassword = 'Password123!';
    const testUsername = `mod_${uniqueNum.toString().slice(-4)}`;

    await request.post('http://localhost:7070/api/v1/auth/register', {
      data: { username: testUsername, email: testEmail, password: testPassword },
    });

    const loginRes = await request.post('http://localhost:7070/api/v1/auth/login', {
      data: { email: testEmail, password: testPassword },
    });
    const loginData = await loginRes.json();
    authToken = loginData.data?.token || '';
  });

  test('should render modern Swap UI and clean Crypto UI in Indonesian', async ({ page }) => {
    await page.goto('http://localhost:7071');
    await page.waitForLoadState('networkidle');

    await page.evaluate(({ token }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_language', 'id');
    }, { token: authToken });

    // 1. Visit Swap Screen
    await page.goto('http://localhost:7071/swap');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Click 50% chip to test active state
    await page.click('#swap-chip-50');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/170_swap_modern_percentage_active.png`,
      fullPage: true,
    });
    console.log('✅ Modern Swap screenshot captured');

    // 2. Visit Crypto Screen (Deposit Tab)
    await page.goto('http://localhost:7071/crypto');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/171_crypto_deposit_clean_id.png`,
      fullPage: true,
    });
    console.log('✅ Clean Crypto Deposit screenshot captured');

    // 3. Switch to Withdraw (Tarik) Tab
    await page.click('#crypto-tab-send-btn');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/172_crypto_withdraw_clean_id.png`,
      fullPage: true,
    });
    console.log('✅ Clean Crypto Withdraw screenshot captured');
  });
});
