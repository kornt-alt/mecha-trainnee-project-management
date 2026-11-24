// frontend/tests/tasks-due-date.spec.js — regression for Task Missing Due Date.
//
// Root cause: the Tasks page rendered dueDate with unsafe expressions that assumed the value
// was always a string:
//   - list view:   task.dueDate.replace(/-/g, '/')          (Tasks.js)
//   - kanban view: task.dueDate.slice(5).replace(/-/g, '/')  (Tasks.js)
// Both throw TypeError when dueDate is null/undefined, crashing the whole Tasks page.
// Overdue detection also compared task.dueDate < todayStr directly (undefined < string -> false);
// now guarded with task.dueDate && ... so overdue stays correct for tasks without a due date.
//
// Runs against the live dev server with mock data; never talks to the backend.
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/session';

const TASKS_URL = '/PROJECT-MANAGEMENT/tasks';

// emp-009 is assignee of the overdue task (due 2026-11-10) and a future-due task (due 2026-12-05)
test.beforeEach(async ({ page }) => {
  await loginAs(page, 'emp-009');
  await page.goto(TASKS_URL);
  await expect(page.getByRole('heading', { name: 'ตารางงาน' })).toBeVisible();
});

test('list view renders every task without a pageerror and formats the due date', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.getByRole('button', { name: 'ตาราง' }).click();
  await expect(page.locator('.task-table')).toBeVisible();

  const rows = page.locator('.task-table tbody tr');
  await expect(rows.first()).toBeVisible();
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    await expect(rows.nth(i).locator('td').nth(3)).not.toBeEmpty();
  }
  expect(errors).toEqual([]);
});

test('kanban view renders every task card without a pageerror', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.getByRole('button', { name: 'บอร์ด' }).click();
  await expect(page.locator('.kanban-card').first()).toBeVisible();

  const cards = page.locator('.kanban-card');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    await expect(cards.nth(i)).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('valid due date is formatted as MM/DD and overdue tasks show the overdue label', async ({ page }) => {
  await page.getByRole('button', { name: 'ตาราง' }).click();

  // overdue task (due 2026-11-10, before today 2026-11-24)
  await expect(
    page
      .locator('.task-table tbody tr')
      .filter({ hasText: 'ทดสอบการใช้งานร่วมกับสายการผลิตจริง' })
      .locator('td')
      .nth(3)
  ).toContainText('11/10 (เลยกำหนด)');

  // future-due task shows the date only, no overdue label
  await expect(
    page
      .locator('.task-table tbody tr')
      .filter({ hasText: 'เขียนคู่มือการใช้งาน' })
      .locator('td')
      .nth(3)
  ).toContainText('12/05');
});