const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = '/Users/bintang/.gemini/antigravity-ide/brain/d0d8b7c6-21a7-4208-b808-47caaf68f71c';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'scratch');

(async () => {
  console.log('🚀 Taking Dashboard screenshot to verify Quick Action card heights...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:7071', { waitUntil: 'networkidle' });
    const loginBtn = page.locator('text=Masuk Akun').or(page.locator('text=Log In'));
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      await page.waitForTimeout(1000);
      const inputs = page.locator('input');
      if (await inputs.count() >= 2) {
        await inputs.nth(0).fill('notif@ledger.io');
        await inputs.nth(1).fill('password123');
        const submit = page.locator('text=Masuk').or(page.locator('text=Log In')).last();
        await submit.click();
        await page.waitForTimeout(2500);
      }
    }

    await page.goto('http://localhost:7071', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '50_dashboard_fixed_action_cards.png') });
    console.log('📸 Saved 50_dashboard_fixed_action_cards.png');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await browser.close();
  }
})();
