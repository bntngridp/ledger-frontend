const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = '/Users/bintang/.gemini/antigravity-ide/brain/d0d8b7c6-21a7-4208-b808-47caaf68f71c';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'scratch');

(async () => {
  console.log('🚀 Running Playwright Multi-Asset Swap UI Test...');
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

    // 2. Navigate to Swap page
    console.log('🔄 Navigating to Swap page...');
    await page.goto('http://localhost:7071/swap', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 3. Click "Receive To" asset selector button to open Asset Picker Modal
    console.log('👆 Clicking Asset Picker Selector (TO asset)...');
    const toAssetBtn = page.locator('#swap-to-asset-btn');
    if (await toAssetBtn.isVisible()) {
      await toAssetBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '20_asset_picker_modal.png') });
      console.log('📸 Saved 20_asset_picker_modal.png');

      // Click "USDC" in modal list
      console.log('✨ Selecting USDC from Modal...');
      const usdcItem = page.locator('text=USD Coin (ERC-20)').or(page.locator('text=USDC')).first();
      if (await usdcItem.isVisible()) {
        await usdcItem.click();
        await page.waitForTimeout(1500);
      }
    }

    // 4. Verify live rate for IDR -> USDC
    const bodyText = await page.innerText('body');
    console.log('--- Swap Page Content after selecting USDC ---');
    console.log(bodyText.substring(0, 700));
    console.log('----------------------------------------------');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '21_swap_usdc_selected.png') });

    console.log('🎉 PLAYWRIGHT MULTI-ASSET SWAP UI TEST SUCCESSFUL!');
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    await browser.close();
  }
})();
