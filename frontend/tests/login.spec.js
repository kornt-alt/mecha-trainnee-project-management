import { test, expect } from '@playwright/test';

const LOGIN_URL = '/PROJECT-MANAGEMENT/';
const EMPLOYEES = [
  ['EMP-001', 'Mock Employee 01', 'Project Engineer', 'PE'],
  ['EMP-002', 'Mock Employee 02', 'Production Planner', 'PD'],
  ['EMP-003', 'Mock Employee 03', 'Mechanical Engineer', 'ENG'],
  ['EMP-004', 'Mock Employee 04', 'Project Manager', 'PE'],
  ['EMP-005', 'Mock Employee 05', 'Systems Analyst', 'IT'],
  ['EMP-006', 'Mock Employee 06', 'ML Engineer', 'AI'],
  ['EMP-007', 'Mock Employee 07', 'Production Supervisor', 'PD'],
  ['EMP-008', 'Mock Employee 08', 'Design Engineer', 'ENG'],
];

test.beforeEach(async ({ page }) => {
  await page.route('**/PROJECT-MANAGEMENT/api/**', (route) => route.abort());
  await page.goto(LOGIN_URL);
});

test('opens the accessible login preview and focuses Employee ID', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: 'Welcome back' });
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel('Employee ID')).toBeFocused();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(dialog.getByText('Enter an Employee ID')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('');
});

test('shows the exact matching card for EMP-001 through EMP-008', async ({ page }) => {
  const employeeId = page.getByLabel('Employee ID');
  const card = page.locator('.login-id-card');

  for (const [id, name, position, department] of EMPLOYEES) {
    await employeeId.fill(id);
    await expect(card.getByText(name, { exact: true })).toBeVisible();
    await expect(card.getByText(position, { exact: true })).toBeVisible();
    await expect(card.getByText(department, { exact: true })).toBeVisible();
    await expect(card.getByText(id, { exact: true })).toBeVisible();
  }
});

test('unknown employee IDs never display another employee card', async ({ page }) => {
  await page.getByLabel('Employee ID').fill('EMP-999');

  const card = page.locator('.login-id-card');
  await expect(card.getByText('Employee not found')).toBeVisible();
  await expect(card.getByText('Check the ID and try again.')).toBeVisible();
  await expect(card.getByText(/Mock Employee/)).toHaveCount(0);
});

test('validates fields and supports password, remember, and recovery controls', async ({ page }) => {
  const employeeId = page.getByLabel('Employee ID');
  const password = page.getByLabel('Password');
  const submit = page.getByRole('button', { name: 'Sign in' });

  await submit.click();
  await expect(page.locator('#login-employee-id-error')).toHaveText('Enter your Employee ID.');
  await expect(employeeId).toHaveAttribute('aria-invalid', 'true');
  await expect(employeeId).toBeFocused();

  await employeeId.fill('EMP-001');
  await submit.click();
  await expect(page.locator('#login-password-error')).toHaveText('Enter your password.');
  await expect(password).toHaveAttribute('aria-invalid', 'true');

  await password.fill('secret');
  await expect(page.locator('.login-password-dots .login-dot')).toHaveCount(6);
  const toggle = page.getByRole('button', { name: 'Show' });
  await toggle.click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(page.getByRole('button', { name: 'Hide' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Hide' }).click();
  await expect(password).toHaveAttribute('type', 'password');

  await page.getByLabel('Remember me').check();
  await expect(page.getByLabel('Remember me')).toBeChecked();
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await expect(page.locator('#login-status')).toHaveText('Password recovery is not available in this preview.');
});

test('close and Escape dismiss the dialog and return focus to the reopen control', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: 'Welcome back' });

  await page.getByRole('button', { name: 'Close login' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.login-app-background')).not.toHaveAttribute('inert', '');
  const reopen = page.getByRole('button', { name: 'Open login' });
  await expect(reopen).toBeFocused();
  await reopen.click();
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel('Employee ID')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(reopen).toBeFocused();
});

test('keeps direct project routes public and outside the login demo', async ({ page }) => {
  await page.goto('/PROJECT-MANAGEMENT/projects');

  await expect(page.getByRole('button', { name: /เพิ่มโปรเจกต์/ }).first()).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.login-app-background')).not.toHaveAttribute('inert', '');
});

test('traps keyboard focus and exposes labelled errors and live status', async ({ page }) => {
  const close = page.getByRole('button', { name: 'Close login' });
  const employeeId = page.getByLabel('Employee ID');
  await employeeId.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeFocused();

  await employeeId.fill('UNKNOWN');
  await expect(employeeId).toHaveAttribute('aria-describedby', 'login-employee-id-error');
  await expect(page.getByRole('status')).toContainText('Employee not found.');
});

test('keeps the login form faded while the preview expands', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: 'Welcome back' });
  const form = page.locator('.login-form-col');

  await page.getByLabel('Employee ID').fill('EMP-001');
  await page.getByLabel('Password').fill('demo');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('.login-preview-col')).toHaveClass(/is-expanded/);

  await page.waitForTimeout(120);
  await expect(dialog).toHaveClass(/is-leaving/);
  await expect(form).toHaveCSS('opacity', '0');
});

test('plays the signature animation and reveals the dashboard as a demo only', async ({ page }) => {
  const authRequests = [];
  page.on('request', (request) => {
    if (/\/api\/(auth|login)(\/|$)/i.test(new URL(request.url()).pathname)) authRequests.push(request.url());
  });
  const storageBefore = await page.evaluate(() => JSON.stringify({
    local: Object.keys(localStorage).sort(),
    session: Object.keys(sessionStorage).sort(),
  }));

  await page.getByLabel('Employee ID').fill('EMP-001');
  await page.getByLabel('Password').fill('anything');
  const dialog = page.getByRole('dialog', { name: 'Welcome back' });
  const submit = page.locator('.login-submit');
  await submit.click();
  await expect(submit).toBeDisabled();
  await expect(page.getByText('Signing in...', { exact: true })).toBeVisible();
  await expect(dialog).toHaveClass(/is-leaving/);
  await expect(page.locator('.login-card-wrap')).toHaveClass(/is-lift/);
  const movingCardTransform = await page.locator('.login-card-wrap').evaluate((cardWrap) => getComputedStyle(cardWrap).transform);
  expect(movingCardTransform).not.toBe('none');
  await expect(page.locator('.login-preview-col')).toHaveClass(/is-expanded/);
  await page.locator('.login-form').evaluate((form) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  });

  const cardBox = await page.locator('.login-id-card').boundingBox();
  expect(cardBox.width).toBeCloseTo(340, 0);
  expect(cardBox.height).toBeCloseTo(214, 0);
  await expect(dialog).toHaveClass(/is-welcomed/, { timeout: 3000 });
  await expect(dialog.getByText('Welcome to MECHA')).toBeVisible();
  await expect(dialog.getByText('Hello, Mock Employee 01')).toBeVisible();
  await expect(dialog).toHaveClass(/is-dissolving/, { timeout: 3000 });
  await expect(dialog).toBeHidden({ timeout: 3000 });
  await expect(page.getByText('Dashboard reveal demo. No session was created.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replay login demo' })).toBeVisible();
  await expect(page.locator('.login-app-background')).not.toHaveAttribute('inert', '');
  await expect(page.locator('.login-app-background')).toHaveClass(/is-revealed/);

  expect(authRequests).toEqual([]);
  const storageAfter = await page.evaluate(() => JSON.stringify({
    local: Object.keys(localStorage).sort(),
    session: Object.keys(sessionStorage).sort(),
  }));
  expect(storageAfter).toBe(storageBefore);
});

test('respects reduced motion while preserving the demo result', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const motionDurations = await page.evaluate(() => ({
    modal: getComputedStyle(document.querySelector('.login-modal-panel')).animationDuration,
    preview: getComputedStyle(document.querySelector('.login-preview-col')).transitionDuration,
    card: getComputedStyle(document.querySelector('.login-card-wrap')).transitionDuration,
  }));
  expect(motionDurations).toEqual({ modal: '0s', preview: '0s', card: '0s' });

  await page.getByLabel('Employee ID').fill('EMP-002');
  await page.getByLabel('Password').fill('demo');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Dashboard reveal demo. No session was created.')).toBeVisible({ timeout: 5000 });
});

test('animates the card reflection with transform instead of layout positioning', async ({ page }) => {
  await page.getByLabel('Employee ID').fill('EMP-001');
  await page.getByLabel('Password').fill('demo');
  await page.getByRole('button', { name: 'Sign in' }).click();
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

test('clips the blurred dashboard during login and restores it after reveal', async ({ page }) => {
  const dashboard = page.locator('.login-app-background');
  const dialog = page.getByRole('dialog', { name: 'Welcome back' });

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

  await page.getByLabel('Employee ID').fill('EMP-001');
  await page.getByLabel('Password').fill('demo');
  await page.getByRole('button', { name: 'Sign in' }).click();
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

  await expect(page.getByText('Dashboard reveal demo. No session was created.')).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect.poll(() => dashboard.evaluate((element) => getComputedStyle(element).maxHeight)).toBe('none');
  await expect.poll(() => dashboard.evaluate((element) => getComputedStyle(element).overflow)).toBe('visible');
  await expect.poll(() => dashboard.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(initialBounds.clientHeight);
});

test('keeps the layout and ID card proportions across desktop, tablet, mobile, and small mobile', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: 'Welcome back' });
  const card = page.locator('.login-id-card');
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

test('keeps the Employee ID card centered across responsive widths', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const viewports = [
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
    if (index > 0) await page.getByRole('button', { name: 'Replay login demo' }).click();

    const dialog = page.locator('.login-modal-panel');
    const form = page.locator('.login-form-col');
    const preview = page.locator('.login-preview-col');
    const card = page.locator('.login-id-card');
    const screenshot = async (stage) => page.screenshot({
      path: testInfo.outputPath(`${viewport.name}-${stage}.png`),
    });
    const cardSize = async () => {
      const bounds = await card.boundingBox();
      return { width: bounds.width, height: bounds.height };
    };
    const expectFixedCardSize = async () => {
      const size = await cardSize();
      const scale = viewport.width <= 340 ? 0.74 : viewport.width <= 380 ? 0.85 : 1;
      expect(size.width).toBeCloseTo(340 * scale, 1);
      expect(size.height).toBeCloseTo(214 * scale, 1);
      expect(size.width / size.height).toBeCloseTo(340 / 214, 2);
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
      expect(
        Math.abs(centers.cardCenter - centers.containerCenter),
        JSON.stringify({ state, ...centers }),
      ).toBeLessThan(1.5);
    };

    await expectCardCenteredIn('.login-preview-col', `${viewport.name}-initial`);

    if (index === 0) await screenshot('initial');
    await page.getByLabel('Employee ID').fill('EMP-001');
    await page.getByLabel('Password').fill('demo');
    await page.getByRole('button', { name: 'Sign in' }).click();
    const submit = page.locator('.login-submit');
    await expect(submit).toBeDisabled();
    await expect(page.getByText('Signing in...', { exact: true })).toBeVisible();
    if (index === 0) await screenshot('loading');

    await page.locator('.login-modal-panel.is-leaving').waitFor();
    await page.waitForTimeout(120);
    if (index === 0) await screenshot('form-fade-card-move');
    await expectFixedCardSize();
    await expect(dialog).toHaveJSProperty('scrollLeft', 0);

    await expect(preview).toHaveClass(/is-expanded/);
    await expect(dialog).toHaveClass(/is-leaving/);
    await expect(form).toHaveCSS('opacity', '0');
    await page.waitForTimeout(120);
    if (index === 0) await screenshot('preview-expansion');
    await expectFixedCardSize();

    await expect(dialog).toHaveClass(/is-welcomed/);
    await expect(dialog.getByText('Welcome to MECHA')).toBeVisible();
    await expect(dialog.getByText('Hello, Mock Employee 01')).toBeVisible();
    await expectFixedCardSize();
    await expectCardCenteredIn('.login-preview-col', `${viewport.name}-welcome-preview`);
    const centered = await page.evaluate(() => {
      const modalElement = document.querySelector('.login-modal-panel');
      const modal = modalElement.getBoundingClientRect();
      const cardRect = document.querySelector('.login-id-card').getBoundingClientRect();
      return {
        delta: Math.abs((cardRect.left + cardRect.width / 2) - (modal.left + modal.width / 2)),
        modalScrollLeft: modalElement.scrollLeft,
        viewport: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });
    expect(centered.modalScrollLeft, JSON.stringify(centered)).toBe(0);
    expect(centered.documentWidth, JSON.stringify(centered)).toBeLessThanOrEqual(viewport.width);
    expect(centered.delta, JSON.stringify(centered)).toBeLessThan(1.5);
    if (index === 0) await screenshot('welcome-overlay');

    await expect(dialog).toHaveClass(/is-dissolving/);
    if (index === 0) {
      await page.waitForTimeout(100);
      await screenshot('modal-dissolve');
    }
    await expect(page.getByText('Dashboard reveal demo. No session was created.')).toBeVisible();
    await expect(page.locator('.login-app-background')).toHaveClass(/is-revealed/);
    if (index === 0) await screenshot('dashboard-reveal');
  }
});
