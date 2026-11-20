// Reference-specific visual regression coverage for Project Workspace.
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/session';

test.beforeEach(async ({ page }) => {
  await loginAs(page);
});

test('Project Workspace keeps operational records empty and renders Team controls', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1000 });
  await page.goto('/PROJECT-MANAGEMENT/projects/5');

  await expect(page.getByRole('heading', { level: 1, name: 'เว็บไซต์องค์กร Mecha 2026' })).toBeVisible();

  await page.getByRole('tab', { name: /^งาน/ }).click();
  await expect(page.locator('.project-tasks-row')).toHaveCount(0);

  await page.getByRole('tab', { name: /^บอร์ด/ }).click();
  for (const [status, count] of [['not_started', '0'], ['in_progress', '0'], ['pending_review', '0'], ['completed', '0']]) {
    await expect(page.locator(`.project-board-column[data-status="${status}"] .project-board-count`)).toHaveText(count);
  }

  await page.getByRole('tab', { name: /^ประวัติ/ }).click();
  await expect(page.locator('.workspace-reference-activity-row')).toHaveCount(0);

  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-008');
  await page.getByRole('tab', { name: /^ทีม/ }).click();
  const team = page.getByRole('region', { name: 'ทีมงานโปรเจกต์' });
  await team.getByLabel('เลือก Team Leader').selectOption('emp-009');
  const leaderDialog = page.getByRole('dialog').last();
  await leaderDialog.getByLabel('เหตุผลการเปลี่ยน Team Leader').fill('กำหนดหัวหน้าทีม');
  await leaderDialog.getByRole('button', { name: 'ยืนยัน' }).click();
  await expect(team.locator('.workspace-member-remove:disabled')).toHaveCount(2);
  await expect(team.locator('.workspace-member-remove:disabled').first()).toHaveCSS('height', '38px');
  await expect(team.locator('.workspace-member-remove:disabled').first()).toHaveCSS('border-radius', '10px');
  await expect(team.locator('.workspace-member-remove:disabled').first()).toHaveCSS('color', 'rgb(100, 116, 139)');
  await team.getByLabel('เลือกสมาชิกเพื่อเพิ่ม').selectOption('emp-002');
  await team.getByRole('button', { name: 'เพิ่มเข้าทีม' }).click();
  const addedMember = team.locator('.workspace-member-row').filter({ has: page.locator('[data-person-id="emp-002"]') });
  await expect(addedMember.locator('.workspace-member-remove')).toHaveText('นำออก');
  await addedMember.locator('.workspace-member-remove').click();
  await expect(addedMember).toHaveCount(0);

  await page.getByRole('tab', { name: /^สิ่งที่ส่งมอบ/ }).click();
  await expect(page.locator('.workspace-deliverable-row')).toHaveCount(0);

  await page.getByRole('tab', { name: /^ไทม์ไลน์/ }).click();
  await expect(page.locator('.workspace-reference-timeline-row')).toHaveCount(0);

});

test('Project Workspace keeps the reference header and overview proportions', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1000 });
  await page.goto('/PROJECT-MANAGEMENT/projects/5');
  await expect(page.locator('.project-detail-header')).toBeVisible();

  const progressCard = page.locator('.project-detail-header-aside');
  await expect(progressCard).toHaveCSS('padding', '18px');
  await expect(progressCard).toHaveCSS('gap', '14px');
  await expect(page.locator('.project-detail-overview-columns')).toHaveCSS('display', 'flex');
  await expect(page.locator('.project-detail-overview-columns')).toHaveCSS('align-items', 'stretch');
  await expect(page.locator('.project-detail-overview-main')).toHaveCSS('flex', '999 1 520px');
  await expect(page.locator('.project-detail-overview-side')).toHaveCSS('flex', '1 1 340px');
  const overviewColumnHeights = await page.locator('.project-detail-overview-main, .project-detail-overview-side').evaluateAll((columns) => columns.map((column) => column.getBoundingClientRect().height));
  expect(Math.abs(overviewColumnHeights[0] - overviewColumnHeights[1])).toBeLessThanOrEqual(1);
  await expect(page.getByRole('heading', { name: 'ข้อมูลโปรเจกต์' })).toHaveCount(0);
  await expect(page.locator('.project-detail-panel-caption')).toHaveCount(0);

  const closure = page.locator('.workspace-closure');
  const closureList = closure.locator('.project-detail-closure-list');
  await expect(closure.locator('.workspace-closure-title')).toHaveCSS('font-size', '16.5px');
  await expect(closureList).toHaveCSS('gap', '0px');
  await expect(closureList).toHaveCSS('margin-top', '0px');
  await expect(closure.locator('.project-detail-closure-list li').first()).toHaveCSS('align-items', 'stretch');
  await expect(closure.locator('.project-detail-closure-marker').first()).toHaveCSS('align-items', 'center');
  await expect(closure.locator('.project-detail-closure-number').first()).toHaveCSS('width', '26px');
  await expect(closure.locator('.project-detail-closure-number').first()).toHaveCSS('height', '26px');
  await expect(closure.locator('.project-detail-closure-number').first()).toHaveCSS('border-color', 'rgb(47, 91, 208)');
  await expect(closure.locator('.project-detail-closure-number').first()).toHaveCSS('background-color', 'rgb(227, 236, 255)');
  await expect(closure.locator('.project-detail-closure-copy').first()).toHaveCSS('padding-bottom', '14px');
  await expect(closure.locator('.project-detail-closure-line').first()).toHaveCSS('width', '2px');

  await page.getByRole('tab', { name: /^ประวัติ/ }).click();
  await expect(page.locator('.workspace-activity-section')).toHaveCSS('max-width', 'none');
  await expect(page.locator('.workspace-reference-empty-note')).toHaveCount(0);
  await page.getByRole('tab', { name: /^ภาพรวม/ }).click();
  await expect(page.getByRole('button', { name: 'จัดการ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ดูทั้งหมด (0)' })).toHaveText('ดูทั้งหมด (0) →');

  const tabs = [
    ['ภาพรวม', 'overview'],
    ['งาน', 'tasks'],
    ['บอร์ด', 'board'],
    ['ทีม', 'team'],
    ['สิ่งที่ส่งมอบ', 'deliverables'],
    ['ไทม์ไลน์', 'timeline'],
    ['ประวัติ', 'activity'],
  ];
  for (const [label, name] of tabs) {
    const tab = page.getByRole('tab', { name: new RegExp(`^${label}`) });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    if (name === 'team' || name === 'deliverables') {
      const layout = page.locator(name === 'team' ? '.workspace-team-layout' : '.workspace-deliverables-layout');
      const heights = await layout.locator('> :first-child, > .workspace-reference-sidebar').evaluateAll((columns) => columns.map((column) => column.getBoundingClientRect().height));
      expect(Math.abs(heights[0] - heights[1])).toBeLessThanOrEqual(1);
    }
    await page.screenshot({ path: `/tmp/workspace-react-after-${name}.png`, fullPage: true });
  }
});

test('Project Workspace board cards can be dragged through shared task state', async ({ page }) => {
  const title = `Board drag task ${Date.now()}`;
  await page.setViewportSize({ width: 1360, height: 1000 });
  await page.goto('/PROJECT-MANAGEMENT/projects/5');
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-008');

  await page.getByRole('tab', { name: /^ทีม/ }).click();
  const team = page.getByRole('region', { name: 'ทีมงานโปรเจกต์' });
  await team.getByLabel('เลือก Team Leader').selectOption('emp-009');
  const leaderDialog = page.getByRole('dialog').last();
  await leaderDialog.getByLabel('เหตุผลการเปลี่ยน Team Leader').fill('กำหนดผู้ตรวจงาน');
  await leaderDialog.getByRole('button', { name: 'ยืนยัน' }).click();

  await page.getByRole('tab', { name: /^งาน/ }).click();
  await page.getByRole('button', { name: 'เพิ่มงาน', exact: true }).click();
  const dialog = page.getByRole('dialog').last();
  await dialog.locator('#workspace-task-title').fill(title);
  await dialog.locator('#workspace-task-assignee').selectOption('emp-008');
  await dialog.locator('#workspace-task-reviewer').selectOption('emp-009');
  await dialog.locator('#workspace-task-due').fill('2026-12-20');
  await dialog.getByRole('button', { name: 'สร้างงาน' }).click();

  await page.getByRole('tab', { name: /^บอร์ด/ }).click();
  const card = page.getByRole('button', { name: `เปิดรายละเอียดงาน ${title}` });
  const todo = page.locator('.project-board-column[data-status="not_started"]');
  const inProgress = page.locator('.project-board-column[data-status="in_progress"]');
  await expect(card).toHaveAttribute('draggable', 'true');
  await expect(todo.locator('.project-board-count')).toHaveText('1');
  await card.dragTo(inProgress);
  await expect(todo.locator('.project-board-count')).toHaveText('0');
  await expect(inProgress.locator('.project-board-count')).toHaveText('1');
  const activeCard = inProgress.getByRole('button', { name: `เปิดรายละเอียดงาน ${title}` });
  await expect(activeCard).toBeVisible();

  const review = page.locator('.project-board-column[data-status="pending_review"]');
  await activeCard.dragTo(review);
  await expect(inProgress.locator('.project-board-count')).toHaveText('0');
  await expect(review.locator('.project-board-count')).toHaveText('1');

  const reviewCard = review.getByRole('button', { name: `เปิดรายละเอียดงาน ${title}` });
  await reviewCard.dragTo(inProgress);
  const detail = page.locator('.workspace-task-detail');
  const reason = detail.locator('#workspace-task-action-reason');
  await expect(reason).toBeVisible();
  await reason.fill('ส่งกลับเพื่อเพิ่มรายละเอียดก่อนตรวจ');
  await detail.locator('.workspace-task-action-panel').getByRole('button', { name: 'ยืนยัน' }).click();
  await detail.getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();
  await page.getByRole('tab', { name: /^บอร์ด/ }).click();
  await expect(inProgress.locator('.project-board-count')).toHaveText('1');
  await expect(review.locator('.project-board-count')).toHaveText('0');

  await inProgress.getByRole('button', { name: `เปิดรายละเอียดงาน ${title}` }).dragTo(todo);
  await expect(inProgress.locator('.project-board-count')).toHaveText('0');
  await expect(todo.locator('.project-board-count')).toHaveText('1');
});

test('Project Workspace blocks member removal inline for unfinished primary tasks', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1000 });
  await page.goto('/PROJECT-MANAGEMENT/projects/5');
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-008');
  await page.getByRole('tab', { name: /^ทีม/ }).click();
  const team = page.getByRole('region', { name: 'ทีมงานโปรเจกต์' });
  await team.getByLabel('เลือกสมาชิกเพื่อเพิ่ม').selectOption('emp-002');
  await team.getByRole('button', { name: 'เพิ่มเข้าทีม' }).click();

  await page.getByRole('tab', { name: /^งาน/ }).click();
  const taskTitles = ['Primary task one', 'Primary task two'];
  for (const title of taskTitles) {
    await page.getByRole('button', { name: 'เพิ่มงาน', exact: true }).click();
    const dialog = page.getByRole('dialog').last();
    await dialog.locator('#workspace-task-title').fill(title);
    await dialog.locator('#workspace-task-assignee').selectOption('emp-002');
    await dialog.locator('#workspace-task-reviewer').selectOption('emp-008');
    await dialog.locator('#workspace-task-due').fill('2026-12-20');
    await dialog.getByRole('button', { name: 'สร้างงาน' }).click();
  }

  await page.getByRole('tab', { name: /^ทีม/ }).click();
  const memberRow = team.locator('.workspace-member-row').filter({ has: page.locator('[data-person-id="emp-002"]') });
  await memberRow.getByRole('button', { name: 'นำ Napat Chaiyaphon ออกจากทีม' }).click();
  const notice = team.getByRole('alert').filter({ hasText: 'ยังนำ Napat Chaiyaphon ออกจากทีมไม่ได้' });
  await expect(notice).toContainText('มีงานที่ยังไม่เสร็จอยู่ในมือ 2 งาน');
  await expect(notice).toHaveCSS('background-color', 'rgb(255, 244, 224)');
  await expect(notice).toHaveCSS('border-radius', '14px');
  await expect(notice.locator('li')).toHaveCount(2);
  for (const title of taskTitles) await expect(notice).toContainText(title);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const tasksTab = page.getByRole('tab', { name: /^งาน/ });
  await notice.getByRole('button', { name: 'ไปที่หน้างาน' }).click();
  await expect(tasksTab).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: /^ทีม/ }).click();
  await expect(notice).toBeVisible();
  await notice.getByRole('button', { name: 'ปิด' }).click();
  await expect(notice).toHaveCount(0);
});

test('Project Workspace preserves reference wrapping on narrow phones', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto('/PROJECT-MANAGEMENT/projects/5');
  await page.evaluate(() => document.fonts.ready);

  const attentionRows = page.locator('.project-detail-attention-row');
  await expect(attentionRows).toHaveCount(0);
  await expect(page.locator('.project-detail-status-legend > span').first()).toHaveCSS('font-size', '13px');
  await expect(page.locator('.project-detail-status-legend > span').first()).toHaveCSS('gap', '7px');

  await page.getByRole('tab', { name: /^งาน/ }).click();
  const taskRows = page.locator('.project-tasks-row');
  await expect(taskRows).toHaveCount(0);

  await page.getByRole('tab', { name: /^ทีม/ }).click();
  await expect(page.locator('.workspace-member-metrics').first()).toHaveCSS('margin-left', '0px');
  await expect(page.locator('.workspace-team-rules')).toHaveCSS('padding', '18px 20px');
  await expect(page.locator('.workspace-team-rules ul')).toHaveCSS('line-height', '22.275px');

  await page.getByRole('tab', { name: /^สิ่งที่ส่งมอบ/ }).click();
  const deliverableRows = page.locator('.workspace-deliverable-row');
  await expect(deliverableRows).toHaveCount(0);

  await page.getByRole('tab', { name: /^ไทม์ไลน์/ }).click();
  const legend = page.locator('.workspace-timeline-legend > span');
  const legendLines = await legend.evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().y)));
  // จุดตัดบรรทัดขึ้นกับการ render ฟอนต์ของแต่ละเครื่อง (3+2 หรือ 4+1) — เช็คแค่ว่า legend ตัดลงบรรทัดใหม่ ไม่ล้นจอ
  expect(legendLines[0]).toBe(legendLines[1]);
  expect(legendLines[1]).toBe(legendLines[2]);
  expect(legendLines[4]).toBeGreaterThan(legendLines[0]);
  await expect(page.locator('.workspace-reference-timeline')).toHaveCSS('margin-top', '0px');

  await page.getByRole('tab', { name: /^ประวัติ/ }).click();
  const activityRows = page.locator('.workspace-reference-activity-row');
  await expect(activityRows).toHaveCount(0);
});
