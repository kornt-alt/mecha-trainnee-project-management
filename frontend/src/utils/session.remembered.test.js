// frontend/src/utils/session.remembered.test.js — ทดสอบเซสชันจำอุปกรณ์ 24 ชั่วโมง
import {
  getRememberedSession,
  REMEMBERED_TTL_MS,
  REMEMBERED_KEY,
  setRememberedSession,
  clearRememberedSession,
  continueAsGuest,
} from './session';

const KEY = 'mecha.remembered';

function clear() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ไม่มี storage ก็ทดสอบต่อไม่ได้ แต่ไม่ให้พัง
  }
}

beforeEach(clear);
afterEach(clear);

test('ส่งออกค่าคงที่ KEY และ TTL ถูกต้อง', () => {
  expect(REMEMBERED_KEY).toBe('mecha.remembered');
  expect(REMEMBERED_TTL_MS).toBe(24 * 60 * 60 * 1000);
});

test('set แล้ว get คืน employeeId และ expiresAt ภายในหน่วงเวลา 24 ชม.', () => {
  const before = Date.now();
  setRememberedSession('emp-001');
  const s = getRememberedSession();
  expect(s).not.toBeNull();
  expect(s.employeeId).toBe('emp-001');
  expect(s.expiresAt - before).toBeGreaterThanOrEqual(0);
  expect(s.expiresAt - before).toBeLessThanOrEqual(REMEMBERED_TTL_MS + 10);
});

test('get คืน null เมื่อเซสชันหมดอายุแล้ว', () => {
  const oldNow = Date.now;
  Date.now = () => 0;
  try {
    setRememberedSession('emp-001');
  } finally {
    Date.now = oldNow;
  }
  // ปรับเวลาปัจจุบันให้เกิน expiresAt (ผ่านไปแล้ว 24 ชม.)
  const future = Date.now();
  Date.now = () => future + REMEMBERED_TTL_MS + 1000;
  try {
    expect(getRememberedSession()).toBeNull();
  } finally {
    Date.now = oldNow;
  }
});

test('get คืน null เมื่อยังไม่มีอะไรถูกเก็บไว้', () => {
  expect(getRememberedSession()).toBeNull();
});

test('clear ลบเซสชันที่จดจำไว้ออกหมด', () => {
  setRememberedSession('emp-001');
  clearRememberedSession();
  expect(getRememberedSession()).toBeNull();
});

test('clear emits one event when a remembered record exists', () => {
  setRememberedSession('emp-001');
  const onSessionChange = jest.fn();
  window.addEventListener('mecha-session-change', onSessionChange);

  clearRememberedSession();

  expect(onSessionChange).toHaveBeenCalledTimes(1);
  window.removeEventListener('mecha-session-change', onSessionChange);
});

test('guest dismissal does not emit a repeated event when no remembered record exists', () => {
  const onSessionChange = jest.fn();
  window.addEventListener('mecha-session-change', onSessionChange);

  continueAsGuest();
  clearRememberedSession();

  expect(JSON.parse(window.sessionStorage.getItem('mecha.session'))).toEqual({ guest: true });
  expect(onSessionChange).toHaveBeenCalledTimes(1);
  window.removeEventListener('mecha-session-change', onSessionChange);
  window.sessionStorage.removeItem('mecha.session');
});

test('ไม่เคยเก็บรหัสผ่านใน localStorage', () => {
  setRememberedSession('emp-001');
  const raw = window.localStorage.getItem(KEY);
  const parsed = JSON.parse(raw);
  expect(parsed.password).toBeUndefined();
  expect(parsed.employeeId).toBe('emp-001');
  expect(parsed.expiresAt).toBeDefined();
});

test('get คืน null เมื่อข้อมูลใน localStorage เป็น JSON ผิดรูป', () => {
  window.localStorage.setItem(KEY, 'not-json-at-all');
  expect(getRememberedSession()).toBeNull();
});

test('get คืน null เมื่อขาด employeeId หรือ expiresAt', () => {
  window.localStorage.setItem(KEY, JSON.stringify({ employeeId: 'emp-001' }));
  expect(getRememberedSession()).toBeNull();

  window.localStorage.setItem(KEY, JSON.stringify({ expiresAt: Date.now() + REMEMBERED_TTL_MS }));
  expect(getRememberedSession()).toBeNull();
});
