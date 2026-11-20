// frontend/tests/login.spec.js — หน้าต่างเข้าสู่ระบบ: ค้นรหัสพนักงาน, ตรวจข้อมูล, เด้งครั้งเดียวต่อ session, animation บัตร
import { test, expect } from '@playwright/test';

const LOGIN_URL = '/PROJECT-MANAGEMENT/';
// ⚠️ ตรงกับ MOCK_EMPLOYEES ใน frontend/src/data/mockData.js
const EMPLOYEES = [
  ['emp-001', 'Kittipat Samran', 'Trainee', 'Mechanical Automation & Software'],
  ['emp-002', 'Napat Chaiyaphon', 'Software Developer', 'Mechanical Automation & Software'],
  ['emp-008', 'Supachai Meesuk', 'Supervisor', 'Mechanical Automation & Software'],
];
const loginDialog = (page) => page.getByRole('dialog', { name: 'เข้าสู่ระบบ' });

async function signIn(page, employeeId = 'emp-001', password = 'demo') {
  await page.getByLabel('รหัสพนักงาน').fill(employeeId);
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.route('**/PROJECT-MANAGEMENT/api/**', (route) => route.abort());
  await page.goto(LOGIN_URL);
});

test('opens the login dialog in Thai and focuses the employee ID', async ({ page }) => {
  const dialog = loginDialog(page);
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel('รหัสพนักงาน')).toBeFocused();
  await expect(page.getByLabel('รหัสผ่าน', { exact: true })).toBeVisible();
  await expect(dialog.getByText('กรอกรหัสพนักงาน', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('');
  // ตัดตัวเลือกที่ยังใช้ไม่ได้จริงออกแล้ว
  await expect(dialog.getByText('Remember me')).toHaveCount(0);
  await expect(dialog.getByText(/Forgot password/)).toHaveCount(0);
});

test('shows the matching card for mock employees (case-insensitive ID)', async ({ page }) => {
  const employeeId = page.getByLabel('รหัสพนักงาน');
  const card = page.locator('.login-id-card');

  for (const [id, name, position, department] of EMPLOYEES) {
    await employeeId.fill(id.toUpperCase());
    await expect(card.getByText(name, { exact: true })).toBeVisible();
    await expect(card.getByText(position, { exact: true })).toBeVisible();
    await expect(card.getByText(department, { exact: true })).toBeVisible();
    await expect(card.getByText(id, { exact: true })).toBeVisible();
  }
});

test('shows partial employee IDs immediately without a not-found state', async ({ page }) => {
  const employeeId = page.getByLabel('รหัสพนักงาน');
  const card = page.locator('.login-id-card');

  await employeeId.fill('emp-001');
  await expect(card.getByText('Kittipat Samran')).toBeVisible();

  for (const value of ['e', 'em', 'emp-', 'emp-0', 'emp-00']) {
    await employeeId.fill(value);
    await expect(card).toHaveClass(/is-partial/);
    await expect(card.locator('.login-idc-partial-value')).toHaveText(value);
    await expect(card.getByText('ไม่พบพนักงาน')).toHaveCount(0);
    await expect(card.getByText('Kittipat Samran')).toHaveCount(0);
  }
});

test('clears stale employee details for unknown IDs and restores the empty card', async ({ page }) => {
  const employeeId = page.getByLabel('รหัสพนักงาน');
  const card = page.locator('.login-id-card');

  await employeeId.fill('emp-001');
  await expect(card.getByText('Kittipat Samran')).toBeVisible();
  await employeeId.fill('emp-00');
  await expect(card.locator('.login-idc-partial-value')).toHaveText('emp-00');
  await expect(card.getByText('Kittipat Samran')).toHaveCount(0);

  await employeeId.fill('emp-999');
  await expect(card).toHaveClass(/is-not-found/);
  await expect(card.getByText('ไม่พบพนักงาน')).toBeVisible();
  await expect(card.getByText('ตรวจสอบรหัสแล้วลองอีกครั้ง')).toBeVisible();
  await expect(card.getByText('Kittipat Samran')).toHaveCount(0);

  await employeeId.fill('');
  await expect(card).toHaveClass(/is-empty/);
  await expect(card.getByText('กรอกรหัสพนักงาน')).toBeVisible();
});

test('validates fields and toggles password visibility', async ({ page }) => {
  const employeeId = page.getByLabel('รหัสพนักงาน');
  const password = page.getByLabel('รหัสผ่าน', { exact: true });
  const submit = page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true });

  await submit.click();
  await expect(page.locator('#login-employee-id-error')).toHaveText('กรอกรหัสพนักงาน');
  await expect(employeeId).toHaveAttribute('aria-invalid', 'true');
  await expect(employeeId).toBeFocused();

  await employeeId.fill('emp-99');
  await submit.click();
  await expect(page.locator('#login-employee-id-error')).toHaveText('กรอกรหัสพนักงานให้ครบ เช่น emp-001');
  await employeeId.fill('emp-999');
  await submit.click();
  await expect(page.locator('#login-employee-id-error')).toHaveText('ไม่พบรหัสพนักงานนี้');

  await employeeId.fill('emp-001');
  await submit.click();
  await expect(page.locator('#login-password-error')).toHaveText('กรอกรหัสผ่าน');
  await expect(password).toHaveAttribute('aria-invalid', 'true');

  await password.fill('secret');
  await expect(page.locator('.login-password-dots .login-dot')).toHaveCount(6);
  await page.getByRole('button', { name: 'แสดง' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(page.getByRole('button', { name: 'ซ่อน' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'ซ่อน' }).click();
  await expect(password).toHaveAttribute('type', 'password');
});

test('closing continues as guest and the dialog does not reappear on other pages', async ({ page }) => {
  const dialog = loginDialog(page);
  await page.getByRole('button', { name: 'ปิดหน้าต่างเข้าสู่ระบบ' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.login-app-background')).not.toHaveAttribute('inert', '');
  await expect(page.locator('.sidebar-profile-btn')).toContainText('ผู้เยี่ยมชม');

  await page.getByRole('link', { name: 'โปรเจกต์' }).first().click();
  await page.getByRole('link', { name: 'หน้าหลัก' }).first().click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(dialog).toHaveCount(0);
});

test('Escape also dismisses the dialog', async ({ page }) => {
  await expect(loginDialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(loginDialog(page)).toHaveCount(0);
});

test('keeps direct project workspace links public without the login dialog', async ({ page }) => {
  await page.goto('/PROJECT-MANAGEMENT/projects/1');
  await expect(page.locator('.project-detail-header')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('traps keyboard focus and exposes labelled errors and live status', async ({ page }) => {
  const close = page.getByRole('button', { name: 'ปิดหน้าต่างเข้าสู่ระบบ' });
  const employeeId = page.getByLabel('รหัสพนักงาน');
  await employeeId.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true })).toBeFocused();

  await employeeId.fill('emp-999');
  await expect(employeeId).toHaveAttribute('aria-describedby', 'login-employee-id-error');
  await expect(page.getByRole('status')).toContainText('ไม่พบรหัสพนักงาน emp-999');
});

test('keeps the login form faded while the preview expands', async ({ page }) => {
  const dialog = loginDialog(page);
  const form = page.locator('.login-form-col');
  const cardWrap = page.locator('.login-card-wrap');

  await page.getByLabel('รหัสพนักงาน').fill('emp-001');
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill('demo');
  await expect(cardWrap).not.toHaveClass(/is-lift/);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await expect(page.locator('.login-submit')).toBeDisabled();
  await expect(page.locator('.login-submit')).toHaveAttribute('aria-busy', 'true');
  await expect(dialog).toHaveClass(/is-leaving/);
  await expect(cardWrap).toHaveClass(/is-lift/);
  await expect(page.locator('.login-preview-col')).toHaveClass(/is-expanded/);
  await page.waitForTimeout(120);
  await expect(dialog).toHaveClass(/is-cinematic/);
  await expect(form).toHaveCSS('opacity', '0');
});

test('signs in as the chosen employee, remembers the session, and makes no API call', async ({ page }) => {
  const authRequests = [];
  const pageErrors = [];
  page.on('request', (request) => {
    if (/\/api\/(auth|login)(\/|$)/i.test(new URL(request.url()).pathname)) authRequests.push(request.url());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.getByLabel('รหัสพนักงาน').fill('emp-008');
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill('anything');
  await expect(page.locator('.login-id-card')).not.toContainText('anything');
  await expect(page.locator('.login-password-dots .login-dot')).toHaveCount(8);
  const dialog = loginDialog(page);
  const submit = page.locator('.login-submit');
  await submit.click();
  await expect(submit).toBeDisabled();
  await expect(page.getByText('กำลังเข้าสู่ระบบ…', { exact: true })).toBeVisible();
  await expect(dialog).toHaveClass(/is-leaving/);
  // กดส่งซ้ำระหว่าง animation ต้องไม่เริ่มใหม่
  await page.locator('.login-form').evaluate((form) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  });
  const cardBox = await page.locator('.login-id-card').boundingBox();
  expect(cardBox.width).toBeCloseTo(340, 0);
  expect(cardBox.height).toBeCloseTo(214, 0);
  await expect(dialog).toHaveClass(/is-welcomed/, { timeout: 3000 });
  await expect(dialog.getByText('ยินดีต้อนรับ', { exact: true })).toBeVisible();
  await expect(dialog.getByText('สวัสดี Supachai Meesuk')).toBeVisible();
  await expect(dialog).toBeHidden({ timeout: 4000 });

  // ผู้ใช้ปัจจุบันเปลี่ยนเป็นคนที่ login จริง (เดิมเป็น Kittipat เสมอ)
  await expect(page.locator('.sidebar-profile-btn')).toContainText('Supachai Meesuk');
  const session = await page.evaluate(() => window.sessionStorage.getItem('mecha.session'));
  expect(JSON.parse(session)).toEqual({ employeeId: 'emp-008' });

  // กลับหน้าหลัก / refresh แล้วไม่เด้งซ้ำ และยังเป็นคนเดิม
  await page.getByRole('link', { name: 'โปรเจกต์' }).first().click();
  await page.getByRole('link', { name: 'หน้าหลัก' }).first().click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.sidebar-profile-btn')).toContainText('Supachai Meesuk');

  expect(authRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('logging out clears the session and shows the login dialog again', async ({ page }) => {
  await signIn(page, 'emp-002');
  await expect(loginDialog(page)).toHaveCount(0, { timeout: 6000 });
  await page.locator('.sidebar-profile-btn').click();
  await page.getByRole('button', { name: 'ออกจากระบบ' }).click();
  await expect(loginDialog(page)).toBeVisible();
  expect(await page.evaluate(() => window.sessionStorage.getItem('mecha.session'))).toBeNull();
});

test('cancels animation state safely when Login unmounts mid-transition', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await signIn(page);
  await expect(page.locator('.login-modal-panel')).toHaveClass(/is-leaving/);

  // หน้า workspace ของโปรเจกต์เปิดได้โดยไม่ต้อง login → หน้าต่างถูก unmount กลาง animation
  await page.evaluate(() => {
    window.history.pushState({}, '', '/PROJECT-MANAGEMENT/projects/1');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.project-detail-header')).toBeVisible();
  await page.waitForTimeout(250);
  expect(pageErrors).toEqual([]);
});

test('respects reduced motion while still signing in', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const motionDurations = await page.evaluate(() => ({
    modal: getComputedStyle(document.querySelector('.login-modal-panel')).animationDuration,
    preview: getComputedStyle(document.querySelector('.login-preview-col')).transitionDuration,
    card: getComputedStyle(document.querySelector('.login-card-wrap')).transitionDuration,
  }));
  expect(motionDurations).toEqual({ modal: '0s', preview: '0s', card: '0s' });

  await signIn(page, 'emp-002');
  await expect(loginDialog(page)).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator('.sidebar-profile-btn')).toContainText('Napat Chaiyaphon');
});

test('animates the card reflection with transform instead of layout positioning', async ({ page }) => {
  await signIn(page);
  await expect(page.locator('.login-card-wrap')).toHaveClass(/is-shining/);

  const reflectionFrames = await page.evaluate(() => {
    const keyframes = Array.from(document.styleSheets)
      .flatMap((sheet) => {
        try {
          return Array.from(sheet.cssRules);
        } catch (error) {
          return [];
        }
      })
      .find((rule) => rule instanceof CSSKeyframesRule && rule.name === 'login-shine');

    return Array.from(keyframes.cssRules, (frame) => ({
      left: frame.style.getPropertyValue('left'),
      transform: frame.style.getPropertyValue('transform'),
    }));
  });

  expect(reflectionFrames).toHaveLength(2);
  expect(reflectionFrames.every(({ left }) => left === '')).toBe(true);
  expect(reflectionFrames[0].transform).toContain('translateX(0px)');
  expect(reflectionFrames[1].transform).toContain('translateX(475%)');
});

test('clips the blurred dashboard during login and restores it after sign-in', async ({ page }) => {
  const dashboard = page.locator('.login-app-background');
  const dialog = loginDialog(page);

  const initialBounds = await dashboard.evaluate((element) => ({
    maxHeight: getComputedStyle(element).maxHeight,
    overflow: getComputedStyle(element).overflow,
    viewportHeight: window.innerHeight,
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(initialBounds.maxHeight).toBe(`${initialBounds.viewportHeight}px`);
  expect(initialBounds.overflow).toBe('clip');
  expect(initialBounds.clientHeight).toBe(initialBounds.viewportHeight);
  expect(initialBounds.scrollHeight).toBeGreaterThan(initialBounds.clientHeight);

  await signIn(page);
  await expect(dialog).toHaveClass(/is-dissolving/);

  const revealBounds = await dashboard.evaluate((element) => ({
    maxHeight: getComputedStyle(element).maxHeight,
    overflow: getComputedStyle(element).overflow,
    isRevealed: element.classList.contains('is-revealed'),
    modalPresent: Boolean(document.querySelector('.login-modal-wrap')),
  }));
  expect(revealBounds).toEqual({
    maxHeight: `${initialBounds.viewportHeight}px`,
    overflow: 'clip',
    isRevealed: true,
    modalPresent: true,
  });

  await expect(dialog).toHaveCount(0, { timeout: 4000 });
  await expect.poll(() => dashboard.evaluate((element) => getComputedStyle(element).maxHeight)).toBe('none');
  await expect.poll(() => dashboard.evaluate((element) => getComputedStyle(element).overflow)).toBe('visible');
  await expect.poll(() => dashboard.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(initialBounds.clientHeight);
});

test('keeps the layout and ID card proportions across desktop, tablet, mobile, and small mobile', async ({ page }) => {
  const dialog = loginDialog(page);
  const sizes = [
    { width: 1280, height: 800, mode: 'desktop' },
    { width: 900, height: 900, mode: 'tablet' },
    { width: 390, height: 844, mode: 'mobile' },
    { width: 320, height: 740, mode: 'small' },
  ];

  for (const size of sizes) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await expect(dialog).toBeVisible();
    const metrics = await page.evaluate(() => {
      const panel = document.querySelector('.login-modal-panel');
      const preview = document.querySelector('.login-preview-col');
      const form = document.querySelector('.login-form-col');
      const idCard = document.querySelector('.login-id-card');
      const columns = getComputedStyle(panel).gridTemplateColumns.split(' ').map(parseFloat);
      const cardRect = idCard.getBoundingClientRect();
      return {
        columns,
        previewTop: preview.getBoundingClientRect().top,
        formTop: form.getBoundingClientRect().top,
        cardWidth: cardRect.width,
        cardHeight: cardRect.height,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });

    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.cardWidth / metrics.cardHeight).toBeCloseTo(340 / 214, 2);
    if (size.mode === 'desktop') {
      expect(metrics.columns).toHaveLength(2);
      expect(metrics.columns[0] / (metrics.columns[0] + metrics.columns[1])).toBeCloseTo(0.4, 1);
    } else {
      expect(metrics.columns).toHaveLength(1);
      expect(metrics.previewTop).toBeLessThan(metrics.formTop);
    }
  }
});

test('keeps the employee ID card centered across responsive widths', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const viewports = [
    { name: 'desktop-wide', width: 1440, height: 900 },
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'tablet-wide', width: 1024, height: 900 },
    { name: 'tablet', width: 900, height: 900 },
    { name: 'mobile-tablet', width: 767, height: 900 },
    { name: 'mobile-wide', width: 414, height: 844 },
    { name: 'mobile', width: 390, height: 844 },
    { name: 'mobile-375', width: 375, height: 844 },
    { name: 'mobile-360', width: 360, height: 844 },
    { name: 'mobile-340', width: 340, height: 740 },
    { name: 'mobile-small', width: 320, height: 740 },
  ];

  for (const [index, viewport] of viewports.entries()) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    // รอบถัดไป: ออกจากระบบ (ล้าง session) แล้วโหลดใหม่ ให้หน้าต่าง login กลับมา
    if (index > 0) {
      await page.evaluate(() => window.sessionStorage.clear());
      await page.reload();
    }

    const dialog = page.locator('.login-modal-panel');
    const form = page.locator('.login-form-col');
    const preview = page.locator('.login-preview-col');
    const card = page.locator('.login-id-card');
    const screenshot = async (stage) => page.screenshot({
      path: testInfo.outputPath(`${viewport.name}-${stage}.png`),
    });
    const expectFixedCardSize = async () => {
      const bounds = await card.boundingBox();
      const scale = viewport.width <= 340 ? 0.74 : viewport.width <= 380 ? 0.85 : 1;
      expect(bounds.width).toBeCloseTo(340 * scale, 1);
      expect(bounds.height).toBeCloseTo(214 * scale, 1);
      expect(bounds.width / bounds.height).toBeCloseTo(340 / 214, 2);
    };
    const expectCardCenteredIn = async (container, state) => {
      const centers = await page.evaluate((containerSelector) => {
        const containerRect = document.querySelector(containerSelector).getBoundingClientRect();
        const cardRect = document.querySelector('.login-id-card').getBoundingClientRect();
        return {
          cardCenter: cardRect.left + cardRect.width / 2,
          containerCenter: containerRect.left + containerRect.width / 2,
          viewport: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
        };
      }, container);
      expect(centers.documentWidth, JSON.stringify({ state, ...centers })).toBeLessThanOrEqual(viewport.width);
      expect(Math.abs(centers.cardCenter - centers.containerCenter), JSON.stringify({ state, ...centers })).toBeLessThan(1.5);
    };

    await expectCardCenteredIn('.login-preview-col', `${viewport.name}-initial`);
    if (index === 0) await screenshot('initial');
    await signIn(page);
    await expect(page.locator('.login-submit')).toBeDisabled();
    await expect(page.getByText('กำลังเข้าสู่ระบบ…', { exact: true })).toBeVisible();

    await page.locator('.login-modal-panel.is-leaving').waitFor();
    await page.waitForTimeout(120);
    await expectFixedCardSize();
    await expect(dialog).toHaveJSProperty('scrollLeft', 0);
    await expect(preview).toHaveClass(/is-expanded/);
    await expect(form).toHaveCSS('opacity', '0');

    await expect(dialog).toHaveClass(/is-welcomed/);
    await expect(dialog.getByText('ยินดีต้อนรับ', { exact: true })).toBeVisible();
    await expect(dialog.getByText('สวัสดี Kittipat Samran')).toBeVisible();
    await expectFixedCardSize();
    await expectCardCenteredIn('.login-modal-panel', `${viewport.name}-welcome-modal`);
    if (index === 0) await screenshot('welcome-overlay');

    await expect(page.locator('.login-modal-panel')).toHaveCount(0, { timeout: 4000 });
    if (index === 0) await screenshot('signed-in');
  }
});
