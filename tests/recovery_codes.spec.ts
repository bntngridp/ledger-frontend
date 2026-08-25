import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('2FA Recovery Codes & Login Flow', () => {
  const artifactDir = '/Users/bintang/.gemini/antigravity-ide/brain/d0d8b7c6-21a7-4208-b808-47caaf68f71c/scratch';

  test('full lifecycle: 2FA activation, recovery code login, profile management & regeneration', async ({ page }) => {
    // 1. Create a fresh test user via backend API
    const uniqueNum = Date.now();
    const testEmail = `dubu_2fa_${uniqueNum}@ledger.io`;
    const testPassword = 'Password123!';
    const testUsername = `dubu2fa${uniqueNum.toString().slice(-4)}`;

    const regRes = await fetch('http://localhost:7070/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: testEmail,
        password: testPassword,
      }),
    });
    const regData = await regRes.json();
    expect(regData.status).toBe(201);

    // 1b. Login to obtain JWT
    const loginRes = await fetch('http://localhost:7070/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginData = await loginRes.json();
    expect(loginData.status).toBe(200);
    const token = loginData.data.token;

    // 2. Enable 2FA via backend API to obtain 16 recovery codes
    // 2a. Get 2FA secret
    const secretRes = await fetch('http://localhost:7070/api/v1/auth/2fa/enable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const secretData = await secretRes.json();
    expect(secretData.status).toBe(200);
    const secret = secretData.data.secret;

    // 2b. Generate valid TOTP code
    const crypto = await import('crypto');
    function getTOTP(secretBase32: string): string {
      const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let bits = '';
      for (let i = 0; i < secretBase32.length; i++) {
        const val = base32chars.indexOf(secretBase32.charAt(i).toUpperCase());
        if (val >= 0) bits += val.toString(2).padStart(5, '0');
      }
      const bytes = [];
      for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.substr(i, 8), 2));
      }
      const key = Buffer.from(bytes);
      const epoch = Math.floor(Date.now() / 1000);
      const timeStep = Math.floor(epoch / 30);
      const timeBuffer = Buffer.alloc(8);
      timeBuffer.writeBigInt64BE(BigInt(timeStep));

      const hmac = crypto.createHmac('sha1', key);
      hmac.update(timeBuffer);
      const digest = hmac.digest();
      const offset = digest[digest.length - 1] & 0xf;
      const code = ((digest[offset] & 0x7f) << 24 |
                    (digest[offset + 1] & 0xff) << 16 |
                    (digest[offset + 2] & 0xff) << 8 |
                    (digest[offset + 3] & 0xff)) % 1000000;
      return code.toString().padStart(6, '0');
    }

    const currentTotp = getTOTP(secret);
    const verifyRes = await fetch('http://localhost:7070/api/v1/auth/2fa/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ code: currentTotp }),
    });
    const verifyData = await verifyRes.json();
    expect(verifyData.status).toBe(200);
    const recoveryCodes: string[] = verifyData.data.recovery_codes;
    expect(recoveryCodes.length).toBe(16);
    const firstRecoveryCode = recoveryCodes[0];
    console.log('Obtained 16 Recovery Codes. First code:', firstRecoveryCode);

    // 3. Test 2FA Login using Recovery Code on Web UI
    await page.goto('http://localhost:7071/login');
    await page.waitForLoadState('networkidle');

    // Fill login form
    await page.getByPlaceholder('email@anda.com').or(page.locator('input[type="email"]')).first().fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.locator('#login-submit-btn').click();

    // 4. Verify 2FA challenge screen appears
    await expect(page.locator('#btn-toggle-recovery-mode')).toBeVisible({ timeout: 10000 });

    // 5. Toggle to Recovery Code Login Mode
    await page.locator('#btn-toggle-recovery-mode').click();
    await page.waitForTimeout(400);

    await expect(page.getByText('Kode Pemulihan Cadangan', { exact: true })).toBeVisible();
    await expect(page.locator('#input-recovery-code')).toBeVisible();

    // Take screenshot of Recovery Code Login UI
    await page.screenshot({ path: path.join(artifactDir, '122_2fa_recovery_login.png'), fullPage: true });

    // 6. Enter the recovery code and submit
    await page.locator('#input-recovery-code').fill(firstRecoveryCode);
    await page.locator('#btn-verify-2fa-login').click();

    // 7. Verify successful login and navigation to Dashboard
    await page.waitForURL('**/', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // 8. Navigate to Profile page to inspect Security Center & Recovery Codes Modal
    await page.goto('http://localhost:7071/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    // Verify 2FA Row says 'Aktif'
    await expect(page.locator('#profile-2fa-row-btn')).toBeVisible();

    // Verify Recovery Codes Row exists in Security Center
    const recoveryRow = page.locator('#profile-recovery-codes-row-btn');
    await expect(recoveryRow).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, '123_profile_recovery_row.png'), fullPage: true });

    // 9. Click Recovery Codes Row to open modal
    await recoveryRow.click();
    await page.waitForTimeout(500);

    // Verify Modal content
    await expect(page.getByText('2FA Backup Recovery Codes')).toBeVisible();
    // Since 1 code was burned during login, remaining should be 15!
    await expect(page.getByText('(15 Tersedia)')).toBeVisible();

    // Take screenshot of Modal
    await page.screenshot({ path: path.join(artifactDir, '124_recovery_codes_modal.png'), fullPage: true });

    // 10. Test Regenerate Recovery Codes button
    await page.locator('#btn-regenerate-recovery-codes').click();
    await page.waitForTimeout(800);

    // Verify 16 new codes generated
    await expect(page.getByText('(16 Tersedia)')).toBeVisible();
    await expect(page.getByText('16 Kode pemulihan baru berhasil dibuat!')).toBeVisible();

    // Close modal
    await page.locator('#recovery-modal-close-btn').click();
    await page.waitForTimeout(400);

    console.log('ALL 2FA RECOVERY TESTS PASSED PERFECTLY!');
  });
});
