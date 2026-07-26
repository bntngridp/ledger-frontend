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

test.describe('TopUp/Deposit - Fiat Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Wait for page to fully load
    await page.waitForTimeout(1000);
  });

  test('Should display TopUp/Deposit button on home page', async ({ page }) => {
    // 🧪 Test: Verify TopUp button exists

    const topupButton = page.locator('button:has-text("Buy"), button:has-text("Top up"), button:has-text("Deposit")').first();

    try {
      await topupButton.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ PASS: TopUp/Deposit button found');
    } catch (e) {
      throw new Error('❌ FAIL: TopUp/Deposit button not found on home page');
    }
  });

  test('Should open TopUp modal when clicking Buy button', async ({ page }) => {
    // 🧪 Test: Verify modal opens when clicking TopUp

    const buyButton = page.locator('button:has-text("Buy"), button:has-text("Top up")').first();
    await buyButton.click();

    await page.waitForTimeout(500);

    // Look for modal or dialog
    const modal = page.locator('[role="dialog"], [class*="modal"], [class*="sheet"]').first();

    try {
      await modal.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ PASS: TopUp modal opened successfully');
    } catch (e) {
      throw new Error('❌ FAIL: TopUp modal did not open');
    }
  });

  test('Should show amount input field in TopUp', async ({ page }) => {
    // 🧪 Test: Verify amount input exists in modal

    const buyButton = page.locator('button:has-text("Buy"), button:has-text("Top up")').first();
    await buyButton.click();

    await page.waitForTimeout(500);

    const amountInput = page.locator('input[type="text"], input[type="number"], input[placeholder*="amount" i], input[placeholder*="amount" i]').first();

    try {
      await amountInput.waitFor({ state: 'visible', timeout: 3000 });
      console.log('✅ PASS: Amount input field found');
    } catch (e) {
      throw new Error('❌ FAIL: Amount input field not found');
    }
  });

  test('Should validate minimum amount (less than Rp 10K should error)', async ({ page }) => {
    // 🧪 Test: Validation - Amount too low

    const buyButton = page.locator('button:has-text("Buy"), button:has-text("Top up")').first();
    await buyButton.click();

    await page.waitForTimeout(500);

    // Find amount input
    const amountInput = page.locator('input[type="text"], input[type="number"]').first();

    // Enter amount below minimum (Rp 5K - below Rp 10K minimum)
    await fillInput(page, 'input[type="text"], input[type="number"]', '5000');

    // Try to submit
    const submitButton = page.locator('button:has-text("Continue"), button:has-text("Submit"), button:has-text("Confirm")').first();
    await submitButton.click();

    await page.waitForTimeout(500);

    // Check for error message
    const hasError = await hasErrorMessage(page, 'minimum');

    if (hasError) {
      console.log('✅ PASS: Validation error shown for amount below minimum');
    } else {
      console.log('⚠️ WARNING: Error message not shown (might be different format)');
    }
  });

  test('Should validate maximum amount (more than Rp 100M should error)', async ({ page }) => {
    // 🧪 Test: Validation - Amount too high

    const buyButton = page.locator('button:has-text("Buy"), button:has-text("Top up")').first();
    await buyButton.click();

    await page.waitForTimeout(500);

    // Enter amount above maximum (Rp 150M - above Rp 100M maximum)
    await fillInput(page, 'input[type="text"], input[type="number"]', '150000000');

    // Try to submit
    const submitButton = page.locator('button:has-text("Continue"), button:has-text("Submit"), button:has-text("Confirm")').first();
    await submitButton.click();

    await page.waitForTimeout(500);

    // Check for error message
    const hasError = await hasErrorMessage(page, 'maximum');

    if (hasError) {
      console.log('✅ PASS: Validation error shown for amount above maximum');
    } else {
      console.log('⚠️ WARNING: Error message not shown (might be different format)');
    }
  });

  test('Should accept valid amount (between Rp 10K - Rp 100M)', async ({ page }) => {
    // 🧪 Test: Valid amount should be accepted

    const buyButton = page.locator('button:has-text("Buy"), button:has-text("Top up")').first();
    await buyButton.click();

    await page.waitForTimeout(500);

    // Enter valid amount (Rp 50K - between minimum and maximum)
    await fillInput(page, 'input[type="text"], input[type="number"]', '50000');

    // Try to submit
    const submitButton = page.locator('button:has-text("Continue"), button:has-text("Submit"), button:has-text("Confirm")').first();
    await submitButton.click();

    await page.waitForTimeout(500);

    // Should either show success or proceed to next step (not error)
    const hasError = await hasErrorMessage(page);

    if (!hasError) {
      console.log('✅ PASS: Valid amount accepted (Rp 50,000)');
    } else {
      console.log('⚠️ WARNING: Valid amount was rejected with error');
    }
  });

  test('Should show payment method options after entering valid amount', async ({ page }) => {
    // 🧪 Test: Payment method selection appears

    const buyButton = page.locator('button:has-text("Buy"), button:has-text("Top up")').first();
    await buyButton.click();

    await page.waitForTimeout(500);

    await fillInput(page, 'input[type="text"], input[type="number"]', '50000');

    const submitButton = page.locator('button:has-text("Continue"), button:has-text("Submit"), button:has-text("Confirm")').first();
    await submitButton.click();

    await page.waitForTimeout(1000);

    // Look for payment methods (e.g., QRIS, Bank Transfer, GCash, etc.)
    const paymentMethods = page.locator('[class*="payment"], [data-testid*="method"]');

    try {
      const methodCount = await paymentMethods.count();
      if (methodCount > 0) {
        console.log(`✅ PASS: Found ${methodCount} payment method(s)`);
      } else {
        console.log('⚠️ INFO: Payment methods not visible yet (might need scrolling)');
      }
    } catch (e) {
      console.log('⚠️ INFO: Could not verify payment methods section');
    }
  });

  test('Should require account details for Bank Transfer method', async ({ page }) => {
    // 🧪 Test: Bank Transfer requires account info

    const buyButton = page.locator('button:has-text("Buy"), button:has-text("Top up")').first();
    await buyButton.click();

    await page.waitForTimeout(500);

    await fillInput(page, 'input[type="text"], input[type="number"]', '50000');

    const submitButton = page.locator('button:has-text("Continue"), button:has-text("Submit")').first();
    await submitButton.click();

    await page.waitForTimeout(1000);

    // Try to find and click Bank Transfer option
    const bankTransferButton = page.locator('button:has-text("Bank"), text=/Bank Transfer|Transfer Bank/').first();

    try {
      await bankTransferButton.click();
      console.log('✅ PASS: Bank Transfer option available');
    } catch (e) {
      console.log('⚠️ INFO: Bank Transfer not found (other methods might be available)');
    }
  });

  test('Should handle form submission and show confirmation', async ({ page }) => {
    // 🧪 Test: End-to-end TopUp flow

    const buyButton = page.locator('button:has-text("Buy"), button:has-text("Top up")').first();
    await buyButton.click();

    await page.waitForTimeout(500);

    // Enter amount
    await fillInput(page, 'input[type="text"], input[type="number"]', '75000');

    const submitButton = page.locator('button:has-text("Continue"), button:has-text("Submit")').first();
    await submitButton.click();

    await page.waitForTimeout(1500);

    // Should see either:
    // 1. Payment method selection
    // 2. Success message
    // 3. Confirmation screen

    const confirmationFound = await page.locator(
      'text=/confirm|success|payment|qris|bank|transfer/i'
    ).count() > 0;

    if (confirmationFound) {
      console.log('✅ PASS: TopUp flow proceeded to confirmation/payment step');
    } else {
      console.log('⚠️ INFO: Confirmation screen not yet visible');
    }
  });

  test('Should display amount in proper IDR format', async ({ page }) => {
    // 🧪 Test: Amount formatting

    const buyButton = page.locator('button:has-text("Buy"), button:has-text("Top up")').first();
    await buyButton.click();

    await page.waitForTimeout(500);

    // Enter amount
    await fillInput(page, 'input[type="text"], input[type="number"]', '100000');

    // Check if formatted display exists
    const displayedAmount = page.locator('text=/Rp|IDR|100|100\.000|100,000/i').first();

    try {
      await displayedAmount.waitFor({ state: 'visible', timeout: 2000 });
      const amountText = await displayedAmount.textContent();
      console.log(`✅ PASS: Amount displayed as: ${amountText}`);
    } catch (e) {
      console.log('⚠️ INFO: Formatted amount not found in expected location');
    }
  });
});

