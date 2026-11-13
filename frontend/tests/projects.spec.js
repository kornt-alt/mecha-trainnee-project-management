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
  await expect(page.locator('.tracking-project-link')).toHaveCount(3);
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

async function openWorkspaceProject(page, projectId) {
  const target = `/projects/${projectId}`;
  if (new URL(page.url()).pathname.endsWith(target)) return;

  if (new URL(page.url()).pathname.includes('/projects/')) {
    await page.locator('.project-detail-breadcrumb a').click();
  }

  const projectLinks = page.locator('.tracking-project-link');
  const hrefs = await projectLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  const index = hrefs.findIndex((href) => href && href.endsWith(target));
  if (index < 0) throw new Error(`Project ${projectId} is not available in the project list`);
  await projectLinks.nth(index).click();
}

async function createWorkspaceTask(page, {
  projectId = 1,
  title,
  assigneeId = 'emp-008',
  reviewerId = 'emp-009',
  priority = 'normal',
  actorId = 'emp-008',
  dueDate = '2026-12-20',
} = {}) {
  await openWorkspaceProject(page, projectId);
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption(actorId);
  await page.getByRole('tab', { name: /^งาน/ }).click();
  await page.getByRole('button', { name: 'เพิ่มงาน' }).click();
  const dialog = page.getByRole('dialog').last();
  await dialog.locator('#workspace-task-title').fill(title);
  await dialog.locator('#workspace-task-assignee').selectOption(assigneeId);
  await dialog.locator('#workspace-task-reviewer').selectOption(reviewerId);
  await dialog.locator('#workspace-task-priority').selectOption(priority);
  await dialog.locator('#workspace-task-due').fill(dueDate);
  await dialog.getByRole('button', { name: 'บันทึกงาน' }).click();
  const taskRow = page.locator('.project-tasks-row').filter({ hasText: title });
  await expect(taskRow).toBeVisible();
  return taskRow;
}

async function addWorkspaceMember(page, projectId, memberId, ownerId = 'emp-008') {
  await openWorkspaceProject(page, projectId);
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption(ownerId);
  await page.getByRole('tab', { name: /^ทีม/ }).click();
  const memberSelect = page.getByLabel('เลือกสมาชิกเพื่อเพิ่ม');
  await memberSelect.selectOption(memberId);
  const memberName = (await memberSelect.locator('option:checked').textContent()).trim();
  await page.getByRole('button', { name: 'เพิ่มสมาชิก' }).click();
  await expect(page.locator('.workspace-member-row').filter({ hasText: memberName })).toBeVisible();
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

  // สิ่งที่ต้องส่งมอบ (Deliverables) ค่าเริ่มต้นปิดอยู่ (Optional)
  const deliverablesToggle = dialog.locator('#stepper-deliverables-toggle');
  await expect(deliverablesToggle).toHaveAttribute('aria-pressed', 'false');

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
  await expect(dialog.locator('#stepper-deliverables-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.locator('textarea[placeholder*="คู่มือการใช้งาน"]')).toHaveValue(deliverableText);
});

test('Dual-View: สลับระหว่างมุมมอง Table และ Card ค้นหา กรอง และเรียกใช้ Action ได้อย่างถูกต้อง', async ({ page }) => {
  // ตรวจสอบค่าเริ่มต้นเป็น Table View
  const tableToggle = page.getByRole('button', { name: /มุมมองตาราง/ });
  const cardToggle = page.getByRole('button', { name: /มุมมองการ์ด/ });
  await expect(tableToggle).toHaveClass(/active/);
  await expect(cardToggle).not.toHaveClass(/active/);

  // ตารางเริ่มต้นแสดงผล
  const trackingTable = page.locator('.tracking-table');
  await expect(trackingTable).toBeVisible();

  // สลับไปยัง Card View
  await cardToggle.click();
  await expect(cardToggle).toHaveClass(/active/);
  await expect(tableToggle).not.toHaveClass(/active/);
  await expect(trackingTable).not.toBeVisible();

  // ตรวจสอบว่าการ์ดโปรเจกต์แสดงขึ้นมา
  const cards = page.locator('.project-card-item');
  const initialCardCount = await cards.count();
  expect(initialCardCount).toBeGreaterThan(0);

  // ทดสอบค้นหาใน Card View
  const searchInput = page.getByRole('searchbox', { name: 'ค้นหาโปรเจกต์' });
  await searchInput.fill('ระบบควบคุมหุ่นยนต์ ARMS');
  await expect(cards).toHaveCount(1);
  await expect(cards.first().locator('.project-card-title')).toContainText('ระบบควบคุมหุ่นยนต์ ARMS');

  // สลับกลับมายัง Table View — ตรวจสอบว่าเงื่อนไขค้นหายังคงอยู่
  await tableToggle.click();
  await expect(trackingTable).toBeVisible();
  await expect(page.locator('.tracking-project-name')).toContainText('ระบบควบคุมหุ่นยนต์ ARMS');
  await expect(searchInput).toHaveValue('ระบบควบคุมหุ่นยนต์ ARMS');

  // Status filtering stays applied in both views.
  await searchInput.fill('');
  const statusFilter = page.getByRole('combobox', { name: 'กรองตามสถานะ' });
  await statusFilter.selectOption('planning');
  await expect(page.locator('.tracking-table .tracking-pill-status.status-planning').first()).toBeVisible();

  await cardToggle.click();
  const planningCards = page.locator('.project-card-item');
  await expect(planningCards.first()).toBeVisible();
  await expect(planningCards.first().locator('.tracking-pill-status.status-planning')).toBeVisible();

  // ล้างตัวกรอง
  await page.getByRole('button', { name: /ล้างตัวกรอง/ }).click();
  await expect(searchInput).toHaveValue('');

  // ทดสอบเปิด Modal แก้ไขผ่านปุ่ม icon-only ที่มี accessible name.
  const card = page.locator('.project-card-item').first();
  const editBtn = card.getByRole('button', { name: /^แก้ไข / });
  await editBtn.click();
  await expect(page).toHaveURL(/\/PROJECT-MANAGEMENT\/projects$/);

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('แก้ไขโปรเจกต์')).toBeVisible();

  // ปิด modal
  await dialog.getByRole('button', { name: 'ยกเลิก' }).click();
  await expect(dialog).not.toBeVisible();

  // Delete action opens the existing confirmation flow.
  const deleteBtn = card.getByRole('button', { name: /^ลบ / });
  await deleteBtn.click();
  await expect(page).toHaveURL(/\/PROJECT-MANAGEMENT\/projects$/);
  const deleteDialog = page.getByRole('dialog');
  await expect(deleteDialog).toBeVisible();
  await expect(deleteDialog.getByText('ยืนยันการลบโปรเจกต์')).toBeVisible();
  await expect(deleteDialog.getByText(/คุณต้องการลบโปรเจกต์/)).toBeVisible();
  await deleteDialog.getByRole('button', { name: 'ยกเลิก' }).click();
  await expect(deleteDialog).not.toBeVisible();
});

test('Card View: แสดงข้อมูล Priority, Status, และ Milestone Progress สอดคล้องกับ Table View', async ({ page }) => {
  // สลับไปยัง Card View
  const cardToggle = page.getByRole('button', { name: /มุมมองการ์ด/ });
  await cardToggle.click();

  const cards = page.locator('.project-card-item');
  await expect(cards.first()).toBeVisible();

  // ตรวจสอบว่าทุกการ์ดมีป้าย Priority และ Status ที่ตรงตามมาตรฐานของระบบ
  const firstCard = cards.first();
  await expect(firstCard.locator('.project-card-category')).toBeVisible();
  await expect(firstCard.locator('.tracking-pill-priority')).toBeVisible();
  await expect(firstCard.locator('.tracking-pill-status')).toBeVisible();
  await expect(firstCard.locator('.project-card-owner-sec')).toContainText('ผู้รับผิดชอบ');
  await expect(firstCard.locator('.project-card-owner-name')).not.toContainText('@');
  await expect(firstCard.locator('.project-card-team-sec')).toContainText(/ทีมงาน · \d+ คน/);
  await expect(firstCard.locator('.project-card-team-avatars .project-card-avatar').first()).toBeVisible();

  // ตรวจสอบส่วน Milestone Progress
  await expect(firstCard.locator('.project-card-progress-sec')).toBeVisible();

  // ค้นหาโปรเจกต์ 'ระบบจัดการและติดตามงาน Trainee'
  const searchInput = page.getByRole('searchbox', { name: 'ค้นหาโปรเจกต์' });
  await searchInput.fill('ระบบจัดการและติดตามงาน Trainee');
  await expect(cards).toHaveCount(1);

  // ตรวจสอบข้อความและเปอร์เซ็นต์ Milestone
  const traineeCard = cards.first();
  await expect(traineeCard.locator('.project-card-title')).toContainText('ระบบจัดการและติดตามงาน Trainee');
  await expect(traineeCard.locator('.project-card-category')).toContainText('ระบบซอฟต์แวร์');
  await expect(traineeCard.locator('.project-card-owner-name')).toHaveText('Supachai Meesuk');
  await expect(traineeCard.locator('.project-card-team-sec')).toContainText('1 คน');
  await expect(traineeCard.locator('.tracking-progress-label')).toContainText(/\d+% · \d+\/\d+ งาน/);
  await expect(traineeCard.locator('.tracking-progress-bar')).toBeVisible();

  const footer = traineeCard.locator('.project-card-footer');
  await expect(footer.locator('.project-card-date-info')).toBeVisible();
  await expect(footer.locator('.project-card-action-btns')).toBeVisible();
  await expect(footer.getByRole('button', { name: 'แก้ไข ระบบจัดการและติดตามงาน Trainee' })).toBeVisible();
  await expect(footer.getByRole('button', { name: 'ลบ ระบบจัดการและติดตามงาน Trainee' })).toBeVisible();
  await expect(footer.locator('.project-card-date-text')).toContainText('วัน');

  // ตรวจสอบโปรเจกต์ที่เสร็จแล้ว (done) จะแสดง 100%
  await searchInput.fill('เว็บไซต');
  const count = await cards.count();
  if (count > 0) {
    const doneCards = page.locator('.project-card-item:has(.status-done)');
    if (await doneCards.count() > 0) {
      await expect(doneCards.first().locator('.tracking-progress-label')).toContainText('100%');
      await expect(doneCards.first().locator('.progress-bar.bg-success')).toBeVisible();
    }
  }
});

test('Project Workspace: เปิดจากหลายพื้นที่บนการ์ด รองรับ URL โดยตรง และแจ้งเมื่อไม่พบโปรเจกต์', async ({ page }) => {
  await page.getByRole('button', { name: /มุมมองการ์ด/ }).click();

  const cards = page.locator('.project-card-item');
  const firstCard = cards.first();
  const firstName = await firstCard.locator('.project-card-title').innerText();
  const firstLink = firstCard.locator('.project-card-navigation-link');
  const firstHref = await firstLink.getAttribute('href');
  const firstId = firstHref.split('/').pop();

  await firstLink.click({ position: { x: 12, y: 12 } });
  await expect(page).toHaveURL(new RegExp(`/projects/${firstId}$`));
  await expect(page.getByRole('heading', { level: 1, name: firstName })).toBeVisible();

  await page.goBack();
  await page.getByRole('button', { name: /มุมมองการ์ด/ }).click();
  await expect(cards.first()).toBeVisible();

  const secondCard = cards.nth(1);
  const secondLink = secondCard.locator('.project-card-navigation-link');
  const secondHref = await secondLink.getAttribute('href');
  const secondId = secondHref.split('/').pop();
  const secondBox = await secondLink.boundingBox();
  await secondLink.click({ position: { x: 12, y: secondBox.height - 16 } });
  await expect(page).toHaveURL(new RegExp(`/projects/${secondId}$`));

  await page.goto(`${PROJECT_URL}/${firstId}`);
  await expect(page.getByRole('heading', { level: 1, name: firstName })).toBeVisible();

  await page.goto(`${PROJECT_URL}/not-a-project`);
  await expect(page.getByRole('heading', { name: 'ไม่พบโปรเจกต์' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'กลับไปหน้าโปรเจกต์' })).toHaveAttribute('href', /\/projects$/);
});

test('Project Workspace: Overview ใช้เฉพาะ Tasks ของโปรเจกต์ที่เลือก', async ({ page }) => {
  const projectOneTask = `Overview Project 1 ${Date.now()}`;
  const otherProjectTask = `Overview Project 3 ${Date.now()}`;
  await createWorkspaceTask(page, { projectId: 1, title: projectOneTask });
  await createWorkspaceTask(page, { projectId: 3, title: otherProjectTask });
  await openWorkspaceProject(page, 1);

  await expect(page.getByRole('heading', { level: 1, name: 'ระบบจัดการและติดตามงาน Trainee' })).toBeVisible();
  await expect(page.getByText('ความคืบหน้ารวม')).toBeVisible();
  await expect(page.getByText('Task Summary')).toBeVisible();

  const taskList = page.getByRole('list', { name: 'งานในโปรเจกต์นี้' });
  await expect(taskList.getByText(projectOneTask)).toBeVisible();
  await expect(taskList.getByText(otherProjectTask)).toHaveCount(0);

  await page.getByRole('tab', { name: /^งาน/ }).click();
  await expect(page.locator('.project-tasks-row').getByText(projectOneTask)).toBeVisible();
  await expect(page.locator('.project-tasks-row').getByText(otherProjectTask)).toHaveCount(0);
  await page.getByRole('tab', { name: 'ภาพรวม', exact: true }).click();
  await expect(taskList.getByText(projectOneTask)).toBeVisible();
});

test('Project Workspace: เปิดโปรเจกต์จากชื่อใน Table View', async ({ page }) => {
  const projectLink = page.locator('.tracking-project-link').first();
  const projectName = await projectLink.innerText();
  const projectId = (await projectLink.getAttribute('href')).split('/').pop();

  await projectLink.click();

  await expect(page).toHaveURL(new RegExp(`/projects/${projectId}$`));
  await expect(page.getByRole('heading', { level: 1, name: projectName })).toBeVisible();
});

test('Project Workspace: เปิดการ์ดด้วยแป้นพิมพ์ได้', async ({ page }) => {
  await page.getByRole('button', { name: /มุมมองการ์ด/ }).click();
  const projectLink = page.locator('.project-card-navigation-link').first();
  const projectName = await page.locator('.project-card-item').first().locator('.project-card-title').innerText();
  const projectId = (await projectLink.getAttribute('href')).split('/').pop();

  await projectLink.focus();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(new RegExp(`/projects/${projectId}$`));
  await expect(page.getByRole('heading', { level: 1, name: projectName })).toBeVisible();
});

test('Project Workspace: Overview ใช้งานได้บนหน้าจอมือถือโดยไม่มี horizontal overflow หรือ browser error', async ({ page }) => {
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspaceProject(page, 1);

  await expect(page.getByRole('heading', { level: 1, name: 'ระบบจัดการและติดตามงาน Trainee' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: 'เมนูโปรเจกต์' })).toBeVisible();
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(390);
  expect(browserErrors).toEqual([]);
});

test('Project Workspace: ใช้ข้อมูลจริงใน Header และเปิด Project Edit modal เดิม', async ({ page }) => {
  await openWorkspaceProject(page, 1);

  const header = page.locator('.project-detail-header');
  await expect(header.getByRole('heading', { level: 1, name: 'ระบบจัดการและติดตามงาน Trainee' })).toBeVisible();
  await expect(header.getByText('กำลังทำ')).toBeVisible();
  await expect(header.getByText('ระบบซอฟต์แวร์')).toBeVisible();
  await expect(header.getByText('Project Owner')).toBeVisible();
  await expect(header.getByText('Supachai Meesuk')).toBeVisible();
  await expect(header.getByRole('img', { name: /^ความคืบหน้า \d+%$/ })).toBeVisible();
  await expect(header.getByText('Team Lead')).toHaveCount(0);

  await header.getByRole('button', { name: 'แก้ไขโปรเจกต์' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('แก้ไขโปรเจกต์')).toBeVisible();
});

test('Project Workspace: งานจาก Attention เปิด Task Detail modal ของระบบเดิม', async ({ page }) => {
  const overdueDate = new Date();
  overdueDate.setDate(overdueDate.getDate() - 7);
  await createWorkspaceTask(page, {
    title: `Overdue Workspace Task ${Date.now()}`,
    dueDate: overdueDate.toISOString().slice(0, 10),
  });
  await openWorkspaceProject(page, 1);
  const attentionItem = page.locator('.project-detail-attention-row').first();
  const taskTitle = await attentionItem.locator('.project-detail-attention-copy strong').innerText();

  await attentionItem.click();

  await expect(page).toHaveURL(/\/projects\/1$/);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('รายละเอียดงาน')).toBeVisible();
  await expect(dialog.getByRole('heading', { name: taskTitle })).toBeVisible();
});

test('Project Workspace: Tasks tab filters project tasks and reuses the existing detail modal', async ({ page }) => {
  const projectOneTask = `Project 1 urgent task ${Date.now()}`;
  const projectOneHighPriorityTask = `Project 1 high task ${Date.now()}`;
  const projectTwoTask = `Project 3 task ${Date.now()}`;
  await createWorkspaceTask(page, { projectId: 1, title: projectOneTask, priority: 'urgent' });
  await createWorkspaceTask(page, { projectId: 1, title: projectOneHighPriorityTask, priority: 'high' });
  await createWorkspaceTask(page, { projectId: 3, title: projectTwoTask });

  await openWorkspaceProject(page, 1);
  await page.getByRole('tab', { name: /^งาน/ }).click();

  const taskRows = page.locator('.project-tasks-row');
  await expect(page.getByRole('heading', { name: 'งานในโปรเจกต์' })).toBeVisible();
  await expect(page.getByText('2 งาน', { exact: true })).toBeVisible();
  await expect(taskRows).toHaveCount(2);
  await expect(taskRows.getByText(projectOneTask)).toBeVisible();
  await expect(taskRows.getByText(projectTwoTask)).toHaveCount(0);

  const search = page.getByRole('searchbox', { name: 'ค้นหางานในโปรเจกต์' });
  await search.fill(projectTwoTask);
  await expect(taskRows).toHaveCount(0);
  await expect(page.getByText('ไม่พบงานที่ตรงกับเงื่อนไข')).toBeVisible();
  await search.fill('');

  await page.getByRole('combobox', { name: 'กรองสถานะงานในโปรเจกต์' }).selectOption('not_started');
  await expect(taskRows).toHaveCount(2);

  await page.getByRole('combobox', { name: 'กรองสถานะงานในโปรเจกต์' }).selectOption('all');
  await page.getByRole('combobox', { name: 'กรองความสำคัญงานในโปรเจกต์' }).selectOption('urgent');
  await expect(taskRows.getByText(projectOneTask)).toBeVisible();
  await expect(taskRows.getByText(projectOneHighPriorityTask)).toHaveCount(0);

  await taskRows.getByRole('button', { name: projectOneTask }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('รายละเอียดงาน')).toBeVisible();
  await expect(dialog.getByRole('heading', { name: projectOneTask })).toBeVisible();
  await dialog.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();

  await expect(page).toHaveURL(/\/projects\/1$/);
  await expect(page.getByRole('tab', { name: /^งาน/ })).toHaveAttribute('aria-selected', 'true');
  await expect(taskRows.getByRole('button', { name: projectOneTask })).toBeVisible();

  await page.getByRole('link', { name: /โปรเจกต์/ }).first().click();
  await page.locator('.tracking-project-link').filter({ hasText: 'รายงานผลการฝึกงาน Mecha' }).click();
  await page.getByRole('tab', { name: /^งาน/ }).click();
  await expect(page.locator('.project-tasks-row').getByText(projectTwoTask)).toBeVisible();
  await expect(page.locator('.project-tasks-row').getByText(projectOneTask)).toHaveCount(0);
});

test('Project Workspace: Tasks tab shows an empty state for a project without tasks', async ({ page }) => {
  await openWorkspaceProject(page, 1);
  await page.getByRole('tab', { name: /^งาน/ }).click();
  await expect(page.getByText('ยังไม่มีงานในโปรเจกต์นี้')).toBeVisible();

  await page.getByRole('tab', { name: /^บอร์ด/ }).click();
  await expect(page.locator('.project-board-empty')).toBeVisible();

  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-008');
  await page.getByRole('tab', { name: /^ทีม/ }).click();
  await expect(page.locator('.workspace-member-row')).toHaveCount(1);
  await expect(page.locator('.workspace-member-row')).toContainText('Project Owner');

  await page.getByRole('tab', { name: /^สิ่งที่ส่งมอบ/ }).click();
  await expect(page.locator('.workspace-empty-state strong')).toHaveText('ยังไม่มีสิ่งที่ส่งมอบ');

  await page.getByRole('tab', { name: /^ประวัติ/ }).click();
  await expect(page.locator('.workspace-empty-state strong')).toHaveText('ยังไม่มีประวัติกิจกรรม');

  await page.getByRole('tab', { name: /^ภาพรวม/ }).click();
  const closure = page.locator('.workspace-closure');
  await expect(closure.getByRole('button', { name: 'ส่งขออนุมัติ' })).toBeDisabled();
  await expect(closure).toContainText('ยังไม่มีงานในโปรเจกต์ จึงยังส่งขออนุมัติปิดไม่ได้');
});

test('Project Workspace: Tasks tab fits mobile screens without browser errors', async ({ page }) => {
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${PROJECT_URL}/1`);
  await page.getByRole('tab', { name: /^งาน/ }).click();
  await expect(page.locator('.project-tasks-panel')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(browserErrors).toEqual([]);
});

test('Workload: no sample allocations are shown while Employees remain available', async ({ page }) => {
  await page.goto('/PROJECT-MANAGEMENT/workload');
  await expect(page.getByRole('heading', { name: 'Workload Dashboard' })).toBeVisible();

  const plannedWorkload = page.locator('.workload-kpi').filter({ hasText: 'Planned Workload' });
  await expect(plannedWorkload.locator('.workload-kpi-value')).toHaveText('0 ชม.');
  const utilization = page.locator('.workload-kpi').filter({ hasText: 'Team Utilization' });
  await expect(utilization.locator('.workload-kpi-value')).toHaveText('0.0%');
  await expect(page.locator('.workload-employee-row')).toHaveCount(20);
  await expect(page.locator('.workload-employee-number').first()).toContainText('0.0');
});

test('Project Workspace: Board separates selected project tasks by status and opens the shared modal', async ({ page }) => {
  const taskTitle = `Board task ${Date.now()}`;
  await createWorkspaceTask(page, { projectId: 1, title: taskTitle });

  await openWorkspaceProject(page, 1);
  const overviewTab = page.getByRole('tab', { name: 'ภาพรวม', exact: true });
  const tasksTab = page.getByRole('tab', { name: /^งาน/ });
  const boardTab = page.getByRole('tab', { name: /^บอร์ด/ });
  await tasksTab.click();
  await expect(page.locator('.project-tasks-panel')).toBeVisible();
  await boardTab.click();

  await expect(page.getByRole('heading', { name: 'บอร์ดงาน' })).toBeVisible();
  const columns = page.locator('.project-board-column');
  await expect(columns).toHaveCount(4);

  const todo = page.locator('.project-board-column[data-status="not_started"]');
  const inProgress = page.locator('.project-board-column[data-status="in_progress"]');
  const review = page.locator('.project-board-column[data-status="pending_review"]');
  const done = page.locator('.project-board-column[data-status="completed"]');
  await expect(todo.getByText('To Do', { exact: true })).toBeVisible();
  await expect(todo.locator('.project-board-count')).toHaveText('1');
  await expect(inProgress.locator('.project-board-count')).toHaveText('0');
  await expect(review.locator('.project-board-count')).toHaveText('0');
  await expect(done.locator('.project-board-count')).toHaveText('0');
  await expect(todo.getByText(taskTitle)).toBeVisible();

  await todo.getByRole('button', { name: new RegExp(taskTitle) }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: taskTitle })).toBeVisible();
  await dialog.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();
  await expect(page).toHaveURL(/\/projects\/1$/);
  await expect(boardTab).toHaveAttribute('aria-selected', 'true');

  await overviewTab.click();
  await tasksTab.click();
  await boardTab.click();
  await expect(todo.getByText(taskTitle)).toBeVisible();

  await page.getByRole('link', { name: /โปรเจกต์/ }).first().click();
  await page.locator('.tracking-project-link').filter({ hasText: 'รายงานผลการฝึกงาน Mecha' }).click();
  await page.getByRole('tab', { name: /^บอร์ด/ }).click();
  const secondProjectTasks = page.locator('.project-board-task');
  await expect(page.locator('.project-board-empty')).toBeVisible();
  await expect(secondProjectTasks).toHaveCount(0);
});

test('Project Workspace: Board empty state and mobile layout are usable', async ({ page }) => {
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });

  const projectName = `Empty Board Project ${Date.now()}`;
  const dialog = await openAddModal(page);
  await dialog.locator('input[placeholder*="ระบุชื่อโปรเจกต์"]').first().fill(projectName);
  await dialog.getByRole('button', { name: 'ถัดไป' }).click();
  await dialog.getByLabel('เลือก Project Owner').selectOption({ index: 1 });
  await dialog.getByRole('button', { name: 'ถัดไป' }).click();
  await dialog.getByRole('button', { name: 'บันทึก' }).click();
  await expect(dialog).not.toBeVisible();

  await page.locator('.tracking-project-link').filter({ hasText: projectName }).click();
  await page.getByRole('tab', { name: /^บอร์ด/ }).click();
  await expect(page.locator('.project-board-empty')).toBeVisible();
  await expect(page.locator('.project-board-column')).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${PROJECT_URL}/1`);
  await page.getByRole('tab', { name: /^บอร์ด/ }).click();
  await expect(page.locator('.project-board-column')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(browserErrors).toEqual([]);
});

test('Project Workspace: all seven sections remain usable on mobile without page overflow', async ({ page }) => {
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${PROJECT_URL}/1`);
  const tabs = [
    /^ภาพรวม/, /^งาน/, /^บอร์ด/, /^ทีม/, /^สิ่งที่ส่งมอบ/, /^ไทม์ไลน์/, /^ประวัติ/,
  ];

  for (const name of tabs) {
    const tab = page.getByRole('tab', { name });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }

  expect(browserErrors).toEqual([]);
});

test('Project Workspace: rendered text and interface color pairs meet WCAG contrast targets', async ({ page }) => {
  const contrastRatio = (foreground, background) => {
    const luminance = (color) => {
      const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map((channel) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(background);
    return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
      / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
  };

  const inspect = async (selectors) => page.evaluate((targets) => {
    const parse = (color) => color.match(/[\d.]+/g).map(Number);
    return targets.map(({ selector, pseudo, foregroundProperty, backgroundFromParent }) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Missing contrast audit target: ${selector}`);
      const style = getComputedStyle(element, pseudo || null);
      let backgroundElement = backgroundFromParent ? element.parentElement : element;
      let background = 'rgb(255, 255, 255)';
      for (let current = backgroundElement; current; current = current.parentElement) {
        const color = getComputedStyle(current).backgroundColor;
        const channels = parse(color);
        if (channels.length === 3 || channels[3] > 0) {
          background = color;
          break;
        }
      }
      return {
        selector,
        foreground: style[foregroundProperty || 'color'],
        background,
      };
    });
  }, selectors);

  const assertReadable = async (selectors, minimum = 4.5) => {
    const pairs = await inspect(selectors);
    for (const pair of pairs) {
      const ratio = contrastRatio(pair.foreground, pair.background);
      expect(ratio, `${pair.selector}: ${pair.foreground} on ${pair.background}`).toBeGreaterThanOrEqual(minimum);
      pair.ratio = Number(ratio.toFixed(2));
    }
    return pairs;
  };

  await page.goto(`${PROJECT_URL}/1`);
  await page.locator('.project-detail-header').waitFor();
  await page.locator('.project-detail-nav-button').nth(1).hover();
  const overviewPairs = await assertReadable([
    { selector: '.project-detail-title' },
    { selector: '.project-detail-description' },
    { selector: '.project-detail-status' },
    { selector: '.project-detail-priority' },
    { selector: '.project-detail-category' },
    { selector: '.project-detail-person-label' },
    { selector: '.project-detail-avatar' },
    { selector: '.project-detail-date-icon svg' },
    { selector: '.project-detail-edit-button' },
    { selector: '.project-detail-edit-button svg' },
    { selector: '.project-detail-navigation .project-detail-nav-button:nth-child(2)' },
    { selector: '.project-detail-navigation .project-detail-nav-button.active' },
    { selector: '.project-detail-kpi h2' },
    { selector: '.project-detail-kpi-subtitle' },
    { selector: '.project-detail-status-legend > span' },
    { selector: '.project-detail-status-legend i', foregroundProperty: 'backgroundColor', backgroundFromParent: true },
    { selector: '.project-detail-status-bar span', foregroundProperty: 'backgroundColor', backgroundFromParent: true },
    { selector: '.project-detail-task-row > strong' },
    { selector: '.project-detail-task-status' },
    { selector: '.project-detail-information dt' },
    { selector: '.project-detail-information dd' },
  ]);

  await page.getByRole('tab', { name: /^งาน/ }).click();
  await assertReadable([
    { selector: '.project-detail-nav-button.active .project-detail-nav-count' },
  ]);
  const search = page.getByRole('searchbox', { name: 'ค้นหางานในโปรเจกต์' });
  const searchStyle = await search.evaluate((element) => ({
    placeholder: getComputedStyle(element, '::placeholder').color,
    background: getComputedStyle(element).backgroundColor,
    border: getComputedStyle(element).borderTopColor,
  }));
  const placeholderContrast = contrastRatio(searchStyle.placeholder, searchStyle.background);
  const searchBorderContrast = contrastRatio(searchStyle.border, searchStyle.background);
  expect(
    placeholderContrast,
    `Project Tasks search placeholder: ${searchStyle.placeholder} on ${searchStyle.background}`
  ).toBeGreaterThanOrEqual(4.5);
  expect(searchBorderContrast).toBeGreaterThanOrEqual(3);
  const taskPairs = await assertReadable([
    { selector: '.project-tasks-table thead th' },
    { selector: '.project-tasks-title-button' },
    { selector: '.project-tasks-status' },
    { selector: '.project-tasks-priority' },
  ]);

  await search.fill('no task matches this phrase');
  const emptyPairs = await assertReadable([
    { selector: '.project-tasks-empty strong' },
    { selector: '.project-tasks-empty span' },
    { selector: '.project-tasks-empty button' },
  ]);
  await search.fill('');
  await page.locator('.project-tasks-title-button').first().click();
  const modalPairs = await assertReadable([
    { selector: '.modal-title' },
    { selector: '.task-detail-priority' },
    { selector: '.task-detail-status' },
    { selector: '.modal-body .text-muted' },
    { selector: '.modal-footer .btn' },
  ]);
  const modalCloseButton = page.getByRole('dialog').getByRole('button', { name: 'ปิดหน้าต่าง' });
  await modalCloseButton.hover();
  await expect(modalCloseButton).toHaveCSS('background-color', 'rgb(51, 65, 85)');
  await expect(modalCloseButton).toHaveCSS('color', 'rgb(255, 255, 255)');
  const modalHoverPairs = await assertReadable([
    { selector: '.modal-footer .btn' },
  ]);
  await modalCloseButton.click();

  await page.getByRole('tab', { name: /^บอร์ด/ }).click();
  await page.locator('.project-board-task').first().hover();
  const boardPairs = await assertReadable([
    { selector: '.project-board-column-heading strong' },
    { selector: '.project-board-column-heading small' },
    { selector: '.project-board-count' },
    { selector: '.project-board-task-title' },
    { selector: '.project-board-status' },
    { selector: '.project-board-priority' },
    { selector: '.project-board-assignee' },
    { selector: '.project-board-due-date' },
    { selector: '.project-board-column.status-not_started', foregroundProperty: 'borderTopColor' },
  ]);
  await page.locator('.project-board-task').first().click();
  const boardModalPairs = await assertReadable([
    { selector: '.task-detail-priority' },
    { selector: '.task-detail-status' },
  ]);
  await page.getByRole('dialog').getByRole('button', { name: 'ปิดหน้าต่าง' }).click();

  await page.getByRole('link', { name: /โปรเจกต์/ }).first().click();
  const projectName = `Contrast Empty State Project ${Date.now()}`;
  const addDialog = await openAddModal(page);
  await addDialog.locator('input[placeholder*="ระบุชื่อโปรเจกต์"]').first().fill(projectName);
  await addDialog.getByRole('button', { name: 'ถัดไป' }).click();
  await addDialog.getByLabel('เลือก Project Owner').selectOption({ index: 1 });
  await addDialog.getByRole('button', { name: 'ถัดไป' }).click();
  await addDialog.getByRole('button', { name: 'บันทึก' }).click();
  await expect(addDialog).not.toBeVisible();
  await page.locator('.tracking-project-link').filter({ hasText: projectName }).click();
  await page.getByRole('tab', { name: 'ภาพรวม', exact: true }).click();
  const overviewEmptyPairs = await assertReadable([
    { selector: '.project-detail-empty' },
  ]);
  await page.getByRole('tab', { name: /^บอร์ด/ }).click();
  const boardEmptyPairs = await assertReadable([
    { selector: '.project-board-empty strong' },
    { selector: '.project-board-empty span' },
  ]);

  console.log('Project Workspace contrast ratios:', JSON.stringify({
    overview: overviewPairs,
    tasks: {
      text: taskPairs,
      searchPlaceholder: {
        foreground: searchStyle.placeholder,
        background: searchStyle.background,
        ratio: Number(placeholderContrast.toFixed(2)),
      },
      searchBorder: {
        foreground: searchStyle.border,
        background: searchStyle.background,
        ratio: Number(searchBorderContrast.toFixed(2)),
      },
    },
    taskEmptyState: emptyPairs,
    taskModal: modalPairs,
    taskModalHover: modalHoverPairs,
    board: boardPairs,
    boardTaskModal: boardModalPairs,
    overviewEmptyState: overviewEmptyPairs,
    boardEmptyState: boardEmptyPairs,
  }));
});

test('Project Workspace: checklist ownership and Task Review use the required workflow', async ({ page }) => {
  const title = `Checklist and review task ${Date.now()}`;
  await addWorkspaceMember(page, 1, 'emp-001');
  await createWorkspaceTask(page, { title, assigneeId: 'emp-001', reviewerId: 'emp-009' });
  await openWorkspaceProject(page, 1);
  await page.getByRole('tab', { name: /^งาน/ }).click();

  const taskRow = page.locator('.project-tasks-row').filter({ hasText: title });
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-001');
  await taskRow.getByRole('button', { name: title }).click();
  const detailDialog = page.getByRole('dialog').first();
  const checklistTitle = `ตรวจสอบ workflow ${Date.now()}`;
  await detailDialog.getByLabel('เพิ่มรายการ Checklist').fill(checklistTitle);
  await detailDialog.getByRole('button', { name: 'เพิ่ม Checklist' }).click();
  const checklistItem = detailDialog.locator('.workspace-checklist li').filter({ hasText: checklistTitle });
  await checklistItem.getByRole('checkbox').check();
  await expect(detailDialog.locator('.task-detail-status')).toContainText('กำลังดำเนินการ');

  await detailDialog.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-002');
  await taskRow.getByRole('button', { name: title }).click();
  const otherMemberDialog = page.getByRole('dialog').first();
  await expect(otherMemberDialog.locator('.workspace-checklist-actions')).toHaveCount(0);
  await expect(otherMemberDialog.locator('.workspace-checklist li input[type="checkbox"]')).toBeDisabled();
  await otherMemberDialog.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();

  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-008');
  await taskRow.getByRole('button', { name: title }).click();
  const ownerDialog = page.getByRole('dialog').first();
  const editableChecklistItem = ownerDialog.locator('.workspace-checklist li').first();
  await editableChecklistItem.getByRole('button', { name: 'แก้ไข' }).click();
  await editableChecklistItem.getByRole('textbox').fill(`${checklistTitle} · Owner edit`);
  await editableChecklistItem.getByRole('button', { name: 'บันทึก' }).click();
  await expect(ownerDialog.locator('.workspace-checklist')).toContainText('Owner edit');
  await ownerDialog.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();

  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-001');
  await taskRow.getByRole('button', { name: title }).click();
  const submitDialog = page.getByRole('dialog').first();
  await expect(submitDialog.getByRole('button', { name: 'ส่งตรวจ' })).toBeVisible();
  await submitDialog.getByRole('button', { name: 'ส่งตรวจ' }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'ยืนยัน' }).click();
  await expect(submitDialog.getByText(/ล็อกการแก้ไข/)).toBeVisible();
  await expect(submitDialog.getByRole('button', { name: 'แก้ไขงาน' })).toHaveCount(0);
  await submitDialog.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();

  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-009');
  await taskRow.getByRole('button', { name: title }).click();
  const reviewerDialog = page.getByRole('dialog').first();
  await reviewerDialog.getByRole('button', { name: 'อนุมัติ' }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'ยืนยัน' }).click();
  await expect(reviewerDialog.locator('.task-detail-status')).toContainText('เสร็จสิ้น');
  await reviewerDialog.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();

  await page.getByRole('tab', { name: /^ประวัติ/ }).click();
  await page.getByLabel('กรองประเภทกิจกรรม').selectOption('review');
  await expect(page.locator('.workspace-activity-list')).toContainText('อนุมัติงาน');
});

test('Project Workspace: request changes and withdrawal require reasons and return Tasks to In Progress', async ({ page }) => {
  const title = `Review changes task ${Date.now()}`;
  await addWorkspaceMember(page, 1, 'emp-001');
  await createWorkspaceTask(page, { title, assigneeId: 'emp-001', reviewerId: 'emp-009' });
  await openWorkspaceProject(page, 1);
  await page.getByRole('tab', { name: /^งาน/ }).click();
  const taskRow = page.locator('.project-tasks-row').filter({ hasText: title });
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-001');
  await taskRow.getByRole('button', { name: title }).click();
  let detailDialog = page.getByRole('dialog').first();
  await detailDialog.getByRole('button', { name: 'ส่งตรวจ' }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'ยืนยัน' }).click();
  await detailDialog.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();

  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-009');
  await taskRow.getByRole('button', { name: title }).click();
  detailDialog = page.getByRole('dialog').first();
  const requestChanges = detailDialog.getByRole('button', { name: 'ขอแก้ไข' });
  await expect(requestChanges).toBeDisabled();
  await detailDialog.getByLabel('เหตุผล (จำเป็นสำหรับขอแก้ไขหรือถอนงาน)').fill('ขอแนบผลทดสอบเพิ่ม');
  await requestChanges.click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'ยืนยัน' }).click();
  await expect(detailDialog.locator('.task-detail-status')).toContainText('กำลังดำเนินการ');
  await detailDialog.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();

  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-001');
  await taskRow.getByRole('button', { name: title }).click();
  detailDialog = page.getByRole('dialog').first();
  await detailDialog.getByRole('button', { name: 'ส่งตรวจ' }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'ยืนยัน' }).click();
  await detailDialog.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();

  await taskRow.getByRole('button', { name: title }).click();
  detailDialog = page.getByRole('dialog').first();
  const withdraw = detailDialog.getByRole('button', { name: 'ถอนจากการตรวจ' });
  await expect(withdraw).toBeDisabled();
  await detailDialog.getByLabel('เหตุผล (จำเป็นสำหรับขอแก้ไขหรือถอนงาน)').fill('ต้องปรับข้อมูลก่อนตรวจอีกครั้ง');
  await withdraw.click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'ยืนยัน' }).click();
  await expect(detailDialog.locator('.task-detail-status')).toContainText('กำลังดำเนินการ');

  await detailDialog.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();
  await page.getByRole('tab', { name: /^ประวัติ/ }).click();
  await page.getByLabel('กรองประเภทกิจกรรม').selectOption('review');
  await expect(page.locator('.workspace-activity-list')).toContainText('ขอแนบผลทดสอบเพิ่ม');
  await expect(page.locator('.workspace-activity-list')).toContainText('ต้องปรับข้อมูลก่อนตรวจอีกครั้ง');
});

test('Project Workspace: Team, Deliverables, Timeline and Activity share project records', async ({ page }) => {
  const deliverableTitle = `Deliverable ${Date.now()}`;
  await page.goto(`${PROJECT_URL}/1`);
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-008');
  await page.getByRole('tab', { name: /^ทีม/ }).click();
  await page.getByLabel('เลือก Team Leader').selectOption('emp-009');

  const memberSelect = page.getByLabel('เลือกสมาชิกเพื่อเพิ่ม');
  await memberSelect.selectOption({ index: 1 });
  const memberName = (await memberSelect.locator('option:checked').textContent()).trim();
  await page.getByRole('button', { name: 'เพิ่มสมาชิก' }).click();
  await expect(page.locator('.workspace-member-row').filter({ hasText: memberName })).toBeVisible();

  await page.getByRole('tab', { name: /^สิ่งที่ส่งมอบ/ }).click();
  await page.getByRole('button', { name: 'เพิ่มรายการ' }).click();
  const deliverableDialog = page.getByRole('dialog').last();
  await deliverableDialog.locator('#deliverable-title').fill(deliverableTitle);
  await deliverableDialog.locator('#deliverable-due').fill('2026-12-31');
  await deliverableDialog.getByRole('button', { name: 'บันทึก' }).click();
  await expect(page.locator('.workspace-deliverable-row').filter({ hasText: deliverableTitle })).toBeVisible();
  await page.getByLabel(`สถานะ ${deliverableTitle}`).selectOption('completed');

  await page.getByRole('tab', { name: /^ไทม์ไลน์/ }).click();
  await expect(page.locator('.workspace-timeline-row').filter({ hasText: deliverableTitle })).toBeVisible();
  await page.getByRole('tab', { name: /^สิ่งที่ส่งมอบ/ }).click();
  const deliverableRow = page.locator('.workspace-deliverable-row').filter({ hasText: deliverableTitle });
  await deliverableRow.getByRole('button', { name: 'แก้ไข' }).click();
  const editDeliverableDialog = page.getByRole('dialog').last();
  await editDeliverableDialog.locator('#deliverable-description').fill('ปรับปรุงรายละเอียดสิ่งที่ส่งมอบ');
  await editDeliverableDialog.getByRole('button', { name: 'บันทึก' }).click();
  await expect(deliverableRow).toContainText('ปรับปรุงรายละเอียดสิ่งที่ส่งมอบ');
  await deliverableRow.getByRole('button', { name: 'ลบ' }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'ยืนยันลบ' }).click();
  await expect(page.locator('.workspace-deliverable-row').filter({ hasText: deliverableTitle })).toHaveCount(0);
  await page.getByRole('tab', { name: /^ประวัติ/ }).click();
  await expect(page.locator('.workspace-activity-list')).toContainText(deliverableTitle);
  await expect(page.locator('.workspace-activity-list')).toContainText(memberName);
});

test('Project Workspace: reassignment requires a reason and updates the shared Task record', async ({ page }) => {
  const title = `Reassignment task ${Date.now()}`;
  await addWorkspaceMember(page, 1, 'emp-001');
  await addWorkspaceMember(page, 1, 'emp-009');
  await createWorkspaceTask(page, { title, assigneeId: 'emp-001', reviewerId: 'emp-009' });
  await openWorkspaceProject(page, 1);
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-008');
  await page.getByRole('tab', { name: /^งาน/ }).click();
  const taskRow = page.locator('.project-tasks-row').filter({ hasText: title });
  await taskRow.getByRole('button', { name: title }).click();

  const dialog = page.getByRole('dialog').first();
  await dialog.getByLabel('ผู้รับผิดชอบใหม่').selectOption('emp-009');
  const saveAssignment = dialog.getByRole('button', { name: 'บันทึกการเปลี่ยน' });
  await expect(saveAssignment).toBeDisabled();
  await dialog.getByLabel('เหตุผลการเปลี่ยนผู้รับผิดชอบ').fill('ปรับสมดุลภาระงาน');
  await saveAssignment.click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'ยืนยัน' }).click();
  await expect(dialog.locator('.project-task-detail-body')).toContainText('Korn Tawonphon');
  await dialog.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();

  await page.getByRole('tab', { name: /^ประวัติ/ }).click();
  await page.getByLabel('กรองประเภทกิจกรรม').selectOption('task');
  await expect(page.locator('.workspace-activity-list')).toContainText('ปรับสมดุลภาระงาน');
  await expect(page.locator('.workspace-activity-list')).toContainText('เปลี่ยนผู้รับผิดชอบ');
});

test('Project Workspace: creating and deleting a Task updates the same Board and Activity records', async ({ page }) => {
  const title = `Workspace CRUD Task ${Date.now()}`;
  await page.goto(`${PROJECT_URL}/1`);
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-008');
  await page.getByRole('tab', { name: /^งาน/ }).click();
  await page.getByRole('button', { name: 'เพิ่มงาน' }).click();
  const formDialog = page.getByRole('dialog').last();
  await formDialog.locator('#workspace-task-title').fill(title);
  await formDialog.locator('#workspace-task-category').fill('Workspace');
  await formDialog.locator('#workspace-task-assignee').selectOption('emp-008');
  await formDialog.locator('#workspace-task-reviewer').selectOption('emp-001');
  await formDialog.locator('#workspace-task-due').fill('2026-12-20');
  await formDialog.getByRole('button', { name: 'บันทึกงาน' }).click();
  await expect(page.locator('.project-tasks-row').filter({ hasText: title })).toBeVisible();

  await page.getByRole('tab', { name: /^บอร์ด/ }).click();
  const toDoColumn = page.locator('.project-board-column[data-status="not_started"]');
  const taskCard = toDoColumn.getByRole('button', { name: `เปิดรายละเอียดงาน ${title}` });
  await expect(taskCard).toBeVisible();
  await taskCard.click();
  const taskDialog = page.getByRole('dialog').first();
  await taskDialog.getByRole('button', { name: 'ลบงาน' }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'ยืนยัน' }).click();
  await expect(page.locator('.project-board-task').filter({ hasText: title })).toHaveCount(0);
  await page.getByRole('tab', { name: /^งาน/ }).click();
  await expect(page.locator('.project-tasks-row').filter({ hasText: title })).toHaveCount(0);
  await page.getByRole('tab', { name: /^ประวัติ/ }).click();
  await expect(page.locator('.workspace-activity-list')).toContainText(title);
});

test('Project Workspace: removing a member reassigns outstanding primary Tasks first', async ({ page }) => {
  const title = `Member removal task ${Date.now()}`;
  await addWorkspaceMember(page, 1, 'emp-001');
  await addWorkspaceMember(page, 1, 'emp-009');
  await createWorkspaceTask(page, { title, assigneeId: 'emp-001', reviewerId: 'emp-009' });
  await openWorkspaceProject(page, 1);
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-008');
  await page.getByRole('tab', { name: /^ทีม/ }).click();

  const memberRow = page.locator('.workspace-member-row').filter({ hasText: 'Kittipat Samran' });
  await memberRow.getByRole('button', { name: 'นำออก' }).click();

  const removeDialog = page.getByRole('dialog').last();
  await expect(removeDialog.getByRole('alert')).toContainText('ต้องมอบหมายใหม่ก่อน');
  await removeDialog.locator('#member-replacement').selectOption('emp-009');
  await removeDialog.getByLabel('เหตุผลการมอบหมายงานใหม่').fill('สมาชิกออกจากโปรเจกต์');
  await removeDialog.getByRole('button', { name: 'ยืนยันนำออก' }).click();
  await expect(memberRow).toHaveCount(0);

  await page.getByRole('tab', { name: /^งาน/ }).click();
  await expect(page.locator('.project-tasks-row').filter({ hasText: title })).toContainText('Korn Tawonphon');
  await page.getByRole('tab', { name: /^ประวัติ/ }).click();
  await expect(page.locator('.workspace-activity-list')).toContainText('สมาชิกออกจากโปรเจกต์');
});

test('Project Workspace: Project Closure requires Owner review, Team Leader approval, then Owner closure', async ({ page }) => {
  const projectName = `Closure Workflow ${Date.now()}`;
  const addDialog = await openAddModal(page);
  await addDialog.locator('input[placeholder*="ระบุชื่อโปรเจกต์"]').first().fill(projectName);
  await addDialog.getByRole('button', { name: 'ถัดไป' }).click();
  const ownerSelect = addDialog.getByLabel('เลือก Project Owner');
  await ownerSelect.selectOption({ index: 1 });
  const ownerId = await ownerSelect.inputValue();
  await addDialog.getByRole('button', { name: 'ถัดไป' }).click();
  await addDialog.getByRole('button', { name: 'บันทึก' }).click();
  await expect(addDialog).not.toBeVisible();

  const projectLink = page.locator('.tracking-project-link').filter({ hasText: projectName });
  const projectId = (await projectLink.getAttribute('href')).split('/').pop();
  await projectLink.click();
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption(ownerId);
  await page.getByRole('tab', { name: /^ทีม/ }).click();
  const leaderId = ownerId === 'emp-008' ? 'emp-009' : 'emp-008';
  await page.getByLabel('เลือก Team Leader').selectOption(leaderId);
  await page.getByRole('tab', { name: /^ภาพรวม/ }).click();

  const closure = page.locator('.workspace-closure');
  await expect(closure.getByRole('button', { name: 'ส่งขออนุมัติ' })).toBeDisabled();
  await expect(closure.getByText('ยังไม่มีงานในโปรเจกต์ จึงยังส่งขออนุมัติปิดไม่ได้')).toBeVisible();
  await createWorkspaceTask(page, {
    projectId,
    title: `Closure task ${Date.now()}`,
    assigneeId: ownerId,
    reviewerId: leaderId,
    actorId: ownerId,
  });
  const taskRow = page.locator('.project-tasks-row').first();
  await taskRow.getByRole('button').click();
  let taskDialog = page.getByRole('dialog').first();
  await taskDialog.getByRole('button', { name: 'ส่งตรวจ' }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'ยืนยัน' }).click();
  await taskDialog.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption(leaderId);
  await taskRow.getByRole('button').click();
  taskDialog = page.getByRole('dialog').first();
  await taskDialog.getByRole('button', { name: 'อนุมัติ' }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'ยืนยัน' }).click();
  await taskDialog.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();
  await page.getByRole('tab', { name: /^ภาพรวม/ }).click();
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption(ownerId);

  await page.getByRole('button', { name: 'ยืนยันตรวจสรุป' }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'ยืนยัน' }).click();
  await expect(closure.getByRole('button', { name: 'ส่งขออนุมัติ' })).toBeEnabled();
  await closure.getByRole('button', { name: 'ส่งขออนุมัติ' }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'ยืนยัน' }).click();

  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption(leaderId);
  await closure.getByRole('button', { name: 'อนุมัติ' }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'ยืนยัน' }).click();
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption(ownerId);
  await closure.getByRole('button', { name: 'ปิดโปรเจกต์' }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'ยืนยัน' }).click();

  await expect(page.locator('.project-detail-status')).toHaveClass(/status-done/);
  await page.getByRole('tab', { name: /^ประวัติ/ }).click();
  await page.getByLabel('กรองประเภทกิจกรรม').selectOption('closure');
  await expect(page.locator('.workspace-activity-list')).toContainText('ปิดโปรเจกต์');
});
