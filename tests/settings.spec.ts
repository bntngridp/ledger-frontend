import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageLoad } from './helpers';

test.describe('Settings & Change Password Dedicated Page', () => {
  test('Should display Settings screen title and Change Password row', async ({ page }) => {
    await navigateTo(page, '/settings');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);

    const settingsTitle = page.getByText(/Settings|Profil & Pengaturan/i).first();
    await expect(settingsTitle).toBeVisible({ timeout: 5000 });

    const changePasswordRow = page.getByText(/Ubah Kata Sandi|Change Password/i).first();
    await expect(changePasswordRow).toBeVisible();

    console.log('✅ PASS: Settings screen rendered correctly');
  });

  test('Should navigate to dedicated /change-password route with full UI form', async ({ page }) => {
    await navigateTo(page, '/change-password');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);

    // Verify URL is /change-password
    await expect(page).toHaveURL(/.*\/change-password/);

    // Verify Old Password input placeholder
    const oldPasswordInput = page.getByPlaceholder(/Masukkan kata sandi saat ini|Enter current password/i).first();
    await expect(oldPasswordInput).toBeVisible({ timeout: 5000 });

    // Verify New Password input placeholder
    const newPasswordInput = page.getByPlaceholder(/Masukkan kata sandi baru|Enter new password/i).first();
    await expect(newPasswordInput).toBeVisible();

    // Verify Confirm Password input placeholder
    const confirmPasswordInput = page.getByPlaceholder(/Ulangi kata sandi baru|Repeat new password/i).first();
    await expect(confirmPasswordInput).toBeVisible();

    // Verify Email OTP input & button
    const otpInput = page.getByPlaceholder(/6-digit OTP email|6-digit email OTP/i).first();
    await expect(otpInput).toBeVisible();

    const sendOtpBtn = page.getByText(/Kirim Kode ke Email|Send Code to Email/i).first();
    await expect(sendOtpBtn).toBeVisible();

    // Verify Submit Button
    const submitBtn = page.getByText(/Simpan Kata Sandi Baru|Save New Password/i).first();
    await expect(submitBtn).toBeVisible();

    console.log('✅ PASS: Change Password page loaded cleanly on dedicated route /change-password');
  });

  test('Should navigate from Settings to /change-password by clicking settings row', async ({ page }) => {
    await navigateTo(page, '/settings');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);

    const changePasswordRow = page.getByText(/Ubah Kata Sandi|Change Password/i).first();
    await changePasswordRow.click();
    await page.waitForTimeout(1000);

    // Verify URL transitioned to /change-password
    await expect(page).toHaveURL(/.*\/change-password/);

    // Verify Old Password input appears on the new screen
    const oldPasswordInput = page.getByPlaceholder(/Masukkan kata sandi saat ini|Enter current password/i).first();
    await expect(oldPasswordInput).toBeVisible({ timeout: 5000 });

    console.log('✅ PASS: Navigation from settings to /change-password succeeded');
  });

  test('Should interact with form inputs, click buttons, and handle validation feedback', async ({ page }) => {
    await navigateTo(page, '/change-password');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);

    const oldPasswordInput = page.getByPlaceholder(/Masukkan kata sandi saat ini|Enter current password/i).first();
    const newPasswordInput = page.getByPlaceholder(/Masukkan kata sandi baru|Enter new password/i).first();
    const confirmPasswordInput = page.getByPlaceholder(/Ulangi kata sandi baru|Repeat new password/i).first();

    // Type passwords
    await oldPasswordInput.fill('OldPassword123.');
    await newPasswordInput.fill('NewSecret456.');
    await confirmPasswordInput.fill('DifferentSecret789.');

    // Click Send OTP Button
    const sendOtpBtn = page.getByText(/Kirim Kode ke Email|Send Code to Email/i).first();
    await sendOtpBtn.click();
    await page.waitForTimeout(500);

    // Click Submit Button to trigger validation feedback
    const submitBtn = page.getByText(/Simpan Kata Sandi Baru|Save New Password/i).first();
    await submitBtn.click();
    await page.waitForTimeout(500);

    // Verify any validation or status message container is present on screen
    const feedbackBanner = page.locator('text=/.*(cocok|mismatch|OTP|gagal|error|wajib).*/i').first();
    await expect(feedbackBanner).toBeVisible({ timeout: 5000 });

    console.log('✅ PASS: Interactive UI validation and Send OTP tested successfully');
  });
});
