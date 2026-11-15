import { expect, test } from '@playwright/test';

const subjects = ['RESPONSE', 'CHARACTER', 'WRITER', 'MODERATOR', 'BOOSTER'];
const events = Array.from({ length: 30 }, (_, index) => ({
  action: ['CREATED', 'UPDATED', 'DELETED'][index % 3], subject: subjects[index % 5], actorId: '111', actorName: index % 2 ? 'Quinn' : null, guildId: 'test',
  entryId: `entry-${index}`, trigger: `Item ${String(index).padStart(2, '0')}`, occurredAt: new Date(Date.UTC(2026, 10, 1, 12, index)).toISOString(),
}));

async function mockHistory(page: import('@playwright/test').Page) {
  const requests: Array<{ page: number; pageSize: number; order: string }> = [];
  await page.route('**/api/graphql', async route => {
    const { query, variables } = route.request().postDataJSON();
    if (query.includes('authUser')) return route.fulfill({ json: { data: { authUser: { id: 'manager', username: 'Manager' }, authCsrfToken: 'csrf' } } });
    if (query.includes('managedGuilds')) return route.fulfill({ json: { data: { managedGuilds: [{ id: 'test', name: 'Test server', installed: true }] } } });
    if (query.includes('changeHistory')) {
      requests.push({ page: variables.page, pageSize: variables.pageSize, order: variables.order });
      const ordered = variables.order === 'OLDEST' ? events : [...events].reverse();
      const pageCount = Math.ceil(ordered.length / variables.pageSize);
      const current = Math.min(variables.page, pageCount);
      return route.fulfill({ json: { data: { changeHistory: { total: ordered.length, page: current, pageCount, pageSize: variables.pageSize, items: ordered.slice((current - 1) * variables.pageSize, current * variables.pageSize) } } } });
    }
    return route.fulfill({ json: { data: {} } });
  });
  return requests;
}

test('Change History lists Responses and recommendations with their type, newest first', async ({ page }) => {
  await mockHistory(page);
  await page.goto('/servers/test/history');
  await expect(page.getByRole('heading', { name: 'Change History', exact: true })).toBeVisible();
  const rows = page.getByRole('listitem').filter({ hasText: 'Item' });
  await expect(rows).toHaveCount(25);
  await expect(rows.first()).toContainText('Item 29');
  await expect(rows.first()).toContainText('Booster');
  await expect(rows.first()).toContainText('deleted');
  await expect(rows.first()).toContainText('Quinn');
  await expect(rows.nth(1)).toContainText('Item 28');
  await expect(rows.nth(1)).toContainText('Moderator');
  await expect(rows.nth(1)).toContainText('user 111');
  await expect(page.getByText('Response', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
});

test('Change History pages and sorts through the address bar', async ({ page }) => {
  const requests = await mockHistory(page);
  await page.goto('/servers/test/history');
  await expect(page.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Item' })).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled();
  expect(requests.at(-1)).toMatchObject({ page: 2, pageSize: 25, order: 'NEWEST' });

  await page.getByRole('combobox', { name: 'Sort order' }).selectOption('oldest');
  await expect(page).toHaveURL(/order=oldest/);
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Item' }).first()).toContainText('Item 00');
  expect(requests.at(-1)).toMatchObject({ page: 1, order: 'OLDEST' });

  await page.goto('/servers/test/history?page=2&order=oldest');
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Sort order' })).toHaveValue('oldest');
  await expect(page.getByRole('listitem').filter({ hasText: 'Item' }).first()).toContainText('Item 25');
});
