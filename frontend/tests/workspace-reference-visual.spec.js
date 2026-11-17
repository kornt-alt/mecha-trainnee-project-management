// Reference-specific visual regression coverage for Project Workspace.
import { test, expect } from '@playwright/test';

test('Project Workspace renders the reference project records on every tab', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1000 });
  await page.goto('/PROJECT-MANAGEMENT/projects/1');

  await expect(page.getByRole('heading', { level: 1, name: 'แดชบอร์ดสถานะสายการผลิต' })).toBeVisible();
  await expect(page.getByText('แดชบอร์ดรวมสถานะและยอดผลิตของแต่ละสายการผลิต เพื่อให้หัวหน้างานและผู้บริหารติดตามได้แบบเรียลไทม์ พร้อมแจ้งเตือนเมื่อเครื่องจักรหยุด')).toBeVisible();
  await expect(page.getByText('1 ต.ค. → 15 ธ.ค. 2026', { exact: true })).toBeVisible();
  await expect(page.getByText('ความสำคัญ: สูง', { exact: true })).toBeVisible();
  await expect(page.getByText(/^ผ่านไปแล้ว \d+% ของระยะเวลาทั้งหมด$/, { exact: true })).toBeVisible();
  await expect(page.getByText('38%', { exact: true })).toHaveCount(2);
  const progressSummary = page.locator('.project-detail-ring-copy > span').first();
  await expect(progressSummary).toBeVisible();
  await expect(page.locator('.project-detail-ring-copy > span').first()).toHaveText('คำนวณจากงานที่เสร็จ');
  await expect(page.locator('.project-detail-ring-copy > span').nth(1)).toHaveText('3 จาก 8 งาน');
  await expect(page.getByText(/^เหลือ \d+ วัน$/, { exact: true })).toBeVisible();

  const taskTitles = [
    'ออกแบบโครงสร้างข้อมูลสายการผลิต',
    'เชื่อมต่อแหล่งข้อมูลเครื่องจักร',
    'ออกแบบหน้าจอแดชบอร์ด (UI)',
    'พัฒนาหน้าสรุปยอดผลิตรายวัน',
    'พัฒนาระบบแจ้งเตือนเครื่องหยุด',
    'ทดสอบการใช้งานร่วมกับสายการผลิตจริง',
    'เขียนคู่มือการใช้งาน',
    'อบรมผู้ใช้งานและส่งมอบ',
  ];

  await page.getByRole('tab', { name: /^งาน/ }).click();
  await expect(page.locator('.project-tasks-row')).toHaveCount(8);
  await expect(page.locator('.project-tasks-row-subtitle')).toHaveText([
    'เช็กลิสต์ 3/3 · ผู้ตรวจ Korn Tawonphon',
    'เช็กลิสต์ 2/2 · ผู้ตรวจ Korn Tawonphon',
    'เช็กลิสต์ 3/3 · ผู้ตรวจ Supachai Meesuk',
    'เช็กลิสต์ 4/4 · ผู้ตรวจ Korn Tawonphon',
    'เช็กลิสต์ 1/3 · ผู้ตรวจ Korn Tawonphon',
    'เช็กลิสต์ 0/2 · ผู้ตรวจ Supachai Meesuk',
    'เช็กลิสต์ 0/2 · ผู้ตรวจ Supachai Meesuk',
    'เช็กลิสต์ 0/3 · ผู้ตรวจ Korn Tawonphon',
  ]);
  for (const title of taskTitles) await expect(page.getByRole('button', { name: title })).toBeVisible();

  await page.getByRole('tab', { name: /^บอร์ด/ }).click();
  for (const [status, count] of [['not_started', '2'], ['in_progress', '2'], ['pending_review', '1'], ['completed', '3']]) {
    await expect(page.locator(`.project-board-column[data-status="${status}"] .project-board-count`)).toHaveText(count);
  }

  await page.getByRole('tab', { name: /^ทีม/ }).click();
  const team = page.getByRole('region', { name: 'ทีมงานโปรเจกต์' });
  await expect(team.getByRole('heading', { name: 'สมาชิกทีม · 3 คน' })).toBeVisible();
  for (const name of ['Supachai Meesuk', 'Korn Tawonphon', 'Napat Chaiyaphon']) {
    await expect(team.getByText(name, { exact: true })).toBeVisible();
  }
  await expect(team.getByRole('button', { name: 'ล็อก' })).toHaveCount(2);
  await expect(team.locator('.workspace-member-remove').filter({ hasText: 'นำออก' })).toHaveCount(1);
  await expect(team.locator('.workspace-member-role.is-owner')).toHaveCSS('background-color', 'rgb(109, 63, 199)');
  await expect(team.locator('.workspace-member-role.is-leader')).toHaveCSS('background-color', 'rgb(15, 118, 110)');

  await page.getByRole('tab', { name: /^สิ่งที่ส่งมอบ/ }).click();
  await expect(page.locator('.workspace-deliverable-copy strong')).toHaveText([
    'ซอร์สโค้ดและเอกสารติดตั้ง', 'คู่มือการใช้งาน', 'รายงานผลการทดสอบ',
  ]);

  await page.getByRole('tab', { name: /^ไทม์ไลน์/ }).click();
  await expect(page.locator('.workspace-reference-timeline-row')).toHaveCount(8);
  await expect(page.locator('.workspace-reference-timeline-row > button')).toHaveText(taskTitles);

  await page.getByRole('tab', { name: /^ประวัติ/ }).click();
  await expect(page.locator('.workspace-reference-activity-row')).toHaveCount(5);
  await expect(page.locator('.workspace-reference-activity-row > span:nth-child(2)')).toContainText([
    'ส่งงาน “พัฒนาหน้าสรุปยอดผลิตรายวัน” เข้าตรวจ',
    'ทำเช็กลิสต์ “กำหนดเงื่อนไขแจ้งเตือน” เสร็จ',
    'อนุมัติงาน “ออกแบบหน้าจอแดชบอร์ด (UI)”',
    'ตั้ง Korn Tawonphon เป็น Team Lead',
    'สร้างโปรเจกต์ และเป็น Project Owner',
  ]);
});

test('Project Workspace keeps the reference header and overview proportions', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1000 });
  await page.goto('/PROJECT-MANAGEMENT/projects/1');
  await expect(page.locator('.project-detail-header')).toBeVisible();

  const progressCard = page.locator('.project-detail-header-aside');
  await expect(progressCard).toHaveCSS('padding', '18px');
  await expect(progressCard).toHaveCSS('gap', '14px');
  await expect(page.locator('.project-detail-overview-columns')).toHaveCSS('display', 'flex');
  await expect(page.locator('.project-detail-overview-main')).toHaveCSS('flex', '999 1 520px');
  await expect(page.locator('.project-detail-overview-side')).toHaveCSS('flex', '1 1 340px');
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
  await expect(page.locator('.workspace-activity-section')).toHaveCSS('max-width', '860px');
  await expect(page.locator('.workspace-reference-empty-note')).toHaveCount(0);
  await page.getByRole('tab', { name: /^ภาพรวม/ }).click();
  await expect(page.getByRole('button', { name: 'จัดการ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ดูทั้งหมด (8)' })).toHaveText('ดูทั้งหมด (8) →');

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
    await page.screenshot({ path: `/tmp/workspace-react-after-${name}.png`, fullPage: true });
  }
});

test('Project Workspace board cards can be dragged through shared task state', async ({ page }) => {
  const title = `Board drag task ${Date.now()}`;
  await page.setViewportSize({ width: 1360, height: 1000 });
  await page.goto('/PROJECT-MANAGEMENT/projects/1');
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-008');

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
  await expect(todo.locator('.project-board-count')).toHaveText('3');
  await card.dragTo(inProgress);
  await expect(todo.locator('.project-board-count')).toHaveText('2');
  await expect(inProgress.locator('.project-board-count')).toHaveText('3');
  const activeCard = inProgress.getByRole('button', { name: `เปิดรายละเอียดงาน ${title}` });
  await expect(activeCard).toBeVisible();

  const review = page.locator('.project-board-column[data-status="pending_review"]');
  await activeCard.dragTo(review);
  await expect(inProgress.locator('.project-board-count')).toHaveText('2');
  await expect(review.locator('.project-board-count')).toHaveText('2');

  const reviewCard = review.getByRole('button', { name: `เปิดรายละเอียดงาน ${title}` });
  await reviewCard.dragTo(inProgress);
  const detail = page.locator('.workspace-task-detail');
  const reason = detail.locator('#workspace-task-action-reason');
  await expect(reason).toBeVisible();
  await reason.fill('ส่งกลับเพื่อเพิ่มรายละเอียดก่อนตรวจ');
  await detail.locator('.workspace-task-action-panel').getByRole('button', { name: 'ยืนยัน' }).click();
  await detail.getByRole('button', { name: 'ปิดรายละเอียดงาน' }).click();
  await page.getByRole('tab', { name: /^บอร์ด/ }).click();
  await expect(inProgress.locator('.project-board-count')).toHaveText('3');
  await expect(review.locator('.project-board-count')).toHaveText('1');

  await inProgress.getByRole('button', { name: `เปิดรายละเอียดงาน ${title}` }).dragTo(todo);
  await expect(inProgress.locator('.project-board-count')).toHaveText('2');
  await expect(todo.locator('.project-board-count')).toHaveText('3');
});

test('Project Workspace reference blocks removal while primary work remains open', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1000 });
  await page.goto('/PROJECT-MANAGEMENT/projects/1');
  const team = page.getByRole('tab', { name: /^ทีม/ });
  await team.click();
  await page.getByLabel('เลือกผู้ใช้งานจำลอง').selectOption('emp-008');
  const memberRow = page.locator('.workspace-member-row').filter({ has: page.locator('[data-person-id="emp-002"]') });
  await memberRow.getByRole('button', { name: 'นำ Napat Chaiyaphon ออกจากทีม' }).click();
  const notice = page.getByRole('alert').filter({ hasText: 'ยังนำ Napat Chaiyaphon ออกจากทีมไม่ได้' });
  await expect(notice).toContainText('มีงานที่ยังไม่เสร็จอยู่ในมือ 2 งาน');
  await expect(notice).toContainText('พัฒนาหน้าสรุปยอดผลิตรายวัน');
  await expect(notice).toContainText('พัฒนาระบบแจ้งเตือนเครื่องหยุด');
  await notice.getByRole('button', { name: 'ปิด' }).click();
  await expect(notice).toHaveCount(0);
});

test('Project Workspace preserves reference wrapping on narrow phones', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto('/PROJECT-MANAGEMENT/projects/1');
  await page.evaluate(() => document.fonts.ready);

  const attentionRows = page.locator('.project-detail-attention-row');
  await expect(attentionRows).toHaveCount(3);
  expect((await attentionRows.evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height))).sort((a, b) => a - b)).toEqual([118, 118, 142]);
  await expect(page.locator('.project-detail-status-legend > span').first()).toHaveCSS('font-size', '13px');
  await expect(page.locator('.project-detail-status-legend > span').first()).toHaveCSS('gap', '7px');

  await page.getByRole('tab', { name: /^งาน/ }).click();
  const taskRows = page.locator('.project-tasks-row');
  await expect(taskRows).toHaveCount(8);
  expect(await taskRows.evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height))).toEqual(Array(8).fill(224));

  await page.getByRole('tab', { name: /^ทีม/ }).click();
  await expect(page.locator('.workspace-member-metrics').first()).toHaveCSS('margin-left', '0px');
  await expect(page.locator('.workspace-team-rules')).toHaveCSS('padding', '18px 20px');
  await expect(page.locator('.workspace-team-rules ul')).toHaveCSS('line-height', '22.275px');

  await page.getByRole('tab', { name: /^สิ่งที่ส่งมอบ/ }).click();
  const deliverableRows = page.locator('.workspace-deliverable-row');
  expect(await deliverableRows.evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height))).toEqual([151, 129, 151]);
  expect(await deliverableRows.first().evaluate((row) => {
    const copy = row.querySelector('.workspace-deliverable-copy');
    const button = row.querySelector('button');
    return button.getBoundingClientRect().y >= copy.getBoundingClientRect().bottom;
  })).toBe(true);

  await page.getByRole('tab', { name: /^ไทม์ไลน์/ }).click();
  const legend = page.locator('.workspace-timeline-legend > span');
  const legendLines = await legend.evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().y)));
  expect(legendLines[0]).toBe(legendLines[1]);
  expect(legendLines[1]).toBe(legendLines[2]);
  expect(legendLines[3]).toBeGreaterThan(legendLines[2]);
  expect(legendLines[3]).toBe(legendLines[4]);
  await expect(page.locator('.workspace-reference-timeline')).toHaveCSS('margin-top', '0px');

  await page.getByRole('tab', { name: /^ประวัติ/ }).click();
  const activityRows = page.locator('.workspace-reference-activity-row');
  await expect(activityRows).toHaveCount(5);
  await expect(activityRows.first()).toHaveCSS('line-height', 'normal');
  await expect(activityRows.first().locator('.workspace-reference-activity-copy')).toHaveCSS('gap', '3px');
});
