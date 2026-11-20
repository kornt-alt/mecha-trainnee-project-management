// backend/middleware/auth.js — แยก guest / ผู้ใช้ที่ login / ADMIN
//
// ขอบเขต: ทั้งแอปต้อง login ยกเว้นการ "ดู" project ที่เป็น public (guest) — เส้นอ่านใช้ optionalLogin
// แล้วให้ services/visibility.js ตัดสินว่าเห็นอะไร · เส้นเขียน / ข้อมูลส่วนตัวใช้ requireLogin
//
// ⚠️ เช็ค is_active และ role ใน DB ทุก request ไม่เชื่อ token อย่างเดียว — ปิดบัญชี / ลดสิทธิ์
//    ต้องมีผลทันที ไม่ใช่รอ token หมดอายุ · req.user มาจาก DB ไม่ใช่ payload
'use strict';

const users = require('../db/users');
const { verifyToken, publicUser } = require('../services/auth');
const { AppError } = require('./errorHandler');

const NEED_LOGIN = 'กรุณาเข้าสู่ระบบก่อน';
const NEED_ADMIN = 'งานนี้ต้องเข้าสู่ระบบเป็น ADMIN';

const tokenOf = (req) => {
  const h = req.get('Authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
};

// คืน publicUser หรือ null (ไม่มี token / token ใช้ไม่ได้ / บัญชีปิด)
const resolveUser = async (req) => {
  const payload = verifyToken(tokenOf(req));
  if (!payload) return null;
  const user = await users.findById(payload.userid);
  if (!user || !Number(user.is_active)) return null;
  return publicUser(user);
};

const requireLogin = async (req, res, next) => {
  try {
    const user = await resolveUser(req);
    if (!user) throw new AppError(NEED_LOGIN, 401);
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const requireAdmin = (req, res, next) =>
  requireLogin(req, res, (err) => {
    if (err) return next(err);
    if (req.user.role !== 'ADMIN') return next(new AppError(NEED_ADMIN, 403));
    next();
  });

// ไม่บังคับ login — token ใช้ได้ = req.user · ไม่มี / หมดอายุ / บัญชีปิด = guest (req.user = null) ไม่ตอบ 401
// ⚠️ token หมดอายุจึงเห็นแค่ข้อมูล public เงียบ ๆ — หน้าเว็บควรเรียก /auth/me ตอนเปิดแอปเพื่อรู้ว่าต้อง login ใหม่
const optionalLogin = async (req, res, next) => {
  try {
    req.user = await resolveUser(req);
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireLogin, requireAdmin, optionalLogin };
