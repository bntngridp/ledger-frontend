import { test, expect } from '@playwright/test';
import { waitForPageLoad } from './helpers';

const ARTIFACTS_DIR = '/Users/bintang/.gemini/antigravity-ide/brain/d0d8b7c6-21a7-4208-b808-47caaf68f71c/scratch';

test.describe.serial('Notifications Flow & UI Consistency', () => {
  let authToken = '';

  test.beforeAll(async ({ request }) => {
    const uniqueNum = Date.now();
    const testEmail = `dubu_notif_${uniqueNum}@ledger.io`;
    const testPassword = 'Password123!';
    const testUsername = `dubu_notif_${uniqueNum.toString().slice(-4)}`;

    // 1. Register user
    await request.post('http://localhost:7070/api/v1/auth/register', {
      data: {
        username: testUsername,
        email: testEmail,
        password: testPassword,
      },
    });

    // 2. Login
    const loginRes = await request.post('http://localhost:7070/api/v1/auth/login', {
      data: {
        email: testEmail,
        password: testPassword,
      },
    });
    const loginData = await loginRes.json();
    authToken = loginData.data?.token || '';

    // 3. Setup PIN
    await request.post('http://localhost:7070/api/v1/auth/pin/setup', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { pin: '123456' },
    });

    // 4. Generate notifications via crypto simulate-deposit
    const deposits = [
      { amount: 250, asset_symbol: 'USDC' },
      { amount: 100, asset_symbol: 'USDT' },
      { amount: 50, asset_symbol: 'USDC' },
      { amount: 500, asset_symbol: 'USDT' },
    ];
    for (const dep of deposits) {
      await request.post('http://localhost:7070/api/v1/crypto/simulate-deposit', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: dep,
      });
    }
  });

  test('Notifications screen renders correctly on Desktop with filter tabs, batch actions, and card items', async ({
    page,
  }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Set auth token in localStorage
    await page.goto('http://localhost:7071');
    await page.evaluate((tok) => {
      localStorage.setItem('auth_token', tok);
      localStorage.setItem('user_language', 'id');
    }, authToken);

    // Accept dialogs automatically
    page.on('dialog', (dialog) => dialog.accept());

    // Navigate to notifications
    await page.goto('http://localhost:7071/notifications');
    await waitForPageLoad(page);

    // Verify header title and back button
    await expect(page.locator('#notif-back-btn')).toBeVisible();
    await expect(page.locator('text=Notifikasi').first()).toBeVisible();

    // Verify filter tabs are visible
    const filterAll = page.locator('#notif-filter-all');
    const filterUnread = page.locator('#notif-filter-unread');
    await expect(filterAll).toBeVisible();
    await expect(filterUnread).toBeVisible();

    // Verify "Tandai Semua Dibaca" button is visible
    const markAllReadBtn = page.locator('#notif-mark-all-read-btn');
    await expect(markAllReadBtn).toBeVisible();

    // Capture initial notifications page
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/130_notifications_initial_desktop.png`,
      fullPage: true,
    });
    console.log('✅ PASS: Notifications initial desktop captured');

    // Test Select All toggle
    const selectAllBtn = page.locator('#notif-select-all-btn');
    await expect(selectAllBtn).toBeVisible();
    await selectAllBtn.click();
    await page.waitForTimeout(300);

    // Verify delete selected button appears with count
    const deleteSelectedBtn = page.locator('#notif-delete-selected-btn');
    await expect(deleteSelectedBtn).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/131_notifications_selected_all_desktop.png`,
      fullPage: true,
    });
    console.log('✅ PASS: Notifications selected all captured');

    // Deselect all
    await selectAllBtn.click();
    await page.waitForTimeout(300);
    await expect(deleteSelectedBtn).not.toBeVisible();

    // Select first notification card checkbox
    const firstCheckbox = page.locator('[id^="notif-checkbox-"]').first();
    await expect(firstCheckbox).toBeVisible();
    await firstCheckbox.click();
    await page.waitForTimeout(300);

    // Verify delete selected button appears
    await expect(deleteSelectedBtn).toBeVisible();

    // Click delete selected
    await deleteSelectedBtn.click();
    await page.waitForTimeout(600);

    // Test Mark All As Read
    if (await markAllReadBtn.isVisible()) {
      await markAllReadBtn.click();
      await page.waitForTimeout(600);
    }

    // Capture after partial deletion and mark all read
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/132_notifications_after_read_all.png`,
      fullPage: true,
    });
    console.log('✅ PASS: Notifications after mark all read captured');

    // Test Delete All
    const deleteAllBtn = page.locator('#notif-delete-all-btn');
    if (await deleteAllBtn.isVisible()) {
      await deleteAllBtn.click();
      await page.waitForTimeout(600);
    }

    // Verify empty state is rendered
    await expect(page.locator('text=Belum ada notifikasi')).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/133_notifications_empty_state_desktop.png`,
      fullPage: true,
    });
    console.log('✅ PASS: Notifications empty state desktop captured');
  });

  test('Notifications screen renders smoothly on Mobile Viewport', async ({ page, request }) => {
    // Generate fresh notifications for mobile screenshot
    const deposits = [
      { amount: 150, asset_symbol: 'USDC' },
      { amount: 300, asset_symbol: 'USDT' },
    ];
    for (const dep of deposits) {
      await request.post('http://localhost:7070/api/v1/crypto/simulate-deposit', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: dep,
      });
    }

    // Mobile Viewport (iPhone 14 / modern standard)
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('http://localhost:7071');
    await page.evaluate((tok) => {
      localStorage.setItem('auth_token', tok);
      localStorage.setItem('user_language', 'id');
    }, authToken);

    await page.goto('http://localhost:7071/notifications');
    await page.waitForTimeout(1500);

    // Verify elements
    await expect(page.locator('#notif-back-btn')).toBeVisible();
    await expect(page.locator('text=Notifikasi').first()).toBeVisible();

    await page.screenshot({
      path: `${ARTIFACTS_DIR}/134_notifications_mobile.png`,
      fullPage: true,
    });
    console.log('✅ PASS: Notifications mobile screen captured');
  });
});
