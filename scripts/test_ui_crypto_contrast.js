const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = '/Users/bintang/.gemini/antigravity-ide/brain/d0d8b7c6-21a7-4208-b808-47caaf68f71c';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'scratch');

(async () => {
  console.log('🚀 Taking screenshots of high-contrast Crypto Stablecoin Asset Pills...');
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

    await page.goto('http://localhost:7071/(tabs)/crypto', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '60_crypto_usdt_selected_contrast.png') });
    console.log('📸 Saved 60_crypto_usdt_selected_contrast.png');

    const usdcBtn = page.locator('#crypto-deposit-asset-usdc-btn');
    if (await usdcBtn.isVisible()) {
      await usdcBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '61_crypto_usdc_selected_contrast.png') });
      console.log('📸 Saved 61_crypto_usdc_selected_contrast.png');
    }
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await browser.close();
  }
})();
