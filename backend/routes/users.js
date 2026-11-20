// backend/routes/users.js — จัดการผู้ใช้ (ADMIN เท่านั้นทั้งไฟล์) · ลอกจาก MECHA2_QC_GAUGE_SYSTEM
'use strict';

const express = require('express');
const users = require('../db/users');
const { ROLES, MIN_PASSWORD, hashPassword, normalizeRfid, publicUser } = require('../services/auth');
const { requireAdmin } = require('../middleware/auth');
const { AppError, wrap } = require('../middleware/errorHandler');

const router = express.Router();
router.use(requireAdmin);

// rfid ส่งออกเฉพาะเส้นนี้ (ADMIN) ไว้ผูก/เปลี่ยนบัตร — publicUser / token / me ไม่มี
const view = (u) => ({
  ...publicUser(u), email: u.email ?? null, rfid: u.rfid ?? null, isActive: !!Number(u.is_active),
  createdAt: u.created_at, updatedAt: u.updated_at,
});

router.get('/', wrap(async (req, res) => {
  res.json((await users.list()).map(view));
}));

// body: { name?, role?, position?, departmentId?, email?, isActive?, rfid?, password? } — ส่งเฉพาะที่จะแก้ · rfid: '' = ถอดบัตร
router.patch('/:userid', wrap(async (req, res) => {
  const { userid } = req.params;
  const b = req.body || {};
  const current = await users.findById(userid);
  if (!current) throw new AppError('ไม่พบผู้ใช้', 404);

  // ⚠️ ชื่อคอลัมน์ถูกต่อเข้า SQL ตรง ๆ ใน db/users.js update() — ใส่ได้เฉพาะ key ที่เขียนไว้ตรงนี้
  const fields = {};
  if (b.name !== undefined) {
    const name = String(b.name).trim();
    if (!name) throw new AppError('ชื่อห้ามว่าง', 400);
    fields.name = name;
  }
  if (b.role !== undefined) {
    if (!ROLES.includes(b.role)) throw new AppError(`role ต้องเป็น ${ROLES.join(' / ')}`, 400);
    fields.role = b.role;
  }
  if (b.position !== undefined) fields.position = String(b.position).trim() || null;
  if (b.email !== undefined) fields.email = String(b.email).trim() || null;
  if (b.departmentId !== undefined) {
    const departmentId = b.departmentId ? String(b.departmentId) : null;
    if (departmentId && !(await users.departmentExists(departmentId))) throw new AppError('ไม่พบแผนกที่เลือก', 400);
    fields.department_id = departmentId;
  }
  if (b.isActive !== undefined) fields.is_active = b.isActive ? 1 : 0;
  if (b.rfid !== undefined) {
    const rfid = normalizeRfid(b.rfid);
    if (rfid && await users.findByRfidExcept(rfid, userid)) throw new AppError('รหัสบัตรนี้ผูกกับบัญชีอื่นแล้ว', 409);
    fields.rfid = rfid;
  }

  // กันล็อกตัวเองออก — ถ้าไม่มี ADMIN เหลือต้องไปแก้ด้วย npm run user:role บนเครื่อง server
  if (userid === req.user.userid && ((fields.role && fields.role !== 'ADMIN') || fields.is_active === 0)) {
    throw new AppError('ลดสิทธิ์หรือปิดบัญชีของตัวเองไม่ได้', 409);
  }

  let passwordHash = null;
  if (b.password) {
    if (String(b.password).length < MIN_PASSWORD) throw new AppError(`รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD} ตัว`, 400);
    passwordHash = await hashPassword(b.password);
  }

  const updated = await users.update(userid, fields, passwordHash);
  const changed = [...Object.keys(fields), ...(passwordHash ? ['password'] : [])].join(', ');
  await users.logAction('USER_UPDATE', userid, 'USER', `by ${req.user.userid}: ${changed || '-'}`);
  res.json(view(updated));
}));

module.exports = router;
