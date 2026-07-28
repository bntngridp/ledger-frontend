import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageLoad } from './helpers';

test.describe('Settings Screen - Change Password Modal', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/settings');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);
  });

  test('Should display Settings screen title and Change Password row', async ({ page }) => {
    // Verify Settings header title
    const settingsTitle = page.getByText(/Settings|Profil & Pengaturan/i).first();
    await expect(settingsTitle).toBeVisible({ timeout: 5000 });

    // Verify Change Password row
    const changePasswordRow = page.getByText(/Ubah Kata Sandi|Change Password/i).first();
    await expect(changePasswordRow).toBeVisible();

    console.log('✅ PASS: Settings screen and Change Password row rendered correctly');
  });

  test('Should open Change Password modal with all required security fields', async ({ page }) => {
    // Click Change Password row
    const changePasswordRow = page.getByText(/Ubah Kata Sandi|Change Password/i).first();
    await changePasswordRow.click();

    // Verify Modal Title
    const modalTitle = page.getByText(/Ubah Kata Sandi|Change Password/i).first();
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    // Verify Old Password input placeholder
    const oldPasswordInput = page.getByPlaceholder(/Masukkan kata sandi saat ini|Enter current password/i).first();
    await expect(oldPasswordInput).toBeVisible();

    // Verify New Password input placeholder
    const newPasswordInput = page.getByPlaceholder(/Masukkan kata sandi baru|Enter new password/i).first();
    await expect(newPasswordInput).toBeVisible();

    // Verify Confirm Password input placeholder
    const confirmPasswordInput = page.getByPlaceholder(/Ulangi kata sandi baru|Repeat new password/i).first();
    await expect(confirmPasswordInput).toBeVisible();

    // Verify Email OTP button
    const sendOtpBtn = page.getByText(/Kirim Kode ke Email|Send Code to Email/i).first();
    await expect(sendOtpBtn).toBeVisible();

    console.log('✅ PASS: Change Password modal opens with all multi-factor security fields');
  });
});
