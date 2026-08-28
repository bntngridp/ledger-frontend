import { test, expect } from '@playwright/test';

const ARTIFACTS_DIR = '/Users/bintang/.gemini/antigravity-ide/brain/d0d8b7c6-21a7-4208-b808-47caaf68f71c/scratch';

test.describe('Settings Arabic Left-Alignment Verification', () => {
  let authToken = '';

  test.beforeAll(async ({ request }) => {
    const uniqueNum = Date.now();
    const testEmail = `settings_ar_${uniqueNum}@ledger.io`;
    const testPassword = 'Password123!';
    const testUsername = `set_ar_${uniqueNum.toString().slice(-4)}`;

    await request.post('http://localhost:7070/api/v1/auth/register', {
      data: { username: testUsername, email: testEmail, password: testPassword },
    });

    const loginRes = await request.post('http://localhost:7070/api/v1/auth/login', {
      data: { email: testEmail, password: testPassword },
    });
    const loginData = await loginRes.json();
    authToken = loginData.data?.token || '';
  });

  test('should render Settings in Arabic with left alignment', async ({ page }) => {
    await page.goto('http://localhost:7071');
    await page.waitForLoadState('networkidle');

    await page.evaluate(({ token }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_language', 'ar');
    }, { token: authToken });

    await page.goto('http://localhost:7071/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/150_settings_arabic_left_aligned.png`,
      fullPage: true,
    });
    console.log('✅ Settings Arabic screenshot captured');
  });
});
