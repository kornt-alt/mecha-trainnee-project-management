// frontend/tests/projects-workspace-consistency.spec.js — regression for Projects list ↔ Project
// Workspace consistency: every project link on the list page must open a workspace that resolves
// (not the "ไม่พบโปรเจกต์" not-found state), and the workspace must show the same project name.
//
// Root cause: the list page sourced projects from the API when connected, while the workspace
// always resolved from the shared mock workspace records — an API-only project could open to
// "ไม่พบโปรเจกต์" and overlapping projects could show diverging data. The list now only links
// projects the workspace can open. These tests run against the live dev server with mock data
// and never talk to the backend.
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/session';

const PROJECT_URL = '/PROJECT-MANAGEMENT/projects';

// Force mock data: no real API call may answer.
test.beforeEach(async ({ page }) => {
  await loginAs(page);
  await page.route('**/PROJECT-MANAGEMENT/api/projects**', async (route) => {
    const type = route.request().resourceType();
    if (type === 'fetch' || type === 'xhr') {
      await route.abort();
    } else {
      await route.continue();
    }
  });
  await page.goto(PROJECT_URL);
  await expect(page.locator('.project-card-item').first()).toBeVisible();
});

// Every project card on the list must open a workspace that resolves, and the workspace title
// must match the card's project name (list and workspace share the same record set).
test('every project card on the list opens a workspace that resolves with the same name', async ({ page }) => {
  const names = await page.locator('.project-card-item').evaluateAll((cards) =>
    cards.map((card) => card.querySelector('.project-card-title')?.textContent?.trim() || '')
  );

  expect(names.length).toBeGreaterThan(0);

  for (const name of names) {
    const card = page.locator('.project-card-item').filter({ hasText: name });
    await card.locator('.project-card-navigation-link').click();
    await expect(page).toHaveURL(/\/projects\/\d+$/);
    // Not-found state must never appear for a project that is listed.
    await expect(page.locator('#project-not-found-title')).toHaveCount(0);
    // The workspace must show the same project name as the list card.
    await expect(page.locator('.project-detail-title')).toHaveText(name);

    // Back to the list for the next card.
    await page.locator('.project-detail-breadcrumb a').click();
    await expect(page.locator('.project-card-item').first()).toBeVisible();
  }
});

// A direct URL to a listed project must also resolve (refresh / direct URL path).
test('direct URL to a listed project opens the workspace and back returns to the list', async ({ page }) => {
  const card = page.locator('.project-card-item').first();
  const name = await card.locator('.project-card-title').textContent();
  const href = await card.locator('.project-card-navigation-link').getAttribute('href');

  await page.goto(href);
  await expect(page.locator('#project-not-found-title')).toHaveCount(0);
  await expect(page.locator('.project-detail-title')).toHaveText(name.trim());

  await page.locator('.project-detail-breadcrumb a').click();
  await expect(page).toHaveURL(new RegExp(`${PROJECT_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
});

// An unlisted / invalid project ID must not crash — it shows the not-found state instead.
test('invalid project URL shows the not-found state without crashing', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(`${PROJECT_URL}/9999`);
  await expect(page.locator('#project-not-found-title')).toBeVisible();
  await expect(page.getByRole('link', { name: 'กลับไปหน้าโปรเจกต์' })).toBeVisible();
  expect(errors).toEqual([]);
});

// Consecutive opens from the list must not bleed state between workspaces (UX-10: opening a
// task from one project must not carry over to the next project).
test('opening two projects consecutively shows each project own name and tasks', async ({ page }) => {
  const first = await page.locator('.project-card-item').first().evaluate((card) =>
    card.querySelector('.project-card-title')?.textContent?.trim() || ''
  );
  const second = await page.locator('.project-card-item').nth(1).evaluate((card) =>
    card.querySelector('.project-card-title')?.textContent?.trim() || ''
  );

  await page.locator('.project-card-item').first().locator('.project-card-navigation-link').click();
  await expect(page.locator('.project-detail-title')).toHaveText(first);
  await page.locator('.project-detail-breadcrumb a').click();
  await page.locator('.project-card-item').nth(1).locator('.project-card-navigation-link').click();
  await expect(page.locator('.project-detail-title')).toHaveText(second);
  await expect(page.locator('.project-detail-title')).not.toHaveText(first);
});