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

// Helper: เปิด Modal เพิ่มโปรเจกต์ (เริ่มต้นที่ Stepper Mode ตามค่าเริ่มต้น)
async function openAddModal(page) {
  await page
    .getByRole('button', { name: /เพิ่มโปรเจกต์/ })
    .first()
    .click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('เพิ่มโปรเจกต์ใหม่')).toBeVisible();
  return dialog;
}

// Helper: สลับไปยังโหมดหน้าเดียว (Single Page Mode)
async function switchToSinglePage(dialog) {
  const singleBtn = dialog.getByRole('button', { name: 'หน้าเดียว' });
  await singleBtn.click();
  await expect(singleBtn).toHaveClass(/active/);
}

// Helper: สลับไปยังโหมดขั้นตอน (Stepper Mode)
async function switchToStepper(dialog) {
  const stepperBtn = dialog.getByRole('button', { name: 'แบบขั้นตอน' });
  await stepperBtn.click();
  await expect(stepperBtn).toHaveClass(/active/);
}

// ─────────────────────────────────────────────────────────────────────────────
// STEPPER MODE TESTS
// ─────────────────────────────────────────────────────────────────────────────

// Test 1: เปิดและปิด Modal เพิ่มโปรเจกต์ได้
test('เปิดและปิด Modal เพิ่มโปรเจกต์ได้', async ({ page }) => {
  const dialog = await openAddModal(page);

  await dialog
    .getByRole('button', { name: 'ยกเลิก' })
    .click();

  await expect(dialog).not.toBeVisible();
});

// Test 2: Stepper Mode - ตรวจสอบค่าเริ่มต้นถูกต้อง
test('Stepper Mode: ตรวจสอบค่าเริ่มต้นของฟอร์มถูกต้อง', async ({ page }) => {
  const dialog = await openAddModal(page);

  // ชื่อโปรเจกต์เริ่มต้นต้องว่าง
  const nameInput = dialog.locator('input[placeholder*="ระบุชื่อโปรเจกต์"]').first();
  await expect(nameInput).toHaveValue('');

  // โปรเจกต์ใหม่ต้องไม่มีตัวเลือกสถานะในฟอร์ม (ถูกกำหนดอัตโนมัติเป็น Planning)
  await expect(dialog.getByText('สถานะโปรเจกต์')).toHaveCount(0);

  // ระดับความสำคัญเริ่มต้นเป็น Normal (ปกติ)
  const normalPrioBtn = dialog.locator('.stepper-prio-btn.prio-normal');
  await expect(normalPrioBtn).toHaveClass(/active/);

  // อยู่ที่ Step 1: ข้อมูลทั่วไป
  await expect(dialog.locator('.stepper-step-circle.active')).toHaveText('01');
  await expect(dialog.getByText('ข้อมูลทั่วไป (Basic Information)')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'ถัดไป' })).toBeVisible();
});

// Test 3: Stepper Mode - ตรวจสอบความถูกต้องของชื่อโปรเจกต์ (Validation) และการนำทาง
test('Stepper Mode: ตรวจสอบ Validation ชื่อโปรเจกต์ และปุ่มถัดไป', async ({
  page,
}) => {
  const dialog = await openAddModal(page);

  // กดปุ่มถัดไปโดยไม่กรอกชื่อโปรเจกต์ -> ต้องแสดงแจ้งเตือน
  await dialog.getByRole('button', { name: 'ถัดไป' }).click();
  await expect(dialog.getByText('กรุณาระบุชื่อโปรเจกต์')).toBeVisible();

  // ต้องยังคงอยู่ที่ Step 1
  await expect(dialog.locator('.stepper-step-circle.active')).toHaveText('01');

  // กรอกชื่อโปรเจกต์แล้วกดถัดไป -> ต้องก้าวไป Step 2 สำเร็จ
  const nameInput = dialog.locator('input[placeholder*="ระบุชื่อโปรเจกต์"]').first();
  await nameInput.fill('โปรเจกต์ทดสอบ Stepper Nav');
  await dialog.getByRole('button', { name: 'ถัดไป' }).click();

  // เข้าสู่ Step 2
  await expect(dialog.locator('.stepper-step-circle.active')).toHaveText('02');
  await expect(
    dialog.getByText('ผู้รับผิดชอบโปรเจกต์ & ทีมงาน (Ownership & Team)')
  ).toBeVisible();
});

// Test 4: Stepper Mode - ตรวจสอบ Owner และ Team synchronization
test('Stepper Mode: เลือก Project Owner แล้วเพิ่มเข้า Team อัตโนมัติ และสลับ Owner ได้', async ({
  page,
}) => {
  const dialog = await openAddModal(page);

  // Step 1: กรอกชื่อโปรเจกต์และไป Step 2
  await dialog.locator('input[placeholder*="ระบุชื่อโปรเจกต์"]').first().fill('โปรเจกต์ทดสอบ Owner Sync');
  await dialog.getByRole('button', { name: 'ถัดไป' }).click();

  // พยายามไป Step 3 โดยยังไม่เลือก Owner -> ต้องแจ้งเตือน
  await dialog.getByRole('button', { name: 'ถัดไป' }).click();
  await expect(dialog.getByText('กรุณาเลือกผู้รับผิดชอบโปรเจกต์')).toBeVisible();

  const ownerSelect = dialog.getByLabel('เลือก Project Owner');
  await expect(ownerSelect).toBeVisible();

  // เลือก Owner คนแรก
  await ownerSelect.selectOption({ index: 1 });
  const owner1Id = await ownerSelect.inputValue();

  // Owner คนแรกต้องถูกเช็คใน Team และ disabled (ห้ามนำออก)
  const owner1Checkbox = dialog.locator(`#project-team-${owner1Id}`);
  await expect(owner1Checkbox).toBeChecked();
  await expect(owner1Checkbox).toBeDisabled();
  await expect(dialog.getByText(/สมาชิกที่เลือก:/)).toContainText('1 คน');

  // เปลี่ยนเป็น Owner คนที่สอง
  await ownerSelect.selectOption({ index: 2 });
  const owner2Id = await ownerSelect.inputValue();
  expect(owner2Id).not.toBe(owner1Id);

  // Owner คนแรกยังต้องอยู่ใน Team แต่เปลี่ยนเป็น enabled (สามารถติ๊กออกได้ในฐานะสมาชิก)
  await expect(owner1Checkbox).toBeChecked();
  await expect(owner1Checkbox).toBeEnabled();

  // Owner คนใหม่ต้องถูกเช็คและ disabled
  const owner2Checkbox = dialog.locator(`#project-team-${owner2Id}`);
  await expect(owner2Checkbox).toBeChecked();
  await expect(owner2Checkbox).toBeDisabled();
  await expect(dialog.getByText(/สมาชิกที่เลือก:/)).toContainText('2 คน');
});

// Test 5: Stepper Mode - Deliverables เป็น Optional, ตรวจสอบวันที่ และสร้างโปรเจกต์สำเร็จ
test('Stepper Mode: Deliverables เป็น Optional ตรวจสอบวันที่ และสร้างโปรเจกต์สำเร็จ', async ({
  page,
}) => {
  const dialog = await openAddModal(page);
  const projectName = `Stepper PW Project ${Date.now()}`;

  // Step 1: กรอกข้อมูลทั่วไป
  await dialog.locator('input[placeholder*="ระบุชื่อโปรเจกต์"]').first().fill(projectName);
  await dialog.getByRole('button', { name: 'ถัดไป' }).click();

  // Step 2: เลือก Owner
  const ownerSelect = dialog.getByLabel('เลือก Project Owner');
  await expect(ownerSelect).toBeVisible();
  await ownerSelect.selectOption({ index: 1 });
  const ownerId = await ownerSelect.inputValue();
  // รอให้ระบบอัปเดตสถานะของ Owner ในทีม
  await expect(dialog.locator(`#project-team-${ownerId}`)).toBeDisabled();
  await dialog.getByRole('button', { name: 'ถัดไป' }).click();

  // Step 3: กำหนดเวลาและสิ่งที่ต้องส่งมอบ
  await expect(dialog.locator('.stepper-step-circle.active')).toHaveText('03');

  // สิ่งที่ต้องส่งมอบ (Deliverables) ไม่ถูกติ๊กตามค่าเริ่มต้น (Optional)
  const deliverablesCheckbox = dialog.locator('#stepper-deliverables-toggle');
  await expect(deliverablesCheckbox).not.toBeChecked();

  // ตรวจสอบ Date Validation: วันที่เริ่ม > กำหนดส่ง
  const startDateInput = dialog.locator('input[type="date"]').first();
  const dueDateInput = dialog.locator('input[type="date"]').nth(1);
  await startDateInput.fill('2026-12-31');
  await dueDateInput.fill('2026-01-01');

  await dialog.getByRole('button', { name: 'บันทึก' }).click();
  await expect(dialog.getByText('วันที่เริ่มต้นต้องไม่มากกว่ากำหนดส่ง')).toBeVisible();

  // แก้ไขวันที่ให้ถูกต้อง
  await startDateInput.fill('2026-01-01');
  await dueDateInput.fill('2026-03-31');

  // บันทึกโปรเจกต์โดยไม่ต้องกรอก Deliverables
  await dialog.getByRole('button', { name: 'บันทึก' }).click();

  // Modal ต้องปิดหลังบันทึก
  await expect(dialog).not.toBeVisible();

  // โปรเจกต์ใหม่ต้องปรากฏในตารางติดตามและมีสถานะเป็นวางแผน
  const projectRow = page.locator('tr').filter({ hasText: projectName });
  await expect(projectRow).toBeVisible();
  await expect(projectRow.getByText('วางแผน')).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE PAGE MODE TESTS
// ─────────────────────────────────────────────────────────────────────────────

// Test 6: Single Page Mode - แสดงครบทุกส่วน, เลือก Owner, ตรวจสอบ Deliverables และสร้างโปรเจกต์สำเร็จ
test('Single Page Mode: แสดงครบทุกส่วน เลือก Owner และสร้างโปรเจกต์สำเร็จ', async ({
  page,
}) => {
  const dialog = await openAddModal(page);

  // สลับไปยังโหมดหน้าเดียว (Single Page Mode)
  await switchToSinglePage(dialog);

  // ตรวจสอบว่ามีหัวข้อครบทั้ง 5 ส่วนในหน้าเดียว
  await expect(dialog.getByText('ข้อมูลทั่วไป', { exact: true })).toBeVisible();
  await expect(dialog.getByText('ผู้รับผิดชอบโปรเจกต์', { exact: true })).toBeVisible();
  await expect(dialog.getByText('ทีมงานโปรเจกต์', { exact: true })).toBeVisible();
  await expect(dialog.getByText('สิ่งที่ต้องส่งมอบ', { exact: true })).toBeVisible();
  await expect(dialog.getByText('กำหนดเวลาและรายละเอียด', { exact: true })).toBeVisible();

  // กรอกชื่อโปรเจกต์
  const spProjectName = `SinglePage PW Project ${Date.now()}`;
  await dialog.locator('.single-page-form-body input[placeholder*="ระบุชื่อโปรเจกต์"]').fill(spProjectName);

  // เลือก Project Owner
  const ownerSelect = dialog.getByLabel('เลือก Project Owner');
  await ownerSelect.selectOption({ index: 1 });
  const ownerId = await ownerSelect.inputValue();

  // ตรวจสอบการ์ดสมาชิกในโหมดหน้าเดียว ต้องแสดงสถานะ Owner
  const memberCard = dialog.locator(`#sp-team-member-${ownerId}`);
  await expect(memberCard).toHaveClass(/is-owner/);
  await expect(memberCard.getByText('Owner')).toBeVisible();

  // ตรวจสอบ Deliverables Toggle เป็น false (Optional)
  const deliverablesToggle = dialog.locator('.sp-section-box button[aria-pressed]');
  await expect(deliverablesToggle).toHaveAttribute('aria-pressed', 'false');

  // บันทึกโปรเจกต์
  await dialog.getByRole('button', { name: 'บันทึก' }).click();

  // Modal ต้องปิดหลังบันทึก
  await expect(dialog).not.toBeVisible();

  // โปรเจกต์ใหม่ต้องปรากฏในตารางติดตามและมีสถานะเป็นวางแผน
  const projectRow = page.locator('tr').filter({ hasText: spProjectName });
  await expect(projectRow).toBeVisible();
  await expect(projectRow.getByText('วางแผน')).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// VIEW MODE SWITCHING & STATE PRESERVATION TEST
// ─────────────────────────────────────────────────────────────────────────────

// Test 7: สลับมุมมองระหว่าง Stepper และ Single Page โดยรักษาข้อมูลทั้งหมด (State Preservation)
test('สลับมุมมองระหว่าง Stepper และ Single Page โดยรักษาข้อมูลทั้งหมดที่กรอกไว้', async ({
  page,
}) => {
  const dialog = await openAddModal(page);
  const preservedName = 'โปรเจกต์ทดสอบสลับมุมมอง State Preservation';

  // เริ่มที่ Stepper Mode (Step 1)
  await dialog.locator('input[placeholder*="ระบุชื่อโปรเจกต์"]').first().fill(preservedName);
  await dialog.getByLabel('เลือกหมวดหมู่โปรเจกต์').selectOption({ index: 1 });
  const urgentPrioBtn = dialog.locator('.stepper-prio-btn.prio-urgent');
  await urgentPrioBtn.click();
  await expect(urgentPrioBtn).toHaveClass(/active/);

  // ไปยัง Step 2 และเลือก Owner
  await dialog.getByRole('button', { name: 'ถัดไป' }).click();
  const ownerSelect = dialog.getByLabel('เลือก Project Owner');
  await expect(ownerSelect).toBeVisible();
  await ownerSelect.selectOption({ index: 1 });
  const ownerId = await ownerSelect.inputValue();
  await expect(dialog.locator(`#project-team-${ownerId}`)).toBeDisabled();

  // สลับไปยัง Single Page Mode
  await switchToSinglePage(dialog);

  // ตรวจสอบว่าข้อมูลจาก Stepper Mode ยังคงอยู่ครบถ้วนใน Single Page Mode
  const spNameInput = dialog.locator('.single-page-form-body input[placeholder*="ระบุชื่อโปรเจกต์"]');
  await expect(spNameInput).toHaveValue(preservedName);

  const spOwnerSelect = dialog.getByLabel('เลือก Project Owner');
  await expect(spOwnerSelect).toHaveValue(ownerId);

  // ตรวจสอบ Live Preview Card ใน Aside ของ Single Page Mode สะท้อนชื่อโปรเจกต์
  await expect(dialog.locator('.single-page-preview-card')).toContainText(preservedName);

  // ใน Single Page Mode: เปิดใช้งาน Deliverables และกรอกรายละเอียด
  const deliverablesToggle = dialog.locator('.sp-section-box button[aria-pressed]');
  await deliverablesToggle.click();
  await expect(deliverablesToggle).toHaveAttribute('aria-pressed', 'true');
  const deliverableText = 'เอกสารระบบทดสอบ State V1';
  await dialog.locator('textarea[placeholder*="Deliverable Description"]').fill(deliverableText);

  // สลับกลับมายัง Stepper Mode (จะยังคงอยู่ที่ Step 2 เดิม)
  await switchToStepper(dialog);

  // ตรวจสอบว่ายังจำ Owner เดิมใน Step 2
  await expect(dialog.getByLabel('เลือก Project Owner')).toHaveValue(ownerId);

  // ย้อนกลับไป Step 1: ตรวจสอบว่าชื่อโปรเจกต์และ Priority ยังคงอยู่
  await dialog.getByRole('button', { name: /STEP 1/ }).click();
  await expect(dialog.locator('input[placeholder*="ระบุชื่อโปรเจกต์"]').first()).toHaveValue(preservedName);
  await expect(dialog.locator('.stepper-prio-btn.prio-urgent')).toHaveClass(/active/);

  // ไปยัง Step 3: ตรวจสอบว่า Deliverables ที่เปิดไว้ใน Single Page ยังคงเปิดอยู่พร้อมข้อความ
  await dialog.getByRole('button', { name: /STEP 3/ }).click();
  await expect(dialog.locator('#stepper-deliverables-toggle')).toBeChecked();
  await expect(dialog.locator('textarea[placeholder*="คู่มือการใช้งาน"]')).toHaveValue(deliverableText);
});
