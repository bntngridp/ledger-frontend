const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = '/Users/bintang/.gemini/antigravity-ide/brain/d0d8b7c6-21a7-4208-b808-47caaf68f71c';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'scratch');

(async () => {
  console.log('🚀 Running Playwright E2E Swap Rate Test...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

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

    // 2. Navigate to Swap page
    console.log('🔄 Navigating to Swap page...');
    await page.goto('http://localhost:7071/swap', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_swap_page_initial.png') });

    // 3. Check page text content for Live Rates
    const bodyText = await page.innerText('body');
    console.log('--- Swap Page Content ---');
    console.log(bodyText.substring(0, 600));
    console.log('-------------------------');

    // 4. Fill 100000 IDR to convert to USDT
    console.log('✍️ Entering 100,000 IDR in Swap calculator...');
    const amountInput = page.locator('input[placeholder="0.00"]').first();
    if (await amountInput.isVisible()) {
      await amountInput.fill('100000');
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_swap_amount_entered.png') });

      const updatedBody = await page.innerText('body');
      console.log('--- After entering 100,000 IDR ---');
      console.log(updatedBody.substring(0, 800));
      console.log('-----------------------------------');
    }

    console.log('🎉 PLAYWRIGHT E2E SWAP RATE TEST COMPLETE!');
  } catch (err) {
    console.error('❌ Swap test error:', err);
  } finally {
    await browser.close();
  }
})();
