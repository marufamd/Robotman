import { expect, test } from '@playwright/test';

type Calls = { saved?: any; settings?: any };

async function mockApi(page: import('@playwright/test').Page, introduction = 'Hello there') {
  const calls: Calls = {};
  await page.route('**/api/graphql', async route => {
    const { query, variables } = route.request().postDataJSON();
    if (query.includes('authUser')) return route.fulfill({ json: { data: { authUser: { id: 'manager', username: 'Manager' }, authCsrfToken: 'csrf' } } });
    if (query.includes('managedGuilds')) return route.fulfill({ json: { data: { managedGuilds: [{ id: 'test', name: 'Test server', installed: true }] } } });
    if (query.includes('updateResponseSettings')) { calls.settings = variables.input; return route.fulfill({ json: { data: { updateResponseSettings: variables.input } } }); }
    if (query.includes('responseSettings')) return route.fulfill({ json: { data: { responseSettings: { introduction } } } });
    if (query.includes('mutation Save')) { calls.saved = variables.input; return route.fulfill({ json: { data: { createResponse: { id: 'saved' } } } }); }
    return route.fulfill({ json: { data: { responses: [], recommendationEntries: [] } } });
  });
  return calls;
}

test('a manager sets the default introduction shown before Responses', async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto('/servers/test/responses/settings');
  const introduction = page.getByRole('textbox', { name: 'Default introduction', exact: true });
  await expect(introduction).toHaveValue('Hello there');
  const variables = page.getByRole('region', { name: 'Variables for introductions' });
  await expect(variables.getByText('{trigger}', { exact: true })).toBeVisible();
  await expect(variables.getByText('{curator_name}', { exact: true })).toHaveCount(0);
  await introduction.fill('Here is {trigger}:');
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(page.getByText('Response settings saved.')).toBeVisible();
  expect(calls.settings).toEqual({ introduction: 'Here is {trigger}:' });
});

test('an unsaved Response settings draft survives signing in again', async ({ page }) => {
  await mockApi(page);
  await page.goto('/servers/test/responses/settings');
  await page.getByRole('textbox', { name: 'Default introduction', exact: true }).fill('Draft intro');
  await page.evaluate(() => window.dispatchEvent(new Event('robotman:before-sign-in', { cancelable: true })));
  await page.reload();
  await expect(page.getByText('Your settings draft was restored.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Default introduction', exact: true })).toHaveValue('Draft intro');
});

test('the Responses page links to Response Settings', async ({ page }) => {
  await mockApi(page);
  await page.goto('/servers/test/responses');
  await page.getByRole('link', { name: 'Response Settings', exact: true }).click();
  await expect(page).toHaveURL(/\/servers\/test\/responses\/settings$/);
  await expect(page.getByRole('heading', { name: 'Response Settings', exact: true })).toBeVisible();
});

test('each Response can use the server default, its own introduction, or none', async ({ page }) => {
  const calls = await mockApi(page, 'Server default intro');
  await page.goto('/servers/test/responses/new');
  const mode = page.getByRole('combobox', { name: 'Introduction', exact: true });
  await expect(mode).toHaveValue('INHERIT');
  await expect(page.getByRole('region', { name: 'Response introduction' }).getByText('Server default intro', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: /^Trigger/ }).fill('welcome');
  await page.getByRole('textbox', { name: 'Message text', exact: true }).fill('The body');
  await mode.selectOption('CUSTOM');
  await page.getByRole('textbox', { name: 'Custom introduction', exact: true }).fill('Own intro for {trigger}');
  await page.getByRole('button', { name: 'Create Response', exact: true }).click();
  await expect.poll(() => calls.saved).toMatchObject({ trigger: 'welcome', introductionMode: 'CUSTOM', introduction: 'Own intro for {trigger}' });

  await page.goto('/servers/test/responses/new');
  await page.getByRole('combobox', { name: 'Introduction', exact: true }).selectOption('NONE');
  await page.getByRole('textbox', { name: /^Trigger/ }).fill('plain');
  await page.getByRole('textbox', { name: 'Message text', exact: true }).fill('Body');
  await page.getByRole('button', { name: 'Create Response', exact: true }).click();
  await expect.poll(() => calls.saved).toMatchObject({ trigger: 'plain', introductionMode: 'NONE', introduction: '' });
});
