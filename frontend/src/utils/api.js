// frontend/src/utils/api.js — ตัวเรียก API ตัวเดียวของแอป (ทุกหน้ายิง backend ผ่านไฟล์นี้)
// backend ตอบ error มาในรูป { error: "..." } เสมอ (backend/middleware/errorHandler.js)
//
// ⚠️ ถ้าเพิ่มระบบ login ทีหลัง: 401 ห้าม redirect เตะผู้ใช้ออก — ดูแบบใน MECHA2_QC_GAUGE_SYSTEM
import { useCallback, useEffect, useState } from 'react';
import { API_ORIGIN, APP_BASE } from './config';

export const API_BASE = `${API_ORIGIN}${APP_BASE}/api`;

async function request(method, url, body) {
  let res;
  try {
    res = await fetch(API_BASE + url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch โยนตอนต่อ server ไม่ได้เลย (backend ไม่ได้รัน / พอร์ตผิด / CORS)
    throw new Error('ติดต่อเซิร์ฟเวอร์ไม่ได้ — เช็คว่า backend รันอยู่');
  }
  const data = await res.json().catch(() => null);
  // 200 แต่ไม่ใช่ JSON = Apache ไม่ได้ proxy /api ไป backend แล้ว RewriteRule ส่ง index.html มาแทน
  // ต้อง throw ไม่งั้นหน้าได้ null ไปใช้ต่อแล้วจอขาว
  if (res.ok && data === null) {
    throw new Error(`API ตอบกลับไม่ใช่ JSON — เช็ค ProxyPass ${APP_BASE}/api/ ใน config Apache`);
  }
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText || `คำขอล้มเหลว (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body ?? {}),
  put: (url, body) => request('PUT', url, body ?? {}),
  patch: (url, body) => request('PATCH', url, body ?? {}),
  del: (url) => request('DELETE', url),
};

/** โหลดข้อมูลจาก GET url → { data, error, loading, reload } · url = null คือยังไม่โหลด */
export function useLoad(url) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const reload = useCallback(() => {
    if (!url) { setState({ data: null, error: null, loading: false }); return; }
    setState((s) => ({ ...s, loading: true }));
    api.get(url)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((e) => setState({ data: null, error: e.message, loading: false }));
  }, [url]);
  useEffect(reload, [reload]);
  return { ...state, reload };
}
