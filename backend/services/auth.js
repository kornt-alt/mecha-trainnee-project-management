// backend/services/auth.js — hash รหัสผ่าน + เซ็น/ตรวจ JWT (pure ไม่แตะ DB) · ลอกจาก MECHA2_QC_GAUGE_SYSTEM
//
// ⚠️ bcryptjs ไม่ใช่ bcrypt โดยตั้งใจ — bcrypt เป็น native module ต้อง compile ตอน npm install
//    และเครื่อง server ในเครือไม่มีเน็ตออก · hash เป็นรูป $2a$/$2b$ เหมือนกัน
'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const SALT_ROUNDS = 10;
const MIN_PASSWORD = 6;

// ⚠️ ต้องตรงกับ ENUM ของ users.role ใน db/schema.sql
// guest = ไม่ได้ login (ไม่มี role ใน DB) — ดูได้เฉพาะ project public (services/visibility.js)
const ROLES = ['ADMIN', 'USER'];
// สมัครเองได้แค่ USER — ADMIN สร้างด้วย `npm run user:add` / `user:role` หรือให้ ADMIN คนอื่นเลื่อนให้เท่านั้น
const SELF_REGISTER_ROLES = ['USER'];

const hashPassword = (password) => bcrypt.hash(String(password), SALT_ROUNDS);

// คืน false ทุกกรณีที่ผิดรูป ไม่ throw — hash เพี้ยนต้องแปลว่า "login ไม่ผ่าน" ไม่ใช่ 500
const verifyPassword = async (password, hash) => {
  try {
    return await bcrypt.compare(String(password ?? ''), String(hash ?? ''));
  } catch {
    return false;
  }
};

// hash ทิ้งไว้ใช้ตอนไม่พบ user — ให้เวลาตอบเท่ากับเคสที่มี user จริง (จับเวลาเดารหัสพนักงานไม่ได้)
const DUMMY_HASH = bcrypt.hashSync('no-such-user', SALT_ROUNDS);

// รหัสบัตร: เก็บเป็น string ตามที่เครื่องอ่านส่งมา (ห้าม Number() — เลข 0 นำหน้าหาย) · ว่าง = null (ไม่ผูกบัตร)
const normalizeRfid = (v) => {
  const s = String(v ?? '').trim();
  return s || null;
};

// ข้อมูลที่ส่งให้หน้าเว็บ / ใส่ใน token — ไม่มี password และ**ไม่มี rfid** (รหัสบัตรใช้ login ได้ = ความลับ)
// employeeId = userid — ฝั่ง frontend ใช้ id พนักงานเทียบสิทธิ์ (managerId, assigneeId …)
const publicUser = (u) => ({
  userid: u.userid,
  employeeId: u.userid,
  name: u.name,
  role: u.role,
  position: u.position ?? null,
  departmentId: u.department_id ?? null,
});

const signToken = (user) =>
  jwt.sign({ userid: user.userid, role: user.role }, env.JWT_SECRET, { expiresIn: `${env.JWT_HOURS}h` });

// คืน payload เมื่อผ่าน · ลายเซ็นผิด / หมดอายุ / รูปเพี้ยน คืน null
const verifyToken = (token) => {
  if (typeof token !== 'string' || !token) return null;
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch {
    return null;
  }
};

module.exports = {
  SALT_ROUNDS, MIN_PASSWORD, ROLES, SELF_REGISTER_ROLES, DUMMY_HASH,
  hashPassword, verifyPassword, normalizeRfid, publicUser, signToken, verifyToken,
};
