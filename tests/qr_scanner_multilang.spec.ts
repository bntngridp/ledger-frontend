import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe.serial('QR Scanner Modal Multi-language UI Verification', () => {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  let authToken = '';

  test.beforeAll(async ({ request }) => {
    const rand = Math.floor(Math.random() * 100000);
    const email = `qr_tester_${Date.now()}_${rand}@ledger.io`;
    const regRes = await request.post('http://localhost:7070/api/v1/auth/register', {
      data: {
        username: `qruser_${rand}`,
        email,
        password: 'Password123!',
      },
    });
    const regData = await regRes.json();
    authToken = regData.data?.token || '';

    if (!authToken) {
      const logRes = await request.post('http://localhost:7070/api/v1/auth/login', {
        data: {
          email,
          password: 'Password123!',
        },
      });
      const logData = await logRes.json();
      authToken = logData.data?.token || '';
    }
  });

  const languages = [
    { code: 'id', title: 'Pindai QR', tab1: 'Kamera', tab2: 'Unggah Gambar', uploadTitle: 'Pilih Gambar QR' },
    { code: 'en', title: 'Scan QR', tab1: 'Camera', tab2: 'Upload Image', uploadTitle: 'Choose QR Image' },
    { code: 'es', title: 'Escanear QR', tab1: 'Cámara', tab2: 'Subir Imagen', uploadTitle: 'Seleccionar Imagen QR' },
    { code: 'ar', title: 'مسح رمز الاستجابة السريعة', tab1: 'الكاميرا', tab2: 'رفع صورة', uploadTitle: 'اختر صورة رمز الاستجابة السريعة' },
  ];

  for (const lang of languages) {
    test(`Should render QR modal cleanly in ${lang.code.toUpperCase()}`, async ({ page }) => {
      // Set language & auth in localStorage
      await page.addInitScript(
        ({ l, token }) => {
          window.localStorage.setItem('user_language', l);
          window.localStorage.setItem('auth_token', token);
          window.localStorage.setItem('authToken', token);
        },
        { l: lang.code, token: authToken }
      );

      await page.goto('http://localhost:7071/crypto');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // Switch to withdraw / send tab
      const sendTabBtn = page.locator('#crypto-tab-send-btn');
      await expect(sendTabBtn).toBeVisible({ timeout: 10000 });
      await sendTabBtn.click();
      await page.waitForTimeout(500);

      // Click scan QR button
      const scanBtn = page.locator('#crypto-scan-qr-btn');
      await expect(scanBtn).toBeVisible({ timeout: 10000 });
      await scanBtn.click();
      await page.waitForTimeout(600);

      // Verify Title
      await expect(page.getByText(lang.title).first()).toBeVisible();

      // Verify Tab 1 (Camera)
      await expect(page.getByText(lang.tab1).first()).toBeVisible();

      // Verify Tab 2 (Upload)
      const uploadTab = page.locator('#qr-tab-upload');
      await expect(uploadTab).toBeVisible();
      await uploadTab.click();
      await page.waitForTimeout(400);

      // Verify Upload Area Title
      await expect(page.getByText(lang.uploadTitle).first()).toBeVisible();

      // Capture screenshot
      await page.screenshot({ path: path.join(screenshotsDir, `qr_modal_${lang.code}.png`) });

      // Close modal
      const closeBtn = page.locator('#qr-modal-close-btn');
      await closeBtn.click();
      await page.waitForTimeout(300);
    });
  }
});
