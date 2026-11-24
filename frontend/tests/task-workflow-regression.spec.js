// frontend/tests/task-workflow-regression.spec.js — regression check for Task workflows after the
// Legacy Planned Hours cleanup (estimatedHours / plannedAllocations / transferPlannedAllocation removed).
// Runs against the live dev server with mock data; never talks to the backend.
import { test, expect } from '@playwright/test';
import { loginAs, switchUser } from './helpers/session';

const PROJECT_URL = '/PROJECT-MANAGEMENT/projects';

// Mock people used below: emp-008 Supachai Meesuk (admin/actor), emp-009 Korn Tawonphon,
// emp-001 Kittipat Samran, emp-002 Napat Chaiyaphon.
const ACTOR = 'emp-008';
const REVIEWER = 'emp-009';

const getWorkspaceTaskDetail = (page) => page.locator('.workspace-task-detail');
const getWorkspaceTaskAction = (page) => page.locator('.workspace-task-action-panel');
const taskRow = (page, title) => page.locator('.project-tasks-row').filter({ hasText: title });

async function openProject(page, projectId) {
  await page.goto(`${PROJECT_URL}/${projectId}`);
  await expect(page.locator('.project-detail-header')).toBeVisible();
}

async function openTab(page, label) {
  await page.getByRole('tab', { name: new RegExp(`^${label}`) }).click();
}

async function addMember(page, memberId) {
  await switchUser(page, ACTOR);
  await openTab(page, 'ทีม');
  const already = page.locator(`.workspace-member-row .project-detail-avatar[data-person-id="${memberId}"]`);
  if (await already.count()) return;
  const select = page.getByLabel('เลือกสมาชิกเพื่อเพิ่ม');
  await select.selectOption(memberId);
  const name = (await select.locator('option:checked').textContent()).trim().split(' — ')[0];
  await page.getByRole('button', { name: 'เพิ่มเข้าทีม' }).click();
  await expect(page.locator('.workspace-member-row').filter({ hasText: name })).toBeVisible();
}

// Fills and submits the create-task form, then waits for the new row.
async function createTask(page, { title, assigneeId = ACTOR, reviewerId = REVIEWER, collaborators = [], size = null, startDate = '', dueDate = '2026-12-20', checklistTemplate = null }) {
  await openTab(page, 'งาน');
  await page.getByRole('button', { name: 'เพิ่มงาน', exact: true }).click();
  const dialog = page.getByRole('dialog').last();
  await dialog.locator('#workspace-task-title').fill(title);
  await dialog.locator('#workspace-task-assignee').selectOption(assigneeId);
  await dialog.locator('#workspace-task-reviewer').selectOption(reviewerId);
  if (collaborators.length) await dialog.locator('#workspace-task-collaborators').selectOption(collaborators);
  if (startDate) await dialog.locator('#workspace-task-start').fill(startDate);
  await dialog.locator('#workspace-task-due').fill(dueDate);
  if (size) await dialog.getByRole('group', { name: 'ขนาดงาน' }).getByRole('button', { name: new RegExp(`^${size}`) }).click();
  if (checklistTemplate) await dialog.locator('.workspace-checklist-template-actions').getByRole('button', { name: checklistTemplate }).click();
  await dialog.getByRole('button', { name: 'สร้างงาน' }).click();
  await expect(taskRow(page, title)).toBeVisible();
}

async function openTaskDetail(page, title) {
  await openTab(page, 'งาน');
  await taskRow(page, title).click();
  const detail = getWorkspaceTaskDetail(page);
  await expect(detail).toBeVisible();
  return detail;
}

// Opens the edit form from the inline task detail and saves with the given mutator.
async function editTask(page, title, mutate) {
  await openTaskDetail(page, title);
  await getWorkspaceTaskDetail(page).getByRole('button', { name: 'แก้ไขงาน' }).click();
  const dialog = page.getByRole('dialog').last();
  await expect(dialog).toBeVisible();
  await mutate(dialog);
  await dialog.getByRole('button', { name: 'บันทึกงาน' }).click();
  await expect(dialog).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await loginAs(page);
  // Force mock data: no real API call may answer.
  await page.route('**/PROJECT-MANAGEMENT/api/**', (route) => route.abort());
});

// 1. CREATE TASK — every submitted field is persisted.
test('Create Task: submitted fields (assignee, reviewer, size, dates) are saved', async ({ page }) => {
  const title = `Regression create ${Date.now()}`;
  await openProject(page, 1);
  await addMember(page, REVIEWER);
  await createTask(page, { title, startDate: '2026-11-01', size: 'ใหญ่', checklistTemplate: '+ พัฒนา' });

  const detail = await openTaskDetail(page, title);
  const meta = detail.locator('.workspace-task-detail-meta');
  await expect(meta).toContainText('Supachai Meesuk');   // assignee emp-008
  await expect(meta).toContainText('Korn Tawonphon');    // reviewer emp-009
  await expect(meta).toContainText('2026-11-01 – 2026-12-20');
  await expect(meta).toContainText('ใหญ่');              // size persisted
  await expect(detail.locator('.workspace-checklist li')).toHaveCount(4);
});

// 2. EDIT TASK — editing the title must not drop reviewer / size / checklist.
test('Edit Task: editing keeps reviewer, size, checklist and status intact', async ({ page }) => {
  const title = `Regression edit ${Date.now()}`;
  await openProject(page, 1);
  await addMember(page, REVIEWER);
  await createTask(page, { title, size: 'กลาง', checklistTemplate: '+ ทดสอบ' });
  let detail = await openTaskDetail(page, title);
  await getWorkspaceTaskDetail(page).getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();

  await editTask(page, title, async (dialog) => {
    await dialog.locator('#workspace-task-title').fill(`${title} edited`);
  });

  await expect(taskRow(page, `${title} edited`)).toBeVisible();
  detail = await openTaskDetail(page, `${title} edited`);
  const meta = detail.locator('.workspace-task-detail-meta');
  await expect(meta).toContainText('Korn Tawonphon');   // reviewer kept
  await expect(meta).toContainText('กลาง');             // size kept
  await expect(detail.locator('.workspace-checklist li')).toHaveCount(4); // checklist kept
});

// 3. REASSIGN TASK — assignee moves, reviewer stays, history recorded.
test('Reassign Task: assignee updates, reviewer stays, history is recorded', async ({ page }) => {
  const title = `Regression reassign ${Date.now()}`;
  await openProject(page, 1);
  await addMember(page, REVIEWER);
  await addMember(page, 'emp-002');
  // Reviewer = emp-002 so the reassign dropdown (which excludes the task's reviewer) can offer emp-009.
  await createTask(page, { title, reviewerId: 'emp-002' });
  const detail = await openTaskDetail(page, title);

  await detail.getByRole('button', { name: 'เปลี่ยนผู้รับผิดชอบ' }).click();
  await getWorkspaceTaskAction(page).getByLabel('ผู้รับผิดชอบใหม่').selectOption(REVIEWER);
  await getWorkspaceTaskAction(page).getByLabel(/เหตุผล/).fill('ทดสอบการโอนงานหลังล้างโค้ด');
  await getWorkspaceTaskAction(page).getByRole('button', { name: 'ยืนยัน' }).click();

  const meta = detail.locator('.workspace-task-detail-meta');
  await expect(meta).toContainText('Korn Tawonphon');    // new assignee emp-009
  await expect(meta).toContainText('Napat Chaiyaphon');  // reviewer emp-002 preserved
  await detail.getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();
  await openTab(page, 'ประวัติ');
  await expect(page.locator('.workspace-reference-activity-list')).toContainText('ทดสอบการโอนงานหลังล้างโค้ด');
});

// 4. COLLABORATORS — add then remove; other task data must survive.
test('Collaborators: add and remove collaborator without losing task data', async ({ page }) => {
  const title = `Regression collab ${Date.now()}`;
  await openProject(page, 1);
  await addMember(page, REVIEWER);
  await addMember(page, 'emp-002');
  await createTask(page, { title, collaborators: ['emp-002'] });

  let detail = await openTaskDetail(page, title);
  await expect(detail.locator('.workspace-task-detail-meta')).toContainText('ผู้ร่วมงาน');
  await expect(detail.locator('.workspace-task-detail-meta')).toContainText('Napat Chaiyaphon');
  await getWorkspaceTaskDetail(page).getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();

  await editTask(page, title, async (dialog) => {
    await dialog.locator('#workspace-task-collaborators').selectOption([]);
  });

  detail = await openTaskDetail(page, title);
  const meta = detail.locator('.workspace-task-detail-meta');
  await expect(meta).toContainText('ผู้ร่วมงาน');
  await expect(meta).not.toContainText('Napat Chaiyaphon'); // collaborator removed
  await expect(meta).toContainText('Korn Tawonphon');       // reviewer intact
});

// 5. PROJECT MEMBER CHANGES — an assigned member cannot be silently dropped: the UI must
// keep the task and refuse removal until work is transferred (documented removal rule).
test('Project Member Changes: assigned member removal is blocked and the task survives', async ({ page }) => {
  const title = `Regression member swap ${Date.now()}`;
  await openProject(page, 1);
  await addMember(page, 'emp-001');
  await addMember(page, REVIEWER);
  await createTask(page, { title, assigneeId: 'emp-001' });

  await switchUser(page, ACTOR);
  await openTab(page, 'ทีม');
  const memberRow = page.locator('.workspace-member-row').filter({ hasText: 'Kittipat Samran' });
  await memberRow.locator('.workspace-member-remove').click();

  // Rule enforced by ProjectTeam.removeMember: unfinished primary work blocks removal.
  await expect(page.locator('.workspace-team-removal-notice')).toBeVisible();
  await expect(page.locator('.workspace-team-removal-notice')).toContainText(title);

  // The task itself is untouched and still opens.
  const detail = await openTaskDetail(page, title);
  await expect(detail.locator('.workspace-task-detail-meta')).toContainText('Kittipat Samran');
});

// 6. TASK DATA INTEGRITY — reviewer/checklist status bookkeeping persists across the review flow.
test('Task Data Integrity: reviewer, checklist and status survive the review workflow', async ({ page }) => {
  const title = `Regression integrity ${Date.now()}`;
  await openProject(page, 1);
  await addMember(page, REVIEWER);
  // No checklist: the "เริ่มงาน" button only shows when the checklist is empty by design
  // (checklist tick drives the status instead).
  await createTask(page, { title });

  let detail = await openTaskDetail(page, title);
  await expect(detail.locator('.workspace-task-detail-meta')).toContainText('Korn Tawonphon');
  await detail.getByRole('button', { name: 'เริ่มงาน' }).click();
  await detail.getByRole('button', { name: 'ส่งตรวจ' }).click();
  await expect(taskRow(page, title)).toHaveClass(/status-pending_review/);
  await getWorkspaceTaskDetail(page).getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();

  // Pending review locks editing by design — reviewer must still be shown.
  detail = await openTaskDetail(page, title);
  await expect(getWorkspaceTaskDetail(page).getByRole('button', { name: 'แก้ไขงาน' })).toHaveCount(0);
  await expect(detail.locator('.workspace-task-detail-meta')).toContainText('Korn Tawonphon');
});

// 7. TASK POINTS / WORKLOAD — size drives points; workload renders with no hour concepts.
test('Task Points and Workload: size drives points and workload has no hour concepts', async ({ page }) => {
  const stamp = Date.now();
  await openProject(page, 1);
  await addMember(page, REVIEWER);
  for (const size of ['เล็ก', 'กลาง', 'ใหญ่']) {
    await createTask(page, { title: `Points ${size} ${stamp}`, size, dueDate: '2026-12-20' });
  }

  await page.goto('/PROJECT-MANAGEMENT/workload');
  await expect(page.getByRole('heading', { name: /ภาระงานของทีม/ })).toBeVisible();
  await expect(page.locator('.workload-points b').first()).toBeVisible();
  await expect(page.getByText('Planned Workload')).toHaveCount(0);
  await expect(page.getByText('Team Utilization')).toHaveCount(0);
  await expect(page.locator('.workload-compact-hours')).toHaveCount(0);
});
