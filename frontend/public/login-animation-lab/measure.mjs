// Runs headed Chromium captures for the isolated MECHA animation lab.
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';
import { gzipSync } from 'node:zlib';

const root = path.dirname(new URL(import.meta.url).pathname);
const evidenceDir = path.join(root, 'evidence');
const baseUrl = process.env.LOGIN_LAB_URL || 'http://localhost:3000/PROJECT-MANAGEMENT/login-animation-lab/index.html';
const runCount = Math.max(1, Number(process.argv.find((arg) => arg.startsWith('--runs='))?.split('=')[1] || 5));
const concepts = ['a', 'b', 'c'];

class DevTools {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
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
        return;
      }
      for (const handler of this.handlers.get(message.method) || []) handler(message.params || {});
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
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

  once(method) {
    return new Promise((resolve) => {
      const off = this.on(method, (params) => { off(); resolve(params); });
    });
  }

  async evaluate(expression, timeout = 20000) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
      timeout,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result?.value;
  }
}

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForTarget(port, browserProcess) {
  const end = Date.now() + 20000;
  let lastError = '';
  while (Date.now() < end) {
    if (browserProcess.exitCode !== null) throw new Error(`Chromium exited early (${browserProcess.exitCode}): ${lastError}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const target = targets.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
      if (target) return target;
    } catch (error) {
      lastError = error.message;
    }
    await delay(200);
  }
  throw new Error(`Chromium DevTools did not become ready: ${lastError}`);
}

async function launchChromium() {
  const port = await reservePort();
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'mecha-login-lab-chrome-'));
  const binary = process.env.CHROMIUM_BIN || 'chromium';
  const versionResult = spawnSync(binary, ['--version'], { encoding: 'utf8' });
  const startUrl = `${baseUrl}?concept=a`;
  const args = [
    '--no-first-run', '--no-default-browser-check', '--disable-pings',
    `--remote-debugging-port=${port}`, '--remote-allow-origins=*',
    `--user-data-dir=${profile}`, '--window-size=1440,960', '--force-device-scale-factor=1',
    `--app=${startUrl}`,
  ];
  if (process.env.WAYLAND_DISPLAY) args.push('--ozone-platform=wayland');
  const child = spawn(binary, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let diagnostics = '';
  child.stderr.on('data', (chunk) => { diagnostics = (diagnostics + chunk.toString()).slice(-3000); });
  const target = await waitForTarget(port, child).catch(async (error) => {
    child.kill('SIGTERM');
    throw new Error(`${error.message}\n${diagnostics}`);
  });
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const devtools = new DevTools(socket);
  await Promise.all([devtools.send('Page.enable'), devtools.send('Runtime.enable'), devtools.send('Log.enable')]);
  return { devtools, child, profile, version: versionResult.stdout?.trim() || 'unknown', diagnostics: () => diagnostics };
}

let stageBindingInstalled = false;

async function navigate(devtools, concept, capture = false) {
  if (capture && !stageBindingInstalled) {
    await devtools.send('Runtime.addBinding', { name: 'loginLabStageSignal' });
    stageBindingInstalled = true;
  }
  const captureQuery = capture ? '&capture=1' : '';
  await devtools.send('Page.navigate', { url: `${baseUrl}?concept=${concept}${captureQuery}` });
  await devtools.evaluate(`(async () => {
    const end = Date.now() + 20000;
    while (Date.now() < end) {
      if (window.loginAnimationLab && document.getElementById('modalWrap')) {
        await window.loginAnimationLab.initialize();
        await new Promise((resolve) => setTimeout(resolve, 550));
        return { concept: window.loginAnimationLab.concept, viewport: [innerWidth, innerHeight] };
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('Login Animation Lab did not initialize.');
  })()`);
}

const armSampler = `(() => {
  const run = { intervals: [], longTasks: [], stages: [] };
  let active = false;
  let previous = 0;
  let observer;
  const onStage = (event) => {
    const name = event.detail.stage;
    run.stages.push({ name, time: performance.now() });
    if (name === 'button-response') {
      active = true;
      previous = 0;
      requestAnimationFrame(sample);
    }
    if (name === 'dashboard-complete') active = false;
  };
  function sample(time) {
    if (!active) return;
    if (previous) run.intervals.push(time - previous);
    previous = time;
    requestAnimationFrame(sample);
  }
  try {
    observer = new PerformanceObserver((list) => {
      if (active) for (const item of list.getEntries()) run.longTasks.push({ start: item.startTime, duration: item.duration });
    });
    observer.observe({ type: 'longtask', buffered: false });
  } catch (_) {}
  window.addEventListener('login-lab-stage', onStage);
  window.__labMeasureResult = () => {
    observer?.disconnect();
    window.removeEventListener('login-lab-stage', onStage);
    return run;
  };
})()`;

async function startFlow(devtools, arm) {
  return devtools.evaluate(`(async () => {
    const wrap = document.getElementById('modalWrap');
    if (wrap.hidden) document.getElementById('reopenBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 520));
    const employee = document.getElementById('empId');
    const password = document.getElementById('password');
    employee.value = 'EMP-001';
    employee.dispatchEvent(new Event('input', { bubbles: true }));
    password.value = 'demo-password';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    ${arm ? armSampler : ''}
    document.getElementById('submitBtn').click();
    return { disabled: document.getElementById('submitBtn').disabled };
  })()`);
}

async function waitForComplete(devtools, timeoutMs = 18000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await devtools.evaluate(`({stage: document.body.dataset.stage, hidden: document.getElementById('modalWrap').hidden})`);
    if (state.stage === 'dashboard-complete' && state.hidden) return;
    await delay(40);
  }
  throw new Error(`Timed out waiting for Dashboard Reveal: ${JSON.stringify(await devtools.evaluate(`({stage:document.body.dataset.stage,hidden:document.getElementById('modalWrap').hidden})`))}`);
}

function stats(run, concept, trial) {
  const sorted = [...run.intervals].sort((a, b) => a - b);
  const percentile = (p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)] : null;
  const durations = {};
  for (let index = 1; index < run.stages.length; index += 1) {
    const previous = run.stages[index - 1];
    const current = run.stages[index];
    durations[`${previous.name} -> ${current.name}`] = Math.round((current.time - previous.time) * 10) / 10;
  }
  return {
    concept, trial, intervalSource: 'headed-page requestAnimationFrame callback intervals; compositor presentation telemetry is separate',
    frameSamples: sorted.length,
    medianMs: percentile(.5) === null ? null : +percentile(.5).toFixed(2),
    p95Ms: percentile(.95) === null ? null : +percentile(.95).toFixed(2),
    maxMs: sorted.length ? +sorted.at(-1).toFixed(2) : null,
    over50ms: sorted.filter((value) => value > 50).length,
    longTasks: run.longTasks.map((item) => ({ durationMs: +item.duration.toFixed(1) })),
    stageDurationsMs: durations,
  };
}

async function writeScreenshot(devtools, filename) {
  const shot = await devtools.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  await fs.writeFile(path.join(evidenceDir, filename), Buffer.from(shot.data, 'base64'));
}

async function recordSequence(devtools, concept) {
  await navigate(devtools, concept, true);
  const frames = [];
  const off = devtools.on('Page.screencastFrame', (event) => {
    frames.push({ data: event.data, received: performance.now() });
    devtools.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
  });
  const stageSignals = [];
  const offStage = devtools.on('Runtime.bindingCalled', (event) => {
    if (event.name !== 'loginLabStageSignal') return;
    try {
      stageSignals.push({ ...JSON.parse(event.payload), received: performance.now() });
    } catch (_) {}
  });
  let recording = false;
  let movie = {};
  try {
    await devtools.send('Page.startScreencast', { format: 'jpeg', quality: 72, maxWidth: 1440, maxHeight: 900, everyNthFrame: 1 });
    recording = true;
    await startFlow(devtools, false);
    await waitForComplete(devtools);
    await delay(420);
  } finally {
    if (recording) await devtools.send('Page.stopScreencast').catch(() => {});
    off();
    offStage();
    movie = await encodeMovie(frames, `concept-${concept}.mp4`);
  }
  const selectedFrames = await saveStageFrames(frames, stageSignals, concept);
  const buttonTime = stageSignals.find((item) => item.stage === 'button-response')?.received;
  const stageTimes = stageSignals.map(({ stage, received }) => ({
    stage,
    msFromButtonResponse: buttonTime === undefined ? null : +(received - buttonTime).toFixed(1),
  }));
  const finalState = await devtools.evaluate(`(() => ({
    stage: document.body.dataset.stage,
    dashboardReveal: document.body.dataset.dashboardReveal,
    modalHidden: document.getElementById('modalWrap').hidden,
    dashboardFilter: getComputedStyle(document.getElementById('dashboardFrame')).filter,
    dashboardTransform: getComputedStyle(document.getElementById('dashboardFrame')).transform,
  }))()`);
  return { ...movie, screencastFrames: frames.length, stageTimes, selectedFrames, finalState };
}

async function captureEvidence(devtools, concept) {
  await navigate(devtools, concept);
  await writeScreenshot(devtools, `concept-${concept}-initial.png`);
  const recording = await recordSequence(devtools, concept);
  return recording;
}

async function saveStageFrames(frames, stageSignals, concept) {
  const formStage = concept === 'b' ? 'form-fade' : 'form-and-card-motion';
  const samples = [
    { stage: 'button-response', name: 'button-loading', offsetMs: 80 },
    { stage: formStage, name: concept === 'b' ? 'form-fade' : 'card-motion', offsetMs: 300 },
    { stage: 'welcome-overlay', name: 'welcome', offsetMs: 140 },
    { stage: 'dashboard-reveal', name: 'dashboard-reveal', offsetMs: concept === 'c' ? 650 : 240 },
    { stage: 'dashboard-complete', name: 'complete', offsetMs: 300 },
  ];
  const selected = [];
  for (const sample of samples) {
    const signal = stageSignals.find((item) => item.stage === sample.stage);
    if (!signal) continue;
    const targetTime = signal.received + sample.offsetMs;
    const frame = frames.reduce((best, item) => (
      !best || Math.abs(item.received - targetTime) < Math.abs(best.received - targetTime) ? item : best
    ), null);
    if (!frame) continue;
    const filename = `concept-${concept}-${sample.name}.jpg`;
    await fs.writeFile(path.join(evidenceDir, filename), Buffer.from(frame.data, 'base64'));
    selected.push({
      stage: sample.stage,
      file: filename,
      requestedOffsetMs: sample.offsetMs,
      actualOffsetMs: +(frame.received - signal.received).toFixed(1),
      frameDistanceFromTargetMs: +(frame.received - targetTime).toFixed(1),
    });
  }
  return selected;
}

async function encodeMovie(frames, filename) {
  if (!frames.length) return { video: null, videoReason: 'Chromium supplied no screencast frames.' };
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'mecha-login-lab-video-'));
  try {
    const lines = ['ffconcat version 1.0'];
    for (let index = 0; index < frames.length; index += 1) {
      const imageName = `${String(index).padStart(5, '0')}.jpg`;
      await fs.writeFile(path.join(temp, imageName), Buffer.from(frames[index].data, 'base64'));
      const next = frames[index + 1];
      const seconds = next ? Math.max(.01, Math.min(.25, (next.received - frames[index].received) / 1000)) : .067;
      lines.push(`file '${imageName}'`, `duration ${seconds.toFixed(4)}`);
    }
    lines.push(`file '${String(frames.length - 1).padStart(5, '0')}.jpg'`);
    await fs.writeFile(path.join(temp, 'frames.ffconcat'), `${lines.join('\n')}\n`);
    const output = path.join(evidenceDir, filename);
    const result = spawnSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'frames.ffconcat',
      '-fps_mode', 'vfr', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '25',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output,
    ], { cwd: temp, encoding: 'utf8' });
    if (result.status !== 0) return { video: null, videoReason: result.stderr || result.error?.message || 'ffmpeg failed.' };
    const { size } = await fs.stat(output);
    return { video: filename, videoBytes: size };
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}

async function collectTrace(devtools, concept) {
  const events = [];
  const off = devtools.on('Tracing.dataCollected', ({ value }) => events.push(...value));
  const complete = devtools.once('Tracing.tracingComplete');
  const categories = 'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,blink.user_timing,cc,disabled-by-default-cc.debug,gpu,viz,benchmark';
  await devtools.send('Tracing.start', { categories, transferMode: 'ReportEvents' });
  await startFlow(devtools, false);
  await waitForComplete(devtools);
  await devtools.send('Tracing.end');
  await complete;
  off();
  const traceFilename = `concept-${concept}-trace.json.gz`;
  await fs.writeFile(path.join(evidenceDir, traceFilename), gzipSync(JSON.stringify({ traceEvents: events })));
  const stageMarkers = events
    .filter((event) => event.name === 'TimeStamp' && event.args?.data?.message?.startsWith('login-lab-stage:'))
    .map((event) => ({ stage: event.args.data.message.slice('login-lab-stage:'.length), ts: event.ts }));
  const startMarker = stageMarkers.find((event) => event.stage === 'button-response');
  const endMarker = stageMarkers.find((event) => event.stage === 'dashboard-complete');
  const animationEvents = startMarker && endMarker
    ? events.filter((event) => event.ts >= startMarker.ts && event.ts <= endMarker.ts)
    : events;
  const wanted = /RasterTask|FinishPaintRenderPass|Paint|Layout|UpdateLayoutTree|BeginFrame|DrawFrame|SubmitCompositorFrame|FramePresented/;
  const aggregate = {};
  for (const event of animationEvents) {
    if (!wanted.test(event.name || '')) continue;
    const item = aggregate[event.name] || (aggregate[event.name] = { count: 0, durationMs: 0 });
    item.count += 1;
    if (typeof event.dur === 'number') item.durationMs += event.dur / 1000;
  }
  return {
    file: traceFilename,
    scope: startMarker && endMarker ? 'between button-response and dashboard-complete stage markers' : 'whole trace; stage markers unavailable',
    stageMarkers: stageMarkers.map(({ stage }) => stage),
    eventCount: animationEvents.length,
    events: Object.fromEntries(Object.entries(aggregate).map(([name, item]) => [name, { count: item.count, summedDurationMs: +item.durationMs.toFixed(2) }])),
  };
}

async function responsiveCheck(devtools) {
  await navigate(devtools, 'a');
  const results = [];
  for (const width of [320, 340, 360, 375, 390, 414, 767, 1024, 1440]) {
    await devtools.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width <= 767 });
    await delay(100);
    const measurement = await devtools.evaluate(`(() => {
      const card = document.getElementById('cardWrap').getBoundingClientRect();
      const preview = document.getElementById('previewCol').getBoundingClientRect();
      return {
        width: innerWidth,
        cardWidth: +card.width.toFixed(2),
        cardHeight: +card.height.toFixed(2),
        cardAspectRatio: +(card.width / card.height).toFixed(3),
        centerOffsetPx: +((card.left + card.width / 2) - (preview.left + preview.width / 2)).toFixed(2),
        horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth,
      };
    })()`);
    results.push(measurement);
    if ([320, 390, 767, 1024, 1440].includes(width)) await writeScreenshot(devtools, `responsive-${width}.png`);
  }
  await devtools.send('Emulation.clearDeviceMetricsOverride');
  return results;
}

async function reducedMotionCheck(devtools) {
  await devtools.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const results = [];
  for (const concept of concepts) {
    await navigate(devtools, concept);
    await devtools.evaluate(`(() => {
      window.__labReducedStages = [];
      window.addEventListener('login-lab-stage', (event) => window.__labReducedStages.push({ stage: event.detail.stage, time: performance.now() }));
    })()`);
    await startFlow(devtools, false);
    await waitForComplete(devtools);
    const result = await devtools.evaluate(`(() => {
      const stages = window.__labReducedStages;
      const start = stages.find((item) => item.stage === 'button-response');
      const end = stages.find((item) => item.stage === 'dashboard-complete');
      return {
        concept: window.loginAnimationLab.concept,
        reducedMotionMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
        completed: document.body.dataset.stage === 'dashboard-complete',
        durationMs: start && end ? +(end.time - start.time).toFixed(1) : null,
        activeAnimations: document.getAnimations().filter((animation) => animation.playState === 'running').length,
      };
    })()`);
    results.push(result);
  }
  await devtools.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  return results;
}

async function main() {
  await fs.mkdir(evidenceDir, { recursive: true });
  const browser = await launchChromium();
  const devtools = browser.devtools;
  const errors = [];
  devtools.on('Runtime.exceptionThrown', ({ exceptionDetails }) => errors.push(exceptionDetails.exception?.description || exceptionDetails.text));
  devtools.on('Log.entryAdded', ({ entry }) => { if (entry.level === 'error') errors.push({ text: entry.text, url: entry.url || null }); });
  const measurements = [];
  const output = { generatedAt: new Date().toISOString(), environment: { browser: 'headed system Chromium', chromiumBinary: process.env.CHROMIUM_BIN || 'chromium', chromiumVersion: browser.version, display: process.env.DISPLAY || null, wayland: process.env.WAYLAND_DISPLAY || null, runCount }, measurements };
  try {
    for (let trial = 1; trial <= runCount; trial += 1) {
      for (const concept of concepts) {
        await navigate(devtools, concept);
        await startFlow(devtools, true);
        await waitForComplete(devtools);
        await delay(80);
        const run = await devtools.evaluate('window.__labMeasureResult()');
        measurements.push(stats(run, concept, trial));
        process.stdout.write(`Measured concept ${concept.toUpperCase()}, run ${trial}/${runCount}: p95 ${measurements.at(-1).p95Ms} ms, max ${measurements.at(-1).maxMs} ms, >50 ms ${measurements.at(-1).over50ms}\n`);
      }
    }
    output.measurementSummary = Object.fromEntries(concepts.map((concept) => {
      const rows = measurements.filter((row) => row.concept === concept);
      const average = (key) => +(rows.reduce((sum, row) => sum + (row[key] || 0), 0) / rows.length).toFixed(2);
      return [concept, { runs: rows.length, medianMsAcrossRuns: average('medianMs'), p95MsAcrossRuns: average('p95Ms'), maxIntervalMs: Math.max(...rows.map((row) => row.maxMs || 0)), intervalsOver50ms: rows.reduce((sum, row) => sum + row.over50ms, 0) }];
    }));

    output.traceEvents = {};
    for (const concept of concepts) {
      await navigate(devtools, concept);
      output.traceEvents[concept] = await collectTrace(devtools, concept);
      process.stdout.write(`Captured Chrome trace for concept ${concept.toUpperCase()}\n`);
    }

    output.evidence = {};
    for (const concept of concepts) {
      output.evidence[concept] = await captureEvidence(devtools, concept);
      process.stdout.write(`Captured screenshots/video for concept ${concept.toUpperCase()}\n`);
    }
    output.responsive = await responsiveCheck(devtools);
    output.reducedMotion = await reducedMotionCheck(devtools);
    output.consoleErrors = [...new Map(errors.map((item) => [`${item.url || ''}\0${item.text || item}`, item])).values()];
    await fs.writeFile(path.join(evidenceDir, 'results.json'), JSON.stringify(output, null, 2));
    process.stdout.write(`Results: ${path.join(evidenceDir, 'results.json')}\n`);
  } finally {
    await devtools.send('Browser.close').catch(() => {});
    if (browser.child.exitCode === null) {
      await new Promise((resolve) => {
        const timer = setTimeout(() => { browser.child.kill('SIGTERM'); resolve(); }, 5000);
        browser.child.once('exit', () => { clearTimeout(timer); resolve(); });
      });
    }
    devtools.socket.close();
    await fs.rm(browser.profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
