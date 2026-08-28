import { test, expect } from '@playwright/test';

const ARTIFACTS_DIR = '/Users/bintang/.gemini/antigravity-ide/brain/d0d8b7c6-21a7-4208-b808-47caaf68f71c/scratch';

test.describe('Dashboard Asset Icons Consistency', () => {
  let authToken = '';

  test.beforeAll(async ({ request }) => {
    const uniqueNum = Date.now();
    const testEmail = `icons_${uniqueNum}@ledger.io`;
    const testPassword = 'Password123!';
    const testUsername = `icons_${uniqueNum.toString().slice(-4)}`;

    await request.post('http://localhost:7070/api/v1/auth/register', {
      data: { username: testUsername, email: testEmail, password: testPassword },
    });

    const loginRes = await request.post('http://localhost:7070/api/v1/auth/login', {
      data: { email: testEmail, password: testPassword },
    });
    const loginData = await loginRes.json();
    authToken = loginData.data?.token || '';
  });

  test('should render consistent 3D coin icons on Dashboard', async ({ page }) => {
    await page.goto('http://localhost:7071');
    await page.waitForLoadState('networkidle');

    await page.evaluate(({ token }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_language', 'id');
    }, { token: authToken });

    await page.goto('http://localhost:7071');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/160_dashboard_consistent_logos.png`,
      fullPage: true,
    });
    console.log('✅ Dashboard consistent logos captured');

    // Also visit Swap page
    await page.goto('http://localhost:7071/swap');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/161_swap_consistent_logos.png`,
      fullPage: true,
    });
    console.log('✅ Swap consistent logos captured');
  });
});
