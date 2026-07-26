import { Page, expect } from '@playwright/test';

/**
 * Test Helper Functions for Ledger App
 */

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

/**
 * Get JWT token from localStorage
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  const token = await page.evaluate(() => {
    return localStorage.getItem('authToken');
  });
  return token;
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const token = await getAuthToken(page);
  return !!token;
}

/**
 * Navigate and wait for page
 */
export async function navigateTo(page: Page, path: string = '/') {
  await page.goto(path);
  await waitForPageLoad(page);
}

/**
 * Extract username from email (e.g., "john.doe@example.com" -> "john doe")
 */
export function extractUsernameFromEmail(email: string): string {
  return email.split('@')[0].replace(/\./g, ' ');
}

/**
 * Get initials from username (e.g., "john doe" -> "JD")
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Wait for element and verify visibility
 */
export async function waitForElementVisible(page: Page, selector: string, timeout = 5000) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
  return element;
}

/**
 * Wait for element and verify invisibility
 */
export async function waitForElementHidden(page: Page, selector: string, timeout = 5000) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'hidden', timeout });
  return element;
}

/**
 * Fill form input and verify value
 */
export async function fillInput(page: Page, selector: string, value: string) {
  const input = page.locator(selector);
  await input.clear();
  await input.fill(value);
  await input.blur();
  await page.waitForTimeout(300);
}

/**
 * Click and wait for navigation or content change
 */
export async function clickAndWait(
  page: Page,
  selector: string,
  options?: { waitForNavigation?: boolean; timeout?: number }
) {
  const button = page.locator(selector);

  if (options?.waitForNavigation) {
    await Promise.all([page.waitForNavigation(), button.click()]);
  } else {
    await button.click();
  }

  await page.waitForTimeout(options?.timeout ?? 500);
}

/**
 * Get text content from element
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible' });
  const content = await element.textContent({ timeout: 5000 });
  return content ?? '';
}

/**
 * Check if error message is displayed
 */
export async function hasErrorMessage(page: Page, errorText?: string): Promise<boolean> {
  const errorLocator = page.locator('[data-testid="error-message"], .error, .alert-error');

  try {
    await errorLocator.waitFor({ state: 'visible', timeout: 2000 });

    if (errorText) {
      const errorContent = await errorLocator.textContent();
      return errorContent?.includes(errorText) ?? false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Check if success message is displayed
 */
export async function hasSuccessMessage(page: Page, successText?: string): Promise<boolean> {
  const successLocator = page.locator('[data-testid="success-message"], .success, .alert-success');

  try {
    await successLocator.waitFor({ state: 'visible', timeout: 2000 });

    if (successText) {
      const successContent = await successLocator.textContent();
      return successContent?.includes(successText) ?? false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Mock API response
 */
export async function mockAPIResponse(
  page: Page,
  urlPattern: string | RegExp,
  responseData: any,
  status = 200
) {
  await page.route(urlPattern, async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(responseData),
    });
  });
}

/**
 * Get sidebar profile section
 */
export async function getSidebarProfile(page: Page) {
  return page.locator('[data-testid="sidebar-profile"], .sidebar-profile, button:has-text("Profile")').last();
}

/**
 * Scroll to bottom of page (for infinite scroll testing)
 */
export async function scrollToBottom(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(1000);
}

/**
 * Take screenshot with custom path
 */
export async function takeScreenshot(page: Page, fileName: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ path: `./test-results/screenshots/${fileName}-${timestamp}.png` });
}



