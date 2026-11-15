import { expect, test } from '@playwright/test';

test('expired sign-in preserves a Response draft through OAuth and never automatically saves it', async ({ page }) => {
  let expired = false;
  let saves = 0;
  let csrf = 'initial-csrf';
  await page.route('**/api/graphql', async route => {
    const { query } = route.request().postDataJSON();
    if (query.includes('mutation Save')) {
      saves++;
      if (expired) return route.fulfill({ json: { errors: [{ message: 'Sign in required', extensions: { code: 'UNAUTHENTICATED' } }] } });
      expect(route.request().headers()['x-csrf-token']).toBe('renewed-csrf');
      return route.fulfill({ json: { data: { createResponse: { id: 'saved' } } } });
    }
    if (query.includes('authUser')) return route.fulfill({ json: { data: { authUser: { id: 'manager', username: 'manager', displayName: null, avatarUrl: null }, authCsrfToken: csrf } } });
    if (query.includes('managedGuilds')) return route.fulfill({ json: { data: { managedGuilds: [{ id: 'test', name: 'Test server', installed: true, owner: true, icon: null, inviteUrl: '' }] } } });
    if (query.includes('responseSettings')) return route.fulfill({ json: { data: { responseSettings: { introduction: '' } } } });
    return route.fulfill({ json: { data: { responses: [] } } });
  });
  await page.route('**/api/auth/login', route => {
    expired = false;
    csrf = 'renewed-csrf';
    return route.fulfill({ status: 302, headers: { location: '/' } });
  });
  await page.goto('/servers/test/responses/new');
  await page.getByRole('textbox', { name: /^Trigger/ }).fill('welcome');
  await page.getByRole('textbox', { name: 'Message text', exact: true }).fill('An unsaved reply');
  expired = true;
  await page.getByRole('button', { name: 'Create Response', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign in again', exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '/tmp/robotman-session-desktop.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/tmp/robotman-session-mobile.png', fullPage: true, animations: 'disabled' });
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as Window & { restoreStorage?: () => void }).restoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith('robotman:response-draft:')) throw new DOMException('Tab storage is full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Sign in again', exact: true }).click();
  await expect(page.getByText('Your draft could not be kept for sign-in. Allow tab storage or copy your changes before continuing.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: /^Trigger/ })).toHaveValue('welcome');
  await page.evaluate(() => (window as Window & { restoreStorage?: () => void }).restoreStorage?.());
  await page.getByRole('button', { name: 'Sign in again', exact: true }).click();
  await expect(page.getByRole('textbox', { name: /^Trigger/ })).toHaveValue('welcome');
  await expect(page.getByRole('textbox', { name: 'Message text', exact: true })).toHaveValue('An unsaved reply');
  await expect(page.getByText('Your draft was restored. Review it, then save when ready.')).toBeVisible();
  expect(saves).toBe(1);
  await page.getByRole('button', { name: 'Create Response', exact: true }).click();
  await expect(page).toHaveURL(/\/servers\/test\/responses\/?$/);
  expect(saves).toBe(2);
});

test('a database outage keeps the editor and identity available for an explicit retry', async ({ page }) => {
  let outage = false;
  await page.route('**/api/graphql', async route => {
    const { query } = route.request().postDataJSON();
    if (outage) return route.fulfill({ json: { errors: [{ message: 'Sign-in service is temporarily unavailable. Please try again.', extensions: { code: 'SERVICE_UNAVAILABLE' } }] } });
    if (query.includes('authUser')) return route.fulfill({ json: { data: { authUser: { id: 'manager', username: 'manager' }, authCsrfToken: 'csrf' } } });
    if (query.includes('responseSettings')) return route.fulfill({ json: { data: { responseSettings: { introduction: '' } } } });
    return route.fulfill({ json: { data: { managedGuilds: [{ id: 'test', name: 'Test server', installed: true }] } } });
  });
  await page.goto('/servers/test/responses/new');
  await page.getByRole('textbox', { name: /^Trigger/ }).fill('keep-me');
  await page.getByRole('textbox', { name: 'Message text', exact: true }).fill('Keep this draft');
  outage = true;
  await page.getByRole('button', { name: 'Create Response', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in again', exact: true })).toHaveCount(0);
  outage = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: /^Trigger/ })).toHaveValue('keep-me');
  await expect(page.getByRole('button', { name: 'Create Response', exact: true })).toBeEnabled();
});

test('signing in with a different Discord account does not restore the previous account draft', async ({ page }) => {
  let userId = 'original-manager';
  await page.route('**/api/graphql', async route => {
    const { query } = route.request().postDataJSON();
    if (query.includes('mutation Save')) return route.fulfill({ json: { errors: [{ message: 'Sign in required', extensions: { code: 'UNAUTHENTICATED' } }] } });
    if (query.includes('authUser')) return route.fulfill({ json: { data: { authUser: { id: userId, username: userId }, authCsrfToken: 'csrf' } } });
    if (query.includes('responseSettings')) return route.fulfill({ json: { data: { responseSettings: { introduction: '' } } } });
    return route.fulfill({ json: { data: { managedGuilds: [{ id: 'test', name: 'Test server', installed: true }] } } });
  });
  await page.route('**/api/auth/login', route => {
    userId = 'another-manager';
    return route.fulfill({ status: 302, headers: { location: '/' } });
  });
  await page.goto('/servers/test/responses/new');
  await page.getByRole('textbox', { name: /^Trigger/ }).fill('private-draft');
  await page.getByRole('textbox', { name: 'Message text', exact: true }).fill('Original account reply');
  await page.getByRole('button', { name: 'Create Response', exact: true }).click();
  await page.getByRole('button', { name: 'Sign in again', exact: true }).click();
  await expect(page.getByRole('textbox', { name: /^Trigger/ })).toHaveValue('');
  await expect(page.getByRole('textbox', { name: 'Message text', exact: true })).toHaveValue('');
  await expect(page.getByText('Your draft was restored. Review it, then save when ready.')).toHaveCount(0);
});
