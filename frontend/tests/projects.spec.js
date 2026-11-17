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
    await expect(page.locator('.tracking-project-link')).toHaveCount(3);
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
  collaborators = [],
  priority = 'medium',
  actorId = 'emp-008',
  dueDate = '2026-12-20',
  plannedHours = null,
  allocationHours = {},
} = {}) {
  await openWorkspaceProject(page, projectId);
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption(actorId);
  await page.getByRole('tab', { name: /^ทีม/ }).click();
  const memberSelect = page.getByLabel('เลือกสมาชิกเพื่อเพิ่ม');
  if (await memberSelect.locator(`option[value="${reviewerId}"]`).count()) {
    const reviewerName = (await memberSelect.locator(`option[value="${reviewerId}"]`).textContent()).trim().split(' — ')[0];
    await memberSelect.selectOption(reviewerId);
    const addReason = page.getByLabel('เหตุผลการเพิ่มสมาชิก');
    if (await addReason.count()) await addReason.fill('กำหนดสมาชิกเพื่อทดสอบผู้ตรวจงาน');
    await page.getByRole('button', { name: 'เพิ่มเข้าทีม' }).click();
    await expect(page.locator('.workspace-member-row').filter({ hasText: reviewerName })).toBeVisible();
  }
  await page.getByRole('tab', { name: /^งาน/ }).click();
  await page.getByRole('button', { name: 'เพิ่มงาน', exact: true }).click();
  const dialog = page.getByRole('dialog').last();
  await dialog.locator('#workspace-task-title').fill(title);
  await dialog.locator('#workspace-task-assignee').selectOption(assigneeId);
  await dialog.locator('#workspace-task-reviewer').selectOption(reviewerId);
  if (collaborators.length) await dialog.locator('#workspace-task-collaborators').selectOption(collaborators);
  await dialog.locator('#workspace-task-priority').selectOption(priority);
  await dialog.locator('#workspace-task-due').fill(dueDate);
  if (plannedHours !== null) {
    await dialog.locator('#workspace-task-hours').fill(String(plannedHours));
    for (const [employeeId, hours] of Object.entries(allocationHours)) {
      const option = dialog.locator(`#workspace-task-assignee option[value="${employeeId}"], #workspace-task-collaborators option[value="${employeeId}"]`).first();
      const employeeName = (await option.textContent()).trim();
      await dialog.getByLabel(`ชั่วโมงที่วางแผนสำหรับ ${employeeName}`).fill(String(hours));
    }
  }
  await dialog.getByRole('button', { name: 'สร้างงาน' }).click();
  const taskRow = page.locator('.project-tasks-row').filter({ hasText: title });
  await expect(taskRow).toBeVisible();
  return taskRow;
}

async function addWorkspaceMember(page, projectId, memberId, ownerId = 'emp-008') {
  await openWorkspaceProject(page, projectId);
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption(ownerId);
  await page.getByRole('tab', { name: /^ทีม/ }).click();
  const existingMember = page.locator(`.workspace-member-row .project-detail-avatar[data-person-id="${memberId}"]`);
  if (await existingMember.count()) return;
  const memberSelect = page.getByLabel('เลือกสมาชิกเพื่อเพิ่ม');
  await memberSelect.selectOption(memberId);
  const memberName = (await memberSelect.locator('option:checked').textContent()).trim().split(' — ')[0];
  const addReason = page.getByLabel('เหตุผลการเพิ่มสมาชิก');
  if (await addReason.count()) await addReason.fill('เพิ่มสมาชิกเพื่อทดสอบ Workspace');
  await page.getByRole('button', { name: 'เพิ่มเข้าทีม' }).click();
  await expect(page.locator('.workspace-member-row').filter({ hasText: memberName })).toBeVisible();
}

function getWorkspaceTaskDetail(page) {
  return page.locator('.workspace-task-detail');
}

function getWorkspaceTaskAction(page) {
  return page.locator('.workspace-task-action-panel');
}

async function confirmWorkspaceTaskAction(page) {
  await getWorkspaceTaskAction(page).getByRole('button', { name: 'ยืนยัน' }).click();
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

// Test 4: Project creator is the Project Owner and joins the Team automatically.
test('Stepper Mode: ผู้สร้างเป็น Project Owner และอยู่ใน Team โดยอัตโนมัติ', async ({
  page,
}) => {
  const dialog = await openAddModal(page);

  // Step 1: กรอกชื่อโปรเจกต์และไป Step 2
  await dialog.locator('input[placeholder*="ระบุชื่อโปรเจกต์"]').first().fill('โปรเจกต์ทดสอบ Owner Sync');
  await dialog.getByRole('button', { name: 'ถัดไป' }).click();

  const ownerSelect = dialog.getByLabel('เลือก Project Owner');
  await expect(ownerSelect).toBeVisible();
  await expect(ownerSelect).toHaveValue('emp-001');
  await expect(ownerSelect).toBeDisabled();
  const ownerCheckbox = dialog.locator('#project-team-emp-001');
  await expect(ownerCheckbox).toBeChecked();
  await expect(ownerCheckbox).toBeDisabled();
  await expect(dialog.getByText(/สมาชิกที่เลือก:/)).toContainText('1 คน');
  await dialog.getByRole('button', { name: 'ถัดไป' }).click();
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

  // Step 2: ผู้สร้างเป็น Owner โดยอัตโนมัติ
  const ownerSelect = dialog.getByLabel('เลือก Project Owner');
  await expect(ownerSelect).toBeVisible();
  await expect(ownerSelect).toBeDisabled();
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

// Test 6: Single Page Mode keeps creator ownership and optional Deliverables.
test('Single Page Mode: แสดงครบทุกส่วน ใช้ผู้สร้างเป็น Owner และสร้างโปรเจกต์สำเร็จ', async ({
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

  // Project Owner เป็นผู้สร้างและเปลี่ยนจากฟอร์มสร้างไม่ได้
  const ownerSelect = dialog.getByLabel('เลือก Project Owner');
  await expect(ownerSelect).toBeDisabled();
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

  // ไปยัง Step 2 และตรวจสอบ Owner ของผู้สร้าง
  await dialog.getByRole('button', { name: 'ถัดไป' }).click();
  const ownerSelect = dialog.getByLabel('เลือก Project Owner');
  await expect(ownerSelect).toBeVisible();
  await expect(ownerSelect).toBeDisabled();
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
  await searchInput.fill('แดชบอร์ดสถานะสายการผลิต');
  await expect(cards).toHaveCount(1);
  await expect(cards.first().locator('.project-card-title')).toContainText('แดชบอร์ดสถานะสายการผลิต');

  // สลับกลับมายัง Table View — ตรวจสอบว่าเงื่อนไขค้นหายังคงอยู่
  await tableToggle.click();
  await expect(trackingTable).toBeVisible();
  await expect(page.locator('.tracking-project-name')).toContainText('แดชบอร์ดสถานะสายการผลิต');
  await expect(searchInput).toHaveValue('แดชบอร์ดสถานะสายการผลิต');

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

  // ค้นหาโปรเจกต์ที่ใช้ข้อมูลจาก Workspace reference
  const searchInput = page.getByRole('searchbox', { name: 'ค้นหาโปรเจกต์' });
  await searchInput.fill('แดชบอร์ดสถานะสายการผลิต');
  await expect(cards).toHaveCount(1);

  // ตรวจสอบข้อความและเปอร์เซ็นต์ Milestone
  const traineeCard = cards.first();
  await expect(traineeCard.locator('.project-card-title')).toContainText('แดชบอร์ดสถานะสายการผลิต');
  await expect(traineeCard.locator('.project-card-category')).toContainText('ระบบองค์กร');
  await expect(traineeCard.locator('.project-card-owner-name')).toHaveText('Supachai Meesuk');
  await expect(traineeCard.locator('.project-card-team-sec')).toContainText('3 คน');
  await expect(traineeCard.locator('.tracking-progress-label')).toHaveText('38% · 3/8 งาน');

  const footer = traineeCard.locator('.project-card-footer');
  await expect(footer.locator('.project-card-date-info')).toBeVisible();
  await expect(footer.locator('.project-card-action-btns')).toBeVisible();
  await expect(footer.getByRole('button', { name: 'แก้ไข แดชบอร์ดสถานะสายการผลิต' })).toBeVisible();
  await expect(footer.getByRole('button', { name: 'ลบ แดชบอร์ดสถานะสายการผลิต' })).toBeVisible();
  await expect(footer.locator('.project-card-date-text')).toContainText('วัน');

  // Seed Projects have no Tasks; the paused sample stays distinct from completed work.
  await searchInput.fill('เว็บไซต์องค์กร Mecha 2026');
  const pausedCard = cards.first();
  await expect(pausedCard.locator('.tracking-pill-status.status-on_hold')).toBeVisible();
  await expect(pausedCard.locator('.tracking-progress-label')).toHaveText('ไม่มีข้อมูล Milestone');
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

test('Project Workspace: project icon paints above the gradient in its overlap area', async ({ page }) => {
  await openWorkspaceProject(page, 1);
  const overlapVisible = await page.locator('.project-detail-project-icon').evaluate((icon) => {
    const rect = icon.getBoundingClientRect();
    const samples = [
      [rect.x + rect.width / 2, rect.y + 8],
      [rect.x + rect.width / 2, rect.y + rect.height / 2],
      [rect.x + rect.width / 2, rect.y + rect.height - 8],
    ];
    return samples.every(([x, y]) => icon.contains(document.elementFromPoint(x, y)));
  });

  expect(overlapVisible).toBe(true);
});

test('Project Workspace: Overview ใช้เฉพาะ Tasks ของโปรเจกต์ที่เลือก', async ({ page }) => {
  const projectOneTask = `Overview Project 1 ${Date.now()}`;
  const otherProjectTask = `Overview Project 3 ${Date.now()}`;
  await createWorkspaceTask(page, { projectId: 1, title: projectOneTask, dueDate: '2026-10-01' });
  await createWorkspaceTask(page, { projectId: 3, title: otherProjectTask });
  await openWorkspaceProject(page, 1);

  await expect(page.getByRole('heading', { level: 1, name: 'แดชบอร์ดสถานะสายการผลิต' })).toBeVisible();
  await expect(page.getByText('ความคืบหน้ารวม')).toBeVisible();
  await expect(page.locator('.project-detail-kpi.status-summary')).toContainText('สรุปสถานะงาน');

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

  await expect(page.getByRole('heading', { level: 1, name: 'แดชบอร์ดสถานะสายการผลิต' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: 'เมนูโปรเจกต์' })).toBeVisible();
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(390);
  expect(browserErrors).toEqual([]);
});

test('Project Workspace: ใช้ข้อมูลจริงใน Header และเปิด Project Edit modal เดิม', async ({ page }) => {
  await openWorkspaceProject(page, 1);

  const header = page.locator('.project-detail-header');
  await expect(header.getByRole('heading', { level: 1, name: 'แดชบอร์ดสถานะสายการผลิต' })).toBeVisible();
  await expect(header.getByText('กำลังดำเนินการ')).toBeVisible();
  await expect(header.getByText('ระบบองค์กร')).toBeVisible();
  await expect(header.locator('.project-detail-person-label').filter({ hasText: /^Project Owner$/ })).toBeVisible();
  await expect(header.getByText('Supachai Meesuk')).toBeVisible();
  await expect(header.getByRole('img', { name: /^ความคืบหน้า \d+%$/ })).toBeVisible();
  await expect(header.locator('.project-detail-person-label').filter({ hasText: /^Team Lead$/ })).toBeVisible();

  await header.getByRole('button', { name: 'แก้ไขโปรเจกต์' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('แก้ไขโปรเจกต์')).toBeVisible();
});

test('Project Workspace: งานจาก Attention เปิดรายละเอียดงานแบบ Inline', async ({ page }) => {
  const overdueDate = new Date();
  overdueDate.setDate(overdueDate.getDate() - 7);
  await createWorkspaceTask(page, {
    title: `Overdue Workspace Task ${Date.now()}`,
    dueDate: overdueDate.toISOString().slice(0, 10),
  });
  await openWorkspaceProject(page, 1);
  await page.getByRole('tab', { name: 'ภาพรวม', exact: true }).click();
  const attentionItem = page.locator('.project-detail-attention-row').first();
  const taskTitle = await attentionItem.locator('.project-detail-attention-copy strong').innerText();

  await attentionItem.click();

  await expect(page).toHaveURL(/\/projects\/1$/);
  const detail = getWorkspaceTaskDetail(page);
  await expect(detail).toBeVisible();
  await expect(detail.getByRole('heading', { name: taskTitle })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^งาน/ })).toHaveAttribute('aria-selected', 'true');
});

test('Project Workspace: Tasks tab filters project tasks and opens task details', async ({ page }) => {
  const projectOneTask = `Project 1 urgent task ${Date.now()}`;
  const projectOneHighPriorityTask = `Project 1 high task ${Date.now()}`;
  const projectTwoTask = `Project 3 task ${Date.now()}`;
  await createWorkspaceTask(page, { projectId: 1, title: projectOneTask, priority: 'urgent' });
  await createWorkspaceTask(page, { projectId: 1, title: projectOneHighPriorityTask, priority: 'high' });
  await createWorkspaceTask(page, { projectId: 3, title: projectTwoTask });

  await openWorkspaceProject(page, 1);
  await page.getByRole('tab', { name: /^งาน/ }).click();

  const taskRows = page.locator('.project-tasks-row');
  await expect(page.getByRole('group', { name: 'กรองงานตามสถานะ' })).toBeVisible();
  await expect(taskRows).toHaveCount(10);
  await expect(taskRows.getByText(projectOneTask)).toBeVisible();
  await expect(taskRows.getByText(projectTwoTask)).toHaveCount(0);

  await page.locator('.project-tasks-status-filter[data-status="not_started"]').click();
  await expect(taskRows).toHaveCount(4);

  await page.locator('.project-tasks-status-filter[data-status="all"]').click();
  await taskRows.filter({ hasText: projectOneTask }).click();
  const detail = getWorkspaceTaskDetail(page);
  await expect(detail).toBeVisible();
  await expect(detail.getByRole('heading', { name: projectOneTask })).toBeVisible();
  await detail.getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();

  await expect(page).toHaveURL(/\/projects\/1$/);
  await expect(page.getByRole('tab', { name: /^งาน/ })).toHaveAttribute('aria-selected', 'true');
  await expect(taskRows.filter({ hasText: projectOneTask })).toBeVisible();

  await page.getByRole('link', { name: /โปรเจกต์/ }).first().click();
  await page.locator('.tracking-project-link').filter({ hasText: 'รายงานผลการฝึกงาน Mecha' }).click();
  await page.getByRole('tab', { name: /^งาน/ }).click();
  await expect(page.locator('.project-tasks-row').getByText(projectTwoTask)).toBeVisible();
  await expect(page.locator('.project-tasks-row').getByText(projectOneTask)).toHaveCount(0);
});

test('Project Workspace: Tasks tab shows an empty state for a project without tasks', async ({ page }) => {
  await openWorkspaceProject(page, 3);
  await page.getByRole('tab', { name: /^งาน/ }).click();
  await expect(page.locator('.project-tasks-empty')).toHaveText('ไม่มีงานในสถานะนี้');
  await expect(page.locator('.workspace-task-detail')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('tab', { name: /^บอร์ด/ }).click();
  await expect(page.locator('.project-board-column')).toHaveCount(4);
  await expect(page.locator('.project-board-column-empty')).toHaveCount(4);

  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-008');
  await page.getByRole('tab', { name: /^ทีม/ }).click();
  await expect(page.locator('.workspace-member-row')).toHaveCount(1);
  await expect(page.locator('.workspace-member-role.is-owner')).toHaveText('Owner');

  await page.getByRole('tab', { name: /^สิ่งที่ส่งมอบ/ }).click();
  await expect(page.locator('.workspace-reference-empty-note')).toHaveText('ยังไม่มีสิ่งที่ต้องส่งมอบ');

  await page.getByRole('tab', { name: /^ประวัติ/ }).click();
  await expect(page.locator('.workspace-reference-empty-note')).toHaveCount(0);

  await page.getByRole('tab', { name: /^ภาพรวม/ }).click();
  const closure = page.locator('.workspace-closure');
  await expect(closure.getByRole('button', { name: 'ส่งขออนุมัติ' })).toBeDisabled();
  await expect(closure.locator('.project-detail-closure-copy').first()).toContainText('เสร็จ 0/0 งาน');
});

test('Project Workspace: Task form shows one modal body and limits reviewers to Project Team members', async ({ page }) => {
  await addWorkspaceMember(page, 1, 'emp-009');
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-008');
  const tasksTab = page.getByRole('tab', { name: /^งาน/ });
  await tasksTab.click();
  await expect(tasksTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.project-tasks-panel')).toBeVisible();
  await page.getByRole('button', { name: 'เพิ่มงาน', exact: true }).click();

  const dialog = page.getByRole('dialog').last();
  await expect(dialog.locator('.modal-body')).toHaveCount(1);
  await dialog.locator('#workspace-task-assignee').selectOption('emp-008');
  const reviewerIds = await dialog.locator('#workspace-task-reviewer option').evaluateAll((options) => (
    options.map((option) => option.value).filter(Boolean)
  ));
  expect(reviewerIds).toEqual(['emp-002', 'emp-009']);
  await dialog.locator('#workspace-task-title').fill('Eligible reviewer validation');
  await dialog.locator('#workspace-task-due').fill('2026-12-20');
  await dialog.locator('#workspace-task-reviewer').evaluate((select) => select.add(new Option('Outside Project Team', 'emp-020')));
  await dialog.locator('#workspace-task-reviewer').selectOption('emp-020');
  await dialog.getByRole('button', { name: 'สร้างงาน' }).click();
  await expect(dialog.getByRole('alert')).toContainText('กรุณากำหนดผู้ตรวจงานจากสมาชิกโปรเจกต์');
  await expect(page.locator('.project-tasks-row').filter({ hasText: 'Eligible reviewer validation' })).toHaveCount(0);
  await dialog.locator('#workspace-task-reviewer').selectOption('emp-009');
  await dialog.getByRole('button', { name: 'สร้างงาน' }).click();
  await expect(page.locator('.project-tasks-row').filter({ hasText: 'Eligible reviewer validation' })).toBeVisible();
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
  await page.getByRole('button', { name: 'เพิ่มงาน', exact: true }).click();
  const taskDialog = page.getByRole('dialog').last();
  await expect(taskDialog).toBeVisible();
  await expect(taskDialog.locator('.workspace-task-modal-columns')).toBeVisible();
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

test('Project Workspace: task selection opens inline detail from every tab and preserves the Work Page return state', async ({ page }) => {
  const taskTitle = `Board task ${Date.now()}`;
  await createWorkspaceTask(page, { projectId: 1, title: taskTitle });

  await openWorkspaceProject(page, 1);
  const overviewTab = page.getByRole('tab', { name: 'ภาพรวม', exact: true });
  const tasksTab = page.getByRole('tab', { name: /^งาน/ });
  const boardTab = page.getByRole('tab', { name: /^บอร์ด/ });
  await overviewTab.click();
  const overviewTask = page.locator('.project-detail-task-row').first();
  const overviewTitle = (await overviewTask.locator('strong').innerText()).trim();
  await overviewTask.click();
  await expect(tasksTab).toHaveAttribute('aria-selected', 'true');
  await expect(getWorkspaceTaskDetail(page).getByRole('heading', { name: overviewTitle })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await getWorkspaceTaskDetail(page).getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();

  await tasksTab.click();
  await expect(page.locator('.project-tasks-panel')).toBeVisible();
  const selectedTaskRow = page.locator('.project-tasks-row').filter({ hasText: taskTitle });
  await selectedTaskRow.click();
  let taskDetail = getWorkspaceTaskDetail(page);
  await expect(taskDetail.getByRole('heading', { name: taskTitle })).toBeVisible();
  await expect(selectedTaskRow).toHaveClass(/selected/);
  const checklistTitle = `Temporary checklist ${Date.now()}`;
  await taskDetail.getByLabel('เพิ่มรายการ Checklist').fill(checklistTitle);
  await taskDetail.getByRole('button', { name: 'เพิ่ม Checklist' }).click();
  const editableItem = taskDetail.locator('.workspace-checklist li').filter({ hasText: checklistTitle });
  await editableItem.getByRole('button', { name: 'แก้ไข' }).click();
  await expect(taskDetail.locator('.workspace-checklist-edit')).toBeVisible();
  const otherTaskRow = page.locator('.project-tasks-row').filter({ hasNotText: taskTitle }).first();
  const otherTaskTitle = await otherTaskRow.getAttribute('aria-label');
  await otherTaskRow.click();
  taskDetail = getWorkspaceTaskDetail(page);
  await expect(taskDetail.getByRole('heading', { name: otherTaskTitle })).toBeVisible();
  await expect(page.locator('.workspace-task-action-panel')).toHaveCount(0);
  await expect(taskDetail.locator('.workspace-checklist-edit')).toHaveCount(0);
  await selectedTaskRow.click();
  taskDetail = getWorkspaceTaskDetail(page);
  await expect(taskDetail.getByRole('heading', { name: taskTitle })).toBeVisible();
  await expect(taskDetail.locator('.workspace-checklist-edit')).toHaveCount(0);
  const bodyOverflow = await page.locator('body').evaluate((element) => element.style.overflow);
  await taskDetail.getByRole('button', { name: 'เปิดหน้าทำงาน' }).click();
  const workPage = page.locator('.workspace-task-work-page');
  await expect(workPage).toBeVisible();
  for (const heading of ['เช็กลิสต์', 'ความคิดเห็น', 'บันทึกเวลาทำงาน', 'ประวัติของงานนี้']) {
    await expect(workPage.getByRole('heading', { name: new RegExp(heading) })).toBeVisible();
  }
  const commentText = `Work page comment ${Date.now()}`;
  await workPage.getByLabel('เขียนความคิดเห็น').fill(commentText);
  await workPage.getByRole('button', { name: 'ส่งความคิดเห็น' }).click();
  await expect(workPage.locator('.workspace-task-comments')).toContainText(commentText);
  const timeNote = `Work page time log ${Date.now()}`;
  await workPage.getByLabel('ชั่วโมง').fill('1.5');
  await workPage.getByLabel('ทำอะไร').fill(timeNote);
  await workPage.getByRole('button', { name: /บันทึกเวลา/ }).click();
  await expect(workPage.locator('.workspace-task-time-list')).toContainText(timeNote);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.locator('body').evaluate((element) => element.style.overflow)).toBe(bodyOverflow);
  await workPage.getByRole('button', { name: 'กลับไปรายการงาน' }).click();
  taskDetail = getWorkspaceTaskDetail(page);
  await expect(taskDetail.getByRole('heading', { name: taskTitle })).toBeVisible();
  await expect(selectedTaskRow).toHaveClass(/selected/);

  await taskDetail.getByRole('button', { name: 'ลบงาน' }).click();
  await expect(page.locator('.workspace-task-action-panel')).toBeVisible();
  const actionSwitchTaskRow = page.locator('.project-tasks-row').filter({ hasNotText: taskTitle }).first();
  const actionSwitchTaskTitle = await actionSwitchTaskRow.getAttribute('aria-label');
  await actionSwitchTaskRow.click();
  taskDetail = getWorkspaceTaskDetail(page);
  await expect(taskDetail.getByRole('heading', { name: actionSwitchTaskTitle })).toBeVisible();
  await expect(page.locator('.workspace-task-action-panel')).toHaveCount(0);
  await selectedTaskRow.click();
  taskDetail = getWorkspaceTaskDetail(page);
  await expect(taskDetail.getByRole('heading', { name: taskTitle })).toBeVisible();
  await taskDetail.getByRole('button', { name: 'เปิดหน้าทำงาน' }).click();
  await expect(page.locator('.workspace-task-comments')).toContainText(commentText);
  await expect(page.locator('.workspace-task-time-list')).toContainText(timeNote);
  await page.locator('.workspace-task-work-toolbar').getByRole('button', { name: 'กลับไปรายการงาน' }).click();

  const reviewTaskRow = page.locator('.project-tasks-row.status-pending_review').first();
  const reviewTaskTitle = await reviewTaskRow.getAttribute('aria-label');
  await reviewTaskRow.click();
  taskDetail = getWorkspaceTaskDetail(page);
  await taskDetail.getByRole('button', { name: 'ถอนจากการตรวจ' }).click();
  await page.locator('#workspace-task-action-reason').fill('Temporary reason state');
  const reasonSwitchTaskRow = page.locator('.project-tasks-row').filter({ hasNotText: reviewTaskTitle }).first();
  await reasonSwitchTaskRow.click();
  await expect(page.locator('.workspace-task-action-panel')).toHaveCount(0);
  await expect(page.locator('#workspace-task-action-reason')).toHaveCount(0);

  await boardTab.click();

  await expect(page.locator('.project-board-reference-note')).toContainText('ลากการ์ดไปวางในคอลัมน์ใหม่เพื่อเปลี่ยนสถานะ');
  const columns = page.locator('.project-board-column');
  await expect(columns).toHaveCount(4);

  const todo = page.locator('.project-board-column[data-status="not_started"]');
  const inProgress = page.locator('.project-board-column[data-status="in_progress"]');
  const review = page.locator('.project-board-column[data-status="pending_review"]');
  const done = page.locator('.project-board-column[data-status="completed"]');
  await expect(todo.getByText('ยังไม่เริ่ม', { exact: true })).toBeVisible();
  await expect(todo.locator('.project-board-count')).toHaveText('3');
  await expect(inProgress.locator('.project-board-count')).toHaveText('2');
  await expect(review.locator('.project-board-count')).toHaveText('1');
  await expect(done.locator('.project-board-count')).toHaveText('3');
  await expect(todo.getByText(taskTitle)).toBeVisible();

  await todo.getByRole('button', { name: `เปิดรายละเอียดงาน ${taskTitle}` }).click();
  await expect(tasksTab).toHaveAttribute('aria-selected', 'true');
  taskDetail = getWorkspaceTaskDetail(page);
  await expect(taskDetail.getByRole('heading', { name: taskTitle })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await taskDetail.getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();
  await expect(page).toHaveURL(/\/projects\/1$/);

  await overviewTab.click();
  await tasksTab.click();
  await boardTab.click();
  await expect(todo.getByText(taskTitle)).toBeVisible();

  await page.getByRole('tab', { name: /^ไทม์ไลน์/ }).click();
  await page.locator('.workspace-reference-timeline-row').filter({ hasText: taskTitle }).getByRole('button', { name: taskTitle }).click();
  await expect(tasksTab).toHaveAttribute('aria-selected', 'true');
  await expect(getWorkspaceTaskDetail(page).getByRole('heading', { name: taskTitle })).toBeVisible();
  await getWorkspaceTaskDetail(page).getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();

  await page.getByRole('link', { name: /โปรเจกต์/ }).first().click();
  await page.locator('.tracking-project-link').filter({ hasText: 'รายงานผลการฝึกงาน Mecha' }).click();
  await page.getByRole('tab', { name: /^บอร์ด/ }).click();
  const secondProjectTasks = page.locator('.project-board-task');
  await expect(page.locator('.project-board-column')).toHaveCount(4);
  await expect(page.locator('.project-board-column-empty')).toHaveCount(4);
  await expect(secondProjectTasks).toHaveCount(0);
});

test('Project Workspace: inline detail matches reference dimensions and wraps at target viewport widths', async ({ page }) => {
  for (const width of [1360, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/PROJECT-MANAGEMENT/projects/1');
    await page.getByRole('tab', { name: /^งาน/ }).click();
    await page.locator('.project-tasks-row').first().click();

    const detail = getWorkspaceTaskDetail(page);
    await expect(detail).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const measurements = await page.evaluate(() => {
      const detailNode = document.querySelector('.workspace-task-detail');
      const listNode = document.querySelector('.project-tasks-main');
      const layoutNode = document.querySelector('.project-tasks-content');
      const style = getComputedStyle(detailNode);
      const rect = detailNode.getBoundingClientRect();
      const listRect = listNode.getBoundingClientRect();
      const cssRules = Array.from(document.styleSheets).flatMap((sheet) => {
        try { return Array.from(sheet.cssRules); } catch (_) { return []; }
      });
      const detailRule = cssRules.find((rule) => rule.selectorText === '.project-detail .workspace-task-detail');
      return {
        flexBasis: style.flexBasis,
        minWidth: style.minWidth,
        boxWidth: rect.width,
        padding: style.padding,
        declaredBorder: detailRule?.style.border || '',
        borderTopWidth: style.borderTopWidth,
        borderTopColor: style.borderTopColor,
        borderRadius: style.borderRadius,
        backgroundColor: style.backgroundColor,
        boxShadow: style.boxShadow,
        display: getComputedStyle(layoutNode).display,
        flexWrap: getComputedStyle(layoutNode).flexWrap,
        gap: getComputedStyle(layoutNode).gap,
        detailX: rect.x,
        detailY: rect.y,
        listX: listRect.x,
        listY: listRect.y,
        listBottom: listRect.bottom,
      };
    });
    expect(measurements.flexBasis).toBe('430px');
    expect(measurements.minWidth).toBe('300px');
    expect(measurements.boxWidth).toBe(width === 390 ? 346 : 476);
    expect(measurements.padding).toBe('22px');
    expect(measurements.declaredBorder).toMatch(/^1\.5px solid/);
    expect(measurements.borderTopWidth).toBe('1px');
    expect(measurements.borderTopColor).toBe('rgb(47, 91, 208)');
    expect(measurements.borderRadius).toBe('20px');
    expect(measurements.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(measurements.boxShadow).toContain('rgba(47, 91, 208, 0.2) 0px 18px 44px');
    expect(measurements.display).toBe('flex');
    expect(measurements.flexWrap).toBe('wrap');
    expect(measurements.gap).toBe('16px');
    if (width === 1360) {
      expect(Math.abs(measurements.detailY - measurements.listY)).toBeLessThanOrEqual(1);
      expect(measurements.detailX).toBeGreaterThan(measurements.listX);
    } else {
      expect(measurements.detailY).toBeGreaterThanOrEqual(measurements.listBottom);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `/tmp/mecha-task-detail-${width}.png`, fullPage: true });

    await detail.getByRole('button', { name: 'เปิดหน้าทำงาน' }).click();
    const workPage = page.locator('.workspace-task-work-page');
    await expect(workPage).toBeVisible();
    await expect(workPage.getByRole('heading', { name: /เช็กลิสต์/ })).toBeVisible();
    await expect(workPage.getByRole('heading', { name: /ความคิดเห็น/ })).toBeVisible();
    await expect(workPage.getByRole('heading', { name: 'บันทึกเวลาทำงาน' })).toBeVisible();
    await expect(workPage.getByRole('heading', { name: 'ประวัติของงานนี้' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `/tmp/mecha-task-work-page-${width}.png`, fullPage: true });
  }
});

test('Task Detail remains a Bootstrap Modal on the general Tasks page', async ({ page }) => {
  const title = `General Task Modal ${Date.now()}`;
  await createWorkspaceTask(page, { projectId: 1, title });
  await page.locator('.project-detail-breadcrumb a').click();
  await page.getByRole('link', { name: 'ตารางงาน', exact: true }).first().click();
  const taskRow = page.locator('.task-table tbody tr').filter({ hasText: title });
  await expect(taskRow).toBeVisible();
  await taskRow.locator('button[title="ดูรายละเอียด"]').click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(title);
  await expect(dialog.locator('.modal-body')).toBeVisible();
  await expect(page.locator('.workspace-task-detail')).toHaveCount(0);
  await dialog.locator('.btn-close').click();
  await expect(dialog).toHaveCount(0);
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
  await expect(dialog.getByLabel('เลือก Project Owner')).toBeDisabled();
  await dialog.getByRole('button', { name: 'ถัดไป' }).click();
  await dialog.getByRole('button', { name: 'บันทึก' }).click();
  await expect(dialog).not.toBeVisible();

  await page.locator('.tracking-project-link').filter({ hasText: projectName }).click();
  await page.getByRole('tab', { name: /^บอร์ด/ }).click();
  await expect(page.locator('.project-board-column')).toHaveCount(4);
  await expect(page.locator('.project-board-column-empty')).toHaveCount(4);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${PROJECT_URL}/3`);
  await page.getByRole('tab', { name: /^บอร์ด/ }).click();
  await expect(page.locator('.project-board-column')).toHaveCount(4);
  await expect(page.locator('.project-board-column-empty')).toHaveCount(4);
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

test('Project Workspace: reference text colors and interface contrast targets', async ({ page }) => {
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

  await createWorkspaceTask(page, { title: `Contrast task ${Date.now()}` });
  await page.getByRole('tab', { name: 'ภาพรวม', exact: true }).click();
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
    { selector: '.project-detail-kpi h2' },
    { selector: '.project-detail-kpi-subtitle' },
    { selector: '.project-detail-status-legend > span' },
    { selector: '.project-detail-task-row > strong' },
    { selector: '.project-detail-task-status' },
    { selector: '.project-detail-information dt' },
    { selector: '.project-detail-information dd' },
  ]);
  await expect(page.locator('.project-detail-status-legend i').first()).toHaveCSS('background-color', 'rgb(148, 163, 184)');
  const activeTabStyle = await page.locator('.project-detail-navigation .project-detail-nav-button.active').evaluate((element) => ({
    foreground: getComputedStyle(element).color,
    backgroundImage: getComputedStyle(element).backgroundImage,
  }));
  const activeTabGradientStops = activeTabStyle.backgroundImage.match(/rgb\([^)]+\)/g) || [];
  expect(activeTabGradientStops.length).toBeGreaterThanOrEqual(2);
  const activeTabGradientContrast = activeTabGradientStops.map((background) => contrastRatio(activeTabStyle.foreground, background));
  expect(Math.min(...activeTabGradientContrast)).toBeGreaterThanOrEqual(4.5);
  const statusSegmentColors = await page.locator('.project-detail-status-bar span').evaluateAll((segments) => (
    segments.map((segment) => getComputedStyle(segment).backgroundColor)
  ));
  expect(statusSegmentColors).toContain('rgb(148, 163, 184)');

  await page.getByRole('tab', { name: /^งาน/ }).click();
  await expect(page.locator('.project-detail-nav-button.active')).toHaveCSS('background-image', /linear-gradient/);
  const taskPairs = await assertReadable([
    { selector: '.project-tasks-row' },
    { selector: '.project-tasks-title-button' },
    { selector: '.project-tasks-status' },
  ]);

  const taskFilterPairs = await assertReadable([
    { selector: '.project-tasks-status-filter' },
  ]);
  await page.locator('.project-tasks-row').first().click();
  const taskDetailPairs = await assertReadable([
    { selector: '.workspace-task-detail h2' },
    { selector: '.workspace-task-detail .task-detail-status' },
    { selector: '.workspace-task-detail-description' },
    { selector: '.workspace-task-detail .workspace-task-actions .btn' },
  ]);
  const taskDetailCloseButton = page.getByRole('button', { name: 'ปิดรายละเอียดงาน' });
  await taskDetailCloseButton.hover();
  await expect(taskDetailCloseButton).toHaveCSS('background-color', 'rgb(241, 245, 249)');
  await expect(taskDetailCloseButton).toHaveCSS('color', 'rgb(15, 23, 42)');
  const taskDetailHoverPairs = await assertReadable([
    { selector: '.workspace-task-detail-close' },
  ]);
  await taskDetailCloseButton.click();

  await page.getByRole('tab', { name: /^บอร์ด/ }).click();
  await page.locator('.project-board-task').first().hover();
  const boardPairs = await assertReadable([
    { selector: '.project-board-column-heading strong' },
    { selector: '.project-board-count' },
    { selector: '.project-board-task-title' },
    { selector: '.project-board-assignee' },
    { selector: '.project-board-due-date' },
  ]);
  const boardStatusSegmentColor = await page.locator('.project-board-column.status-not_started').evaluate((column) => (
    getComputedStyle(column).borderTopColor
  ));
  expect(boardStatusSegmentColor).toBe('rgb(148, 163, 184)');
  await page.locator('.project-board-task').first().click();
  const boardTaskDetailPairs = await assertReadable([
    { selector: '.workspace-task-detail .task-detail-status' },
    { selector: '.workspace-task-detail .workspace-task-detail-meta dd' },
  ]);
  await getWorkspaceTaskDetail(page).getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();

  await page.getByRole('link', { name: /โปรเจกต์/ }).first().click();
  const projectName = `Contrast Empty State Project ${Date.now()}`;
  const addDialog = await openAddModal(page);
  await addDialog.locator('input[placeholder*="ระบุชื่อโปรเจกต์"]').first().fill(projectName);
  await addDialog.getByRole('button', { name: 'ถัดไป' }).click();
  await expect(addDialog.getByLabel('เลือก Project Owner')).toBeDisabled();
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
    { selector: '.project-board-column-heading strong' },
  ]);
  await expect(page.locator('.project-board-column-empty').first()).toHaveCSS('color', 'rgb(100, 116, 139)');

  console.log('Project Workspace contrast ratios:', JSON.stringify({
    overview: overviewPairs,
    activeTabGradient: activeTabGradientContrast.map((ratio) => Number(ratio.toFixed(2))),
    statusSegmentColors,
    tasks: {
      text: taskPairs,
      filters: taskFilterPairs,
    },
    taskDetail: taskDetailPairs,
    taskDetailHover: taskDetailHoverPairs,
    board: boardPairs,
    boardStatusSegmentColor,
    boardTaskDetail: boardTaskDetailPairs,
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
  await taskRow.click();
  const detailDialog = getWorkspaceTaskDetail(page);
  const checklistTitle = `ตรวจสอบ workflow ${Date.now()}`;
  await detailDialog.getByLabel('เพิ่มรายการ Checklist').fill(checklistTitle);
  await detailDialog.getByRole('button', { name: 'เพิ่ม Checklist' }).click();
  const checklistItem = detailDialog.locator('.workspace-checklist li').filter({ hasText: checklistTitle });
  await checklistItem.getByRole('checkbox').check();
  await expect(detailDialog.locator('.task-detail-status')).toContainText('รอเริ่มทำ');

  await detailDialog.getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-002');
  await taskRow.click();
  const otherMemberDialog = getWorkspaceTaskDetail(page);
  await expect(otherMemberDialog.locator('.workspace-checklist-actions')).toHaveCount(0);
  await expect(otherMemberDialog.locator('.workspace-checklist li input[type="checkbox"]')).toBeDisabled();
  await otherMemberDialog.getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();

  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-008');
  await taskRow.click();
  const ownerDialog = getWorkspaceTaskDetail(page);
  const editableChecklistItem = ownerDialog.locator('.workspace-checklist li').first();
  await editableChecklistItem.getByRole('button', { name: 'แก้ไข' }).click();
  await editableChecklistItem.getByRole('textbox').fill(`${checklistTitle} · Owner edit`);
  await editableChecklistItem.getByRole('button', { name: 'บันทึก' }).click();
  await expect(ownerDialog.locator('.workspace-checklist')).toContainText('Owner edit');
  await ownerDialog.getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();

  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-001');
  await taskRow.click();
  const submitDialog = getWorkspaceTaskDetail(page);
  await submitDialog.getByRole('button', { name: 'เริ่มงาน' }).click();
  await confirmWorkspaceTaskAction(page);
  await expect(submitDialog.getByRole('button', { name: 'ส่งตรวจ' })).toBeVisible();
  await submitDialog.getByRole('button', { name: 'ส่งตรวจ' }).click();
  await confirmWorkspaceTaskAction(page);
  await expect(submitDialog.getByText(/ล็อกระหว่างรอตรวจ/)).toBeVisible();
  await expect(submitDialog.getByRole('button', { name: 'แก้ไขงาน' })).toHaveCount(0);
  await submitDialog.getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();

  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-009');
  await taskRow.click();
  const reviewerDialog = getWorkspaceTaskDetail(page);
  await reviewerDialog.getByRole('button', { name: 'อนุมัติ' }).click();
  await confirmWorkspaceTaskAction(page);
  await expect(reviewerDialog.locator('.task-detail-status')).toContainText('เสร็จสิ้น');
  await reviewerDialog.getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();

  await page.getByRole('tab', { name: /^ประวัติ/ }).click();
  await expect(page.locator('.workspace-reference-activity-list')).toContainText('อนุมัติงาน');
});

test('Project Workspace: request changes and withdrawal require reasons and return Tasks to In Progress', async ({ page }) => {
  const title = `Review changes task ${Date.now()}`;
  await addWorkspaceMember(page, 1, 'emp-001');
  await createWorkspaceTask(page, { title, assigneeId: 'emp-001', reviewerId: 'emp-009' });
  await openWorkspaceProject(page, 1);
  await page.getByRole('tab', { name: /^งาน/ }).click();
  const taskRow = page.locator('.project-tasks-row').filter({ hasText: title });
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-001');
  await taskRow.click();
  let detailDialog = getWorkspaceTaskDetail(page);
  await detailDialog.getByRole('button', { name: 'เริ่มงาน' }).click();
  await confirmWorkspaceTaskAction(page);
  await detailDialog.getByRole('button', { name: 'ส่งตรวจ' }).click();
  await confirmWorkspaceTaskAction(page);
  await detailDialog.getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();

  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-009');
  await taskRow.click();
  detailDialog = getWorkspaceTaskDetail(page);
  const requestChanges = detailDialog.getByRole('button', { name: 'ขอแก้ไข' });
  await requestChanges.click();
  await getWorkspaceTaskAction(page).getByLabel(/เหตุผล/).fill('ขอแนบผลทดสอบเพิ่ม');
  await confirmWorkspaceTaskAction(page);
  await expect(detailDialog.locator('.task-detail-status')).toContainText('กำลังดำเนินการ');
  await detailDialog.getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();

  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-001');
  await taskRow.click();
  detailDialog = getWorkspaceTaskDetail(page);
  await detailDialog.getByRole('button', { name: 'ส่งตรวจ' }).click();
  await confirmWorkspaceTaskAction(page);
  await detailDialog.getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();

  await taskRow.click();
  detailDialog = getWorkspaceTaskDetail(page);
  const withdraw = detailDialog.getByRole('button', { name: 'ถอนจากการตรวจ' });
  await withdraw.click();
  await getWorkspaceTaskAction(page).getByLabel(/เหตุผล/).fill('ต้องปรับข้อมูลก่อนตรวจอีกครั้ง');
  await confirmWorkspaceTaskAction(page);
  await expect(detailDialog.locator('.task-detail-status')).toContainText('กำลังดำเนินการ');

  await detailDialog.getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();
  await page.getByRole('tab', { name: /^ประวัติ/ }).click();
  await expect(page.locator('.workspace-reference-activity-list')).toContainText('ขอแนบผลทดสอบเพิ่ม');
  await expect(page.locator('.workspace-reference-activity-list')).toContainText('ต้องปรับข้อมูลก่อนตรวจอีกครั้ง');
});

test('Project Workspace: Team, Deliverables, Timeline and Activity share project records', async ({ page }) => {
  const deliverableTitle = `Deliverable ${Date.now()}`;
  await page.goto(`${PROJECT_URL}/3`);
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-008');
  await page.getByRole('tab', { name: /^ทีม/ }).click();
  const memberSelect = page.getByLabel('เลือกสมาชิกเพื่อเพิ่ม');
  await memberSelect.selectOption({ index: 1 });
  const memberName = (await memberSelect.locator('option:checked').textContent()).trim().split(' — ')[0];
  const addReason = page.getByLabel('เหตุผลการเพิ่มสมาชิก');
  if (await addReason.count()) await addReason.fill('เพิ่มสมาชิกเพื่อทดสอบ Workspace');
  await page.getByRole('button', { name: 'เพิ่มเข้าทีม' }).click();
  await expect(page.locator('.workspace-member-row').filter({ hasText: memberName })).toBeVisible();

  await page.getByRole('tab', { name: /^สิ่งที่ส่งมอบ/ }).click();
  await page.getByLabel('ชื่อ/รายละเอียด').fill(deliverableTitle);
  await page.getByRole('button', { name: 'เพิ่ม', exact: true }).click();
  await expect(page.locator('.workspace-deliverable-row').filter({ hasText: deliverableTitle })).toBeVisible();
  await page.locator('.workspace-deliverable-row').filter({ hasText: deliverableTitle })
    .getByRole('button', { name: 'ทำเครื่องหมายส่งมอบแล้ว' }).click();

  const timelineTaskTitle = `Timeline task ${Date.now()}`;
  await createWorkspaceTask(page, { projectId: 3, title: timelineTaskTitle });
  await page.getByRole('tab', { name: /^ไทม์ไลน์/ }).click();
  await expect(page.locator('.workspace-reference-timeline-row').filter({ hasText: timelineTaskTitle })).toBeVisible();
  await page.getByRole('tab', { name: /^สิ่งที่ส่งมอบ/ }).click();
  await expect(page.locator('.workspace-deliverable-row').filter({ hasText: deliverableTitle }))
    .toContainText('ส่งมอบแล้ว');
  await page.getByRole('tab', { name: /^ประวัติ/ }).click();
  await expect(page.locator('.workspace-reference-activity-list')).toContainText(deliverableTitle);
  await expect(page.locator('.workspace-reference-activity-list')).toContainText(memberName);
});

test('Project Workspace: reassignment requires a reason and updates the shared Task record', async ({ page }) => {
  const title = `Reassignment task ${Date.now()}`;
  await addWorkspaceMember(page, 3, 'emp-001');
  await addWorkspaceMember(page, 3, 'emp-009');
  await createWorkspaceTask(page, {
    projectId: 3,
    title,
    assigneeId: 'emp-001',
    reviewerId: 'emp-002',
    collaborators: ['emp-009'],
    plannedHours: 12,
    allocationHours: { 'emp-001': 6, 'emp-009': 6 },
  });
  await openWorkspaceProject(page, 3);
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-008');
  await page.getByRole('tab', { name: /^งาน/ }).click();
  const taskRow = page.locator('.project-tasks-row').filter({ hasText: title });
  await taskRow.click();

  const detail = getWorkspaceTaskDetail(page);
  await detail.getByRole('button', { name: 'เปลี่ยนผู้รับผิดชอบ' }).click();
  const action = getWorkspaceTaskAction(page);
  await action.getByLabel('ผู้รับผิดชอบใหม่').selectOption('emp-009');
  await action.getByLabel(/เหตุผล/).fill('ปรับสมดุลภาระงาน');
  await confirmWorkspaceTaskAction(page);
  await expect(detail.locator('.workspace-task-detail-meta dd').first()).toContainText('Korn Tawonphon');
  await expect(detail.locator('.workspace-task-detail-meta dd').nth(1)).toHaveText('ไม่มี');
  await detail.getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();

  await page.getByRole('tab', { name: /^ประวัติ/ }).click();
  await expect(page.locator('.workspace-reference-activity-list')).toContainText('ปรับสมดุลภาระงาน');
  await expect(page.locator('.workspace-reference-activity-list')).toContainText('เปลี่ยนผู้รับผิดชอบ');
});

test('Project Workspace: editing and deleting planned hours keeps Workload in sync', async ({ page }) => {
  const title = `Planned allocation lifecycle ${Date.now()}`;
  await addWorkspaceMember(page, 3, 'emp-001');
  await addWorkspaceMember(page, 3, 'emp-009');
  await createWorkspaceTask(page, {
    projectId: 3,
    title,
    assigneeId: 'emp-001',
    reviewerId: 'emp-002',
    collaborators: ['emp-009'],
    plannedHours: 12,
    allocationHours: { 'emp-001': 6, 'emp-009': 6 },
  });

  await openWorkspaceProject(page, 3);
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-008');
  await page.getByRole('tab', { name: /^งาน/ }).click();
  const taskRow = page.locator('.project-tasks-row').filter({ hasText: title });
  await taskRow.click();
  await getWorkspaceTaskDetail(page).getByRole('button', { name: 'แก้ไขงาน' }).click();

  const editDialog = page.getByRole('dialog').last();
  await editDialog.locator('#workspace-task-hours').fill('14');
  await editDialog.getByLabel('ชั่วโมงที่วางแผนสำหรับ Kittipat Samran').fill('7');
  await editDialog.getByLabel('ชั่วโมงที่วางแผนสำหรับ Korn Tawonphon').fill('7');
  await editDialog.getByRole('button', { name: 'บันทึกงาน' }).click();

  await taskRow.click();
  const detail = getWorkspaceTaskDetail(page);
  await detail.getByRole('button', { name: 'ลบงาน' }).click();
  await confirmWorkspaceTaskAction(page);
  await expect(taskRow).toHaveCount(0);

  await page.goto('/PROJECT-MANAGEMENT/workload');
  const plannedWorkload = page.locator('.workload-kpi').filter({ hasText: 'Planned Workload' });
  await expect(plannedWorkload.locator('.workload-kpi-value')).toHaveText('0 ชม.');
});

test('Project Workspace: creating and deleting a Task updates the same Board and Activity records', async ({ page }) => {
  const title = `Workspace CRUD Task ${Date.now()}`;
  await page.goto(`${PROJECT_URL}/1`);
  await addWorkspaceMember(page, 1, 'emp-001');
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-008');
  await page.getByRole('tab', { name: /^งาน/ }).click();
  await page.getByRole('button', { name: 'เพิ่มงาน', exact: true }).click();
  const formDialog = page.getByRole('dialog').last();
  await formDialog.locator('#workspace-task-title').fill(title);
  await formDialog.locator('#workspace-task-category').fill('Workspace');
  await formDialog.locator('#workspace-task-assignee').selectOption('emp-008');
  await formDialog.locator('#workspace-task-reviewer').selectOption('emp-001');
  await formDialog.locator('#workspace-task-due').fill('2026-12-20');
  await formDialog.getByRole('button', { name: 'สร้างงาน' }).click();
  await expect(page.locator('.project-tasks-row').filter({ hasText: title })).toBeVisible();

  await page.getByRole('tab', { name: /^บอร์ด/ }).click();
  const toDoColumn = page.locator('.project-board-column[data-status="not_started"]');
  const taskCard = toDoColumn.getByRole('button', { name: `เปิดรายละเอียดงาน ${title}` });
  await expect(taskCard).toBeVisible();
  await taskCard.click();
  const taskDetail = getWorkspaceTaskDetail(page);
  await taskDetail.getByRole('button', { name: 'ลบงาน' }).click();
  await confirmWorkspaceTaskAction(page);
  await expect(page.locator('.project-board-task').filter({ hasText: title })).toHaveCount(0);
  await page.getByRole('tab', { name: /^งาน/ }).click();
  await expect(page.locator('.project-tasks-row').filter({ hasText: title })).toHaveCount(0);
  await page.getByRole('tab', { name: /^ประวัติ/ }).click();
  await expect(page.locator('.workspace-reference-activity-list')).toContainText(title);
});

test('Project Workspace: removing a member reassigns outstanding primary Tasks first', async ({ page }) => {
  const title = `Member removal task ${Date.now()}`;
  await addWorkspaceMember(page, 3, 'emp-001');
  await addWorkspaceMember(page, 3, 'emp-009');
  await createWorkspaceTask(page, { projectId: 3, title, assigneeId: 'emp-001', reviewerId: 'emp-002' });
  await openWorkspaceProject(page, 3);
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-008');
  await page.getByRole('tab', { name: /^ทีม/ }).click();

  const memberRow = page.locator('.workspace-member-row').filter({ hasText: 'Kittipat Samran' });
  await memberRow.getByRole('button', { name: 'นำ Kittipat Samran ออกจากทีม' }).click();

  const removeDialog = page.getByRole('dialog').last();
  await expect(removeDialog.getByRole('alert')).toContainText('ต้องมอบหมายใหม่ก่อน');
  await removeDialog.locator('#member-replacement').selectOption('emp-009');
  await removeDialog.getByLabel('เหตุผลการนำสมาชิกออก').fill('สมาชิกออกจากโปรเจกต์');
  await removeDialog.getByRole('button', { name: 'ยืนยันนำออก' }).click();
  await expect(memberRow).toHaveCount(0);

  await page.getByRole('tab', { name: /^งาน/ }).click();
  await expect(page.locator('.project-tasks-row').filter({ hasText: title })).toContainText('Korn Tawonphon');
  await page.getByRole('tab', { name: /^ประวัติ/ }).click();
  await expect(page.locator('.workspace-reference-activity-list')).toContainText('สมาชิกออกจากโปรเจกต์');
});

test('Project Workspace: member removal promotes an existing collaborator without duplicate assignment', async ({ page }) => {
  const title = `Member removal collaborator ${Date.now()}`;
  await addWorkspaceMember(page, 3, 'emp-001');
  await addWorkspaceMember(page, 3, 'emp-009');
  await createWorkspaceTask(page, {
    projectId: 3,
    title,
    assigneeId: 'emp-001',
    reviewerId: 'emp-002',
    collaborators: ['emp-009'],
    plannedHours: 8,
    allocationHours: { 'emp-001': 4, 'emp-009': 4 },
  });
  await openWorkspaceProject(page, 3);
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-008');
  await page.getByRole('tab', { name: /^ทีม/ }).click();

  const memberRow = page.locator('.workspace-member-row').filter({ hasText: 'Kittipat Samran' });
  await memberRow.getByRole('button', { name: 'นำ Kittipat Samran ออกจากทีม' }).click();
  const removeDialog = page.getByRole('dialog').last();
  await removeDialog.locator('#member-replacement').selectOption('emp-009');
  await removeDialog.getByLabel('เหตุผลการนำสมาชิกออก').fill('โอนงานให้ผู้ร่วมงานเดิม');
  await removeDialog.getByRole('button', { name: 'ยืนยันนำออก' }).click();
  await expect(memberRow).toHaveCount(0);

  await page.getByRole('tab', { name: /^งาน/ }).click();
  const taskRow = page.locator('.project-tasks-row').filter({ hasText: title });
  await expect(taskRow).toContainText('Korn Tawonphon');
  await taskRow.click();
  const detail = getWorkspaceTaskDetail(page);
  await expect(detail.locator('.workspace-task-detail-meta')).toContainText('ผู้ร่วมงาน');
  await expect(detail.locator('.workspace-task-detail-meta dd').first()).toContainText('Korn Tawonphon');
  await expect(detail.locator('.workspace-task-detail-meta dd').nth(1)).toHaveText('ไม่มี');
});

test('Project Workspace: Project Closure requires Owner review, Team Leader approval, then Owner closure', async ({ page }) => {
  const projectName = `Closure Workflow ${Date.now()}`;
  const addDialog = await openAddModal(page);
  await addDialog.locator('input[placeholder*="ระบุชื่อโปรเจกต์"]').first().fill(projectName);
  await addDialog.getByRole('button', { name: 'ถัดไป' }).click();
  const ownerSelect = addDialog.getByLabel('เลือก Project Owner');
  await expect(ownerSelect).toBeDisabled();
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
  await page.getByLabel('เหตุผลการเปลี่ยน Team Leader').fill('กำหนดผู้อนุมัติการปิดโปรเจกต์');
  await page.getByRole('dialog').last().getByRole('button', { name: 'ยืนยัน' }).click();
  await page.getByRole('tab', { name: /^ภาพรวม/ }).click();

  const closure = page.locator('.workspace-closure');
  await expect(closure.getByRole('button', { name: 'ส่งขออนุมัติ' })).toBeDisabled();
  await expect(closure.locator('.project-detail-closure-copy').first()).toContainText('เสร็จ 0/0 งาน');
  await createWorkspaceTask(page, {
    projectId,
    title: `Closure task ${Date.now()}`,
    assigneeId: ownerId,
    reviewerId: leaderId,
    actorId: ownerId,
  });
  const taskRow = page.locator('.project-tasks-row').first();
  await taskRow.click();
  let taskDetail = getWorkspaceTaskDetail(page);
  await taskDetail.getByRole('button', { name: 'เริ่มงาน' }).click();
  await confirmWorkspaceTaskAction(page);
  await taskDetail.getByRole('button', { name: 'ส่งตรวจ' }).click();
  await confirmWorkspaceTaskAction(page);
  await taskDetail.getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption(leaderId);
  await taskRow.click();
  taskDetail = getWorkspaceTaskDetail(page);
  await taskDetail.getByRole('button', { name: 'อนุมัติ' }).click();
  await confirmWorkspaceTaskAction(page);
  await taskDetail.getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();
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
  await expect(page.locator('.workspace-reference-activity-list')).toContainText('ปิดโปรเจกต์');
});
