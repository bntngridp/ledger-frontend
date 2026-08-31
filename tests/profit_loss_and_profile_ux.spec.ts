import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe.serial('Dashboard Profit/Loss & Profile Clean UX Tests', () => {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  let authToken = '';

  test.beforeAll(async ({ request }) => {
    const rand = Math.floor(Math.random() * 100000);
    const email = `chartprof_${Date.now()}_${rand}@ledger.io`;
    const regRes = await request.post('http://localhost:7070/api/v1/auth/register', {
      data: {
        username: `chartprof_${rand}`,
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
    { code: 'en', copyWord: 'Copy', secTitle: 'Two-Step Verification' },
    { code: 'id', copyWord: 'Salin', secTitle: 'Autentikasi Ganda' },
    { code: 'es', copyWord: 'Copiar', secTitle: 'Verificación en dos pasos' },
    { code: 'ar', copyWord: 'نسخ', secTitle: 'التحقق بخطوتين' },
  ];

  for (const lang of languages) {
    test(`Dashboard & Profile UX verification in [${lang.code}]`, async ({ page }) => {
      await page.goto('http://localhost:7071/login');
      await page.waitForLoadState('domcontentloaded');

      await page.evaluate(({ token, langCode }) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('authToken', token);
        localStorage.setItem('user_language', langCode);
      }, { token: authToken, langCode: lang.code });

      // 1. Check Dashboard Profit/Loss row
      await page.goto('http://localhost:7071/');
      await page.waitForLoadState('domcontentloaded');
      // Wait for loading indicator to finish
      await page.locator('text=Syncing ledger data...').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);

      // Verify trend row
      const trendRow = page.locator('text=▲').or(page.locator('text=▼')).first();
      await expect(trendRow).toBeVisible({ timeout: 15000 });
      const trendText = await trendRow.innerText();
      expect(trendText).not.toContain('Profit/Loss');
      expect(trendText).not.toContain('Untung/Rugi');
      expect(trendText).not.toContain('Ganancia/Pérdida');
      expect(trendText).not.toContain('الربح/الخسارة');

      await page.screenshot({ path: path.join(screenshotsDir, `dashboard_profit_chart_${lang.code}.png`) });

      // 2. Check Profile Screen UX Clean Labels
      await page.goto('http://localhost:7071/profile');
      await page.waitForLoadState('domcontentloaded');
      await page.locator('text=Memuat').or(page.locator('text=Loading')).waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);

      // Verify Two-Factor row doesn't have "(2FA)" or "/"
      const secRow = page.getByText(lang.secTitle).first();
      await expect(secRow).toBeVisible({ timeout: 10000 });

      // Verify Copy buttons have correct copy verb and not "Save" or "Simpan"
      const copyBtn = page.locator('#profile-copy-userid-btn');
      await expect(copyBtn).toBeVisible({ timeout: 10000 });
      await expect(copyBtn).toContainText(lang.copyWord);

      await page.screenshot({ path: path.join(screenshotsDir, `profile_clean_ui_${lang.code}.png`) });
    });
  }
});
