// frontend/tests/security-incidents-state.spec.js — E2E regression for Security Incidents list state preservation.
//
// Covers: search, filter, and pagination state surviving the list → detail → list round-trip,
// browser Back behavior, direct detail URL access, and safe fallback for invalid/missing state.
// Cancels after returning so no incident records are modified. Never talks to the backend.
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/session';

const INCIDENTS_URL = '/PROJECT-MANAGEMENT/security/incidents';

function searchParamsOf(url) {
  return new URL(url).searchParams;
}

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'emp-009'); // ADMIN — incidents list requires ADMIN
  await page.goto(INCIDENTS_URL);
  await expect(page.getByRole('heading', { name: 'เหตุการณ์ความปลอดภัย' })).toBeVisible();
});

async function openIncidentDetail(page, incidentTitle) {
  await page.getByRole('link', { name: incidentTitle }).click();
  await expect(page.getByRole('heading', { name: 'รายละเอียดเหตุการณ์' })).toBeVisible();
}

// React Router's setSearchParams is async — wait for the URL to flush before reading
// the list query string into navigation state.
async function waitForUrlParam(page, key, value) {
  await page.waitForFunction(([k, v]) => {
    const params = new URL(window.location.href).searchParams;
    return params.get(k) === v;
  }, [key, value]);
}

test('search state survives opening and returning from detail', async ({ page }) => {
  await page.getByLabel('ค้นหาเหตุการณ์').fill('เข้าสู่ระบบ');
  await expect(page.getByLabel('ค้นหาเหตุการณ์')).toHaveValue('เข้าสู่ระบบ');
  await waitForUrlParam(page, 'q', 'เข้าสู่ระบบ');

  await openIncidentDetail(page, 'เข้าสู่ระบบจากอุปกรณ์ใหม่');

  await page.getByRole('button', { name: 'กลับรายการเหตุการณ์' }).click();
  await expect(page.getByRole('heading', { name: 'เหตุการณ์ความปลอดภัย' })).toBeVisible();
  await expect(page.getByLabel('ค้นหาเหตุการณ์')).toHaveValue('เข้าสู่ระบบ');
  expect(searchParamsOf(page.url()).get('q')).toBe('เข้าสู่ระบบ');
});

test('filter state survives opening and returning from detail', async ({ page }) => {
  await page.getByLabel('กรองสถานะเหตุการณ์').selectOption('reported');
  await expect(page.getByLabel('กรองสถานะเหตุการณ์')).toHaveValue('reported');
  await waitForUrlParam(page, 'status', 'reported');

  await openIncidentDetail(page, 'เข้าสู่ระบบจากอุปกรณ์ใหม่');

  await page.getByRole('button', { name: 'กลับรายการเหตุการณ์' }).click();
  await expect(page.getByLabel('กรองสถานะเหตุการณ์')).toHaveValue('reported');
  expect(searchParamsOf(page.url()).get('status')).toBe('reported');
});

test('pagination state survives opening and returning from detail', async ({ page }) => {
  await page.goto(`${INCIDENTS_URL}?page=1`);
  await expect(page.getByRole('heading', { name: 'เหตุการณ์ความปลอดภัย' })).toBeVisible();
  await waitForUrlParam(page, 'page', '1');

  await openIncidentDetail(page, 'เข้าสู่ระบบจากอุปกรณ์ใหม่');

  await page.getByRole('button', { name: 'กลับรายการเหตุการณ์' }).click();
  await expect(page.getByRole('heading', { name: 'เหตุการณ์ความปลอดภัย' })).toBeVisible();
  expect(searchParamsOf(page.url()).get('page')).toBe('1');
});

test('browser back restores previous list state', async ({ page }) => {
  await page.getByLabel('กรองสถานะเหตุการณ์').selectOption('investigating');
  await expect(page.getByLabel('กรองสถานะเหตุการณ์')).toHaveValue('investigating');
  await waitForUrlParam(page, 'status', 'investigating');

  await openIncidentDetail(page, 'เปลี่ยนสิทธิ์ผู้ดูแลโครงการ');

  await page.goBack();
  await expect(page.getByRole('heading', { name: 'เหตุการณ์ความปลอดภัย' })).toBeVisible();
  await expect(page.getByLabel('กรองสถานะเหตุการณ์')).toHaveValue('investigating');
  expect(searchParamsOf(page.url()).get('status')).toBe('investigating');
});

test('direct detail URL access works without prior list navigation', async ({ page }) => {
  await page.goto(`${INCIDENTS_URL}/INC-2026-021`);
  await expect(page.getByRole('heading', { name: 'รายละเอียดเหตุการณ์' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'เข้าสู่ระบบจากอุปกรณ์ใหม่' })).toBeVisible();

  await page.getByRole('button', { name: 'กลับรายการเหตุการณ์' }).click();
  await expect(page.getByRole('heading', { name: 'เหตุการณ์ความปลอดภัย' })).toBeVisible();
  // Falls back to default list state (no leftover params from a prior list visit).
  expect(searchParamsOf(page.url()).toString()).toBe('');
});

test('invalid query parameters fall back safely', async ({ page }) => {
  // Invalid page (non-numeric) clamps to 1 but incidents still load.
  await page.goto(`${INCIDENTS_URL}?page=abc`);
  await expect(page.getByRole('heading', { name: 'เหตุการณ์ความปลอดภัย' })).toBeVisible();

  await openIncidentDetail(page, 'เข้าสู่ระบบจากอุปกรณ์ใหม่');

  await page.getByRole('button', { name: 'กลับรายการเหตุการณ์' }).click();
  await expect(page.getByRole('heading', { name: 'เหตุการณ์ความปลอดภัย' })).toBeVisible();
});
