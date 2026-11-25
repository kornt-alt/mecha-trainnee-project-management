// Regression tests for Project Workspace Timeline task bar date-range calculation.
// Project 1 range: 2026-10-01 → 2026-12-15 (spanDays = 75).
// Covers: fully in-range, starts-before overlap, ends-after overlap,
// entirely before, entirely after, and Not Started visibility.

import { test, expect } from '@playwright/test';
import { loginAs, switchUser } from './helpers/session';

const PROJECT_URL = '/PROJECT-MANAGEMENT/projects';
const PROJECT_ID = 1;

// เปิดหน้า Projects และบังคับให้ใช้ Mock Data (เทียบเท่า projects.spec.js beforeEach)
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
  await expect(page.getByRole('button', { name: /เพิ่มโปรเจกต์/ }).first()).toBeVisible();
  await expect(page.locator('.project-card-item')).toHaveCount(3);
});

async function openWorkspaceProject(page, projectId) {
  const target = `/projects/${projectId}`;
  if (new URL(page.url()).pathname.endsWith(target)) return;
  if (new URL(page.url()).pathname.includes('/projects/')) {
    await page.locator('.project-detail-breadcrumb a').click();
    await expect(page.locator('.project-card-item').first()).toBeVisible();
  }
  const projectLinks = page.locator('.project-card-navigation-link');
  const hrefs = await projectLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  const index = hrefs.findIndex((href) => href && href.endsWith(target));
  if (index < 0) throw new Error(`Project ${projectId} is not available in the project list`);
  await projectLinks.nth(index).click();
}

async function createTaskWithDates(page, { title, startDate, dueDate, actorId = 'emp-008', reviewerId = 'emp-009' }) {
  await openWorkspaceProject(page, PROJECT_ID);
  await switchUser(page, actorId);
  await page.getByRole('tab', { name: /^งาน/ }).click();
  await page.getByRole('button', { name: 'เพิ่มงาน', exact: true }).click();
  const dialog = page.getByRole('dialog').last();
  await dialog.locator('#workspace-task-title').fill(title);
  await dialog.locator('#workspace-task-assignee').selectOption(actorId);
  await dialog.locator('#workspace-task-reviewer').selectOption(reviewerId);
  await dialog.locator('#workspace-task-due').fill(dueDate);
  if (startDate) await dialog.locator('#workspace-task-start').fill(startDate);
  await dialog.getByRole('button', { name: 'สร้างงาน' }).click();
  const taskRow = page.locator('.project-tasks-row').filter({ hasText: title });
  await expect(taskRow).toBeVisible();
  return taskRow;
}

async function openTimeline(page) {
  await openWorkspaceProject(page, PROJECT_ID);
  await page.getByRole('tab', { name: /^ไทม์ไลน์/ }).click();
  await expect(page.locator('.workspace-reference-timeline')).toBeVisible();
}

async function barGeometry(page, title) {
  const row = page.locator('.workspace-reference-timeline-row').filter({ hasText: title });
  await expect(row).toBeVisible();
  const bar = row.locator('.workspace-reference-timeline-track > span');
  await expect(bar).toBeVisible();
  const style = (await bar.getAttribute('style')) || '';
  const leftM = style.match(/left:\s*([\d.]+)%?/);
  const widthM = style.match(/width:\s*([\d.]+)%?/);
  return { left: leftM ? parseFloat(leftM[1]) : null, width: widthM ? parseFloat(widthM[1]) : null, style };
}

const EPS = 0.01;

test('Timeline: task fully inside project range keeps its position and width', async ({ page }) => {
  const title = `In-range task ${Date.now()}`;
  await createTaskWithDates(page, { title, startDate: '2026-10-10', dueDate: '2026-10-20' });
  await openTimeline(page);
  const { left, width } = await barGeometry(page, title);
  expect(left).toBeGreaterThan(0);
  expect(left + width).toBeLessThan(100 - EPS);
});

test('Timeline: task starting before range but overlapping starts at left boundary', async ({ page }) => {
  const title = `Starts-before task ${Date.now()}`;
  await createTaskWithDates(page, { title, startDate: '2026-09-20', dueDate: '2026-10-05' });
  await openTimeline(page);
  const { left, width } = await barGeometry(page, title);
  expect(left).toBeCloseTo(0, EPS);
  expect(left + width).toBeLessThan(100 - EPS);
});

test('Timeline: task ending after range but overlapping ends at right boundary', async ({ page }) => {
  const title = `Ends-after task ${Date.now()}`;
  await createTaskWithDates(page, { title, startDate: '2026-12-10', dueDate: '2027-01-10' });
  await openTimeline(page);
  const { left, width } = await barGeometry(page, title);
  expect(left).toBeGreaterThan(0);
  expect(left + width).toBeCloseTo(100, EPS);
});

test('Timeline: task entirely before project range is not rendered', async ({ page }) => {
  const title = `Entirely-before task ${Date.now()}`;
  await createTaskWithDates(page, { title, startDate: '2026-09-01', dueDate: '2026-09-15' });
  await openTimeline(page);
  const rows = page.locator('.workspace-reference-timeline-row').filter({ hasText: title });
  await expect(rows).toHaveCount(0);
});

test('Timeline: task entirely after project range is not rendered', async ({ page }) => {
  const title = `Entirely-after task ${Date.now()}`;
  await createTaskWithDates(page, { title, startDate: '2027-01-01', dueDate: '2027-01-15' });
  await openTimeline(page);
  const rows = page.locator('.workspace-reference-timeline-row').filter({ hasText: title });
  await expect(rows).toHaveCount(0);
});

test('Timeline: Not Started task with valid dates remains visible (not hidden by status)', async ({ page }) => {
  const title = `Not-started task ${Date.now()}`;
  await createTaskWithDates(page, { title, startDate: '2026-11-20', dueDate: '2026-11-25' });
  await openTimeline(page);
  const row = page.locator('.workspace-reference-timeline-row').filter({ hasText: title });
  await expect(row).toBeVisible();
});
