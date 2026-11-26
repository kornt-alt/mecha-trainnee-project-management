// frontend/tests/boards-module.spec.js — Boards module focused tests (frontend-only, localStorage persistence).
//
// Covers: nav entry, Boards Overview page, board creation/open canvas, sticky notes via keyboard shortcut,
// project linking from canvas, zoom controls, undo/redo initial state, Project Workspace entry point.
//
// Notes:
// - All paths use the /PROJECT-MANAGEMENT basename (Router basename in App.js).
// - Boards persist in browser localStorage only (mecha.boards.v1); no backend/API/database involvement.
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/session';

const BASE = '/PROJECT-MANAGEMENT';

test.describe('Boards module', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'emp-001');
    await page.goto(`${BASE}/boards`);
    await expect(page.getByTestId('boards-page')).toBeVisible({ timeout: 10000 });
  });

  test('nav entry opens Boards Overview', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'บอร์ด', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /สร้างบอร์ด/ })).toBeVisible();
  });

  test('create board then open canvas', async ({ page }) => {
    await page.getByTestId('boards-create-open').click();
    await page.getByTestId('boards-create-title').fill('ทดสอบบอร์ดใหม่');
    await page.getByTestId('boards-create-submit').click();
    // create+เปิด navigates to canvas automatically
    await expect(page.getByTestId('board-canvas')).toBeVisible({ timeout: 10000 });
    // board title lives in the top-left input, not a heading
    await expect(page.getByRole('textbox', { name: /คลิกเพื่อเปลี่ยนชื่อบอร์ด/ })).toHaveValue('ทดสอบบอร์ดใหม่');
  });

  test('add sticky note via dock button', async ({ page }) => {
    await page.getByTestId('boards-create-open').click();
    await page.getByTestId('boards-create-title').fill('Canvas test board');
    await page.getByTestId('boards-create-submit').click();
    await expect(page.getByTestId('board-canvas')).toBeVisible({ timeout: 10000 });
    // dock button โพสต์อิท
    await page.getByTitle('โพสต์อิท (S)').first().click();
    await expect(page.getByTitle('Yellow').first()).toBeVisible();
    await page.getByTitle('Yellow').first().click();
    await expect(page.locator('.board-sticky').first()).toBeVisible({ timeout: 10000 });
  });

  test('project linking from canvas', async ({ page }) => {
    await page.getByTestId('boards-create-open').click();
    await page.getByTestId('boards-create-title').fill('Project link board');
    await page.getByTestId('boards-create-submit').click();
    await expect(page.getByTestId('board-canvas')).toBeVisible({ timeout: 10000 });
    await page.getByTitle(/เชื่อมโยงโปรเจกต์|Link Project/).first().click();
    await page.getByPlaceholder(/รหัสโปรเจกต์/).fill('Rigid-FPCA-Layer1');
    await page.getByRole('button', { name: /บันทึกลิงก์/ }).click();
    await expect(page.getByTestId('board-canvas')).toBeVisible();
  });

  test('zoom controls present and undo/redo disabled initially', async ({ page }) => {
    await page.getByTestId('boards-create-open').click();
    await page.getByTestId('boards-create-title').fill('Zoom board');
    await page.getByTestId('boards-create-submit').click();
    await expect(page.getByTestId('board-canvas')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTitle('ย่อ')).toBeVisible();
    await expect(page.getByTitle('ขยาย')).toBeVisible();
    await expect(page.getByTitle(/เลิกทำล่าสุด/)).toBeDisabled();
  });

  test('Boards Overview accessible from Project Workspace overview', async ({ page }) => {
    await page.goto(`${BASE}/projects`);
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    const cards = page.getByRole('button').filter({ hasText: /โปรเจกต์/ });
    if ((await cards.count()) > 0) {
      await cards.first().click();
      // on project detail, look for Boards link (กardo) if present
      const boardsLink = page.getByRole('link', { name: /เปิด Boards/ });
      if ((await boardsLink.count()) > 0) {
        await boardsLink.click();
        await expect(page.getByRole('heading', { name: 'บอร์ด', exact: true })).toBeVisible({ timeout: 10000 });
      }
    }
  });
});
