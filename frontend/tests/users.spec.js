// frontend/tests/users.spec.js — หน้าจัดการผู้ใช้ (/admin/users): แก้ข้อมูล / เพิ่ม / ปิดบัญชี / กันล็อกตัวเอง / บัตรซ้ำ / สิทธิ์เข้าหน้า
import { test, expect } from '@playwright/test';
import { loginAs, switchUser } from './helpers/session';

const USERS_URL = '/PROJECT-MANAGEMENT/admin/users';

test.beforeEach(async ({ page }) => {
  await page.route('**/PROJECT-MANAGEMENT/api/**', (route) => (
    ['fetch', 'xhr'].includes(route.request().resourceType()) ? route.abort() : route.continue()
  ));
});

const userRow = (page, id) => page.locator(`.user-admin-row[data-user-id="${id}"]`);
async function openEdit(page, id) {
  await userRow(page, id).getByRole('button', { name: /^แก้ไข/ }).click();
  return page.getByRole('dialog');
}

// ไปหน้าอื่นด้วยเมนู (ไม่รีโหลด — ข้อมูล mock อยู่ใน memory)
async function goByMenu(page, label) {
  const toggle = page.locator('.app-menu-toggle');
  if (await toggle.isVisible() && (await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await page.getByRole('link', { name: label }).first().click();
}

test('ADMIN แก้ชื่อผู้ใช้แล้วชื่อใหม่ไปขึ้นในหน้าโปรเจกต์', async ({ page }) => {
  await loginAs(page, 'emp-008');
  await page.goto(USERS_URL);
  await expect(page.getByRole('heading', { name: 'จัดการผู้ใช้' })).toBeVisible();
  await expect(page.locator('.user-admin-row')).toHaveCount(20);
  await expect(userRow(page, 'emp-008')).toContainText('คุณ');

  const dialog = await openEdit(page, 'emp-002');
  await dialog.getByLabel(/ชื่อ-นามสกุล/).fill('Napat ชื่อใหม่');
  await dialog.getByRole('button', { name: 'บันทึก' }).click();
  await expect(dialog).toBeHidden();
  await expect(userRow(page, 'emp-002')).toContainText('Napat ชื่อใหม่');

  await goByMenu(page, 'โปรเจกต์');
  await page.locator('.project-card-item').filter({ hasText: 'แดชบอร์ดสถานะสายการผลิต' }).locator('.project-card-navigation-link').click();
  await page.getByRole('tab', { name: /^ทีม/ }).click();
  await expect(page.locator('.workspace-member-list')).toContainText('Napat ชื่อใหม่');
});

test('ADMIN เพิ่มผู้ใช้ใหม่ แล้ว login ด้วยรหัสใหม่ได้', async ({ page }) => {
  await loginAs(page, 'emp-008');
  await page.goto(USERS_URL);
  await page.getByRole('button', { name: '+ เพิ่มผู้ใช้' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/ชื่อ-นามสกุล/).fill('ผู้ใช้ ทดสอบใหม่');
  await dialog.getByRole('button', { name: 'เพิ่มผู้ใช้' }).click();
  await expect(dialog.getByRole('alert')).toContainText('รหัสผ่านต้องมีอย่างน้อย 6');
  await dialog.getByLabel(/รหัสผ่านเริ่มต้น/).fill('secret1');
  await dialog.getByRole('button', { name: 'เพิ่มผู้ใช้' }).click();
  await expect(dialog.getByRole('alert')).toContainText('เลือกสังกัด');
  // ติ๊กทีม IT → Section ของทีมถูกติ๊กให้เอง
  await dialog.getByLabel('ทีม IT').check();
  await expect(dialog.getByLabel('Mechanical Automation & Software')).toBeChecked();
  await dialog.getByRole('button', { name: 'เพิ่มผู้ใช้' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('alert').filter({ hasText: 'บันทึก ผู้ใช้ ทดสอบใหม่' })).toContainText('emp-035');
  await expect(userRow(page, 'emp-035')).toContainText('ทีม IT');

  await switchUser(page, 'emp-035');
  await expect(page.locator('.sidebar-profile-btn')).toContainText('ผู้ใช้ ทดสอบใหม่');
  // ผู้ใช้ทั่วไปเปิดหน้าผู้ดูแลไม่ได้
  await expect(page.getByText('หน้านี้สำหรับผู้ดูแลระบบ')).toBeVisible();
});

test('ปิดบัญชีแล้ว login ไม่ได้ และไม่ขึ้นในรายชื่อให้เพิ่มเข้าทีม', async ({ page }) => {
  await loginAs(page, 'emp-008');
  await page.goto(USERS_URL);
  const dialog = await openEdit(page, 'emp-003');
  await dialog.getByLabel('เปิดใช้งานบัญชี').uncheck();
  await expect(dialog.getByText(/จะ login ไม่ได้/)).toBeVisible();
  await dialog.getByRole('button', { name: 'ยืนยันปิดบัญชีและบันทึก' }).click();
  await expect(dialog).toBeHidden();
  await expect(userRow(page, 'emp-003')).toContainText('ปิดใช้งาน');

  // ไม่อยู่ในรายชื่อให้เพิ่มเข้าโปรเจกต์
  await goByMenu(page, 'โปรเจกต์');
  await page.locator('.project-card-item').filter({ hasText: 'แดชบอร์ดสถานะสายการผลิต' }).locator('.project-card-navigation-link').click();
  await page.getByRole('tab', { name: /^ทีม/ }).click();
  await expect(page.getByLabel('เลือกสมาชิกเพื่อเพิ่ม').locator('option[value="emp-003"]')).toHaveCount(0);
  await expect(page.getByLabel('เลือกสมาชิกเพื่อเพิ่ม').locator('option[value="emp-001"]')).toHaveCount(1);

  // login ด้วยบัญชีที่ปิดไม่ได้
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const toggle = page.locator('.app-menu-toggle');
  if (await toggle.isVisible() && (await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await page.locator('.sidebar-profile-btn').click();
  await page.getByRole('button', { name: 'ออกจากระบบ' }).click();
  const login = page.getByRole('dialog', { name: 'เข้าสู่ระบบ' });
  await login.getByLabel('รหัสพนักงาน').fill('emp-003');
  await login.getByLabel('รหัสผ่าน', { exact: true }).fill('demo');
  await login.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await expect(login.getByText('บัญชีนี้ถูกปิดใช้งาน ติดต่อผู้ดูแลระบบ')).toBeVisible();
});

test('ADMIN ลดสิทธิ์ / ปิดบัญชีตัวเองไม่ได้ และผูกบัตรซ้ำกับคนอื่นไม่ได้', async ({ page }) => {
  await loginAs(page, 'emp-008');
  await page.goto(USERS_URL);
  let dialog = await openEdit(page, 'emp-008');
  await expect(dialog.getByRole('button', { name: /^ผู้ใช้ทั่วไป/ })).toBeDisabled();
  await expect(dialog.getByLabel('เปิดใช้งานบัญชี')).toBeDisabled();
  await dialog.getByRole('button', { name: 'ยกเลิก' }).click();

  dialog = await openEdit(page, 'emp-002');
  await dialog.getByLabel(/รหัสบัตรพนักงาน/).fill('CARD-0001');
  await dialog.getByRole('button', { name: 'บันทึก' }).click();
  await expect(dialog).toBeHidden();
  await expect(userRow(page, 'emp-002')).toContainText('ผูกแล้ว');

  dialog = await openEdit(page, 'emp-001');
  await dialog.getByLabel(/รหัสบัตรพนักงาน/).fill('CARD-0001');
  await dialog.getByRole('button', { name: 'บันทึก' }).click();
  await expect(dialog.getByRole('alert')).toContainText('รหัสบัตรนี้ผูกกับบัญชีอื่นแล้ว');
  await dialog.getByRole('button', { name: 'ถอดบัตร' }).click();
  await dialog.getByRole('button', { name: 'ตั้งรหัสผ่านใหม่' }).click();
  await dialog.getByLabel(/รหัสผ่านใหม่/).fill('newpass1');
  await dialog.getByRole('button', { name: 'บันทึก' }).click();
  await expect(dialog).toBeHidden();
});

test('USER ไม่เห็นเมนูผู้ดูแล และเปิดหน้าจัดการผู้ใช้ตรง ๆ ไม่ได้', async ({ page }) => {
  await loginAs(page, 'emp-001');
  await page.goto(USERS_URL);
  await expect(page.getByText('หน้านี้สำหรับผู้ดูแลระบบ')).toBeVisible();
  await expect(page.locator('.app-nav-admin')).toHaveCount(0);
  await expect(page.locator('.user-admin-row')).toHaveCount(0);
});
