// frontend/tests/notifications-bell-center-consistency.spec.js — regression for Notification Bell vs Notification Center consistency.
//
// Scope:
//   - Bell badge count matches Notification Center unread count
//   - Read/unread actions are reflected in both places for shared system notifications
//   - Bell notification items navigate to the correct destination
//   - Notification Center filters and pagination remain intact
//
// Runs against the live dev server with mock data; never talks to the backend.
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/session';

const NOTIFICATIONS_URL = '/PROJECT-MANAGEMENT/notifications';

test.beforeEach(async ({ page }) => {
  await loginAs(page);
  await page.goto(NOTIFICATIONS_URL);
  await expect(page.getByRole('heading', { name: 'ศูนย์การแจ้งเตือน' })).toBeVisible();
});

test('Bell badge matches Notification Center unread count', async ({ page }) => {
  const centerBadge = page.locator('.notification-unread-summary .unread-count');
  const bellBadge = page.locator('#dropdown-notifications .notification-badge');

  // Center shows 5 unread system notifications out of 14 total
  await expect(centerBadge).toHaveText('5');

  // Bell badge must reflect the same unread count
  await page.locator('#dropdown-notifications').click();
  await page.waitForTimeout(300);
  await expect(bellBadge).toHaveText('5');
  await page.locator('#dropdown-notifications').click(); // close dropdown
});

test('Bell displays recent system notifications linking to the correct detail page', async ({ page }) => {
  await page.locator('#dropdown-notifications').click();
  await page.waitForTimeout(300);

  const bellItems = page.locator('.notifications-list .notification-item');
  await expect(bellItems).toHaveCount(5);

  // First item is the most recent system notification (NTF-24018)
  await expect(bellItems.first().locator('.notification-title')).toHaveText(
    'พบการเข้าสู่ระบบจากอุปกรณ์ใหม่'
  );
  await expect(bellItems.first()).toHaveClass(/unread/);

  await page.locator('#dropdown-notifications').click(); // close dropdown
});

test('Read/unread sync: Center detail mark-read updates Bell badge', async ({ page }) => {
  const centerBadge = page.locator('.notification-unread-summary .unread-count');
  const bellBadge = page.locator('#dropdown-notifications .notification-badge');

  await expect(centerBadge).toHaveText('5');

  // Open an unread notification from the Center and mark it as read
  await page.getByRole('link', { name: 'พบการเข้าสู่ระบบจากอุปกรณ์ใหม่' }).click();
  await expect(page.getByRole('heading', { name: 'รายละเอียดการแจ้งเตือน' })).toBeVisible();
  await page.getByRole('button', { name: /ทำเครื่องหมายว่าอ่านแล้ว/ }).click();
  await expect(page.getByRole('button', { name: /ทำเครื่องหมายว่ายังไม่อ่าน/ })).toBeVisible();

  // Return to Center — badge decreased
  await page.locator('.notification-back-link').click();
  await expect(page.getByRole('heading', { name: 'ศูนย์การแจ้งเตือน' })).toBeVisible();
  await expect(centerBadge).toHaveText('4');

  // Open Bell — badge reflects the shared system notification's read state
  await page.locator('#dropdown-notifications').click();
  await page.waitForTimeout(300);
  await expect(bellBadge).toHaveText('4');
  await page.locator('#dropdown-notifications').click(); // close
});

test('Read/unread sync: Bell "mark all read" updates Center badge', async ({ page }) => {
  const centerBadge = page.locator('.notification-unread-summary .unread-count');
  await expect(centerBadge).toHaveText('5');

  // Mark all read via Bell
  await page.locator('#dropdown-notifications').click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /อ่านทั้งหมด/ }).click();
  await page.locator('#dropdown-notifications').click(); // close dropdown

  // Center badge must reflect the change
  await expect(centerBadge).toHaveText('0');
});

test('Bell "view all" navigates to the Notification Center', async ({ page }) => {
  await page.locator('#dropdown-notifications').click();
  await page.waitForTimeout(300);

  await page.getByRole('link', { name: /ดูการแจ้งเตือนทั้งหมด/ }).click();
  await expect(page.getByRole('heading', { name: 'ศูนย์การแจ้งเตือน' })).toBeVisible();
  await expect(page).toHaveURL(NOTIFICATIONS_URL);
});

test('Notification Center filters and pagination remain intact', async ({ page }) => {
  const dataRows = page.locator('.notification-row:not(.notification-table-head)');

  // Default page shows PAGE_SIZE (8) rows
  await expect(dataRows).toHaveCount(8);

  // Filter to unread narrows the list
  await page.getByLabel('กรองตามสถานะการอ่าน').selectOption('ยังไม่อ่าน');
  await expect(dataRows).toHaveCount(5);
  await expect(dataRows.locator('.read-state.is-unread')).toHaveCount(5);
  await expect(page).toHaveURL(/readStatus=unread/);

  // Filter to priority narrows the list
  await page.getByLabel('กรองตามความสำคัญ').selectOption('urgent');
  await expect(dataRows).toHaveCount(2);
  await expect(page).toHaveURL(/priority=urgent/);
});
