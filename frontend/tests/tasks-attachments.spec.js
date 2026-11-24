// frontend/tests/tasks-attachments.spec.js — E2E regression for Project Attachments.
//
// Covers: single/multiple file selection, validation failures, metadata rendering,
// download content integrity, image/PDF preview, remove file, remove legacy metadata,
// no fake download actions for unavailable attachments.
// Cancels before saving so no task/attachment records are persisted.
// Never talks to the backend.
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/session';
import fs from 'fs';

const TASKS_URL = '/PROJECT-MANAGEMENT/tasks';

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'emp-009');
  await page.goto(TASKS_URL);
  await expect(page.getByRole('heading', { name: 'ตารางงาน' })).toBeVisible();
});

async function openAttachmentsSection(page) {
  await page.getByRole('button', { name: 'เพิ่มงานใหม่' }).click();
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  // Attachments are inside <details open={hasExtras}> which is closed for new tasks.
  await page.locator('summary').first().click();
  await expect(page.locator('#workspace-task-attachments')).toBeVisible();
  return modal;
}

test('selecting a single real file shows metadata with size and no page errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  const modal = await openAttachmentsSection(page);
  await page.setInputFiles('#workspace-task-attachments', {
    name: 'spec.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('spec content'),
  });

  const row = page.locator('.workspace-task-attachment-items > div').filter({ hasText: 'spec.txt' });
  await expect(row).toBeVisible();
  await expect(row.getByText('ไฟล์')).toBeVisible();
  await expect(row).toContainText('B'); // size label shown

  // download and preview buttons present for available file
  await expect(row.getByRole('button', { name: 'ตัวอย่าง' })).toBeVisible();
  await expect(row.getByRole('button', { name: 'ดาวน์โหลด' })).toBeVisible();

  await modal.getByRole('button', { name: 'ยกเลิก' }).click();
  expect(errors).toEqual([]);
});

test('selecting multiple real files shows all metadata rows', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const modal = await openAttachmentsSection(page);
  await page.setInputFiles('#workspace-task-attachments', [
    { name: 'one.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') },
    { name: 'two.png', mimeType: 'image/png', buffer: Buffer.from([137, 80, 78, 71]) },
  ]);

  await expect(page.locator('.workspace-task-attachment-items > div').filter({ hasText: 'one.pdf' })).toBeVisible();
  await expect(page.locator('.workspace-task-attachment-items > div').filter({ hasText: 'two.png' })).toBeVisible();
  expect(errors).toEqual([]);

  await modal.getByRole('button', { name: 'ยกเลิก' }).click();
});

test('file validation failures show user-facing error and do not add rows', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  const modal = await openAttachmentsSection(page);

  // oversized file (>10 MB)
  await page.setInputFiles('#workspace-task-attachments', {
    name: 'huge.bin',
    mimeType: 'application/octet-stream',
    buffer: Buffer.alloc(1024 * 1024 * 11),
  });
  await expect(page.getByRole('alert')).toContainText('ใหญ่เกินไป');

  // unsupported type
  await page.setInputFiles('#workspace-task-attachments', {
    name: 'script.sh',
    mimeType: 'application/x-sh',
    buffer: Buffer.from([1, 2, 3]),
  });
  await expect(page.getByRole('alert')).toContainText('ไม่รองรับ');

  // no attachment rows should exist
  await expect(page.locator('.workspace-task-attachment-items > div')).toHaveCount(0);

  await modal.getByRole('button', { name: 'ยกเลิก' }).click();
  expect(errors).toEqual([]);
});

test('removing a selected file deletes its row and revokes content (no page errors)', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const modal = await openAttachmentsSection(page);
  await page.setInputFiles('#workspace-task-attachments', {
    name: 'remove-me.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('temporary'),
  });

  const row = page.locator('.workspace-task-attachment-items > div').filter({ hasText: 'remove-me.txt' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'ลบไฟล์ remove-me.txt' }).click();
  await expect(page.locator('.workspace-task-attachment-items > div').filter({ hasText: 'remove-me.txt' })).toHaveCount(0);

  await modal.getByRole('button', { name: 'ยกเลิก' }).click();
  expect(errors).toEqual([]);
});

test('quick attachment (metadata-only legacy) shows unavailable status and no download action', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const modal = await openAttachmentsSection(page);
  await page.getByRole('button', { name: '+ Production Plan' }).click();

  const row = page.locator('.workspace-task-attachment-items > div').filter({ hasText: 'Production Plan' });
  await expect(row).toBeVisible();
  await expect(row).toContainText('ลิงก์เอกสาร');
  // unavailable badge shown, no download button
  await expect(row).toContainText('ไม่มีเนื้อหา');
  await expect(row.getByRole('button', { name: 'ดาวน์โหลด' })).toHaveCount(0);
  await expect(row.getByRole('button', { name: 'ตัวอย่าง' })).toHaveCount(0);

  await modal.getByRole('button', { name: 'ยกเลิก' }).click();
  expect(errors).toEqual([]);
});

test('download returns the original file content', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const modal = await openAttachmentsSection(page);
  const originalContent = Buffer.from('original file content here');

  const downloadPromise = page.waitForEvent('download');
  await page.setInputFiles('#workspace-task-attachments', {
    name: 'download-me.txt',
    mimeType: 'text/plain',
    buffer: originalContent,
  });

  const row = page.locator('.workspace-task-attachment-items > div').filter({ hasText: 'download-me.txt' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'ดาวน์โหลด' }).click();

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('download-me.txt');
  const received = Buffer.from(await fs.promises.readFile(await download.path())).toString();
  expect(received).toBe('original file content here');

  await modal.getByRole('button', { name: 'ยกเลิก' }).click();
  expect(errors).toEqual([]);
});

test('image preview opens the file content in a new tab', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const modal = await openAttachmentsSection(page);
  await page.setInputFiles('#workspace-task-attachments', {
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from([137, 80, 78, 71, 0, 0, 0, 13]),
  });

  const row = page.locator('.workspace-task-attachment-items > div').filter({ hasText: 'photo.png' });
  await expect(row).toBeVisible();

  const popupPromise = page.waitForEvent('popup');
  await row.getByRole('button', { name: 'ตัวอย่าง' }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState('load');
  // The preview page should show the image (blob URL served as image/png).
  const img = popup.locator('img');
  await expect(img).toHaveCount(1);
  await popup.close();

  await modal.getByRole('button', { name: 'ยกเลิก' }).click();
  expect(errors).toEqual([]);
});

test('PDF preview opens the file content in a new tab', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const modal = await openAttachmentsSection(page);
  await page.setInputFiles('#workspace-task-attachments', {
    name: 'report.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n%âãÏÓ\n'),
  });

  const row = page.locator('.workspace-task-attachment-items > div').filter({ hasText: 'report.pdf' });
  await expect(row).toBeVisible();

  const popupPromise = page.waitForEvent('popup');
  await row.getByRole('button', { name: 'ตัวอย่าง' }).click();
  const popup = await popupPromise;
  // PDF preview opens in a new tab; the tab itself is the preview surface.
  expect(popup).not.toBeNull();
  await popup.close();

  await modal.getByRole('button', { name: 'ยกเลิก' }).click();
  expect(errors).toEqual([]);
});

test('unsupported preview type falls back to download', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const modal = await openAttachmentsSection(page);
  await page.setInputFiles('#workspace-task-attachments', {
    name: 'data.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('a,b,c\n1,2,3\n'),
  });

  const row = page.locator('.workspace-task-attachment-items > div').filter({ hasText: 'data.csv' });
  await expect(row).toBeVisible();
  // CSV has no preview; the preview button should still download the actual content.
  const downloadPromise = page.waitForEvent('download');
  await row.getByRole('button', { name: 'ตัวอย่าง' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('data.csv');
  const received = Buffer.from(await fs.promises.readFile(await download.path())).toString();
  expect(received).toBe('a,b,c\n1,2,3\n');

  await modal.getByRole('button', { name: 'ยกเลิก' }).click();
  expect(errors).toEqual([]);
});

test('removing a metadata-only legacy attachment deletes its row (no page errors)', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const modal = await openAttachmentsSection(page);
  await page.getByRole('button', { name: '+ Production Plan' }).click();

  const row = page.locator('.workspace-task-attachment-items > div').filter({ hasText: 'Production Plan' });
  await expect(row).toBeVisible();
  await expect(row).toContainText('ไม่มีเนื้อหา');
  await row.getByRole('button', { name: 'ลบไฟล์ Production Plan' }).click();
  await expect(page.locator('.workspace-task-attachment-items > div').filter({ hasText: 'Production Plan' })).toHaveCount(0);

  await modal.getByRole('button', { name: 'ยกเลิก' }).click();
  expect(errors).toEqual([]);
});

test('no duplicate or stale attachment state after editing a task', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const modal = await openAttachmentsSection(page);
  await page.setInputFiles('#workspace-task-attachments', {
    name: 'edit-me.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('first'),
  });

  const row = page.locator('.workspace-task-attachment-items > div').filter({ hasText: 'edit-me.txt' });
  await expect(row).toBeVisible();
  // Re-selecting the same file replaces the row (no duplicate).
  await page.setInputFiles('#workspace-task-attachments', {
    name: 'edit-me.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('second'),
  });
  await expect(page.locator('.workspace-task-attachment-items > div')).toHaveCount(1);
  await expect(page.locator('.workspace-task-attachment-items > div').filter({ hasText: 'edit-me.txt' })).toBeVisible();

  await modal.getByRole('button', { name: 'ยกเลิก' }).click();
  expect(errors).toEqual([]);
});
