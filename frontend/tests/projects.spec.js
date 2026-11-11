
import { test, expect } from '@playwright/test';

const PROJECT_URL = '/PROJECT-MANAGEMENT/projects';

// เปิดหน้า Projects และบังคับให้ใช้ Mock Data
test.beforeEach(async ({ page }) => {
  await page.route('**/PROJECT-MANAGEMENT/api/projects**', async (route) => {
    const type = route.request().resourceType();

    if (type === 'fetch' || type === 'xhr') {
      await route.abort();
    } else {
      await route.continue();
    }
  });

  await page.goto(PROJECT_URL);

  await expect(
    page.getByRole('button', { name: /เพิ่มโปรเจกต์/ }).first()
  ).toBeVisible();
});

// เปิด Modal เพิ่มโปรเจกต์
async function openAddModal(page) {
  await page
    .getByRole('button', { name: /เพิ่มโปรเจกต์/ })
    .first()
    .click();

  const dialog = page.getByRole('dialog');

  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('เพิ่มโปรเจกต์')).toBeVisible();

  return dialog;
}

// หา Checkbox Deliverables
function getDeliverablesCheckbox(dialog) {
  return dialog
    .locator('.form-check')
    .filter({ hasText: 'โปรเจกต์นี้มีสิ่งที่ต้องส่งมอบ' })
    .locator('input[type="checkbox"]');
}

// Test 1: เปิดและปิด Modal
test('เปิดและปิด Modal เพิ่มโปรเจกต์ได้', async ({ page }) => {
  const dialog = await openAddModal(page);

  await dialog
    .getByRole('button', { name: 'ยกเลิก' })
    .click();

  await expect(dialog).not.toBeVisible();
});

// Test 2: ตรวจสอบข้อมูลที่จำเป็น
test('แจ้งเตือนเมื่อไม่กรอกชื่อโปรเจกต์และไม่เลือก Owner', async ({
  page,
}) => {
  const dialog = await openAddModal(page);

  await dialog
    .getByRole('button', { name: 'บันทึก' })
    .click();

  await expect(
    dialog.getByText('กรุณาระบุชื่อโปรเจกต์')
  ).toBeVisible();

  await expect(
    dialog.getByText('กรุณาเลือกผู้รับผิดชอบโปรเจกต์')
  ).toBeVisible();
});

// Test 3: ตรวจสอบค่าเริ่มต้น
test('โปรเจกต์ใหม่มีค่าเริ่มต้นถูกต้อง', async ({ page }) => {
  const dialog = await openAddModal(page);

  // ชื่อโปรเจกต์ต้องว่าง
  await expect(
    dialog.locator('input').first()
  ).toHaveValue('');

  // โปรเจกต์ใหม่ยังไม่มีตัวเลือกสถานะ
  await expect(
    dialog.getByText('สถานะ', { exact: true })
  ).toHaveCount(0);

  // ระดับความสำคัญเริ่มต้นเป็น Normal
  const prioritySelect = dialog.locator('select').nth(1);

  await expect(prioritySelect).toHaveValue('normal');

  // Deliverables ไม่ถูกบังคับ
  await expect(
    getDeliverablesCheckbox(dialog)
  ).not.toBeChecked();
});

// Test 4: Owner ต้องอยู่ใน Team อัตโนมัติ
test('เลือก Project Owner แล้วเพิ่มเข้า Project Team อัตโนมัติ', async ({
  page,
}) => {
  const dialog = await openAddModal(page);

  const ownerSelect = dialog.getByLabel('เลือก Project Owner');

  await ownerSelect.selectOption({ index: 1 });

  const ownerId = await ownerSelect.inputValue();

  const ownerCheckbox = dialog.locator(
    `#project-team-${ownerId}`
  );

  await expect(ownerCheckbox).toBeChecked();
  await expect(ownerCheckbox).toBeDisabled();

  await expect(
    dialog.getByText(/สมาชิกที่เลือก:/)
  ).toContainText('1 คน');
});

// Test 5: เปลี่ยน Owner แล้ว Owner คนเดิมยังอยู่ใน Team
test('เปลี่ยน Owner แล้วสมาชิก Owner คนเดิมยังอยู่ใน Team', async ({
  page,
}) => {
  const dialog = await openAddModal(page);

  const ownerSelect = dialog.getByLabel('เลือก Project Owner');

  // เลือก Owner คนแรก
  await ownerSelect.selectOption({ index: 1 });

  const previousOwnerId = await ownerSelect.inputValue();

  // เปลี่ยนเป็น Owner คนที่สอง
  await ownerSelect.selectOption({ index: 2 });

  const newOwnerId = await ownerSelect.inputValue();

  expect(newOwnerId).not.toBe(previousOwnerId);

  // Owner คนเดิมยังอยู่ใน Team
  await expect(
    dialog.locator(`#project-team-${previousOwnerId}`)
  ).toBeChecked();

  // Owner คนใหม่ต้องอยู่ใน Team และนำออกไม่ได้
  const newOwnerCheckbox = dialog.locator(
    `#project-team-${newOwnerId}`
  );

  await expect(newOwnerCheckbox).toBeChecked();
  await expect(newOwnerCheckbox).toBeDisabled();
});

// Test 6: สร้างโปรเจกต์สำเร็จโดยไม่กรอก Deliverables
test('สร้างโปรเจกต์สำเร็จโดยไม่ต้องกรอก Deliverables', async ({
  page,
}) => {
  const dialog = await openAddModal(page);

  const projectName = `PW Test Project ${Date.now()}`;

  // กรอกชื่อโปรเจกต์
  await dialog.locator('input').first().fill(projectName);

  // เลือก Project Owner
  const ownerSelect = dialog.getByLabel('เลือก Project Owner');

  await ownerSelect.selectOption({ index: 1 });

  // ตรวจสอบว่าไม่ต้องกรอก Deliverables
  await expect(
    getDeliverablesCheckbox(dialog)
  ).not.toBeChecked();

  // บันทึกโปรเจกต์
  await dialog
    .getByRole('button', { name: 'บันทึก' })
    .click();

  // Modal ต้องปิดหลังบันทึก
  await expect(dialog).not.toBeVisible();

  // โปรเจกต์ใหม่ต้องปรากฏในตาราง
  const projectRow = page.locator('tr').filter({
    hasText: projectName,
  });

  await expect(projectRow).toBeVisible();

  // สถานะเริ่มต้นต้องเป็นวางแผน
  await expect(
    projectRow.getByText('วางแผน')
  ).toBeVisible();
});
