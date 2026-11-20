// backend/middleware/notImplemented.js — ตอบ 501 ให้เส้นเขียนที่ยังไม่ทำ (รอ Phase B)
//
// ทำไมมี: ไม่งั้น POST /projects ฯลฯ ตกไป notFoundApi ได้ 404 ซึ่งดูเหมือนพิมพ์ path ผิด
// mount ใน index.js หลัง router จริง ก่อน notFoundApi — เส้นไหนทำเสร็จแล้ว router จะตอบก่อนถึงตัวนี้
// ⚠️ ทำเส้นเขียนของหมวดไหนครบแล้ว ให้ลบ prefix นั้นออกจาก PENDING_PREFIXES
'use strict';

const PENDING_PREFIXES = ['/projects', '/tasks', '/deliverables', '/labels', '/notifications'];

const notImplemented = (req, res, next) => {
  const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  const pending = PENDING_PREFIXES.some((p) => req.path === p || req.path.startsWith(`${p}/`));
  if (!isWrite || !pending) return next();
  res.status(501).json({ error: 'ยังไม่รองรับการบันทึกข้อมูลส่วนนี้ — รอ Phase B (ดู docs/api-contract.md)' });
};

module.exports = { notImplemented, PENDING_PREFIXES };
