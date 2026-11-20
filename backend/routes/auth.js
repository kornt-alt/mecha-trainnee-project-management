// backend/routes/auth.js — login (รหัสพนักงาน+รหัสผ่าน, บัตร), สมัครเอง, me, logout · ลอกจาก MECHA2_QC_GAUGE_SYSTEM
//
// ต่างจากต้นแบบ: login ด้วย userid (รหัสพนักงาน) ตามหน้า login ของ frontend — ไม่มีคอลัมน์ username
'use strict';

const express = require('express');
const users = require('../db/users');
const {
  MIN_PASSWORD, SELF_REGISTER_ROLES, DUMMY_HASH, hashPassword, verifyPassword, normalizeRfid, publicUser, signToken,
} = require('../services/auth');
const { requireLogin } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { AppError, wrap } = require('../middleware/errorHandler');

const router = express.Router();

const WINDOW = 15 * 60 * 1000;
const MAX_USERID = 20; // ตรงกับ VARCHAR(20) ใน db/schema.sql

// ⚠️ นับต่อ IP + รหัสพนักงาน ไม่ใช่ IP อย่างเดียว — หลัง Apache reverse proxy req.ip อาจเป็น IP
//    ของ Apache ตัวเดียวทั้งโรงงาน นับต่อ IP ล้วน คนเดียวพิมพ์ผิดรัว ๆ จะล็อกทุกคน
const loginLimiter = rateLimit({
  name: 'login', limit: 10, windowMs: WINDOW,
  message: 'พยายามเข้าสู่ระบบถี่เกินไป กรุณารอ 15 นาทีแล้วลองใหม่',
  keyOf: (req) => `${req.ip || 'unknown'}:${String(req.body?.userid ?? '').trim().toLowerCase()}`,
});
// บัตรไม่มีรหัสพนักงานให้แยกถัง — นับต่อ IP (สแกนผิดรัว ๆ แล้วต้องรอ แต่ช่องรหัสผ่านยังใช้ได้)
const cardLimiter = rateLimit({
  name: 'card', limit: 30, windowMs: WINDOW,
  message: 'สแกนบัตรไม่ผ่านถี่เกินไป กรุณารอ 15 นาที หรือเข้าด้วยรหัสพนักงานและรหัสผ่าน',
});
const registerLimiter = rateLimit({
  name: 'register', limit: 10, windowMs: 60 * 60 * 1000,
  message: 'สมัครบัญชีถี่เกินไป กรุณารอสักครู่แล้วลองใหม่',
});

// ข้อความเดียวกันทั้ง "ไม่พบผู้ใช้" / "รหัสผิด" / "บัญชีถูกปิด" — แยกเมื่อไหร่คือบอกคนเดาว่ารหัสพนักงานไหนมีจริง
const BAD_LOGIN = 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง';

const issue = (user) => ({ token: signToken(user), user: publicUser(user) });

// body: { userid, password }
router.post('/login', loginLimiter, wrap(async (req, res) => {
  const userid = String(req.body?.userid ?? '').trim();
  const password = String(req.body?.password ?? '');
  if (!userid || !password) throw new AppError('กรอกรหัสพนักงานและรหัสผ่าน', 400);

  const user = await users.findByIdWithPassword(userid);
  // ไม่พบ user ก็ยังเสียเวลา verify เท่ากัน — ความเร็วของคำตอบต้องไม่บอกว่ารหัสพนักงานมีจริงไหม
  const ok = await verifyPassword(password, user?.password ?? DUMMY_HASH);
  if (!user || !ok || !Number(user.is_active)) throw new AppError(BAD_LOGIN, 401);

  await users.logAction('LOGIN_SUCCESS', user.userid, 'USER', `User ${user.userid} logged in`);
  res.json(issue(user));
}));

// login ด้วยบัตร: ค้นจาก users.rfid อย่างเดียว ไม่มีรหัสผ่าน
// ⚠️ ไม่ fallback ไป userid โดยตั้งใจ — รหัสพนักงานใครก็รู้ได้ แต่เลขบัตรต้องถือบัตรจริง
//    ความเสี่ยงที่เหลือ: บัตรหาย/ถูกยืม = เข้าได้ทันที → ถอดบัตรด้วย PATCH /users/:userid หรือ npm run user:card
router.post('/login-card', cardLimiter, wrap(async (req, res) => {
  const rfid = normalizeRfid(req.body?.rfid);
  if (!rfid) throw new AppError('แตะบัตรหรือกรอกรหัสบัตร', 400);

  const user = await users.findByRfid(rfid);
  if (!user || !Number(user.is_active)) throw new AppError('ไม่พบรหัสบัตรนี้ในระบบ', 401);

  await users.logAction('LOGIN_CARD_SUCCESS', user.userid, 'USER', 'Logged in via card');
  res.json(issue(user));
}));

// body: { userid, password, name, position?, departmentId?, email?, rfid?, role? } — role ได้แค่ USER (ตรวจที่ server)
router.post('/register', registerLimiter, wrap(async (req, res) => {
  const b = req.body || {};
  const userid = String(b.userid ?? '').trim();
  const password = String(b.password ?? '');
  const name = String(b.name ?? '').trim();
  const role = String(b.role ?? 'USER');
  const departmentId = b.departmentId ? String(b.departmentId) : null;
  const rfid = normalizeRfid(b.rfid); // ไม่บังคับ — ผูกบัตรทีหลังได้

  if (!userid || !password || !name) throw new AppError('กรอกรหัสพนักงาน รหัสผ่าน และชื่อให้ครบ', 400);
  if (userid.length > MAX_USERID) throw new AppError(`รหัสพนักงานยาวได้ไม่เกิน ${MAX_USERID} ตัว`, 400);
  if (password.length < MIN_PASSWORD) throw new AppError(`รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD} ตัว`, 400);
  if (!SELF_REGISTER_ROLES.includes(role)) throw new AppError(`สมัครเองได้เฉพาะ ${SELF_REGISTER_ROLES.join(' / ')}`, 400);
  if (departmentId && !(await users.departmentExists(departmentId))) throw new AppError('ไม่พบแผนกที่เลือก', 400);

  if (await users.findById(userid)) throw new AppError(`รหัสพนักงาน ${userid} มีบัญชีแล้ว`, 409);
  if (rfid && await users.findByRfid(rfid)) throw new AppError('รหัสบัตรนี้ผูกกับบัญชีอื่นแล้ว', 409);

  await users.insert({
    userid, rfid, passwordHash: await hashPassword(password), name, role,
    position: b.position ? String(b.position).trim() : null, departmentId, email: b.email ? String(b.email).trim() : null,
  });
  await users.logAction('REGISTER', userid, 'USER', `User ${userid} registered as ${role}`);
  res.status(201).json({ ok: true });
}));

// หน้าเว็บใช้เช็คว่า token ที่เก็บไว้ยังใช้ได้ และเอาข้อมูล user ล่าสุด (role อาจถูกเปลี่ยนหลัง login)
router.get('/me', requireLogin, (req, res) => res.json({ user: req.user }));

router.post('/logout', requireLogin, wrap(async (req, res) => {
  await users.logAction('LOGOUT', req.user.userid, 'USER', `User ${req.user.userid} logged out`);
  res.json({ ok: true });
}));

module.exports = router;
