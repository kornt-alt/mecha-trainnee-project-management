// backend/services/projects.js — กติกาของ project (สถานะที่มีได้ + ตรวจข้อมูลจาก body)
//
// ไม่เชื่อ body จากหน้าเว็บ — ทุกค่าที่จะลง DB ต้องผ่าน cleanProject() ก่อนเสมอ
'use strict';

const { AppError } = require('../middleware/errorHandler');

// ⚠️ ต้องตรงกับ ENUM ใน db/schema.sql และ PROJECT_STATUSES ใน frontend/src/utils/config.js
const STATUSES = ['planning', 'in_progress', 'on_hold', 'done', 'cancelled'];

// ⚠️ ตรงกับความยาว VARCHAR ใน db/schema.sql
const MAX = { name: 200, owner: 100, description: 5000 };

const text = (v) => (v === undefined || v === null ? '' : String(v).trim());

// รับ 'YYYY-MM-DD' หรือว่าง (= null) · วันที่ที่ไม่มีจริง เช่น 2026-02-30 ไม่รับ
const cleanDate = (v, label) => {
  const s = text(v);
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (!d || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) {
    throw new AppError(`${label} ต้องเป็นวันที่รูปแบบ YYYY-MM-DD`, 400);
  }
  return s;
};

const cleanText = (v, label, max, required = false) => {
  const s = text(v);
  if (required && !s) throw new AppError(`${label} ห้ามว่าง`, 400);
  if (s.length > max) throw new AppError(`${label} ยาวได้ไม่เกิน ${max} ตัวอักษร`, 400);
  return s || null;
};

/**
 * body (camelCase จากหน้าเว็บ) → fields (snake_case ตามคอลัมน์)
 * partial = false (สร้างใหม่): ใส่ครบทุก field, name บังคับ
 * partial = true  (แก้ไข): เอาเฉพาะ key ที่ส่งมา — ไม่ส่ง key = ไม่แตะ
 * current = แถวเดิม (ตอนแก้ไข) ใช้เช็ควันที่เริ่ม ≤ กำหนดส่ง เมื่อแก้แค่ตัวเดียว
 */
const cleanProject = (body, { partial = false, current = null } = {}) => {
  const b = body || {};
  const has = (k) => !partial || b[k] !== undefined;
  const out = {};

  if (has('name')) out.name = cleanText(b.name, 'ชื่อโปรเจกต์', MAX.name, true);
  if (has('description')) out.description = cleanText(b.description, 'รายละเอียด', MAX.description);
  if (has('owner')) out.owner = cleanText(b.owner, 'ผู้รับผิดชอบ', MAX.owner);
  if (has('status')) {
    const status = text(b.status) || (partial ? '' : 'planning');
    if (!STATUSES.includes(status)) throw new AppError('สถานะไม่ถูกต้อง', 400);
    out.status = status;
  }
  if (has('startDate')) out.start_date = cleanDate(b.startDate, 'วันที่เริ่ม');
  if (has('dueDate')) out.due_date = cleanDate(b.dueDate, 'กำหนดส่ง');

  const start = out.start_date !== undefined ? out.start_date : current?.start_date;
  const due = out.due_date !== undefined ? out.due_date : current?.due_date;
  if (start && due && start > due) throw new AppError('กำหนดส่งต้องไม่ก่อนวันที่เริ่ม', 400);

  return out;
};

// แถวจาก DB → JSON ที่ส่งให้หน้าเว็บ (camelCase)
const view = (p) => ({
  id: p.id,
  name: p.name,
  description: p.description ?? '',
  owner: p.owner ?? '',
  status: p.status,
  startDate: p.start_date ?? null,
  dueDate: p.due_date ?? null,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
});

module.exports = { STATUSES, cleanProject, view };
