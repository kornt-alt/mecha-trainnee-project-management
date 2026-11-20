// frontend/src/utils/session.js — สถานะ login ของหน้าเว็บ (ช่วงยังไม่ต่อ backend: เก็บใน sessionStorage ของแท็บนี้)
//
// ทำไมมี: เดิมหน้าต่าง login เด้งทุกครั้งที่กลับหน้าหลัก และ login แล้วไม่ได้เปลี่ยนผู้ใช้จริง
// session = { employeeId } หลัง login · { guest: true } เมื่อปิดหน้าต่าง login โดยไม่เข้าสู่ระบบ · null = ยังไม่ตัดสินใจ
// ⚠️ ตอนต่อ POST /auth/login จริง (docs/api-contract.md) ให้เก็บ token ที่นี่ที่เดียว แล้วเลิกใช้รหัสผ่านอะไรก็ได้
import { useEffect, useState } from 'react';

const KEY = 'mecha.session';
const EVENT = 'mecha-session-change';

// sessionStorage ใช้ไม่ได้ในบางโหมด (private / ถูกบล็อก) — พังแล้วต้องไม่ทำให้แอปขาว
export function getLoginSession() {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save(value) {
  try {
    if (value) window.sessionStorage.setItem(KEY, JSON.stringify(value));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // เก็บไม่ได้ก็ยังใช้งานต่อได้ แค่ refresh แล้วต้อง login ใหม่
  }
  window.dispatchEvent(new Event(EVENT));
}

export const setLoginSession = (employeeId) => save({ employeeId: String(employeeId) });
export const continueAsGuest = () => save({ guest: true });
export const clearLoginSession = () => save(null);

// ค่า session ปัจจุบัน + render ใหม่เมื่อ login / ออกจากระบบ
export function useLoginSession() {
  const [session, setSession] = useState(getLoginSession);
  useEffect(() => {
    const sync = () => setSession(getLoginSession());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return session;
}
