# Remember This Device (24 Hours) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Remember this device for 24 hours" checkbox to the existing MECHA Login modal so a remembered mock session persists across page refreshes/browser restarts for 24 hours, while logout clears it. Frontend-only mock auth; no backend/API/database changes.

**Architecture:** Extend the existing `utils/session.js` session mechanism with a localStorage-backed remembered session (`mecha.remembered` key, `{ employeeId, expiresAt }`). Hydrate from it in `App.js` when no sessionStorage session exists. Add the checkbox to `LoginModal.js` and call `setRememberedSession` on successful login; `clearRememberedSession` on logout. Employee-ID validation only (exists + active); password validation deferred to backend Phase API Integration (mock accepts any non-empty password as today).

**Tech Stack:** React 19, react-scripts CRA, localStorage (browser API, no new dependencies), existing `session.js`/`MockDataContext.js`/`App.js`/`LoginModal.js`.

**Spec:** This plan file (`docs/superpowers/plans/2026-11-23-remember-device.md`); user-approved design from brainstorming (Approach A, option 1).

## Global Constraints

- Frontend-only mock auth prototype. NO backend/API/database changes.
- NO new dependencies; NO changes to `frontend/build/`.
- NO git mutations: no commit/push/reset/checkout/stash.
- Preserve all existing changes, untracked files (47 untracked), and 3 stashes.
- Branch `page/login`, HEAD `2a649467`, 11 ahead of origin.
- Do NOT redesign the Login page; add ONLY the checkbox.
- Match existing typography/spacing/colors/component style; responsive; keyboard accessible with associated checkbox label.
- No dark mode/theme toggle; no browser fingerprinting as authentication.
- Do NOT change employee records; do NOT duplicate credentials; do NOT store passwords.
- 24-hour absolute expiration starting at successful login; NOT extended on refresh/activity.
- Stored session = employeeId + expiresAt only.
- Expired/invalid stored session → clear and redirect to Login.
- Logout clears both sessionStorage session and localStorage remembered session.

## Review Focus

- `sessionStorage` vs `localStorage` scope: remembered session is per-origin, not synced across browsers/devices (documented limitation).
- Stored session must never contain the password.
- Expiration is absolute from login time, not sliding on activity.
- Logout must clear remembered session so it cannot auto-authenticate again.
- Invalid employee ID in stored session (employee removed/disabled) must clear and require login.
- Password validation is NOT implemented here (mock data has no password field) — deferred to backend Phase API Integration.

## Tasks

### Task 1: session.js remembered-session helpers

**Files:**
- Modify: `frontend/src/utils/session.js`

**Interfaces:**
- Consumes: none new (existing `window.localStorage`, `window.dispatchEvent`)
- Produces: `REMEMBERED_KEY = 'mecha.remembered'`, `REMEMBERED_TTL_MS = 24 * 60 * 60 * 1000`, `setRememberedSession(employeeId)`, `getRememberedSession()`, `clearRememberedSession()`

- [ ] **Step 1: Write the failing test**

Test file: `frontend/src/utils/session.remembered.test.js` (new).
```js
const KEY = 'mecha.remembered';
const TTL = 24 * 60 * 60 * 1000;

function clear() { try { window.localStorage.removeItem(KEY); } catch {} }

beforeEach(clear);
afterEach(clear);

test('set then get returns employeeId and expiresAt', () => {
  const { setRememberedSession, getRememberedSession } = require('./session');
  setRememberedSession('emp-001');
  const s = getRememberedSession();
  expect(s.employeeId).toBe('emp-001');
  expect(s.expiresAt - Date.now()).toBeGreaterThanOrEqual(0);
  expect(s.expiresAt - Date.now()).toBeLessThanOrEqual(TTL);
});

test('get returns null when expired', () => {
  const { setRememberedSession, getRememberedSession } = require('./session');
  const oldNow = Date.now;
  Date.now = () => 0;
  try {
    setRememberedSession('emp-001');
  } finally {
    Date.now = oldNow;
  }
  expect(getRememberedSession()).toBeNull();
});

test('get returns null when nothing stored', () => {
  const { getRememberedSession } = require('./session');
  expect(getRememberedSession()).toBeNull();
});

test('clear removes stored session', () => {
  const { setRememberedSession, clearRememberedSession, getRememberedSession } = require('./session');
  setRememberedSession('emp-001');
  clearRememberedSession();
  expect(getRememberedSession()).toBeNull();
});

test('never stores password', () => {
  const { setRememberedSession } = require('./session');
  setRememberedSession('emp-001');
  const raw = window.localStorage.getItem(KEY);
  const parsed = JSON.parse(raw);
  expect(parsed.password).toBeUndefined();
});
```
- [ ] **Step 2: Run test to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/utils/session.remembered.test.js -v`
Expected: FAIL (functions not yet defined)

- [ ] **Step 3: Implement helpers in `frontend/src/utils/session.js`**

Add constants and three functions. `getRememberedSession` returns null if expired or invalid JSON. `setRememberedSession` stores `{ employeeId: String(employeeId), expiresAt: Date.now() + REMEMBERED_TTL_MS }`. Dispatch `mecha-session-change` event like existing `save()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `CI=true npx react-scripts test --watchAll=false src/utils/session.remembered.test.js -v`
Expected: PASS

- [ ] **Step 5: Commit**

Skip — no git mutations authorized.

### Task 2: App.js hydration from remembered session

**Files:**
- Modify: `frontend/src/App.js`

**Interfaces:**
- Consumes: `getRememberedSession()` from `../utils/session` (Task 1), `setActorId`, `setLoginSession` from `./context/MockDataContext` and `./utils/session` (already imported)
- Produces: on App mount, if `!session` and remembered session valid and `employeeExists(id)`, call `setActorId(id)` + `setLoginSession(id)`

- [ ] **Step 1: Write the failing test**

Covered by runtime behavior of App (LoginModal not shown when remembered session valid). No separate unit test practical without DOM rendering; verified via Task 5 runtime scenarios.

- [ ] **Step 2: Run test to verify it fails**

N/A — runtime verification in Task 5.

- [ ] **Step 3: Implement hydration in `frontend/src/App.js`**

In `RoutedApplication`, after `const showLogin = !session;`, add: if `!session`, call `getRememberedSession()`; if result valid (non-null) and `employeeExists(result.employeeId)`, call `setActorId(result.employeeId)` then `setLoginSession(result.employeeId)` so `showLogin` becomes false. Import `getRememberedSession` from `../utils/session`.

- [ ] **Step 4: Run test to verify it passes**

N/A — runtime verification in Task 5 (LoginModal does not appear on refresh when remembered session valid).

- [ ] **Step 5: Commit**

Skip — no git mutations authorized.

### Task 3: LoginModal checkbox + remember on login, clear on logout

**Files:**
- Modify: `frontend/src/components/auth/LoginModal.js`

**Interfaces:**
- Consumes: `setRememberedSession`, `clearRememberedSession` from `../utils/session` (Task 1); `onLoggedIn(employee)` from parent (already provided)
- Produces: checked-state checkbox "Remember this device for 24 hours" in form; on successful login if checked, `setRememberedSession(employee.id)`; logout/close clears remembered session

- [ ] **Step 1: Write the failing test**

Test file: `frontend/src/components/auth/LoginModal.remembered.test.js` (new).
```js
test('checkbox default unchecked', () => {
  render(<LoginModal onLoggedIn={jest.fn()} onDismiss={jest.fn()} />);
  const box = screen.getByLabelText(/จดจำอุปกรณ์นี้ไว้ 24 ชั่วโมง/);
  expect(box.checked).toBe(false);
});

test('calls setRememberedSession when checked on login', async () => {
  const set = jest.fn();
  jest.mock('../utils/session', () => ({
    ...jest.requireActual('../utils/session'),
    setRememberedSession: set,
  }), { virtual: true });
  render(<LoginModal onLoggedIn={jest.fn()} onDismiss={jest.fn()} />);
  fireEvent.change(screen.getByLabelText(/รหัสพนักงาน/), { target: { value: 'emp-001' } });
  fireEvent.change(screen.getByLabelText(/รหัสผ่าน/), { target: { value: 'any' } });
  fireEvent.click(screen.getByLabelText(/จดจำอุปกรณ์นี้ไว้ 24 ชั่วโมง/));
  fireEvent.submit(screen.getByText(/เข้าสู่ระบบ/));
  await waitFor(() => expect(set).toHaveBeenCalledWith('emp-001'));
});
```
- [ ] **Step 2: Run test to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/components/auth/LoginModal.remembered.test.js -v`
Expected: FAIL (checkbox not present / setRememberedSession not called)

- [ ] **Step 3: Implement checkbox + remember logic in `frontend/src/components/auth/LoginModal.js`**

Add `const [remember, setRemember] = useState(false);` state. Add checkbox input below password field (before submit button), with associated `<label htmlFor="login-remember-device">จดจำอุปกรณ์นี้ไว้ 24 ชั่วโมง</label>`, matched styling (existing form field pattern). In `submitForm`, after successful validation before `runSignature`, if `remember` call `setRememberedSession(employee.id)`. On `closeModal` (guest dismiss) and App logout path (`clearLoginSession`), call `clearRememberedSession()`.

Import `setRememberedSession`, `clearRememberedSession` from `../utils/session`.

- [ ] **Step 4: Run test to verify it passes**

Run: `CI=true npx react-scripts test --watchAll=false src/components/auth/LoginModal.remembered.test.js -v`
Expected: PASS

- [ ] **Step 5: Commit**

Skip — no git mutations authorized.

### Task 4: Logout clears remembered session (Policy A)

**Files:**
- Modify: `frontend/src/App.js` (logout path calls `clearLoginSession` → extend to clear remembered)
- Modify: `frontend/src/utils/session.js` — `clearLoginSession` already exists; extend `save(null)` to also clear remembered? Better: add a combined `clearAllSessions()` or call both from App logout.

Decision: keep `clearLoginSession` as-is (clears sessionStorage). In App.js `logout`, call `clearLoginSession()` then `clearRememberedSession()`.

**Interfaces:**
- Consumes: `clearRememberedSession()` from `../utils/session` (Task 1)
- Produces: App logout clears both sessionStorage and localStorage remembered session

- [ ] **Step 1: Write the failing test**

Runtime-only (App logout clears localStorage remembered item). Verified in Task 5 scenario 9.

- [ ] **Step 2: Run test to verify it fails**

N/A — runtime verification in Task 5.

- [ ] **Step 3: Implement logout clearing in `frontend/src/App.js`**

In `RoutedApplication` `logout = () => { setMenuOpen(false); clearLoginSession(); clearRememberedSession(); };`. Import `clearRememberedSession`.

- [ ] **Step 4: Run test to verify it passes**

N/A — runtime verification in Task 5 scenario 9.

- [ ] **Step 5: Commit**

Skip — no git mutations authorized.

### Task 5: Runtime verification of all 13 scenarios

**Files:**
- Test: runtime (browser console on `localhost:3000/PROJECT-MANAGEMENT/`); no repo test files

**Interfaces:**
- Consumes: running frontend dev server on port 3000 (already running)
- Produces: pass/fail per scenario below

- [ ] **Step 1: Execute scenarios 1–13 manually against running server**

Scenario list:
1. Valid Employee ID + Password → logged in
2. Invalid Employee ID → error shown
3. Invalid Password (non-empty but wrong) → accepted (mock limitation, documented)
4. Remember unchecked → session lost on refresh (login reappears)
5. Remember checked → persists on refresh
6. Page refresh after login (remembered) → stays logged in
7. Browser restart simulation → clear sessionStorage, keep localStorage → stays logged in until expiry
8. 24h expiry via controlled timestamp → set expiresAt to past → redirected to Login
9. Logout clears remembered session → localStorage item removed; login reappears
10. Expired session redirects to Login → covered by 8
11. Invalid employee reference in stored session → stored emp-999 → cleared, login required
12. Protected routes reject unauthenticated → LoginModal overlays when no session
13. Visibility/role behavior unchanged → MockDataContext filtering intact

- [ ] **Step 2: Report results**

Document actual pass/fail per scenario in final report. Do not claim passed unless observed.

- [ ] **Step 5: Commit**

Skip — no git mutations authorized.

## Self-Review

- Spec coverage: every requirement (checkbox, 24h expiry, logout clears, no password storage, no backend, no build changes, responsive, keyboard accessible) maps to Tasks 1–3 or Task 5 runtime scenarios.
- Step scan: each step is one action with a checkable result; no TBD lines.
- Type consistency: `setRememberedSession(employeeId): void`, `getRememberedSession(): {employeeId, expiresAt}|null`, `clearRememberedSession(): void` consistent across Tasks 1–3.
- Review Focus: each of the 5 failure modes has a test/task (expiry → Task 1 test + scenario 8; password not stored → Task 1 test; logout clears → Task 3/4 + scenario 9; invalid employee ref → scenario 11; absolute not sliding expiry → Task 1 test).
- Proportion: plan ~1:1 with code size (3 files), appropriate for a small change.

---

**Plan complete.** Please review the plan. Does it capture what you want?

Since no execution method has been explicitly supplied, which approach would you prefer?
- **Subagent-driven** - A fresh subagent implements each task with independent review per task, then whole-branch review. Most thorough; fresh context per task.
- **Native** - I implement every task myself in this session, then one fresh review on the whole branch. Cheapest and fastest; no independent review until the end.

For this plan I recommend **Native**, because the tasks are tightly coupled through shared interfaces (session.js functions used by App.js and LoginModal.js), there are only 3 files, and a shipped mistake would be confined to the auth flow with clear rollback (revert 3 files). Does the plan capture what you want, and should we use Native execution?
