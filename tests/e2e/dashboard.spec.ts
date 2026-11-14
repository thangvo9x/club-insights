import { test, expect } from '@playwright/test';

test('API contract, validation and club isolation', async ({ request }) => {
  const clubsResponse = await request.get('/api/clubs');
  expect(clubsResponse.ok()).toBeTruthy();
  expect((await clubsResponse.json()).clubs).toHaveLength(2);
  const response = await request.get(
    '/api/insights?clubId=club-001&start=2026-09-07&end=2026-10-04',
  );
  expect(response.headers()['cache-control']).toBe('no-store');
  const insights = await response.json();
  expect(insights.dataSource).toBe('imported');
  expect(insights.current).toMatchObject({
    activePlayers: 93,
    sessionsHeld: 20,
    noShows: 15,
  });
  expect(insights.current.sessionsHeld).toBe(insights.details.sessions.length);
  expect(insights.current.activePlayers).toBe(insights.details.players.length);
  expect(insights.current.noShows).toBe(
    insights.details.sessions.reduce(
      (sum: number, session: { noShows: number | null }) =>
        sum + (session.noShows ?? 0),
      0,
    ),
  );
  expect(insights.previousRange).toEqual({
    start: '2026-08-10',
    end: '2026-09-06',
  });
  for (const query of [
    'clubId=club-001&start=2026-02-30&end=2026-10-04',
    'clubId=club-001&start=2026-10-05&end=2026-09-01',
    'clubId=club-001&start=2026-10-06&end=2026-10-06',
    'clubId=club-001',
  ]) {
    expect((await request.get(`/api/insights?${query}`)).status()).toBe(400);
  }
  expect(
    (
      await request.get(
        '/api/insights?clubId=missing&start=2026-09-07&end=2026-10-04',
      )
    ).status(),
  ).toBe(404);
  const empty = await (
    await request.get(
      '/api/insights?clubId=club-002&start=2026-09-07&end=2026-10-04',
    )
  ).json();
  expect(empty.current).toMatchObject({
    activePlayers: 0,
    sessionsHeld: 0,
    noShows: null,
  });
  expect(empty.details).toEqual({ players: [], sessions: [] });
});

test('host explores numbers, changes dates, and switches to a useful empty club', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Your club at a glance' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'View players', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page.getByRole('columnheader', { name: 'Player', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Chart Recorded no-shows' }).click();
  await expect(
    page.getByRole('heading', { name: 'Recorded no-shows, week by week' }),
  ).toBeVisible();
  await page
    .locator('.metric-card')
    .last()
    .getByRole('button', { name: 'View sessions' })
    .click();
  await expect(page.getByRole('dialog')).toContainText('Unknown');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByLabel('DATE RANGE', { exact: true }).selectOption('custom');
  await page.getByLabel('Start date', { exact: true }).fill('2026-10-05');
  await page.getByLabel('End date', { exact: true }).fill('2026-10-04');
  await page.getByRole('button', { name: 'Apply range' }).click();
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'Start date must be on or before end date.' }),
  ).toBeVisible();
  await page.getByLabel('Start date', { exact: true }).fill('2026-09-30');
  await page.getByLabel('End date', { exact: true }).fill('2026-10-04');
  await page.getByRole('button', { name: 'Apply range' }).click();
  await expect(
    page.getByText('Partial week', { exact: true }).first(),
  ).toBeVisible();
  await page.getByLabel('Start date', { exact: true }).fill('2026-01-02');
  await page.getByLabel('End date', { exact: true }).fill('2026-01-02');
  await page.getByRole('button', { name: 'Apply range' }).click();
  await expect(
    page.getByText('No held sessions in this range.', { exact: false }),
  ).toBeVisible();
  await page.getByLabel('YOUR CLUB', { exact: true }).selectOption('club-002');
  await expect(
    page.getByRole('heading', { name: 'Your club’s story starts here.' }),
  ).toBeVisible();
  await expect(
    page.getByText('Record attendance', { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('mobile stays within viewport and dialog remains usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Your club at a glance' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'View players', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('API errors offer retry and recover', async ({ page }) => {
  await page.route('**/api/insights?*', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Temporary failure.' }),
    }),
  );
  await page.goto('/');
  await expect(
    page.getByRole('alert').filter({ hasText: 'Temporary failure.' }),
  ).toContainText('Temporary failure.');
  await page.unroute('**/api/insights?*');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(
    page.getByRole('heading', { name: 'Your club at a glance' }),
  ).toBeVisible();
});

test('a delayed response for the previous filters cannot replace the selected club', async ({
  page,
  request,
}) => {
  const oldResponse = await request.get(
    '/api/insights?clubId=club-001&start=2026-09-28&end=2026-10-04',
  );
  const oldData = await oldResponse.json();
  const started = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const finished = Promise.withResolvers<void>();
  await page.route('**/api/insights?*', async (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (
      params.get('clubId') !== 'club-001' ||
      params.get('start') !== '2026-09-28'
    ) {
      await route.continue();
      return;
    }
    started.resolve();
    await release.promise;
    try {
      await route.fulfill({ json: oldData });
    } finally {
      finished.resolve();
    }
  });
  try {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Your club at a glance' }),
    ).toBeVisible();
    await page.getByLabel('DATE RANGE', { exact: true }).selectOption('7');
    await started.promise;
    await page
      .getByLabel('YOUR CLUB', { exact: true })
      .selectOption('club-002');
    await expect(
      page.getByRole('heading', { name: 'Your club’s story starts here.' }),
    ).toBeVisible();
    release.resolve();
    await finished.promise;
    await expect(
      page.getByRole('heading', { name: 'Your club’s story starts here.' }),
    ).toBeVisible();
    await expect(page.locator('.metric-value').first()).toHaveText('0');
  } finally {
    release.resolve();
  }
});

test('club-list requests recover from a non-JSON server error', async ({
  page,
}) => {
  await page.route('**/api/clubs', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'text/html',
      body: '<h1>Unavailable</h1>',
    }),
  );
  await page.goto('/');
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'The server returned invalid JSON.' }),
  ).toBeVisible();
  await page.unroute('**/api/clubs');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(
    page.getByRole('heading', { name: 'Your club at a glance' }),
  ).toBeVisible();
});
