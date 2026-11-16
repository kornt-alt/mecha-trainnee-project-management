// Verifies the isolated Revision v1.3 prototype in visible Chromium and captures review evidence.
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';

const root = path.dirname(new URL(import.meta.url).pathname);
const evidenceRunId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
const evidenceDir = path.join(root, 'evidence', `video-reference-run-${evidenceRunId}`);
const pageUrl = process.env.LOGIN_REVISION_URL || 'http://localhost:3000/PROJECT-MANAGEMENT/login-animation-lab/revision-v1.3/index.html';
const widths = [320, 340, 360, 375, 390, 414, 767, 900, 1024, 1280, 1440];

class DevTools {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.pending = new Map();
    this.handlers = new Map();
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result || {});
      } else {
        for (const handler of this.handlers.get(message.method) || []) handler(message.params || {});
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, handler) {
    const handlers = this.handlers.get(method) || [];
    handlers.push(handler);
    this.handlers.set(method, handlers);
    return () => this.handlers.set(method, handlers.filter((item) => item !== handler));
  }

  async evaluate(expression, timeout = 16000) {
    const response = await this.send('Runtime.evaluate', {
      expression, awaitPromise: true, returnByValue: true, userGesture: true, timeout,
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    }
    return response.result?.value;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function launchChromium() {
  const port = await reservePort();
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'mecha-login-revision-'));
  const binary = process.env.CHROMIUM_BIN || 'chromium';
  const child = spawn(binary, [
    '--no-first-run', '--no-default-browser-check', '--disable-pings',
    `--remote-debugging-port=${port}`, '--remote-allow-origins=*',
    `--user-data-dir=${profile}`, '--window-size=1440,1000', '--force-device-scale-factor=1',
    `--app=${pageUrl}`,
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let diagnostics = '';
  child.stderr.on('data', (chunk) => { diagnostics = (diagnostics + chunk.toString()).slice(-2500); });
  const deadline = Date.now() + 20000;
  let target;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Chromium exited: ${diagnostics}`);
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      target = targets.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
      if (target) break;
    } catch (_) {}
    await delay(150);
  }
  if (!target) throw new Error(`Chromium did not expose DevTools: ${diagnostics}`);
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const devtools = new DevTools(socket);
  await Promise.all(['Page.enable', 'Runtime.enable', 'Network.enable', 'Log.enable'].map((method) => devtools.send(method)));
  return { child, profile, socket, devtools, diagnostics: () => diagnostics };
}

async function waitForPage(devtools) {
  const until = Date.now() + 14000;
  while (Date.now() < until) {
    const state = await devtools.evaluate(`({ready:document.readyState,hasInput:!!document.getElementById('employee-id')})`);
    if (state.ready === 'complete' && state.hasInput) return;
    if (state.ready === 'complete' && !state.hasInput) {
      throw new Error('Revision v1.3 page is not implemented yet: Employee ID input is missing.');
    }
    await delay(50);
  }
  throw new Error('Timed out waiting for the prototype page.');
}

async function setViewport(devtools, width, height = 1000) {
  await devtools.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: width <= 767,
  });
  await delay(60);
}

async function setInput(devtools, value) {
  await devtools.evaluate(`(() => {
    const field = document.getElementById('employee-id');
    field.focus(); field.value = ${JSON.stringify(value)};
    field.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await delay(40);
}

async function screenshot(devtools, filename) {
  const result = await devtools.send('Page.captureScreenshot', {
    format: 'png', fromSurface: true, captureBeyondViewport: false,
  });
  await fs.writeFile(path.join(evidenceDir, filename), Buffer.from(result.data, 'base64'));
}

async function beginScreencast(devtools) {
  const frames = [];
  const off = devtools.on('Page.screencastFrame', (event) => {
    frames.push({ data: event.data, received: performance.now(), captureTime: event.metadata?.timestamp });
    devtools.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
  });
  await devtools.send('Page.startScreencast', {
    format: 'jpeg', quality: 78, maxWidth: 1440, maxHeight: 1000, everyNthFrame: 1,
  });
  return { frames, stop: async () => { await devtools.send('Page.stopScreencast'); off(); } };
}

async function encodeVideo(frames, filename) {
  if (!frames.length) throw new Error(`No frames were captured for ${filename}.`);
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'mecha-login-revision-video-'));
  try {
    const lines = ['ffconcat version 1.0'];
    for (let index = 0; index < frames.length; index += 1) {
      const name = `${String(index).padStart(5, '0')}.jpg`;
      await fs.writeFile(path.join(temp, name), Buffer.from(frames[index].data, 'base64'));
      const next = frames[index + 1];
      const seconds = next ? Math.max(.01, Math.min(.25, (next.received - frames[index].received) / 1000)) : .067;
      lines.push(`file '${name}'`, `duration ${seconds.toFixed(4)}`);
    }
    lines.push(`file '${String(frames.length - 1).padStart(5, '0')}.jpg'`);
    await fs.writeFile(path.join(temp, 'frames.ffconcat'), `${lines.join('\n')}\n`);
    const output = path.join(evidenceDir, filename);
    const result = spawnSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'frames.ffconcat',
      '-fps_mode', 'vfr', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '24',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output,
    ], { cwd: temp, encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr || 'ffmpeg could not create the review video.');
    return filename;
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}

async function saveFrameAtPageTime(frames, pageTargetTime, pageClockAnchor, nodeClockAnchor, filename) {
  const expectedCaptureTime = (pageClockAnchor.origin + pageTargetTime) / 1000;
  const hasCaptureTimes = frames.some((frame) => Number.isFinite(frame.captureTime));
  const expectedReceiveTime = nodeClockAnchor + pageTargetTime - pageClockAnchor.now;
  const selected = frames.reduce((best, frame) => {
    const frameTime = hasCaptureTimes ? frame.captureTime : frame.received;
    const targetTime = hasCaptureTimes ? expectedCaptureTime : expectedReceiveTime;
    const bestTime = hasCaptureTimes ? best.captureTime : best.received;
    if (!Number.isFinite(frameTime)) return best;
    if (!Number.isFinite(bestTime)) return frame;
    return Math.abs(frameTime - targetTime) < Math.abs(bestTime - targetTime) ? frame : best;
  }, frames[0]);
  if (!selected) throw new Error(`No screencast frame was captured for ${filename}.`);
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'mecha-login-revision-still-'));
  try {
    const source = path.join(temp, 'selected-frame.jpg');
    const output = path.join(evidenceDir, filename);
    await fs.writeFile(source, Buffer.from(selected.data, 'base64'));
    const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, output], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr || `ffmpeg could not create ${filename}.`);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
  const offsetMs = hasCaptureTimes
    ? selected.captureTime * 1000 - pageClockAnchor.origin - pageTargetTime
    : selected.received - expectedReceiveTime;
  return { filename, offsetMs: +offsetMs.toFixed(1), clock: hasCaptureTimes ? 'Chromium capture timestamp' : 'frame receipt fallback' };
}

async function waitForStage(devtools, target, timeoutMs = 12000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const stage = await devtools.evaluate('document.body.dataset.animationStage || "initial"');
    if (stage === target) return;
    await delay(30);
  }
  throw new Error(`Animation stage ${target} was not reached.`);
}

async function fillValidCredentials(devtools, id = 'EMP-001') {
  await setInput(devtools, id);
  await devtools.evaluate(`(() => { const password=document.getElementById('password'); password.value='demo-password'; password.dispatchEvent(new Event('input',{bubbles:true})); })()`);
}

async function runAnimation(devtools) {
  await fillValidCredentials(devtools);
  await devtools.evaluate(`document.getElementById('sign-in').click()`);
  await delay(80);
  await devtools.evaluate(`document.getElementById('sign-in').click()`);
  await waitForStage(devtools, 'complete');
  await delay(180);
  return devtools.evaluate('window.__revisionStages || []');
}

async function main() {
  await fs.mkdir(evidenceDir, { recursive: false });
  const browser = await launchChromium();
  const devtools = browser.devtools;
  const errors = [];
  const requests = [];
  devtools.on('Runtime.exceptionThrown', ({ exceptionDetails }) => errors.push(exceptionDetails.exception?.description || exceptionDetails.text));
  devtools.on('Log.entryAdded', ({ entry }) => { if (entry.level === 'error') errors.push(entry.text); });
  devtools.on('Network.requestWillBeSent', ({ request }) => requests.push(request.url));
  const report = { browser: 'headed system Chromium', viewportWidths: widths, requestUrls: requests };
  try {
    await devtools.send('Page.navigate', { url: pageUrl });
    await waitForPage(devtools);
    assert(await devtools.evaluate(`document.querySelector('label[for="employee-id"]')?.textContent.trim() === 'Employee ID'`), 'Employee ID has a visible label');
    const empty = await devtools.evaluate(`({state:document.getElementById('employee-card').dataset.state,id:document.getElementById('employee-id-value').textContent.trim()})`);
    assert(empty.state === 'empty' && !empty.id, 'empty input shows the placeholder card');
    await setViewport(devtools, 1440, 1000);
    await screenshot(devtools, 'empty-placeholder.png');
    await screenshot(devtools, 'desktop-cinematic-preview.png');

    const partialStates = [];
    for (const value of ['E', 'EM', 'EMP-', 'EMP-0', 'EMP-00']) {
      await setInput(devtools, value);
      const state = await devtools.evaluate(`({state:document.getElementById('employee-card').dataset.state,id:document.getElementById('employee-id-value').textContent.trim(),notFound:!!document.querySelector('.idc-msg')})`);
      assert(state.state === 'partial' && state.id === value && !state.notFound, `partial value ${value} is shown without a not-found state`);
      partialStates.push({ input: value, cardId: state.id, state: state.state });
    }
    await screenshot(devtools, 'partial-employee-id.png');

    const employeeResults = [];
    for (let index = 1; index <= 8; index += 1) {
      const id = `EMP-${String(index).padStart(3, '0')}`;
      await setInput(devtools, id);
      const employee = await devtools.evaluate(`(() => ({state:document.getElementById('employee-card').dataset.state,id:document.getElementById('employee-id-value').textContent.trim(),name:document.getElementById('employee-name').textContent.trim()}))()`);
      assert(employee.state === 'valid' && employee.id === id && employee.name === `Mock Employee ${String(index).padStart(2, '0')}`, `${id} shows its matching employee`);
      employeeResults.push({ id, name: employee.name });
    }
    await setInput(devtools, 'EMP-001');
    await screenshot(devtools, 'valid-employee-id.png');
    await setInput(devtools, 'EMP-999');
    const unknown = await devtools.evaluate(`(() => ({state:document.getElementById('employee-card').dataset.state,id:document.getElementById('employee-id-value').textContent.trim(),name:document.getElementById('employee-name').textContent.trim(),message:document.querySelector('#card-message strong')?.textContent.trim()}))()`);
    assert(unknown.state === 'not-found' && unknown.id === 'EMP-999' && !unknown.name && unknown.message === 'Employee not found', `unknown ID clears previous employee data (${JSON.stringify(unknown)})`);
    await screenshot(devtools, 'employee-not-found.png');
    await setInput(devtools, '');
    assert(await devtools.evaluate(`document.getElementById('employee-card').dataset.state === 'empty'`), 'clearing the input restores the placeholder');

    await devtools.evaluate(`(() => {
      const password=document.getElementById('password'); password.value='demo-secret'; password.dispatchEvent(new Event('input',{bubbles:true}));
      document.getElementById('remember').click(); document.getElementById('forgot-password').click();
    })()`);
    const passwordSafety = await devtools.evaluate(`(() => ({
      hidden:document.getElementById('password').type==='password',
      dots:document.querySelectorAll('.password-dot').length,
      exposed:document.getElementById('employee-card').textContent.includes('demo-secret'),
      remember:document.getElementById('remember').checked,
      forgot:document.getElementById('form-status').textContent.includes('not available'),
    }))()`);
    assert(passwordSafety.hidden && passwordSafety.dots === 11 && !passwordSafety.exposed && passwordSafety.remember && passwordSafety.forgot, 'password stays masked and form demo controls work');
    await devtools.evaluate(`document.getElementById('password-toggle').click()`);
    assert(await devtools.evaluate(`document.getElementById('password').type === 'text'`), 'Show Password toggles input visibility');
    await devtools.evaluate(`document.getElementById('password-toggle').click()`);
    assert(await devtools.evaluate(`document.getElementById('password').type === 'password'`), 'Hide Password restores masking');
    report.passwordSafety = passwordSafety;

    await devtools.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await devtools.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    const closedState = await devtools.evaluate(`({hidden:document.getElementById('modal-wrap').hidden,focused:document.activeElement.id})`);
    assert(closedState.hidden && closedState.focused === 'replay-demo', 'Escape closes the dialog and moves focus to the reopen control');
    await devtools.evaluate(`document.getElementById('replay-demo').click()`);
    assert(await devtools.evaluate(`!document.getElementById('modal-wrap').hidden`), 'reopen control restores the login dialog');
    report.escapeAndFocus = closedState;

    const typingCast = await beginScreencast(devtools);
    await devtools.evaluate(`(() => { const field=document.getElementById('employee-id'); field.value=''; field.focus(); field.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    for (const character of 'EMP-001') {
      await devtools.send('Input.insertText', { text: character });
      await delay(190);
    }
    await delay(280);
    await typingCast.stop();
    report.typingVideo = await encodeVideo(typingCast.frames, 'realtime-employee-id-typing.mp4');
    report.typingFrames = typingCast.frames.length;

    const responsive = [];
    for (const width of widths) {
      await setViewport(devtools, width, 1000);
      const result = await devtools.evaluate(`(() => {
        const card=document.getElementById('card-wrap').getBoundingClientRect();
        const preview=document.getElementById('preview-panel').getBoundingClientRect();
        return {
          width:innerWidth,cardWidth:+card.width.toFixed(2),cardHeight:+card.height.toFixed(2),
          aspectRatio:+(card.width/card.height).toFixed(3),centerOffset:+((card.left+card.width/2)-(preview.left+preview.width/2)).toFixed(2),
          overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)>innerWidth,
          contained:card.left>=preview.left-1&&card.right<=preview.right+1,
        };
      })()`);
      assert(Math.abs(result.centerOffset) < 1, `card centered at ${width}px`);
      assert(Math.abs(result.aspectRatio - (340 / 214)) < .01, `card ratio preserved at ${width}px`);
      assert(!result.overflow && result.contained, `no overflow or card clipping at ${width}px`);
      responsive.push(result);
    }
    await setViewport(devtools, 390, 844);
    await setInput(devtools, 'EMP-001');
    await screenshot(devtools, 'mobile-cinematic-preview.png');
    const mobileStages = await runAnimation(devtools);
    const mobileCardArrival = mobileStages.find((item) => item.stage === 'card-arrived');
    assert(Math.abs(mobileCardArrival.cardCenterOffset) < 1 && Math.abs(mobileCardArrival.cardCenterOffsetY) < 1, 'mobile card finishes centered in the modal');
    assert(Math.abs(mobileCardArrival.cardAspectRatio - (340 / 214)) < .01, 'mobile card proportion remains fixed during movement');
    report.mobileAnimation = { viewport: [390, 844], cardArrival: mobileCardArrival, completed: mobileStages.some((item) => item.stage === 'complete') };

    await setViewport(devtools, 1440, 1000);
    await devtools.send('Page.navigate', { url: pageUrl });
    await waitForPage(devtools);
    const animationCast = await beginScreencast(devtools);
    const pageClockAnchor = await devtools.evaluate('({now:performance.now(),origin:performance.timeOrigin})');
    const nodeClockAnchor = performance.now();
    await fillValidCredentials(devtools);
    await devtools.evaluate(`document.getElementById('sign-in').click()`);
    await delay(80);
    await devtools.evaluate(`document.getElementById('sign-in').click()`);
    await waitForStage(devtools, 'preview-expand');
    await delay(120);
    await screenshot(devtools, 'concept-a-preview-expansion.png');
    await waitForStage(devtools, 'welcome-overlay');
    await waitForStage(devtools, 'complete');
    const stages = await devtools.evaluate('window.__revisionStages || []');
    const requiredStages = ['button-response', 'form-and-card-motion', 'preview-expand', 'welcome-overlay', 'dashboard-reveal', 'complete'];
    for (const stage of requiredStages) assert(stages.some((item) => item.stage === stage), `animation visits ${stage}`);
    const cardArrival = stages.find((item) => item.stage === 'card-arrived');
    assert(Math.abs(cardArrival.cardCenterOffset) < 1, 'card finishes centered in the modal');
    assert(Math.abs(cardArrival.cardAspectRatio - (340 / 214)) < .01, 'card proportion remains fixed during movement');
    assert(cardArrival.previewOverflow === 'visible', 'preview does not clip the moving card');
    report.cardArrival = cardArrival;
    await delay(360);
    await animationCast.stop();
    report.animationVideo = await encodeVideo(animationCast.frames, 'concept-a-complete-animation.mp4');
    const welcomeStage = stages.find((item) => item.stage === 'welcome-overlay');
    report.welcomeScreenshot = await saveFrameAtPageTime(
      animationCast.frames,
      welcomeStage.time + 680,
      pageClockAnchor,
      nodeClockAnchor,
      'concept-a-welcome.png',
    );
    report.animationFrames = animationCast.frames.length;
    report.animationStages = stages;

    await devtools.evaluate(`document.getElementById('replay-demo').click()`);
    await delay(80);
    const repeatStages = await runAnimation(devtools);
    assert(repeatStages.some((item) => item.stage === 'complete'), 'animation completes after replay reset');
    report.replayCompleted = true;

    await devtools.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await setViewport(devtools, 390, 844);
    await devtools.evaluate(`document.getElementById('replay-demo').click()`);
    await delay(80);
    const reducedStages = await runAnimation(devtools);
    const reducedResult = await devtools.evaluate(`({matches:matchMedia('(prefers-reduced-motion: reduce)').matches,active:document.getAnimations().filter(item=>item.playState==='running').length,stage:document.body.dataset.animationStage})`);
    assert(reducedResult.matches && reducedResult.stage === 'complete' && reducedResult.active === 0, 'reduced-motion flow completes without active animations');
    report.reducedMotion = { ...reducedResult, viewport: [390, 844] };
    report.reducedMotionStages = reducedStages;

    report.noApiRequests = !requests.some((url) => /\/api\b|:3011\b/i.test(url));
    assert(report.noApiRequests, 'prototype makes no API/backend requests');
    report.errors = errors;
    report.responsive = responsive;
    report.partialStates = partialStates;
    report.employeeResults = employeeResults;
    report.unknownEmployee = unknown;
    await fs.writeFile(path.join(evidenceDir, 'verification.json'), JSON.stringify(report, null, 2));
    process.stdout.write(`Verified Revision v1.3. Evidence: ${evidenceDir}\n`);
  } finally {
    await devtools.send('Browser.close').catch(() => {});
    if (browser.child.exitCode === null) {
      await new Promise((resolve) => {
        const timer = setTimeout(() => { browser.child.kill('SIGTERM'); resolve(); }, 5000);
        browser.child.once('exit', () => { clearTimeout(timer); resolve(); });
      });
    }
    devtools.socket.close();
    await fs.rm(browser.profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 300 });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
