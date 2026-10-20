// backend/middleware/errorHandler.js — ที่เดียวที่ตัดสินว่า error จะถูกตอบกลับหน้าเว็บยังไง
//
// ข้อความที่ "ตั้งใจให้ผู้ใช้เห็น" ต้องประกาศตัวเองด้วย AppError เท่านั้น
// error อื่นทั้งหมดตอบเป็น 500 ข้อความกลาง ๆ (ไม่ให้รายละเอียดภายในหลุดไปหน้าจอ)
'use strict';

const GENERIC = 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาลองใหม่ หรือแจ้งผู้ดูแลระบบ';

class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.expose = true;
  }
}

// resolveErrorResponse(err) → { status, message }
// status นอกช่วง 400-599 ถือเป็น 500 (ค่าที่หลุดมาจาก library เอาไปใส่ res.status ตรง ๆ จะ throw)
const resolveErrorResponse = (err) => {
  const raw = err?.status ?? err?.statusCode;
  const status = Number.isInteger(raw) && raw >= 400 && raw <= 599 ? raw : 500;
  const message =
    err?.expose === true && typeof err?.message === 'string' && err.message.trim() !== ''
      ? err.message
      : GENERIC;
  return { status, message };
};

// ต้อง mount หลัง route ทั้งหมด
const errorHandler = (err, req, res, _next) => {
  const { status, message } = resolveErrorResponse(err);
  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl} →`, err);
  } else {
    console.warn(`[warn] ${req.method} ${req.originalUrl} → ${status} ${message}`);
  }
  // client อ่าน key `error` (frontend/src/utils/api.js) — อย่าเปลี่ยนเป็น message เฉย ๆ
  res.status(status).json({ error: message });
};

// 404 ของทุกเส้นใต้ /api ต้องเป็น JSON ไม่ใช่ HTML (หน้าเว็บเป็นหน้าที่ของ Apache)
const notFoundApi = (req, res) => {
  res.status(404).json({ error: `ไม่พบ endpoint: ${req.method} ${req.originalUrl}` });
};

// ครอบ route ให้ error เด้งเข้า errorHandler เอง ไม่ต้องเขียน try/catch ทุกเส้น
const wrap = (fn) => (req, res, next) => Promise.resolve().then(() => fn(req, res, next)).catch(next);

module.exports = { AppError, errorHandler, notFoundApi, wrap, resolveErrorResponse };
