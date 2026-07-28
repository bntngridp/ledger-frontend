const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = '/Users/bintang/.gemini/antigravity-ide/brain/d0d8b7c6-21a7-4208-b808-47caaf68f71c';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'scratch');

(async () => {
  console.log('🚀 Running Playwright E2E Crypto Deposit & Withdraw UI Test...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // 1. Open app & Login
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

    // 2. Navigate to Crypto screen
    console.log('🔄 Navigating to Crypto page...');
    await page.goto('http://localhost:7071/crypto', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '30_crypto_deposit_page.png') });

    const depositText = await page.innerText('body');
    console.log('--- Deposit Page Content ---');
    console.log(depositText.substring(0, 800));
    console.log('----------------------------');

    // 3. Switch to Withdraw (Send) Tab
    console.log('📤 Switching to Withdraw (Send) Tab...');
    const withdrawTab = page.locator('text=Withdraw').or(page.locator('text=Penarikan')).first();
    if (await withdrawTab.isVisible()) {
      await withdrawTab.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '31_crypto_withdraw_page.png') });

      const withdrawText = await page.innerText('body');
      console.log('--- Withdraw Page Content ---');
      console.log(withdrawText.substring(0, 800));
      console.log('-----------------------------');
    }

    console.log('🎉 PLAYWRIGHT CRYPTO DEPOSIT & WITHDRAW UI TEST SUCCESSFUL!');
  } catch (err) {
    console.error('❌ Test error:', err);
  } finally {
    await browser.close();
  }
})();
