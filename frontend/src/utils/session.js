// frontend/src/utils/session.js — สถานะ login ของหน้าเว็บ (ช่วงยังไม่ต่อ backend: เก็บใน sessionStorage ของแท็บนี้)
//
// ทำไมมี: เดิมหน้าต่าง login เด้งทุกครั้งที่กลับหน้าหลัก และ login แล้วไม่ได้เปลี่ยนผู้ใช้จริง
// session = { employeeId } หลัง login · { guest: true } เมื่อปิดหน้าต่าง login โดยไม่เข้าสู่ระบบ · null = ยังไม่ตัดสินใจ
// ⚠️ ตอนต่อ POST /auth/login จริง (docs/api-contract.md) ให้เก็บ token ที่นี่ที่เดียว แล้วเลิกใช้รหัสผ่านอะไรก็ได้
import { useEffect, useState } from 'react';

const KEY = 'mecha.session';
const EVENT = 'mecha-session-change';
// เซสชันจำอุปกรณ์ (Remember This Device) เก็บใน localStorage ข้ามการรีเฟรชและปิดเบราว์เซอร์
// เก็บแค่ employeeId กับเวลาหมดอายุเท่านั้น ห้ามเก็บรหัสผ่านเด็ดขาด
export const REMEMBERED_KEY = 'mecha.remembered';
export const REMEMBERED_TTL_MS = 24 * 60 * 60 * 1000; // หมดอายุ absoluta หลัง login 24 ชั่วโมง ไม่ยืดตามกิจกรรม

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
export const hasAuthenticatedEmployee = (session) => Boolean(session?.employeeId);

// ── เซสชันจำอุปกรณ์ (localStorage, ข้ามการปิดเบราว์เซอร์) ──
// คืน { employeeId, expiresAt } ถ้ายังไม่หมดอายุ ถ้าไม่มี หรือหมดอายุแล้ว คืน null
export function getRememberedSession() {
  try {
    const raw = window.localStorage.getItem(REMEMBERED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.employeeId || !Number.isFinite(parsed.expiresAt)) return null;
    if (Date.now() >= parsed.expiresAt) return null;
    return { employeeId: String(parsed.employeeId), expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

// เก็บเซสชันจำอุปกรณ์หลัง login สำเร็จ หมดอายุ absoluta หลังจาก 24 ชั่วโมง
export function setRememberedSession(employeeId) {
  try {
    window.localStorage.setItem(
      REMEMBERED_KEY,
      JSON.stringify({ employeeId: String(employeeId), expiresAt: Date.now() + REMEMBERED_TTL_MS }),
    );
  } catch {
    // เก็บไม่ได้ก็ให้ใช้งานต่อไป แค่รีเฟรชแล้วต้องจำอุปกรณ์ใหม่
  }
  window.dispatchEvent(new Event(EVENT));
}

// ลบเซสชันจำอุปกรณ์ออกจาก localStorage (ใช้เมื่อ logout)
export function clearRememberedSession() {
  let hadRecord = false;
  try {
    hadRecord = window.localStorage.getItem(REMEMBERED_KEY) !== null;
    if (hadRecord) window.localStorage.removeItem(REMEMBERED_KEY);
  } catch {
    // เก็บไม่ได้ก็ไม่ต้องทำอะไร
  }
  if (hadRecord) window.dispatchEvent(new Event(EVENT));
}

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
