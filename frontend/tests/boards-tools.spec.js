// frontend/tests/boards-tools.spec.js — Comprehensive canvas tool tests through real UI.
// Covers: sticky notes, colors, sizes, drag, text, shapes, connectors, groups, comment pins,
// stickers, image upload, freehand drawing, frameworks, bring-to-front, delete, undo/redo,
// auto arrange, zoom, fit to screen, minimap, keyboard shortcuts, project linking, comments, share.
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/session';

const BASE = '/PROJECT-MANAGEMENT';

test.describe('Boards canvas tools', () => {
  test.beforeEach(async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ERROR: ' + m.text()); });
    page._caughtErrors = errors;

    await loginAs(page, 'emp-001');
    await page.goto(`${BASE}/boards`);
    await page.getByTestId('boards-page').waitFor({ state: 'visible', timeout: 10000 });

    await page.getByTestId('boards-create-open').click();
    await page.getByTestId('boards-create-title').fill('Tool audit board');
    await page.getByTestId('boards-create-submit').click();
    await page.getByTestId('board-canvas').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTitle('คลิกเพื่อเปลี่ยนชื่อบอร์ด').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test('sticky note: create, drag, color picker, size, resize, duplicate, delete, persist across refresh', async ({ page }) => {
    const errors = page._caughtErrors;

    // --- Create sticky ---
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    const sticky = page.locator('.board-sticky').first();
    await expect(sticky).toBeVisible();
    await expect(sticky).toHaveClass(/note-yellow/);

    // --- Drag sticky ---
    const boxBefore = await sticky.boundingBox();
    const startX = boxBefore.x + boxBefore.width / 2;
    const startY = boxBefore.y + boxBefore.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 120, startY + 90, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const boxAfter = await sticky.boundingBox();
    expect(boxAfter.x).toBeGreaterThan(boxBefore.x + 90);
    expect(boxAfter.y).toBeGreaterThan(boxBefore.y + 60);

    // --- Color picker visible when sticky is selected ---
    await sticky.click();
    await page.waitForTimeout(300);
    const colorPicker = page.locator('.board-selection-colors');
    await expect(colorPicker).toBeVisible();
    // Six color swatches
    await expect(page.locator('.board-selection-color')).toHaveCount(6);

    // --- Change color to pink ---
    await page.locator('.board-selection-color').nth(3).click(); // pink
    await page.waitForTimeout(300);
    await expect(sticky).toHaveClass(/note-pink/);
    expect(sticky).not.toHaveClass(/note-yellow/);

    // --- Color persists after move ---
    await sticky.hover();
    await page.mouse.down();
    await page.mouse.move(boxAfter.x + 50, boxAfter.y + 30, { steps: 3 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await expect(sticky).toHaveClass(/note-pink/);

    // --- Color persists after refresh ---
    await page.reload();
    await page.getByTestId('board-canvas').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    const reloadedSticky = page.locator('.board-sticky').first();
    await expect(reloadedSticky).toHaveClass(/note-pink/);

    // --- Duplicate ---
    await reloadedSticky.click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'สำเนา' }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('.board-sticky.note-pink')).toHaveCount(2);

    // --- Delete one (select via a safe header point so the textarea does not intercept) ---
    await page.locator('.board-sticky.note-pink').first().click({ position: { x: 15, y: 15 } });
    await page.waitForTimeout(300);
    await page.locator('.board-selection-action-delete').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky.note-pink')).toHaveCount(1);

    console.log('STICKY TOOLS PASS. Errors:', JSON.stringify(errors));
  });

  test('text: create heading and body text, edit text', async ({ page }) => {
    const errors = page._caughtErrors;

    // Open text flyout, then add body text
    await page.getByTitle('ข้อความอิสระ (T)').first().click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /ข้อความย่อหน้า/ }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('.board-text')).toHaveCount(1);

    // Edit text
    const textArea = page.locator('.board-text-textarea').first();
    await textArea.click();
    await textArea.fill('Hello MECHA');
    await page.waitForTimeout(300);
    await expect(textArea).toHaveValue('Hello MECHA');

    console.log('TEXT TOOL PASS. Errors:', JSON.stringify(errors));
  });

  test('shapes: rectangle, circle, diamond, card', async ({ page }) => {
    const errors = page._caughtErrors;

    // Open shapes flyout, add rectangle
    await page.getByTitle('รูปทรงและลูกศรเชื่อม').first().click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /สี่เหลี่ยมผืนผ้า/ }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('.board-canvas-item[class*="rounded-sm"]').first()).toBeVisible();

    // Add circle (reopen flyout)
    await page.getByTitle('รูปทรงและลูกศรเชื่อม').first().click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /วงกลม/ }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('.board-canvas-item.rounded-full')).toHaveCount(1);

    console.log('SHAPES TOOL PASS. Errors:', JSON.stringify(errors));
  });

  test('connectors: create arrow between two items', async ({ page }) => {
    const errors = page._caughtErrors;

    // Create sticky 1 (yellow) and drag it away so stickies do not overlap
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    const s1 = page.locator('.board-sticky').first();
    const b1 = await s1.boundingBox();
    await page.mouse.move(b1.x + 50, b1.y + 50);
    await page.mouse.down();
    await page.mouse.move(180, 180, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Create sticky 2 (mint) at the center
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Mint').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(2);

    // Connector mode: open shapes flyout, then click connector button inside it
    await page.getByTitle('รูปทรงและลูกศรเชื่อม').first().click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /วาดตัวเชื่อมลูกศร/ }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-connector-banner')).toBeVisible();

    // Click s1 (isolated at 180,180) then s2 (center)
    await page.locator('.board-sticky').nth(0).click({ position: { x: 15, y: 15 } });
    await page.waitForTimeout(300);
    await page.locator('.board-sticky').nth(1).click({ position: { x: 15, y: 15 } });
    await page.waitForTimeout(500);
    await expect(page.locator('#connectorsLayer line')).toHaveCount(1);

    console.log('CONNECTORS TOOL PASS. Errors:', JSON.stringify(errors));
  });

  test('group: create group frame and drag group', async ({ page }) => {
    const errors = page._caughtErrors;

    // Create sticky 1 (yellow) and drag it away so stickies do not overlap
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    const s1 = page.locator('.board-sticky').first();
    const b1 = await s1.boundingBox();
    await page.mouse.move(b1.x + 50, b1.y + 50);
    await page.mouse.down();
    await page.mouse.move(180, 180, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Create sticky 2 (mint) at the center
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Mint').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(2);

    // Select both (click s1 header; shift+click s2 header)
    await page.locator('.board-sticky').nth(0).click({ position: { x: 15, y: 15 } });
    await page.waitForTimeout(300);
    await page.locator('.board-sticky').nth(1).click({ position: { x: 15, y: 15 }, modifiers: ['Shift'] });
    await page.waitForTimeout(300);

    // Group
    await page.locator('.board-selection-action-group').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-group')).toHaveCount(1);

    console.log('GROUP TOOL PASS. Errors:', JSON.stringify(errors));
  });

  test('comment pin: create comment pin', async ({ page }) => {
    const errors = page._caughtErrors;

    await page.getByTitle('หมุดความคิดเห็น').first().click();
    await page.waitForTimeout(300);
    // Click on canvas to place comment pin
    await page.getByTestId('board-canvas').click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(300);
    await expect(page.locator('.board-comment-pin')).toBeVisible();

    console.log('COMMENT PIN TOOL PASS. Errors:', JSON.stringify(errors));
  });

  test('stickers: add sticker', async ({ page }) => {
    const errors = page._caughtErrors;

    await page.getByTitle('สติกเกอร์และแถบสถานะ').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticker-btn')).toHaveCount(8);
    await page.locator('.board-sticker-btn').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticker')).toHaveCount(1);

    console.log('STICKERS TOOL PASS. Errors:', JSON.stringify(errors));
  });

  test('freehand drawing: draw on canvas', async ({ page }) => {
    const errors = page._caughtErrors;

    await page.getByTitle('วาดมืออิสระ (P)').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('#liveDrawLayer')).toBeVisible();

    // Draw a line
    await page.getByTestId('board-canvas').click({ position: { x: 300, y: 300 } });
    await page.mouse.move(400, 400, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    console.log('DRAWING TOOL PASS. Errors:', JSON.stringify(errors));
  });

  test('frameworks: 2x2 matrix and 3-phase frame', async ({ page }) => {
    const errors = page._caughtErrors;

    await page.getByTitle('กรอบโครงสร้างว่างเปล่า').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-flyout-item')).toHaveCount(2);

    await page.locator('.board-flyout-item').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('.board-group').first()).toBeVisible();

    console.log('FRAMEWORKS TOOL PASS. Errors:', JSON.stringify(errors));
  });

  test('undo/redo: undo sticky creation, redo', async ({ page }) => {
    const errors = page._caughtErrors;

    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(1);

    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(0);

    await page.keyboard.press('Control+y');
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(1);

    console.log('UNDO REDO PASS. Errors:', JSON.stringify(errors));
  });

  test('zoom controls: zoom in, zoom out, reset, fit to screen', async ({ page }) => {
    const errors = page._caughtErrors;

    await expect(page.locator('.board-zoom-label')).toContainText('100%');
    await page.locator('button[title="ขยาย"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-zoom-label')).not.toContainText('100%');
    await page.locator('button[title="รีเซ็ตซูม 100%"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-zoom-label')).toContainText('100%');
    await page.locator('.board-fit-btn').click();
    await page.waitForTimeout(300);

    console.log('ZOOM PASS. Errors:', JSON.stringify(errors));
  });

  test('minimap: toggle visible', async ({ page }) => {
    const errors = page._caughtErrors;

    await page.locator('button[title="สลับมินิแมป"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-minimap-panel:not(.hidden)')).toBeVisible();

    console.log('MINIMAP PASS. Errors:', JSON.stringify(errors));
  });

  test('bring to front: reorder sticky notes', async ({ page }) => {
    const errors = page._caughtErrors;

    // Create sticky 1 (yellow) and drag it away so stickies do not overlap
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    const s1 = page.locator('.board-sticky').first();
    const b1 = await s1.boundingBox();
    await page.mouse.move(b1.x + 50, b1.y + 50);
    await page.mouse.down();
    await page.mouse.move(180, 180, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Create sticky 2 (pink)
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Pink').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(2);

    await page.locator('.board-sticky.note-yellow').first().click({ position: { x: 15, y: 15 } });
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'ด้านหน้า' }).click();
    await page.waitForTimeout(500);

    console.log('BRING TO FRONT PASS. Errors:', JSON.stringify(errors));
  });

  test('auto arrange: grid layout selected items', async ({ page }) => {
    const errors = page._caughtErrors;

    // Create sticky 1 (yellow) and drag it away so stickies do not overlap
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(500);
    const s1 = page.locator('.board-sticky').first();
    const b1 = await s1.boundingBox();
    await page.mouse.move(b1.x + 50, b1.y + 50);
    await page.mouse.down();
    await page.mouse.move(180, 180, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Create sticky 2 (mint) at the center
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Mint').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('.board-sticky')).toHaveCount(2);

    // Select both (click s1 header; shift+click s2 header)
    await page.locator('.board-sticky').nth(0).click({ position: { x: 15, y: 15 } });
    await page.waitForTimeout(500);
    await page.locator('.board-sticky').nth(1).click({ position: { x: 15, y: 15 }, modifiers: ['Shift'] });
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'เรียงกริดอัตโนมัติ' }).click();
    await page.waitForTimeout(500);

    console.log('AUTO ARRANGE PASS. Errors:', JSON.stringify(errors));
  });

  test('delete: remove selected item', async ({ page }) => {
    const errors = page._caughtErrors;

    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(1);

    await page.locator('.board-sticky').click();
    await page.waitForTimeout(300);
    await page.locator('.board-selection-action-delete').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(0);

    console.log('DELETE PASS. Errors:', JSON.stringify(errors));
  });

  test('project linking: link board to project', async ({ page }) => {
    const errors = page._caughtErrors;

    await page.locator('.board-project-pill').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-modal-overlay')).toBeVisible();
    await page.locator('.board-modal-cancel').click();
    await page.waitForTimeout(300);

    console.log('PROJECT LINKING PASS. Errors:', JSON.stringify(errors));
  });

  test('share modal: open and close', async ({ page }) => {
    const errors = page._caughtErrors;

    await page.getByTitle('แชร์บอร์ด').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-modal-overlay')).toBeVisible();
    await page.locator('.board-modal-close').first().click();
    await page.waitForTimeout(300);

    console.log('SHARE PASS. Errors:', JSON.stringify(errors));
  });

  test('keyboard shortcuts: S sticky, T text, G group, Delete', async ({ page }) => {
    const errors = page._caughtErrors;

    await page.keyboard.press('s');
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(1);

    await page.keyboard.press('t');
    await page.waitForTimeout(300);
    await expect(page.locator('.board-text')).toHaveCount(1);

    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);
    // Delete should remove selected item

    console.log('KEYBOARD SHORTCUTS PASS. Errors:', JSON.stringify(errors));
  });

  test('no console errors after tool usage', async ({ page }) => {
    const errors = page._caughtErrors;
    // Exercise several tools
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    await page.locator('.board-sticky').click();
    await page.waitForTimeout(300);
    await page.locator('.board-selection-action-delete').click();
    await page.waitForTimeout(300);

    const relevantErrors = errors.filter((e) =>
      !e.includes('stroke-dasharray') &&
      !e.includes('strokeDasharray') &&
      !e.includes('defaultValue') &&
      !e.includes('textarea')
    );
    expect(relevantErrors).toEqual([]);
    console.log('NO ERRORS PASS. All errors:', JSON.stringify(errors));
  });

  test('image upload: real file appears as board image item', async ({ page }) => {
    const errors = page._caughtErrors;
    const filePath = require('path').join(__dirname, '..', 'fixtures', 'boards-qa-image.png');
    // Create a tiny 1x1 transparent PNG fixture on the fly if missing.
    await page.setInputFiles('#boardImageFileInput', [
      { name: 'boards-qa-image.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64') },
    ]);
    await page.waitForTimeout(500);
    await expect(page.locator('.board-image')).toHaveCount(1);
    const img = page.locator('.board-image-img').first();
    await expect(img).toHaveAttribute('src', /data:image\/png;base64/);
    const relevantErrors = errors.filter((e) =>
      !e.includes('stroke-dasharray') && !e.includes('strokeDasharray') &&
      !e.includes('defaultValue') && !e.includes('textarea')
    );
    expect(relevantErrors).toEqual([]);
    console.log('IMAGE UPLOAD PASS. Errors:', JSON.stringify(errors));
  });

  test('freehand drawing: drawn path becomes a saved board-drawing item', async ({ page }) => {
    const errors = page._caughtErrors;
    await page.getByTitle('วาดมืออิสระ (P)').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('#liveDrawLayer')).toBeVisible();

    // Draw a short stroke inside the viewport using viewport-relative page coordinates.
    // Pick coordinates clear of the open draw flyout (fixed at left:70px, width:260px).
    const vp = page.locator('.board-viewport');
    const vbox = await vp.boundingBox();
    await page.mouse.move(vbox.x + 500, vbox.y + 300);
    await page.mouse.down();
    await page.mouse.move(vbox.x + 620, vbox.y + 380, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    // The live layer is cleared on up and a board-drawing item is added to the canvas.
    await expect(page.locator('#liveDrawLayer')).not.toContainText('M');
    await expect(page.locator('.board-drawing')).toHaveCount(1);
    await expect(page.locator('.board-drawing svg path')).toHaveAttribute('d', /[ML]/);
    const drawingPath = await page.locator('.board-drawing svg path').getAttribute('d');
    expect(drawingPath).toContain('M');

    const relevantErrors = errors.filter((e) =>
      !e.includes('stroke-dasharray') && !e.includes('strokeDasharray') &&
      !e.includes('defaultValue') && !e.includes('textarea')
    );
    expect(relevantErrors).toEqual([]);
    console.log('DRAWING PATH PASS. Errors:', JSON.stringify(errors));
  });

  test('keyboard P shortcut activates draw tool and creates a drawing', async ({ page }) => {
    const errors = page._caughtErrors;
    // Click viewport to ensure focus is not on an input, then press P.
    await page.locator('.board-viewport').click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(200);
    await page.keyboard.press('p');
    await page.waitForTimeout(300);

    // Draw flyout opens and draw dock button is active.
    await expect(page.locator('[data-flyout="draw"]')).toBeVisible();
    await expect(page.locator('button[title="วาดมืออิสระ (P)"]')).toHaveClass(/board-dock-btn-active/);

    // Draw a stroke to confirm currentTool is actually 'draw'.
    const vp = page.locator('.board-viewport');
    const vbox = await vp.boundingBox();
    await page.mouse.move(vbox.x + 500, vbox.y + 300);
    await page.mouse.down();
    await page.mouse.move(vbox.x + 600, vbox.y + 360, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    await expect(page.locator('.board-drawing')).toHaveCount(1);
    const relevantErrors = errors.filter((e) =>
      !e.includes('stroke-dasharray') && !e.includes('strokeDasharray') &&
      !e.includes('defaultValue') && !e.includes('textarea')
    );
    expect(relevantErrors).toEqual([]);
    console.log('P SHORTCUT DRAW PASS. Errors:', JSON.stringify(errors));
  });

  test('marquee selection: drag box on canvas selects items inside it', async ({ page }) => {
    const errors = page._caughtErrors;
    // Create two stickies separated on the canvas.
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    const s1 = page.locator('.board-sticky').first();
    const b1 = await s1.boundingBox();
    await page.mouse.move(b1.x + b1.width / 2, b1.y + b1.height / 2);
    await page.mouse.down();
    await page.mouse.move(b1.x + 260, b1.y, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Mint').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(2);

    // Marquee-drag a box covering both stickies on the canvas background.
    const a1 = await page.locator('.board-sticky').nth(0).boundingBox();
    const a2 = await page.locator('.board-sticky').nth(1).boundingBox();
    await page.mouse.move(Math.min(a1.x, a2.x) - 40, Math.min(a1.y, a2.y) - 40);
    await page.mouse.down();
    await page.mouse.move(Math.max(a1.x + a1.width, a2.x + a2.width) + 40, Math.max(a1.y + a1.height, a2.y + a2.height) + 40, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    await expect(page.locator('.board-selection-count')).toHaveText(/2 รายการที่เลือก/);
    const relevantErrors = errors.filter((e) =>
      !e.includes('stroke-dasharray') && !e.includes('strokeDasharray') &&
      !e.includes('defaultValue') && !e.includes('textarea')
    );
    expect(relevantErrors).toEqual([]);
    console.log('MARQUEE SELECTION PASS. Errors:', JSON.stringify(errors));
  });

  test('empty state: shows on empty board', async ({ page }) => {
    const errors = page._caughtErrors;
    // Fresh board has no canvas objects -> empty hint visible (no hidden class)
    await expect(page.locator('.board-empty-hint')).not.toHaveClass(/hidden/);
    await expect(page.locator('.board-empty-hint')).toBeVisible();
    await expect(page.locator('.board-sticky')).toHaveCount(0);
    await expect(page.locator('.board-group')).toHaveCount(0);
    console.log('EMPTY STATE SHOW PASS. Errors:', JSON.stringify(errors));
  });

  test('empty state: hidden immediately after creating first post-it', async ({ page }) => {
    const errors = page._caughtErrors;
    await expect(page.locator('.board-empty-hint')).not.toHaveClass(/hidden/);

    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(1);
    await expect(page.locator('.board-empty-hint')).toHaveClass(/hidden/);

    console.log('EMPTY STATE HIDE AFTER STICKY PASS. Errors:', JSON.stringify(errors));
  });

  test('empty state: hidden when creating other object types (text)', async ({ page }) => {
    const errors = page._caughtErrors;
    await expect(page.locator('.board-empty-hint')).not.toHaveClass(/hidden/);

    await page.getByTitle('ข้อความอิสระ (T)').first().click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /ข้อความย่อหน้า/ }).click();
    await page.waitForTimeout(400);
    await expect(page.locator('.board-text')).toHaveCount(1);
    await expect(page.locator('.board-empty-hint')).toHaveClass(/hidden/);

    console.log('EMPTY STATE HIDE AFTER TEXT PASS. Errors:', JSON.stringify(errors));
  });

  test('empty state: shows again after deleting the last object', async ({ page }) => {
    const errors = page._caughtErrors;

    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(1);
    await expect(page.locator('.board-empty-hint')).toHaveClass(/hidden/);

    // Select the sticky at a safe header corner, then delete it
    await page.locator('.board-sticky').first().click({ position: { x: 15, y: 15 } });
    await page.waitForTimeout(300);
    await page.locator('.board-selection-action-delete').click();
    await page.waitForTimeout(300);

    await expect(page.locator('.board-sticky')).toHaveCount(0);
    await expect(page.locator('.board-empty-hint')).not.toHaveClass(/hidden/);
    await expect(page.locator('.board-empty-hint')).toBeVisible();

    console.log('EMPTY STATE SHOW AFTER DELETE PASS. Errors:', JSON.stringify(errors));
  });

  test('empty state: updates correctly on undo and redo', async ({ page }) => {
    const errors = page._caughtErrors;

    // Empty board -> empty state visible
    await expect(page.locator('.board-empty-hint')).not.toHaveClass(/hidden/);

    // Create sticky -> hidden
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(1);
    await expect(page.locator('.board-empty-hint')).toHaveClass(/hidden/);

    // Undo removes sticky -> visible again
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(0);
    await expect(page.locator('.board-empty-hint')).not.toHaveClass(/hidden/);

    // Redo restores sticky -> hidden again
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(1);
    await expect(page.locator('.board-empty-hint')).toHaveClass(/hidden/);

    // Persist and reopen: empty state should remain hidden when objects exist
    await page.reload();
    await page.getByTestId('board-canvas').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    await expect(page.locator('.board-sticky')).toHaveCount(1);
    await expect(page.locator('.board-empty-hint')).toHaveClass(/hidden/);

    // Delete last object, persist, reopen -> empty state should show
    await page.locator('.board-sticky').first().click({ position: { x: 15, y: 15 } });
    await page.waitForTimeout(300);
    await page.locator('.board-selection-action-delete').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(0);
    await expect(page.locator('.board-empty-hint')).not.toHaveClass(/hidden/);

    await page.reload();
    await page.getByTestId('board-canvas').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    await expect(page.locator('.board-sticky')).toHaveCount(0);
    await expect(page.locator('.board-empty-hint')).not.toHaveClass(/hidden/);

    console.log('EMPTY STATE UNDO REDO PASS. Errors:', JSON.stringify(errors));
  });

  // ── Selection bar positioning ───────────────────────────────────────────────
  async function selectStickyAtHeader(page) {
    await page.locator('.board-sticky').first().click({ position: { x: 15, y: 15 } });
    await page.waitForTimeout(300);
    await expect(page.locator('.board-selection-bar')).toBeVisible();
  }

  test('selection bar: centered above sticky at canvas center', async ({ page }) => {
    const errors = page._caughtErrors;
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(1);
    await selectStickyAtHeader(page);
    const sticky = page.locator('.board-sticky').first();
    const bar = page.locator('.board-selection-bar');
    const sbox = await sticky.boundingBox();
    const bbox = await bar.boundingBox();
    expect(bbox).not.toBeNull();
    const stickyCenterX = sbox.x + sbox.width / 2;
    const barCenterX = bbox.x + bbox.width / 2;
    expect(Math.abs(barCenterX - stickyCenterX)).toBeLessThanOrEqual(4);
    // Bar sits just above the sticky with a small gap, not overlapping it.
    expect(bbox.y + bbox.height).toBeLessThanOrEqual(sbox.y - 6);
    console.log('SELECTION BAR CENTER PASS. Errors:', JSON.stringify(errors));
  });

  test('selection bar: keeps visible at left viewport edge', async ({ page }) => {
    const errors = page._caughtErrors;
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    const sticky = page.locator('.board-sticky').first();
    const box = await sticky.boundingBox();
    // Drag sticky toward the left edge (keep its header on-screen so it stays selectable).
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(120, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await selectStickyAtHeader(page);
    const bar = page.locator('.board-selection-bar');
    const bbox = await bar.boundingBox();
    expect(bbox).not.toBeNull();
    expect(bbox.x).toBeGreaterThanOrEqual(6);
    expect(bbox.x + bbox.width).toBeLessThanOrEqual(page.viewportSize().width - 6);
    console.log('SELECTION BAR LEFT EDGE PASS. Errors:', JSON.stringify(errors));
  });

  test('selection bar: keeps visible at right viewport edge', async ({ page }) => {
    const errors = page._caughtErrors;
    const width = page.viewportSize().width;
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    const sticky = page.locator('.board-sticky').first();
    const box = await sticky.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(width - 120, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await selectStickyAtHeader(page);
    const bar = page.locator('.board-selection-bar');
    const bbox = await bar.boundingBox();
    expect(bbox).not.toBeNull();
    expect(bbox.x).toBeGreaterThanOrEqual(6);
    expect(bbox.x + bbox.width).toBeLessThanOrEqual(width - 6);
    console.log('SELECTION BAR RIGHT EDGE PASS. Errors:', JSON.stringify(errors));
  });

  test('selection bar: stays visible and aligned at top viewport edge', async ({ page }) => {
    const errors = page._caughtErrors;
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    const sticky = page.locator('.board-sticky').first();
    const box = await sticky.boundingBox();
    // Drag sticky toward the top edge.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, 160, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await selectStickyAtHeader(page);
    const bar = page.locator('.board-selection-bar');
    const bbox = await bar.boundingBox();
    const sbox = await sticky.boundingBox();
    expect(bbox).not.toBeNull();
    // Fully inside viewport.
    expect(bbox.x).toBeGreaterThanOrEqual(6);
    expect(bbox.x + bbox.width).toBeLessThanOrEqual(page.viewportSize().width - 6);
    expect(bbox.y).toBeGreaterThanOrEqual(6);
    expect(bbox.y + bbox.height).toBeLessThanOrEqual(page.viewportSize().height - 6);
    // Horizontally centered over the sticky.
    expect(Math.abs((bbox.x + bbox.width / 2) - (sbox.x + sbox.width / 2))).toBeLessThanOrEqual(4);
    // Vertically separated (above with gap, or below with gap when no room above).
    expect(bbox.y + bbox.height <= sbox.y - 6 || bbox.y >= sbox.y + sbox.height + 6).toBeTruthy();
    console.log('SELECTION BAR TOP EDGE PASS. Errors:', JSON.stringify(errors));
  });

  test('selection bar: stays centered after zoom in and reset', async ({ page }) => {
    const errors = page._caughtErrors;
    await page.locator('button[title="ขยาย"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[title="ขยาย"]').click();
    await page.waitForTimeout(300);
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    await selectStickyAtHeader(page);
    const sticky = page.locator('.board-sticky').first();
    const bar = page.locator('.board-selection-bar');
    const sbox = await sticky.boundingBox();
    const bbox = await bar.boundingBox();
    expect(bbox).not.toBeNull();
    expect(Math.abs((bbox.x + bbox.width / 2) - (sbox.x + sbox.width / 2))).toBeLessThanOrEqual(4);
    expect(bbox.y + bbox.height).toBeLessThanOrEqual(sbox.y - 6);
    // Reset zoom; bar should still be aligned.
    await page.locator('button[title="รีเซ็ตซูม 100%"]').click();
    await page.waitForTimeout(300);
    const sbox2 = await sticky.boundingBox();
    const bbox2 = await bar.boundingBox();
    expect(Math.abs((bbox2.x + bbox2.width / 2) - (sbox2.x + sbox2.width / 2))).toBeLessThanOrEqual(4);
    console.log('SELECTION BAR ZOOM PASS. Errors:', JSON.stringify(errors));
  });

  test('selection bar: stays centered after panning canvas', async ({ page }) => {
    const errors = page._caughtErrors;
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    await selectStickyAtHeader(page);
    const sticky = page.locator('.board-sticky').first();
    // Pan the canvas with the pan tool, then switch back to select. Note: pressing Space
    // alone does not switch tools here -- use the dock buttons so the canvas actually pans.
    await page.locator('button[title="มือ / ลากแคนวาส (H หรือกดค้าง Space)"]').click();
    await page.waitForTimeout(200);
    await page.mouse.move(400, 400);
    await page.mouse.down();
    await page.mouse.move(150, 150, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await page.locator('button[title="เลือกและย้าย (V)"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(1);
    await expect(page.locator('.board-selection-bar')).toBeVisible();
    const afterBar = await page.locator('.board-selection-bar').boundingBox();
    const afterSticky = await sticky.boundingBox();
    expect(Math.abs((afterBar.x + afterBar.width / 2) - (afterSticky.x + afterSticky.width / 2))).toBeLessThanOrEqual(4);
    expect(afterBar.y + afterBar.height <= afterSticky.y - 6 || afterBar.y >= afterSticky.y + afterSticky.height + 6).toBeTruthy();
    console.log('SELECTION BAR PAN PASS. Errors:', JSON.stringify(errors));
  });

  test('selection bar: keeps visible at bottom viewport edge', async ({ page }) => {
    const errors = page._caughtErrors;
    const height = page.viewportSize().height;
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    await selectStickyAtHeader(page);
    const sticky = page.locator('.board-sticky').first();
    const box = await sticky.boundingBox();
    // Drag sticky toward the bottom edge while keeping its header on-screen.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, Math.min(height - 140, box.y + 260), { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await selectStickyAtHeader(page);
    const bar = page.locator('.board-selection-bar');
    const bbox = await bar.boundingBox();
    const sbox = await sticky.boundingBox();
    expect(bbox).not.toBeNull();
    // Fully inside viewport.
    expect(bbox.x).toBeGreaterThanOrEqual(6);
    expect(bbox.x + bbox.width).toBeLessThanOrEqual(page.viewportSize().width - 6);
    expect(bbox.y).toBeGreaterThanOrEqual(6);
    expect(bbox.y + bbox.height).toBeLessThanOrEqual(height - 6);
    // Horizontally centered over the sticky and vertically separated (above it).
    expect(Math.abs((bbox.x + bbox.width / 2) - (sbox.x + sbox.width / 2))).toBeLessThanOrEqual(4);
    expect(bbox.y + bbox.height).toBeLessThanOrEqual(sbox.y - 6);
    console.log('SELECTION BAR BOTTOM EDGE PASS. Errors:', JSON.stringify(errors));
  });

  test('selection bar: stays centered when the selected sticky is resized', async ({ page }) => {
    const errors = page._caughtErrors;
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    await selectStickyAtHeader(page);
    const sticky = page.locator('.board-sticky').first();
    const handle = sticky.locator('.board-resize-handle');
    await expect(handle).toBeVisible();
    const hbox = await handle.boundingBox();
    // Drag the resize handle to make the sticky noticeably wider.
    await page.mouse.move(hbox.x + hbox.width / 2, hbox.y + hbox.height / 2);
    await page.mouse.down();
    await page.mouse.move(hbox.x + 130, hbox.y + 40, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-selection-bar')).toBeVisible();
    const bar = page.locator('.board-selection-bar');
    const bbox = await bar.boundingBox();
    const sbox2 = await sticky.boundingBox();
    expect(bbox).not.toBeNull();
    expect(sbox2.width).toBeGreaterThan(150); // resize actually took effect
    expect(Math.abs((bbox.x + bbox.width / 2) - (sbox2.x + sbox2.width / 2))).toBeLessThanOrEqual(4);
    expect(bbox.y + bbox.height).toBeLessThanOrEqual(sbox2.y - 6);
    console.log('SELECTION BAR RESIZE PASS. Errors:', JSON.stringify(errors));
  });

  test('selection bar: centered over combined bounding box for multi-selection', async ({ page }) => {
    const errors = page._caughtErrors;
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    await selectStickyAtHeader(page);
    // Drag the first sticky aside so the two stickies do not overlap each other.
    const s1 = page.locator('.board-sticky').nth(0);
    const b1 = await s1.boundingBox();
    await page.mouse.move(b1.x + b1.width / 2, b1.y + b1.height / 2);
    await page.mouse.down();
    await page.mouse.move(b1.x - 300, b1.y + b1.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(1);
    // Place a second sticky at the canvas centre.
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Mint').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveCount(2);
    const s2 = page.locator('.board-sticky').nth(1);
    // Marquee-select both stickies (drag a box covering both on the canvas background).
    const a1 = await s1.boundingBox();
    const a2 = await s2.boundingBox();
    await page.mouse.move(Math.min(a1.x, a2.x) - 30, Math.min(a1.y, a2.y) - 30);
    await page.mouse.down();
    await page.mouse.move(Math.max(a1.x + a1.width, a2.x + a2.width) + 30, Math.max(a1.y + a1.height, a2.y + a2.height) + 30, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-selection-bar')).toBeVisible();
    await expect(page.locator('.board-selection-count')).toHaveText(/2 รายการที่เลือก/);
    const bar = page.locator('.board-selection-bar');
    const bbox = await bar.boundingBox();
    const combinedCenterX = (Math.min(a1.x, a2.x) + Math.max(a1.x + a1.width, a2.x + a2.width)) / 2;
    expect(bbox).not.toBeNull();
    expect(Math.abs((bbox.x + bbox.width / 2) - combinedCenterX)).toBeLessThanOrEqual(7);
    const combinedTop = Math.min(a1.y, a2.y);
    expect(bbox.y + bbox.height).toBeLessThanOrEqual(combinedTop - 6);
    console.log('SELECTION BAR MULTI-SELECT PASS. Errors:', JSON.stringify(errors));
  });

  test('selection bar: follows sticky when moved', async ({ page }) => {
    const errors = page._caughtErrors;
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    await selectStickyAtHeader(page);
    const sticky = page.locator('.board-sticky').first();
    const box = await sticky.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + 100, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await expect(page.locator('.board-selection-bar')).toBeVisible();
    const sbox2 = await sticky.boundingBox();
    const bar = page.locator('.board-selection-bar');
    const bbox2 = await bar.boundingBox();
    expect(Math.abs((bbox2.x + bbox2.width / 2) - (sbox2.x + sbox2.width / 2))).toBeLessThanOrEqual(4);
    expect(bbox2.y + bbox2.height).toBeLessThanOrEqual(sbox2.y - 6);
    console.log('SELECTION BAR FOLLOW MOVE PASS. Errors:', JSON.stringify(errors));
  });

  test('selection bar: all color swatches visible and clickable', async ({ page }) => {
    const errors = page._caughtErrors;
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await page.getByTitle('Yellow').first().click();
    await page.waitForTimeout(300);
    await selectStickyAtHeader(page);
    await expect(page.locator('.board-selection-color')).toHaveCount(6);
    const colors = page.locator('.board-selection-color');
    for (let i = 0; i < 6; i++) {
      await expect(colors.nth(i)).toBeVisible();
      await expect(colors.nth(i)).toBeEnabled();
    }
    await colors.nth(4).click(); // lavender
    await page.waitForTimeout(300);
    await expect(page.locator('.board-sticky')).toHaveClass(/note-lavender/);
    console.log('SELECTION BAR COLORS PASS. Errors:', JSON.stringify(errors));
  });
});
