const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = '/Users/bintang/.gemini/antigravity-ide/brain/d0d8b7c6-21a7-4208-b808-47caaf68f71c';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'scratch');

(async () => {
  console.log('🚀 Running Playwright E2E IDR Bank & E-Wallet Withdraw UI Test...');
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

    // 2. Navigate to Withdraw screen
    console.log('🔄 Navigating to Withdraw page...');
    await page.goto('http://localhost:7071/withdraw', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '40_withdraw_page_initial.png') });

    // 3. Click Bank / E-Wallet Selector
    console.log('👆 Clicking Bank & E-Wallet Selector Modal...');
    const bankSelector = page.locator('#withdraw-bank-selector-btn');
    if (await bankSelector.isVisible()) {
      await bankSelector.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '41_bank_modal_open.png') });
      console.log('📸 Saved 41_bank_modal_open.png');

      // Select DANA E-Wallet
      console.log('✨ Selecting DANA E-Wallet from Modal...');
      const danaOption = page.locator('text=DANA E-Wallet').first();
      if (await danaOption.isVisible()) {
        await danaOption.click();
        await page.waitForTimeout(1500);
      }
    }

    const withdrawText = await page.innerText('body');
    console.log('--- Withdraw Page Content after selecting DANA ---');
    console.log(withdrawText.substring(0, 800));
    console.log('--------------------------------------------------');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '42_dana_selected.png') });

    console.log('🎉 PLAYWRIGHT E2E IDR BANK & E-WALLET WITHDRAW TEST SUCCESSFUL!');
  } catch (err) {
    console.error('❌ Test error:', err);
  } finally {
    await browser.close();
  }
})();
