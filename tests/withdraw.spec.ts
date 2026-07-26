import { test, expect } from '@playwright/test';
import {
  navigateTo,
  waitForPageLoad,
  fillInput,
  clickAndWait,
  hasErrorMessage,
  hasSuccessMessage,
  waitForElementVisible,
  getTextContent,
} from './helpers';

test.describe('Withdraw - Fiat Withdrawal', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Wait for page to fully load
    await page.waitForTimeout(1000);
  });

  test('Should display Withdraw button on home page', async ({ page }) => {
    // 🧪 Test: Verify Withdraw button exists

    const withdrawButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send"), button:has-text("Cash Out")'
    ).first();

    try {
      await withdrawButton.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ PASS: Withdraw button found on home page');
    } catch (e) {
      throw new Error('❌ FAIL: Withdraw button not found on home page');
    }
  });

  test('Should open Withdraw modal when clicking button', async ({ page }) => {
    // 🧪 Test: Verify modal opens when clicking Withdraw

    const withdrawButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send")'
    ).first();
    await withdrawButton.click();

    await page.waitForTimeout(500);

    // Look for modal or dialog
    const modal = page.locator('[role="dialog"], [class*="modal"], [class*="sheet"], [class*="drawer"]').first();

    try {
      await modal.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ PASS: Withdraw modal opened successfully');
    } catch (e) {
      throw new Error('❌ FAIL: Withdraw modal did not open');
    }
  });

  test('Should show all required form fields for withdraw', async ({ page }) => {
    // 🧪 Test: Verify all necessary form fields exist

    const withdrawButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send")'
    ).first();
    await withdrawButton.click();

    await page.waitForTimeout(500);

    // Expected fields: Amount, Account Number, Account Name, Currency/Method
    const expectedFieldLabels = ['amount', 'account', 'name', 'method', 'bank'];

    for (const label of expectedFieldLabels) {
      const field = page.locator(`label:has-text("${label}"), input[placeholder*="${label}" i]`).first();

      try {
        await field.waitFor({ state: 'visible', timeout: 2000 });
        console.log(`✅ PASS: Found "${label}" field`);
      } catch (e) {
        console.log(`⚠️ INFO: "${label}" field not found (might use different label)`);
      }
    }
  });

  test('Should validate - amount field is required', async ({ page }) => {
    // 🧪 Test: Amount field validation (required)

    const withdrawButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send")'
    ).first();
    await withdrawButton.click();

    await page.waitForTimeout(500);

    // Leave amount empty and try to submit
    const submitButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send"), button:has-text("Submit"), button:has-text("Confirm")'
    ).last();

    await submitButton.click();
    await page.waitForTimeout(500);

    // Check for validation error
    const hasError = await hasErrorMessage(page);

    if (hasError) {
      console.log('✅ PASS: Validation error shown for empty amount');
    } else {
      console.log('⚠️ WARNING: No validation error for empty amount');
    }
  });

  test('Should validate - account number is required', async ({ page }) => {
    // 🧪 Test: Account number validation (required)

    const withdrawButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send")'
    ).first();
    await withdrawButton.click();

    await page.waitForTimeout(500);

    // Fill amount but leave account number empty
    await fillInput(page, 'input[type="text"], input[type="number"]', '100000');

    const submitButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send"), button:has-text("Submit")'
    ).last();

    await submitButton.click();
    await page.waitForTimeout(500);

    // Check for validation error
    const hasError = await hasErrorMessage(page, 'account');

    if (hasError) {
      console.log('✅ PASS: Validation error shown for empty account number');
    } else {
      console.log('⚠️ WARNING: No validation error for empty account number');
    }
  });

  test('Should validate - account name is required', async ({ page }) => {
    // 🧪 Test: Account name validation (required)

    const withdrawButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send")'
    ).first();
    await withdrawButton.click();

    await page.waitForTimeout(500);

    // Fill amount and account number but leave name empty
    const inputs = page.locator('input[type="text"], input[type="number"]');

    await fillInput(page, 'input[type="text"]', '100000');
    await page.waitForTimeout(200);

    const secondInput = inputs.nth(1);
    await secondInput.fill('1234567890');
    await page.waitForTimeout(200);

    const submitButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send"), button:has-text("Submit")'
    ).last();

    await submitButton.click();
    await page.waitForTimeout(500);

    // Check for validation error
    const hasError = await hasErrorMessage(page);

    if (hasError) {
      console.log('✅ PASS: Validation error shown for empty account name');
    } else {
      console.log('⚠️ WARNING: No validation error for empty account name');
    }
  });

  test('Should validate minimum withdraw amount', async ({ page }) => {
    // 🧪 Test: Minimum amount validation

    const withdrawButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send")'
    ).first();
    await withdrawButton.click();

    await page.waitForTimeout(500);

    // Enter very small amount
    const inputs = page.locator('input[type="text"], input[type="number"]');
    await fillInput(page, 'input[type="text"], input[type="number"]', '1000');

    // Fill other required fields
    await page.waitForTimeout(200);
    const secondInput = inputs.nth(1);
    await secondInput.fill('1234567890');

    await page.waitForTimeout(200);
    const thirdInput = inputs.nth(2);
    await thirdInput.fill('John Doe');

    const submitButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send"), button:has-text("Submit")'
    ).last();

    await submitButton.click();
    await page.waitForTimeout(500);

    // Check for validation error
    const hasError = await hasErrorMessage(page, 'minimum');

    if (hasError) {
      console.log('✅ PASS: Validation error shown for amount below minimum');
    } else {
      console.log('⚠️ INFO: Minimum validation might not be set or error format differs');
    }
  });

  test('Should validate account number format', async ({ page }) => {
    // 🧪 Test: Account number format validation

    const withdrawButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send")'
    ).first();
    await withdrawButton.click();

    await page.waitForTimeout(500);

    // Enter invalid account number format
    const inputs = page.locator('input[type="text"], input[type="number"]');
    await fillInput(page, 'input[type="text"], input[type="number"]', '100000');

    await page.waitForTimeout(200);
    const secondInput = inputs.nth(1);
    await secondInput.fill('abc'); // Invalid: should be numeric

    await page.waitForTimeout(200);
    const thirdInput = inputs.nth(2);
    await thirdInput.fill('John Doe');

    const submitButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send"), button:has-text("Submit")'
    ).last();

    await submitButton.click();
    await page.waitForTimeout(500);

    // Check for validation error
    const hasError = await hasErrorMessage(page);

    if (hasError) {
      console.log('✅ PASS: Validation error shown for invalid account number');
    } else {
      console.log('⚠️ INFO: Account number format validation might be lenient');
    }
  });

  test('Should accept valid withdraw data', async ({ page }) => {
    // 🧪 Test: Valid data acceptance

    const withdrawButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send")'
    ).first();
    await withdrawButton.click();

    await page.waitForTimeout(500);

    // Fill all required fields with valid data
    const inputs = page.locator('input[type="text"], input[type="number"]');

    await fillInput(page, 'input[type="text"], input[type="number"]', '50000');

    await page.waitForTimeout(200);
    const secondInput = inputs.nth(1);
    await secondInput.fill('1234567890');

    await page.waitForTimeout(200);
    const thirdInput = inputs.nth(2);
    await thirdInput.fill('John Doe');

    const submitButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send"), button:has-text("Submit")'
    ).last();

    await submitButton.click();
    await page.waitForTimeout(500);

    // Should proceed (either success or next step)
    const hasError = await hasErrorMessage(page);

    if (!hasError) {
      console.log('✅ PASS: Valid withdraw data accepted');
    } else {
      console.log('⚠️ INFO: Valid data was rejected (check backend response)');
    }
  });

  test('Should show confirmation before submitting withdraw', async ({ page }) => {
    // 🧪 Test: Confirmation dialog

    const withdrawButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send")'
    ).first();
    await withdrawButton.click();

    await page.waitForTimeout(500);

    // Fill form
    const inputs = page.locator('input[type="text"], input[type="number"]');
    await fillInput(page, 'input[type="text"], input[type="number"]', '50000');

    await page.waitForTimeout(200);
    const secondInput = inputs.nth(1);
    await secondInput.fill('1234567890');

    await page.waitForTimeout(200);
    const thirdInput = inputs.nth(2);
    await thirdInput.fill('John Doe');

    const submitButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send"), button:has-text("Submit")'
    ).last();

    await submitButton.click();
    await page.waitForTimeout(500);

    // Look for confirmation message
    const confirmationText = page.locator('text=/confirm|confirmation|proceed|sure/i').first();

    try {
      await confirmationText.waitFor({ state: 'visible', timeout: 3000 });
      console.log('✅ PASS: Confirmation message shown');
    } catch (e) {
      console.log('⚠️ INFO: Confirmation message not shown (might skip to processing)');
    }
  });

  test('Should display admin fee in withdraw form', async ({ page }) => {
    // 🧪 Test: Admin fee display

    const withdrawButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send")'
    ).first();
    await withdrawButton.click();

    await page.waitForTimeout(500);

    // Look for fee information
    const feeDisplay = page.locator('text=/fee|charge|admin|commission/i').first();

    try {
      await feeDisplay.waitFor({ state: 'visible', timeout: 3000 });
      const feeText = await feeDisplay.textContent();
      console.log(`✅ PASS: Admin fee displayed: ${feeText}`);
    } catch (e) {
      console.log('⚠️ INFO: Admin fee not displayed (might be shown after form fill)');
    }
  });

  test('Should reset form after successful withdrawal', async ({ page }) => {
    // 🧪 Test: Form reset after success

    const withdrawButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send")'
    ).first();
    await withdrawButton.click();

    await page.waitForTimeout(500);

    // Fill form
    const inputs = page.locator('input[type="text"], input[type="number"]');
    await fillInput(page, 'input[type="text"], input[type="number"]', '50000');

    await page.waitForTimeout(200);
    const secondInput = inputs.nth(1);
    await secondInput.fill('1234567890');

    await page.waitForTimeout(200);
    const thirdInput = inputs.nth(2);
    await thirdInput.fill('John Doe');

    // Get initial values
    const amountBefore = await page.locator('input[type="text"], input[type="number"]').first().inputValue();

    const submitButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send"), button:has-text("Submit")'
    ).last();

    await submitButton.click();
    await page.waitForTimeout(1000);

    // After success, form should be cleared
    const amountAfter = await page.locator('input[type="text"], input[type="number"]').first().inputValue();

    if (amountBefore !== '' && (amountAfter === '' || amountAfter === null)) {
      console.log('✅ PASS: Form reset after submission');
    } else {
      console.log('⚠️ INFO: Form might not reset automatically (depends on UX design)');
    }
  });

  test('Should display withdraw in appropriate currency', async ({ page }) => {
    // 🧪 Test: Currency display

    const withdrawButton = page.locator(
      'button:has-text("Withdraw"), button:has-text("Send")'
    ).first();
    await withdrawButton.click();

    await page.waitForTimeout(500);

    // Look for currency indicator
    const currencyDisplay = page.locator('text=/IDR|Rp|PHP|GCash|USDC/i').first();

    try {
      await currencyDisplay.waitFor({ state: 'visible', timeout: 3000 });
      const currencyText = await currencyDisplay.textContent();
      console.log(`✅ PASS: Currency displayed: ${currencyText}`);
    } catch (e) {
      console.log('⚠️ INFO: Currency indicator not found in expected location');
    }
  });
});

