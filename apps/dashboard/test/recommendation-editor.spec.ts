import { expect, test } from '@playwright/test';

test('a manager composes and previews a personal recommendation with the full embed editor', async ({ page }) => {
  let saved: any;
  let expired = true;
  let saveAttempts = 0;
  const settings = { lists: { tasteTest: { title: 'Taste Test', introduction: 'Welcome to **Taste Test**.', color: 3447003, moderatorHeading: 'Mods', boosterHeading: 'Boosters' }, characters: { title: 'Character Recommendations', introduction: 'Use /recs lookup.', color: 3447003 }, writers: { title: 'Writer Recommendations', introduction: 'Use /recs lookup.', color: 3447003 } }, categories: ['CHARACTER', 'WRITER', 'MODERATOR', 'BOOSTER'].map(category => ({ category, introduction: category === 'MODERATOR' ? 'Welcome to **Taste Test**, {curator_name} picks.' : '' })) };
  await page.route('**/api/graphql', async route => {
    const { query, variables } = route.request().postDataJSON();
    if (query.includes('authUser')) return route.fulfill({ json: { data: { authUser: { id: 'manager', username: 'Manager' }, authCsrfToken: 'csrf' } } });
    if (query.includes('managedGuilds')) return route.fulfill({ json: { data: { managedGuilds: [{ id: 'test', name: 'Test server', installed: true }] } } });
    if (query.includes('mutation Save')) { saveAttempts++; if (expired) return route.fulfill({ json: { errors: [{ message: 'Sign in required', extensions: { code: 'UNAUTHENTICATED' } }] } }); saved = variables.input; return route.fulfill({ json: { data: { createRecommendation: { id: 'saved' } } } }); }
    if (query.includes('recommendationSettings')) return route.fulfill({ json: { data: { recommendationSettings: settings } } });
    return route.fulfill({ json: { data: { recommendationEntries: [] } } });
  });
  await page.route('**/api/auth/login', route => { expired = false; return route.fulfill({ status: 302, headers: { location: '/' } }); });
  await page.goto('/servers/test/recommendations');
  await page.getByRole('link', { name: 'New Recommendation', exact: true }).click();
  await page.getByRole('textbox', { name: /^Collection name/ }).fill('Alex’s Marvel picks');
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('MODERATOR');
  await page.getByRole('textbox', { name: 'Curator name', exact: true }).fill('Alex');
  await expect(page.getByRole('textbox', { name: /^Collection name/ })).toHaveCount(0);
  await page.getByRole('textbox', { name: /^Discord user ID/ }).fill('123456789012345678');
  await page.getByRole('textbox', { name: 'Message text', exact: true }).fill('Books selected by {curator_name}. Hello {username}.');
  await page.getByRole('button', { name: /Add embed/ }).click();
  await page.getByRole('textbox', { name: /^Title\b/ }).first().fill('Start here');
  await page.getByRole('textbox', { name: /^Description/ }).fill('Book one, then book two.');
  const preview = page.getByLabel('Discord preview', { exact: true });
  await expect(preview).toContainText('Taste Test');
  await expect(preview).toContainText('Books selected by Alex. Hello Manager.');
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/recommendation-editor-desktop.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/recommendation-editor-mobile.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('combobox', { name: 'Introduction', exact: true }).selectOption('NONE');
  await expect(preview).not.toContainText('Taste Test');
  await page.getByRole('button', { name: 'Create Recommendation', exact: true }).click();
  await page.getByRole('button', { name: 'Sign in again', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Curator name', exact: true })).toHaveValue('Alex');
  await expect(page.getByRole('combobox', { name: 'Introduction', exact: true })).toHaveValue('NONE');
  await expect(preview).toContainText('Start here');
  expect(saveAttempts).toBe(1);
  await page.getByRole('button', { name: 'Create Recommendation', exact: true }).click();
  await expect(page).toHaveURL(/\/recommendations\/?$/);
  expect(saved.category).toBe('MODERATOR');
  expect(saved.curatorName).toBe('Alex');
  expect(saved.name).toBe('Alex');
  expect(saved.introductionMode).toBe('NONE');
  expect(JSON.parse(saved.embedsJson)[0]).toMatchObject({ title: 'Start here', description: 'Book one, then book two.' });
});

test('a manager customizes each list separately from category introductions', async ({ page }) => {
  let saved: any;
  const settings = { lists: { tasteTest: { title: 'Taste Test', introduction: 'Welcome to **Taste Test**.', color: 3447003, moderatorHeading: 'Mods', boosterHeading: 'Boosters' }, characters: { title: 'Character Recommendations', introduction: 'Use /recs lookup.', color: 3447003 }, writers: { title: 'Writer Recommendations', introduction: 'Use /recs lookup.', color: 3447003 } }, categories: ['CHARACTER', 'WRITER', 'MODERATOR', 'BOOSTER'].map(category => ({ category, introduction: category === 'MODERATOR' ? 'Original Taste Test wording' : '' })) };
  await page.route('**/api/graphql', async route => {
    const { query, variables } = route.request().postDataJSON();
    if (query.includes('authUser')) return route.fulfill({ json: { data: { authUser: { id: 'manager', username: 'Manager' }, authCsrfToken: 'csrf' } } });
    if (query.includes('managedGuilds')) return route.fulfill({ json: { data: { managedGuilds: [{ id: 'test', name: 'Test server', installed: true }] } } });
    if (query.includes('updateRecommendationSettings')) { saved = variables.input; return route.fulfill({ json: { data: { updateRecommendationSettings: saved } } }); }
    return route.fulfill({ json: { data: { recommendationSettings: settings } } });
  });
  await page.goto('/servers/test/recommendations/settings');
  const backLink = page.getByRole('link', { name: 'All Recommendations', exact: true });
  await backLink.hover();
  await expect(backLink.locator('span')).toHaveCSS('text-decoration-line', 'underline');
  await page.getByRole('textbox', { name: 'Taste Test title', exact: true }).fill('Community taste');
  await page.getByRole('textbox', { name: 'Mods heading', exact: true }).fill('Our mods');
  await page.getByRole('textbox', { name: 'Boosters heading', exact: true }).fill('Our supporters');
  await page.getByRole('textbox', { name: 'Characters title', exact: true }).fill('Heroes');
  await page.getByRole('textbox', { name: 'Writers introduction', exact: true }).fill('Find authors with /recs lookup.');
  await page.getByRole('textbox', { name: 'Moderator default introduction', exact: true }).fill('Reading picks from {curator_name}');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '/tmp/recommendation-settings.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(page.getByText('Recommendation settings saved.')).toBeVisible();
  expect(saved.lists.tasteTest).toMatchObject({ title: 'Community taste', moderatorHeading: 'Our mods', boosterHeading: 'Our supporters' });
  expect(saved.lists.characters.title).toBe('Heroes');
  expect(saved.lists.writers.introduction).toBe('Find authors with /recs lookup.');
  expect(saved.categories.find((c: any) => c.category === 'MODERATOR')).toEqual({ category: 'MODERATOR', introduction: 'Reading picks from {curator_name}' });
});

test('an in-progress list settings draft is restored after signing in again', async ({ page }) => {
  const settings = { lists: { tasteTest: { title: 'Taste Test', introduction: 'Hello', color: 3447003, moderatorHeading: 'Mods', boosterHeading: 'Boosters' }, characters: { title: 'Character Recommendations', introduction: '', color: 3447003 }, writers: { title: 'Writer Recommendations', introduction: '', color: 3447003 } }, categories: ['CHARACTER', 'WRITER', 'MODERATOR', 'BOOSTER'].map(category => ({ category, introduction: '' })) };
  await page.route('**/api/graphql', async route => {
    const { query } = route.request().postDataJSON();
    if (query.includes('authUser')) return route.fulfill({ json: { data: { authUser: { id: 'manager', username: 'Manager' }, authCsrfToken: 'csrf' } } });
    if (query.includes('managedGuilds')) return route.fulfill({ json: { data: { managedGuilds: [{ id: 'test', name: 'Test server', installed: true }] } } });
    return route.fulfill({ json: { data: { recommendationSettings: settings } } });
  });
  await page.goto('/servers/test/recommendations/settings');
  await page.getByRole('textbox', { name: 'Writers title', exact: true }).fill('Authors draft');
  await page.evaluate(() => window.dispatchEvent(new Event('robotman:before-sign-in', { cancelable: true })));
  await page.reload();
  await expect(page.getByText('Your settings draft was restored.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Writers title', exact: true })).toHaveValue('Authors draft');
});

async function mockEditorApi(page: import('@playwright/test').Page) {
  const settings = { lists: { tasteTest: { title: 'Taste Test', introduction: '', color: 3447003, moderatorHeading: 'Mods', boosterHeading: 'Boosters' }, characters: { title: 'C', introduction: '', color: 1 }, writers: { title: 'W', introduction: '', color: 1 } }, categories: ['CHARACTER', 'WRITER', 'MODERATOR', 'BOOSTER'].map(category => ({ category, introduction: '' })) };
  await page.route('**/api/graphql', async route => {
    const { query } = route.request().postDataJSON();
    if (query.includes('authUser')) return route.fulfill({ json: { data: { authUser: { id: 'manager', username: 'Manager' }, authCsrfToken: 'csrf' } } });
    if (query.includes('managedGuilds')) return route.fulfill({ json: { data: { managedGuilds: [{ id: 'test', name: 'Test server', installed: true }] } } });
    if (query.includes('recommendationSettings')) return route.fulfill({ json: { data: { recommendationSettings: settings } } });
    return route.fulfill({ json: { data: { responses: [], recommendationEntries: [] } } });
  });
}

test('the message editors show every variable up front and insert it at the cursor', async ({ page }) => {
  await mockEditorApi(page);
  await page.goto('/servers/test/responses/new');
  const variables = page.getByRole('region', { name: 'Available variables' });
  for (const name of ['user', 'username', 'avatar', 'server', 'channel', 'trigger']) await expect(variables.getByRole('button', { name: `Insert {${name}}` })).toBeVisible();
  await expect(variables.getByText('what the requester typed')).toBeVisible();
  await expect(variables.getByRole('button', { name: 'Insert {curator_name}' })).toHaveCount(0);
  const message = page.getByRole('textbox', { name: 'Message text', exact: true });
  await message.fill('AB');
  await message.press('Home'); await message.press('ArrowRight');
  await variables.getByRole('button', { name: 'Insert {trigger}' }).click();
  await expect(message).toHaveValue('A{trigger}B');
  await expect(message).toBeFocused();
});

test('curator variables appear only for Moderator and Booster recommendations', async ({ page }) => {
  await mockEditorApi(page);
  await page.goto('/servers/test/recommendations/new');
  const variables = page.getByRole('region', { name: 'Available variables' });
  await expect(variables.getByRole('button', { name: 'Insert {trigger}' })).toBeVisible();
  await expect(variables.getByRole('button', { name: 'Insert {curator_name}' })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('MODERATOR');
  await expect(variables.getByRole('button', { name: 'Insert {curator_name}' })).toBeVisible();
});

test('recommendation settings list the variables for introductions and say the list texts are plain', async ({ page }) => {
  await mockEditorApi(page);
  await page.goto('/servers/test/recommendations/settings');
  const variables = page.getByRole('region', { name: 'Variables for introductions' });
  await expect(variables).toBeVisible();
  for (const name of ['user', 'username', 'avatar', 'server', 'channel', 'trigger', 'curator_name']) await expect(variables.getByText(`{${name}}`, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('List titles and introductions are plain text; variables are not filled in.')).toBeVisible();
});
