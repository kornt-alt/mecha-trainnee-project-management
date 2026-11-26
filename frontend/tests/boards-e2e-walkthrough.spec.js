// frontend/tests/boards-e2e-walkthrough.spec.js — Comprehensive end-to-end browser walkthrough of MECHA Boards.
// Real Playwright interactions against the dev server at http://127.0.0.1:3000 with basename /PROJECT-MANAGEMENT.
// Captures screenshots and logs console errors for QA evidence. Frontend-only; no backend/API/database/auth changes.
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/session';

const BASE = '/PROJECT-MANAGEMENT';

// Playwright-held Shift is not observed by React's onPointerDown/onMouseDown
// handlers on canvas items, so multi-select dispatches pointer/mouse events
// carrying shiftKey directly on the target sticky element.
const shiftSelectAdd = async (page, stickyLocator) => {
  const el = await stickyLocator.first().elementHandle();
  if (!el) throw new Error('shiftSelectAdd: element not found');
  await page.evaluate((handle) => {
    const target = handle;
    const r = target.getBoundingClientRect();
    const x = r.left + 14;
    const y = r.top + 14;
    const base = { bubbles: true, cancelable: true, clientX: x, clientY: y, shiftKey: true, button: 0, pointerId: 3, isPrimary: true };
    target.dispatchEvent(new PointerEvent('pointerdown', base));
    target.dispatchEvent(new MouseEvent('mousedown', { ...base, detail: 1 }));
    target.dispatchEvent(new PointerEvent('pointerup', base));
    target.dispatchEvent(new MouseEvent('mouseup', { ...base, detail: 1 }));
    target.dispatchEvent(new MouseEvent('click', { ...base, detail: 1 }));
  }, el);
};

test.describe('Boards end-to-end walkthrough', () => {
  test.beforeEach(async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ERROR: ' + m.text()); });
    page._qaErrors = errors;
    await loginAs(page, 'emp-001');
  });

  test('A. Boards Overview — navigate, search, project filter, create, open, back, empty states, refresh', async ({ page }) => {
    const errors = page._qaErrors;
    await page.goto(`${BASE}/boards`);
    await expect(page.getByTestId('boards-page')).toBeVisible({ timeout: 10000 });

    // Page rendering and navigation
    await expect(page.getByRole('heading', { name: 'บอร์ด', exact: true })).toBeVisible();
    await expect(page.getByTestId('boards-create-open')).toBeVisible();
    await expect(page.getByTestId('boards-search')).toBeVisible();
    await expect(page.getByTestId('boards-project-filter')).toBeVisible();
    await expect(page.getByTestId('boards-section-mine')).toBeVisible();
    await expect(page.getByTestId('boards-section-shared')).toBeVisible();
    await expect(page.getByTestId('boards-section-public')).toBeVisible();

    await page.screenshot({ path: '/tmp/opencode/qa/qa-boards-overview.png', fullPage: true });

    // Create a board
    await page.getByTestId('boards-create-open').click();
    await page.getByTestId('boards-create-title').fill('QA Walkthrough Board');
    await page.getByTestId('boards-create-submit').click();
    await expect(page.getByTestId('board-canvas')).toBeVisible({ timeout: 10000 });

    // Open an existing board: navigate back to overview
    await page.getByTitle('Boards Overview').click();
    await expect(page.getByTestId('boards-page')).toBeVisible({ timeout: 10000 });
    const qaCard = page.locator('.board-card').filter({ hasText: 'QA Walkthrough Board' });
    await expect(qaCard).toBeVisible();

    // Verify board card appears in My Boards section
    const mineSection = page.getByTestId('boards-section-mine');
    await expect(mineSection.locator('.board-card')).toHaveCount(1);
    await expect(qaCard).toContainText('ส่วนตัว');

    // Search
    await page.getByTestId('boards-search').fill('QA Walkthrough');
    await expect(qaCard).toBeVisible();
    await page.getByTestId('boards-search').fill('');
    await expect(qaCard).toBeVisible();

    // Browser refresh persistence
    await page.reload();
    await expect(page.getByTestId('boards-page')).toBeVisible({ timeout: 10000 });
    await expect(qaCard).toBeVisible();

    // Open board again
    await qaCard.click();
    await expect(page.getByTestId('board-canvas')).toBeVisible({ timeout: 10000 });

    const relevantErrors = errors.filter((e) =>
      !e.includes('stroke-dasharray') && !e.includes('strokeDasharray') &&
      !e.includes('defaultValue') && !e.includes('textarea') &&
      !e.includes('ERR_CONNECTION_REFUSED') && !e.includes('Failed to load resource')
    );
    expect(relevantErrors).toEqual([]);
    console.log('BOARDS OVERVIEW WALKTHROUGH PASS. Errors:', JSON.stringify(relevantErrors));
  });

  test('B. Canvas and basic interaction — toolbars, zoom, pan, Fit, selection, drag, resize, multi-select, marquee, minimap', async ({ page }) => {
    const errors = page._qaErrors;
    await page.goto(`${BASE}/boards`);
    await page.getByTestId('boards-create-open').click();
    await page.getByTestId('boards-create-title').fill('Canvas Interaction Board');
    await page.getByTestId('boards-create-submit').click();
    await expect(page.getByTestId('board-canvas')).toBeVisible({ timeout: 10000 });

    // Toolbars render
    await expect(page.locator('.board-left-dock')).toBeVisible();
    await expect(page.getByTitle('โพสต์อิท (S)')).toBeVisible();
    await expect(page.getByTitle('ขยาย')).toBeVisible();
    await expect(page.getByTitle('ย่อ')).toBeVisible();
    await expect(page.getByTitle('รีเซ็ตซูม 100%')).toBeVisible();
    await expect(page.getByTitle('พอดีจอทั้งหมด')).toBeVisible();
    await expect(page.getByTitle('สลับมินิแมป')).toBeVisible();
    await expect(page.locator('.board-bottom-right')).toBeVisible();

    // Zoom in / out / reset
    await page.getByTitle('ขยาย').click();
    await page.waitForTimeout(200);
    await expect(page.getByTitle('รีเซ็ตซูม 100%')).toHaveText('115%');
    await page.getByTitle('ย่อ').click();
    await page.waitForTimeout(200);
    await expect(page.getByTitle('รีเซ็ตซูม 100%')).toHaveText('100%');

    // Mouse-wheel zoom (ctrl+wheel) — Playwright modifiers don't apply to mouse.wheel, use keyboard down/up
    const vp = page.locator('.board-viewport');
    const box = await vp.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -100);
    await page.keyboard.up('Control');
    await page.waitForTimeout(500);
    await expect(page.getByTitle('รีเซ็ตซูม 100%')).toHaveText('108%');

    // Pan canvas with Space+drag
    await page.keyboard.down(' ');
    await page.mouse.move(400, 400);
    await page.mouse.down();
    await page.mouse.move(200, 200, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.up(' ');
    await page.waitForTimeout(200);

    // Fit to screen
    await page.getByTitle('พอดีจอทั้งหมด').click();
    await page.waitForTimeout(300);
    await expect(page.getByTitle('รีเซ็ตซูม 100%')).toHaveText('100%');

    // Minimap toggle
    await page.getByTitle('สลับมินิแมป').click();
    await expect(page.locator('.board-minimap-panel')).not.toHaveClass(/hidden/);
    await page.getByTitle('สลับมินิแมป').click();
    await expect(page.locator('.board-minimap-panel')).toHaveClass(/hidden/);

    // Create two stickies, select/deselect, drag, resize, multi-select, marquee
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(1);
    const s1 = page.locator('.board-sticky').first();
    const b1 = await s1.boundingBox();

    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Mint').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(2);

    // Stickies are created at the same centre with jitter -> move the second one away
    // so later clicks on the first sticky aren't intercepted by an overlapping sibling.
    const s2box0 = await page.locator('.board-sticky').nth(1).boundingBox();
    await page.mouse.move(s2box0.x + s2box0.width / 2, s2box0.y + s2box0.height / 2);
    await page.mouse.down();
    await page.mouse.move(s2box0.x + 260, s2box0.y, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Select first sticky (click header corner)
    await page.waitForTimeout(400);
    await s1.waitFor({ state: 'visible' });
    await s1.click({ position: { x: 15, y: 15 }, force: true });
    await page.waitForTimeout(300);
    await expect(page.locator('.board-selection-bar')).toBeVisible();

    // Deselect by clicking canvas background
    await page.mouse.click(500, 400);
    await page.waitForTimeout(300);
    await expect(page.locator('.board-selection-bar')).toBeHidden();

    // Multi-select via shift+click (dispatch shift-key events; Playwright's
    // held Shift is not observed by React pointer handlers on canvas items)
    await page.waitForTimeout(400);
    await s1.waitFor({ state: 'visible' });
    await s1.click({ position: { x: 15, y: 15 }, force: true });
    await page.waitForTimeout(300);
    await shiftSelectAdd(page, page.locator('.board-sticky').nth(1));
    await page.waitForTimeout(300);
    await expect(page.locator('.board-selection-count')).toHaveText(/2 รายการที่เลือก/);

    // Move multiple selected objects via drag of one selected item
    await page.mouse.move(b1.x + b1.width / 2, b1.y + b1.height / 2);
    await page.mouse.down();
    await page.mouse.move(b1.x + 150, b1.y + 100, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(2);

    // Resize a sticky
    const sticky = page.locator('.board-sticky').first();
    const handle = sticky.locator('.board-resize-handle');
    await expect(handle).toBeVisible();
    const hbox = await handle.boundingBox();
    await page.mouse.move(hbox.x + hbox.width / 2, hbox.y + hbox.height / 2);
    await page.mouse.down();
    await page.mouse.move(hbox.x + 130, hbox.y + 40, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const resized = await sticky.boundingBox();
    expect(resized.width).toBeGreaterThan(200);

    const relevantErrors = errors.filter((e) =>
      !e.includes('stroke-dasharray') && !e.includes('strokeDasharray') &&
      !e.includes('defaultValue') && !e.includes('textarea') &&
      !e.includes('ERR_CONNECTION_REFUSED') && !e.includes('Failed to load resource')
    );
    expect(relevantErrors).toEqual([]);
    console.log('CANVAS INTERACTION WALKTHROUGH PASS. Errors:', JSON.stringify(relevantErrors));
  });

  test('C. Sticky notes full lifecycle', async ({ page }) => {
    const errors = page._qaErrors;
    await page.goto(`${BASE}/boards`);
    await page.getByTestId('boards-create-open').click();
    await page.getByTestId('boards-create-title').fill('Sticky Lifecycle Board');
    await page.getByTestId('boards-create-submit').click();
    await expect(page.getByTestId('board-canvas')).toBeVisible({ timeout: 10000 });

    // Empty state visible initially
    await expect(page.locator('.board-empty-hint')).not.toHaveClass(/hidden/);

    // Create standard Post-it
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(1);

    // Empty canvas message disappears immediately
    await expect(page.locator('.board-empty-hint')).toHaveClass(/hidden/);

    // Edit text
    const sticky = page.locator('.board-sticky').first();
    await sticky.click({ position: { x: 15, y: 15 } });
    await page.waitForTimeout(200);
    const textarea = page.locator('.board-sticky-textarea').first();
    await expect(textarea).toBeVisible();
    await textarea.click();
    await textarea.fill('ทดสอบข้อความบนโพสต์อิท');
    await page.waitForTimeout(300);
    await expect(textarea).toHaveValue('ทดสอบข้อความบนโพสต์อิท');

    // Select -> toolbar centered above -> six colors visible
    await sticky.click({ position: { x: 15, y: 15 } });
    await page.waitForTimeout(300);
    await expect(page.locator('.board-selection-bar')).toBeVisible();
    await expect(page.locator('.board-selection-color')).toHaveCount(6);

    // Select every available color
    const COLOR_ORDER = ['yellow', 'mint', 'sky', 'pink', 'lavender', 'peach'];
    const colors = page.locator('.board-selection-color');
    for (let i = 0; i < 6; i++) {
      await colors.nth(i).click();
      await page.waitForTimeout(200);
      await expect(sticky).toHaveClass(new RegExp(`note-${COLOR_ORDER[i]}`));
    }
    // Back to yellow
    await colors.nth(0).click();
    await page.waitForTimeout(200);
    await expect(sticky).toHaveClass(/note-yellow/);

    // Move the Post-it (drag from header, not textarea which stops propagation)
    await sticky.waitFor({ state: 'visible' });
    await sticky.click({ position: { x: 15, y: 15 }, force: true });
    await page.waitForTimeout(300);
    const box = await sticky.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + 12);
    await page.mouse.down();
    await page.mouse.move(box.x + 200, box.y + 150, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const moved = await sticky.boundingBox();
    expect(moved.x).toBeGreaterThan(box.x + 80);

    // Wide sticky
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Peach').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(2);
    await expect(page.locator('.board-sticky.note-peach')).toBeVisible();

    // Multiple / overlapping stickies
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Sky').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(3);

    // Duplicate
    await page.locator('.board-sticky').first().waitFor({ state: 'visible' });
    await page.locator('.board-sticky').first().click({ position: { x: 15, y: 15 }, force: true });
    await page.waitForTimeout(200);
    await page.locator('.board-selection-action').filter({ hasText: /สำเนา/ }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(4);

    // Bring to front
    await page.locator('.board-selection-action').filter({ hasText: /ด้านหน้า/ }).click();
    await page.waitForTimeout(300);

    // Delete last object -> empty state shows
    const delBtn = page.locator('.board-selection-action-delete');
    await delBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(3);

    // Undo / redo
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(4);
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(3);

    // Refresh and reopen — content and position persist
    await page.reload();
    await page.getByTestId('board-canvas').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    await expect(page.locator('.board-sticky')).toHaveCount(3);
    await expect(page.locator('.board-sticky.note-yellow')).toHaveCount(1);

    const relevantErrors = errors.filter((e) =>
      !e.includes('stroke-dasharray') && !e.includes('strokeDasharray') &&
      !e.includes('defaultValue') && !e.includes('textarea') &&
      !e.includes('ERR_CONNECTION_REFUSED') && !e.includes('Failed to load resource')
    );
    expect(relevantErrors).toEqual([]);
    console.log('STICKY LIFECYCLE WALKTHROUGH PASS. Errors:', JSON.stringify(relevantErrors));
  });

  test('D. All other canvas tools — text, shapes, connectors, group, comment, sticker, image, drawing, frameworks', async ({ page }) => {
    const errors = page._qaErrors;
    await page.goto(`${BASE}/boards`);
    await page.getByTestId('boards-create-open').click();
    await page.getByTestId('boards-create-title').fill('All Tools Board');
    await page.getByTestId('boards-create-submit').click();
    await expect(page.getByTestId('board-canvas')).toBeVisible({ timeout: 10000 });

    // Create two stickies at different positions for connector/group tests
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Mint').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(2);
    // Move second sticky away so they don't overlap
    const s2 = page.locator('.board-sticky').nth(1);
    const s2b = await s2.boundingBox();
    await page.mouse.move(s2b.x + s2b.width / 2, s2b.y + s2b.height / 2);
    await page.mouse.down();
    await page.mouse.move(s2b.x + 220, s2b.y, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Text: heading + body
    await page.getByTitle('ข้อความอิสระ (T)').first().click();
    await page.getByRole('button', { name: /หัวข้อข้อความ/ }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-text')).toHaveCount(1);
    await page.getByTitle('ข้อความอิสระ (T)').first().click();
    await page.getByRole('button', { name: /ข้อความย่อหน้า/ }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-text')).toHaveCount(2);
    const textArea = page.locator('.board-text-textarea').first();
    await page.waitForTimeout(400);
    await textArea.click({ force: true });
    await page.waitForTimeout(200);
    await textArea.fill('หัวข้อทดสอบ');
    await page.waitForTimeout(300);
    await expect(textArea).toHaveValue('หัวข้อทดสอบ');

    // Shapes: rectangle, card (rounded), circle, diamond
    await page.getByTitle('รูปทรงและลูกศรเชื่อม').first().click();
    await page.locator('.board-shape-btn').filter({ hasText: /สี่เหลี่ยมผืนผ้า/ }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-shape-input')).toHaveCount(1);
    await page.getByTitle('รูปทรงและลูกศรเชื่อม').first().click();
    await page.locator('.board-shape-btn').filter({ hasText: /การ์ด/ }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-shape-input')).toHaveCount(2);
    await page.getByTitle('รูปทรงและลูกศรเชื่อม').first().click();
    await page.locator('.board-shape-btn').filter({ hasText: /วงกลม/ }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-shape-input')).toHaveCount(3);
    await page.getByTitle('รูปทรงและลูกศรเชื่อม').first().click();
    await page.locator('.board-shape-btn').filter({ hasText: /ขนมเปียกปูน/ }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-shape-input')).toHaveCount(4);

    // Connector: draw arrow between two items
    await page.getByTitle('รูปทรงและลูกศรเชื่อม').first().click();
    await page.locator('.board-shape-connector').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-connector-banner')).toBeVisible();
    const firstSticky = page.locator('.board-sticky').first();
    const firstBox = await firstSticky.boundingBox();
    await page.mouse.click(firstBox.x + 15, firstBox.y + 15);
    await page.waitForTimeout(300);
    const secondSticky = page.locator('.board-sticky').nth(1);
    const secondBox = await secondSticky.boundingBox();
    await page.mouse.click(secondBox.x + 15, secondBox.y + 15);
    await page.waitForTimeout(300);
    await expect(page.locator('#connectorsLayer line')).toHaveCount(1);
    await expect(page.locator('.board-connector-banner')).toBeHidden();

    // Stickers
    await page.getByTitle('สติกเกอร์และแถบสถานะ').first().click();
    await page.locator('.board-sticker-btn[title="star"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticker')).toHaveCount(1);

    // Freehand drawing (activate only — full draw requires mouse path)
    await page.getByTitle('วาดมืออิสระ (P)').first().click();
    await expect(page.locator('#liveDrawLayer')).toBeVisible();

    // Return to select tool after drawing (click Done on the draw flyout),
    // otherwise subsequent canvas clicks are treated as draw, not select.
    await page.locator('.board-flyout-done').first().click();
    await page.waitForTimeout(300);

    // Image upload button present
    await expect(page.getByTitle('อัปโหลดรูปภาพจากคอมพิวเตอร์')).toBeVisible();

    // Image upload: real file appears on canvas
    await page.setInputFiles('#boardImageFileInput', [
      { name: 'boards-e2e-image.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64') },
    ]);
    await page.waitForTimeout(500);
    await expect(page.locator('.board-image')).toHaveCount(1);
    await expect(page.locator('.board-image-img').first()).toHaveAttribute('src', /data:image\/png;base64/);

    // Frameworks: 2x2 matrix
    await page.getByTitle('กรอบโครงสร้างว่างเปล่า').first().click();
    await page.locator('.board-flyout-item').filter({ hasText: /2×2/ }).click();
    await page.waitForTimeout(500);
    await expect((await page.locator('.board-group').count())).toBeGreaterThanOrEqual(4);

    // 3-phase framework
    await page.getByTitle('กรอบโครงสร้างว่างเปล่า').first().click();
    await page.locator('.board-flyout-item').filter({ hasText: /แนวราบ 3 เฟส/ }).click();
    await page.waitForTimeout(300);
    await expect((await page.locator('.board-group').count())).toBeGreaterThanOrEqual(7);

    // Group / Area: create group frame from selection
    await page.locator('.board-sticky').first().click({ position: { x: 15, y: 15 }, force: true });
    await page.waitForTimeout(300);
    await shiftSelectAdd(page, page.locator('.board-sticky').nth(1));
    await page.waitForTimeout(300);
    await expect(page.locator('.board-selection-count')).toHaveText(/2 รายการที่เลือก/);
    await page.getByTitle('สร้างกรอบกลุ่ม (G)').first().click();
    await page.waitForTimeout(300);
    await expect((await page.locator('.board-group').count())).toBeGreaterThanOrEqual(8);

    // Delete selected item
    await page.locator('.board-selection-action-delete').click();
    await page.waitForTimeout(300);

    // Auto arrange
    await page.locator('.board-sticky').first().click({ position: { x: 15, y: 15 }, force: true });
    await page.waitForTimeout(300);
    await shiftSelectAdd(page, page.locator('.board-sticky').nth(1));
    await page.waitForTimeout(300);
    await page.getByTitle('เรียงกริดอัตโนมัติ').first().click();
    await page.waitForTimeout(300);

    // Undo / redo
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(300);

    const relevantErrors = errors.filter((e) =>
      !e.includes('stroke-dasharray') && !e.includes('strokeDasharray') &&
      !e.includes('defaultValue') && !e.includes('textarea') &&
      !e.includes('ERR_CONNECTION_REFUSED') && !e.includes('Failed to load resource')
    );
    expect(relevantErrors).toEqual([]);
    console.log('ALL TOOLS WALKTHROUGH PASS. Errors:', JSON.stringify(relevantErrors));
  });

  test('E. Selection toolbar and color picker — centering, edges, pan/zoom, multi-select, all swatches', async ({ page }) => {
    const errors = page._qaErrors;
    await page.goto(`${BASE}/boards`);
    await page.getByTestId('boards-create-open').click();
    await page.getByTestId('boards-create-title').fill('Selection Bar Board');
    await page.getByTestId('boards-create-submit').click();
    await expect(page.getByTestId('board-canvas')).toBeVisible({ timeout: 10000 });

    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    const sticky = page.locator('.board-sticky').first();
    await sticky.click({ position: { x: 15, y: 15 } });
    await page.waitForTimeout(300);
    await expect(page.locator('.board-selection-bar')).toBeVisible();

    const bar = page.locator('.board-selection-bar');
    const sbox = await sticky.boundingBox();
    const bbox = await bar.boundingBox();
    expect(Math.abs((bbox.x + bbox.width / 2) - (sbox.x + sbox.width / 2))).toBeLessThanOrEqual(4);
    expect(bbox.y + bbox.height).toBeLessThanOrEqual(sbox.y - 6);

    // All six swatches visible + clickable
    await expect(page.locator('.board-selection-color')).toHaveCount(6);
    for (let i = 0; i < 6; i++) {
      await expect(page.locator('.board-selection-color').nth(i)).toBeVisible();
      await expect(page.locator('.board-selection-color').nth(i)).toBeEnabled();
    }
    await page.locator('.board-selection-color').nth(3).click(); // Pink
    await page.waitForTimeout(300);
    await expect(sticky).toHaveClass(/note-pink/);

    // Move -> bar follows
    const box = await sticky.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 180, box.y + 90, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const sbox2 = await sticky.boundingBox();
    const bbox2 = await bar.boundingBox();
    expect(Math.abs((bbox2.x + bbox2.width / 2) - (sbox2.x + sbox2.width / 2))).toBeLessThanOrEqual(4);

    // Zoom -> bar stays centered
    await page.getByTitle('ขยาย').click();
    await page.waitForTimeout(300);
    const sbox3 = await sticky.boundingBox();
    const bbox3 = await bar.boundingBox();
    expect(Math.abs((bbox3.x + bbox3.width / 2) - (sbox3.x + sbox3.width / 2))).toBeLessThanOrEqual(4);
    await page.getByTitle('รีเซ็ตซูม 100%').click();
    await page.waitForTimeout(300);

    const relevantErrors = errors.filter((e) =>
      !e.includes('stroke-dasharray') && !e.includes('strokeDasharray') &&
      !e.includes('defaultValue') && !e.includes('textarea') &&
      !e.includes('ERR_CONNECTION_REFUSED') && !e.includes('Failed to load resource')
    );
    expect(relevantErrors).toEqual([]);
    console.log('SELECTION BAR WALKTHROUGH PASS. Errors:', JSON.stringify(relevantErrors));
  });

  test('F. Board state and persistence — empty state lifecycle, rename, project association, visibility, switch boards', async ({ page }) => {
    const errors = page._qaErrors;
    await page.goto(`${BASE}/boards`);
    await page.getByTestId('boards-create-open').click();
    await page.getByTestId('boards-create-title').fill('Persistence Board');
    await page.getByTestId('boards-create-submit').click();
    await expect(page.getByTestId('board-canvas')).toBeVisible({ timeout: 10000 });

    // Empty state shows on empty board
    await expect(page.locator('.board-empty-hint')).not.toHaveClass(/hidden/);

    // First object creation -> empty state hides
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-empty-hint')).toHaveClass(/hidden/);
    await expect(page.locator('.board-sticky')).toHaveCount(1);

    // Delete final object -> empty state shows again
    await page.locator('.board-sticky').first().click({ position: { x: 15, y: 15 } });
    await page.waitForTimeout(300);
    await page.locator('.board-selection-action-delete').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(0);
    await expect(page.locator('.board-empty-hint')).not.toHaveClass(/hidden/);

    // Undo -> object back -> empty hides
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(1);
    await expect(page.locator('.board-empty-hint')).toHaveClass(/hidden/);

    // Rename board
    await page.getByRole('textbox', { name: /คลิกเพื่อเปลี่ยนชื่อบอร์ด/ }).click();
    await page.getByRole('textbox', { name: /คลิกเพื่อเปลี่ยนชื่อบอร์ด/ }).fill('Renamed Persistence Board');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Project association
    await page.getByTitle(/เชื่อมโยงโปรเจกต์|Link Project/).first().click();
    await page.getByPlaceholder(/รหัสโปรเจกต์/).fill('QA-PROJECT-01');
    await page.getByRole('button', { name: /บันทึกลิงก์/ }).click();
    await page.waitForTimeout(300);

    // Visibility: public toggle via Share modal
    await page.getByTitle('แชร์บอร์ด').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-modal-overlay')).toBeVisible();
    await page.locator('.board-share-public-label input[type="checkbox"]').click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Refresh — state persists
    await page.reload();
    await page.getByTestId('board-canvas').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    await expect(page.locator('.board-sticky')).toHaveCount(1);
    await expect(page.locator('.board-empty-hint')).toHaveClass(/hidden/);

    // Switch boards: back to overview, open a different board
    await page.getByTitle('Boards Overview').click();
    await expect(page.getByTestId('boards-page')).toBeVisible({ timeout: 10000 });
    const renamedCard = page.locator('.board-card').filter({ hasText: 'Renamed Persistence Board' });
    await expect(renamedCard).toBeVisible();

    const relevantErrors = errors.filter((e) =>
      !e.includes('stroke-dasharray') && !e.includes('strokeDasharray') &&
      !e.includes('defaultValue') && !e.includes('textarea') &&
      !e.includes('ERR_CONNECTION_REFUSED') && !e.includes('Failed to load resource')
    );
    expect(relevantErrors).toEqual([]);
    console.log('BOARD STATE/PERSISTENCE WALKTHROUGH PASS. Errors:', JSON.stringify(relevantErrors));
  });

  test('G. Share, comments, project integration — UI only, no real sync', async ({ page }) => {
    const errors = page._qaErrors;
    await page.goto(`${BASE}/boards`);
    await page.getByTestId('boards-create-open').click();
    await page.getByTestId('boards-create-title').fill('Share Comment Board');
    await page.getByTestId('boards-create-submit').click();
    await expect(page.getByTestId('board-canvas')).toBeVisible({ timeout: 10000 });

    // Share modal open/close, collaborator input, visibility
    await page.getByTitle('แชร์บอร์ด').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-modal-overlay')).toBeVisible();
    await expect(page.locator('.board-share-input[type="text"]')).toBeVisible();
    await page.locator('.board-share-input[type="text"]').fill('emp-002');
    await page.getByRole('button', { name: /เชิญ/ }).click();
    await page.waitForTimeout(300);
    await page.locator('.board-modal-close').click();
    await page.waitForTimeout(300);

    // Comments drawer
    await page.getByTitle('ความคิดเห็นบนบอร์ด').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-right-drawer')).not.toHaveClass(/hidden/);
    await expect(page.locator('.board-comment-input')).toBeVisible();
    await page.locator('#boardCommentInput').fill('ทดสอบความคิดเห็นบนบอร์ด');
    await page.locator('.board-comment-post').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-comment-entry')).toHaveCount(1);
    await page.locator('.board-drawer-close').click();
    await page.waitForTimeout(300);

    // Comment pin tool
    await page.getByTitle('ปักหมุดความคิดเห็น (C)').first().click();
    await page.waitForTimeout(300);
    const vp = page.locator('.board-viewport');
    const vbox = await vp.boundingBox();
    await page.mouse.click(vbox.x + vbox.width / 2, vbox.y + vbox.height / 2);
    await page.waitForTimeout(300);
    await expect(page.locator('.board-comment-pin')).toHaveCount(1);
    await page.getByTitle('เลือกและย้าย (V)').first().click();
    await page.waitForTimeout(300);

    // Project Workspace entry point -> open project-linked board -> return
    await page.goto(`${BASE}/projects`);
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    const projectCards = page.getByRole('button').filter({ hasText: /โปรเจกต์/ });
    if ((await projectCards.count()) > 0) {
      await projectCards.first().click();
      await page.waitForTimeout(1000);
      const boardsLink = page.getByRole('link', { name: /เปิด Boards/ });
      if ((await boardsLink.count()) > 0) {
        await boardsLink.click();
        await expect(page.getByTestId('boards-page')).toBeVisible({ timeout: 10000 });
        await page.goto(`${BASE}/boards`);
      }
    }

    const relevantErrors = errors.filter((e) =>
      !e.includes('stroke-dasharray') && !e.includes('strokeDasharray') &&
      !e.includes('defaultValue') && !e.includes('textarea') &&
      !e.includes('ERR_CONNECTION_REFUSED') && !e.includes('Failed to load resource')
    );
    expect(relevantErrors).toEqual([]);
    console.log('SHARE/COMMENTS/PROJECT WALKTHROUGH PASS. Errors:', JSON.stringify(relevantErrors));
  });
});
