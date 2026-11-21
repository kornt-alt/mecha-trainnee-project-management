// frontend/tests/access.spec.js — การเห็นโปรเจกต์ตามโครงองค์กร Division → Section → Team (utils/access.js)
// ข้อมูลตั้งต้น: โปรเจกต์ 6 private ของ Section Electrical (dept-2) · โปรเจกต์ 7 private ไม่ติด Section (สมาชิก emp-021 Mechanical + emp-024 Electrical)
//               emp-007 = Management เห็นเฉพาะ dept-2 · emp-005 = Management เห็นทั้ง Division Engineering · emp-001 = USER
import { test, expect } from '@playwright/test';
import { loginAs, switchUser } from './helpers/session';

const P6 = 'ปรับปรุงตู้ควบคุมสายพาน';
const P7 = 'คู่มือตรวจรับเครื่องจักรใหม่';

test.beforeEach(async ({ page }) => {
  await page.route('**/PROJECT-MANAGEMENT/api/**', (route) => (
    ['fetch', 'xhr'].includes(route.request().resourceType()) ? route.abort() : route.continue()
  ));
});

const cards = (page) => page.locator('.project-card-item');

test('USER ไม่เห็นโปรเจกต์ private ที่ตัวเองไม่ได้อยู่ และเปิด URL ตรงก็ขึ้นไม่พบ', async ({ page }) => {
  await loginAs(page, 'emp-001');
  await page.goto('/PROJECT-MANAGEMENT/projects');
  await expect(cards(page)).toHaveCount(3);
  await expect(cards(page).filter({ hasText: P6 })).toHaveCount(0);
  await page.goto('/PROJECT-MANAGEMENT/projects/6');
  await expect(page.getByRole('heading', { name: 'ไม่พบโปรเจกต์' })).toBeVisible();
});

test('Management เห็นเฉพาะขอบเขตที่ติ๊ก — รวมโปรเจกต์ที่ดึงคนในขอบเขตไปร่วม', async ({ page }) => {
  await loginAs(page, 'emp-007');
  await page.goto('/PROJECT-MANAGEMENT/projects');
  await expect(cards(page).filter({ hasText: P6 })).toHaveCount(1); // ติด Section dept-2
  await expect(cards(page).filter({ hasText: P7 })).toHaveCount(1); // ไม่ติด Section แต่มี emp-024 (dept-2) เป็นสมาชิก
  await expect(cards(page)).toHaveCount(5);
});

test('Management ในขอบเขตจัดการโปรเจกต์ได้เท่า Owner: สร้างงานและคอมเมนต์ได้ทั้งที่ไม่ได้เป็นสมาชิก', async ({ page }) => {
  await loginAs(page, 'emp-007');
  await page.goto('/PROJECT-MANAGEMENT/projects/6');
  await expect(page.locator('.project-workspace-actor-role')).toHaveText('คุณ: Management');
  await page.getByRole('tab', { name: /^ทีม/ }).click();
  await expect(page.getByLabel('เลือก Team Leader')).toBeVisible();

  const title = `Management task ${Date.now()}`;
  await page.getByRole('tab', { name: /^งาน/ }).click();
  await page.getByRole('button', { name: 'เพิ่มงาน', exact: true }).click();
  const dialog = page.getByRole('dialog').last();
  await dialog.locator('#workspace-task-title').fill(title);
  await dialog.locator('#workspace-task-assignee').selectOption('emp-013');
  await dialog.locator('#workspace-task-reviewer').selectOption('emp-028');
  await dialog.locator('#workspace-task-due').fill('2026-12-20');
  await dialog.getByRole('button', { name: 'สร้างงาน' }).click();
  const row = page.locator('.project-tasks-row').filter({ hasText: title });
  await expect(row).toBeVisible();

  await row.click();
  await page.locator('#workspace-task-comment').fill('หัวหน้าส่วนขอดูแผนเดินสายก่อนเริ่ม');
  await page.getByRole('button', { name: 'ส่งความคิดเห็น' }).click();
  await expect(page.locator('.workspace-task-comments')).toContainText('หัวหน้าส่วนขอดูแผนเดินสายก่อนเริ่ม');
});

test('ADMIN เปลี่ยนขอบเขต Management จาก Section เป็นทั้ง Division แล้วเห็นเพิ่ม', async ({ page }) => {
  await loginAs(page, 'emp-008');
  // สร้างโปรเจกต์ private ของ Section Mechanical (dept-3) ที่ emp-007 ยังไม่เห็น
  await page.goto('/PROJECT-MANAGEMENT/projects');
  await page.getByRole('button', { name: /เพิ่มโปรเจกต์/ }).first().click();
  const form = page.getByRole('dialog');
  const name = `Mechanical private ${Date.now()}`;
  await form.locator('input[placeholder*="ระบุชื่อโปรเจกต์"]').first().fill(name);
  await form.locator('input[type="date"]').nth(1).fill('2027-03-31');
  await form.getByRole('group', { name: 'การมองเห็น' }).getByRole('button', { name: 'เฉพาะทีมโปรเจกต์' }).click();
  await form.getByRole('group', { name: /Section ที่เกี่ยวข้อง/ }).getByLabel('Mechanical', { exact: true }).check();
  await form.getByRole('button', { name: 'บันทึก' }).click();
  await expect(form).toBeHidden();

  await switchUser(page, 'emp-007');
  await expect(cards(page).filter({ hasText: name })).toHaveCount(0);

  await switchUser(page, 'emp-008');
  await page.locator('.app-menu-toggle').isVisible().then(async (visible) => { if (visible) await page.locator('.app-menu-toggle').click(); });
  await page.getByRole('link', { name: 'จัดการผู้ใช้' }).click();
  await page.locator('.user-admin-row[data-user-id="emp-007"]').getByRole('button', { name: /^แก้ไข/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('ทั้ง Engineering').check();
  await expect(dialog.locator('#scope-section-dept-3')).toBeDisabled();
  await dialog.getByRole('button', { name: 'บันทึก' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.user-admin-row[data-user-id="emp-007"]')).toContainText('ทั้ง Engineering');

  await switchUser(page, 'emp-007');
  await page.getByRole('link', { name: 'โปรเจกต์' }).first().click();
  await expect(cards(page).filter({ hasText: name })).toHaveCount(1);
});
