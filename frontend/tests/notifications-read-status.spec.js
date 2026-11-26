// frontend/tests/notifications-read-status.spec.js — regression for Notification read/unread filter
// consistency between the list page (NotificationCenter) and the detail page (NotificationDetail).
//
// Root cause: the list page writes URL param `readStatus` (NotificationCenter.js line 89) while the
// detail page read the old/incorrect param `read` (NotificationDetail.js line 18). Navigating from a
// filtered list (e.g. ?readStatus=unread) into a detail therefore lost the filter context: the
// detail's Previous/Next adjacent navigation ignored the read/unread filter and cycled through all
// notifications. Both pages now use the single convention `readStatus`.
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

test('read/unread filter narrows the notification list', async ({ page }) => {
  const dataRows = page.locator('.notification-row:not(.notification-table-head)');

  // default page shows up to PAGE_SIZE (8) rows
  await expect(dataRows).toHaveCount(8);

  // filter to unread
  await page.getByLabel('กรองตามสถานะการอ่าน').selectOption('ยังไม่อ่าน');
  await expect(page.getByLabel('กรองตามสถานะการอ่าน')).toHaveValue('unread');
  await expect(dataRows).toHaveCount(5);
  await expect(dataRows.locator('.read-state.is-unread')).toHaveCount(5);
  await expect(page).toHaveURL(/readStatus=unread/);

  // filter to read
  await page.getByLabel('กรองตามสถานะการอ่าน').selectOption('อ่านแล้ว');
  await expect(page.getByLabel('กรองตามสถานะการอ่าน')).toHaveValue('read');
  await expect(dataRows).toHaveCount(7);
  await expect(dataRows.locator('.read-state.is-unread')).toHaveCount(0);
  await expect(page).toHaveURL(/readStatus=read/);
});

test('URL refresh preserves the read filter', async ({ page }) => {
  await page.getByLabel('กรองตามสถานะการอ่าน').selectOption('ยังไม่อ่าน');
  const dataRows = page.locator('.notification-row:not(.notification-table-head)');
  await expect(dataRows).toHaveCount(5);
  await expect(page).toHaveURL(/readStatus=unread/);

  await page.reload();
  await expect(page.getByLabel('กรองตามสถานะการอ่าน')).toHaveValue('unread');
  await expect(dataRows).toHaveCount(5);
  await expect(page).toHaveURL(/readStatus=unread/);
});

test('opening a notification preserves the read filter for adjacent navigation', async ({ page }) => {
  await page.getByLabel('กรองตามสถานะการอ่าน').selectOption('ยังไม่อ่าน');
  const dataRows = page.locator('.notification-row:not(.notification-table-head)');
  await expect(dataRows).toHaveCount(5);

  // open an unread notification that is not first in the unread list
  await dataRows
    .filter({ hasText: 'การยืนยันตัวตนล้มเหลวหลายครั้ง' })
    .locator('.notification-item-link')
    .click();
  await expect(page).toHaveURL(/\/notifications\/NTF-24015/);
  // the read filter param is preserved in the detail URL
  await expect(page).toHaveURL(/readStatus=unread/);

  // adjacent "next" must stay within the unread filter (NTF-24013), not jump to a read item (NTF-24014)
  await page.getByRole('button', { name: 'รายการถัดไป' }).click();
  await expect(page).toHaveURL(/\/notifications\/NTF-24013/);
  await expect(page.locator('h2')).toHaveText('กักกันแพ็กเกจส่งออก');

  // back to list keeps the filter
  await page.locator('.notification-back-link').click();
  await expect(page).toHaveURL(new RegExp(`${NOTIFICATIONS_URL}\\?`));
  await expect(page.getByLabel('กรองตามสถานะการอ่าน')).toHaveValue('unread');
  await expect(page.locator('.notification-row:not(.notification-table-head)')).toHaveCount(5);
});

test('invalid notification id shows not-found without crashing', async ({ page }) => {
  await page.goto(`${NOTIFICATIONS_URL}/does-not-exist`);
  await expect(page.getByRole('heading', { name: 'ไม่พบการแจ้งเตือน' })).toBeVisible();
  await page.locator('a:has-text("กลับศูนย์การแจ้งเตือน")').click();
  await expect(page).toHaveURL(NOTIFICATIONS_URL);
});
