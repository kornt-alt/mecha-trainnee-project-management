// backend/config/env.js — ที่เดียวที่อ่าน process.env
//
// ค่าที่ขาดไม่ได้ให้ fail fast ตั้งแต่ตอน start ไม่ใช่รอให้ request แรกพัง
// เพิ่มค่าใหม่ใน .env เมื่อไหร่ ให้เพิ่มที่ไฟล์นี้ + .env.example ด้วยเสมอ (ห้ามอ่าน process.env ที่ไฟล์อื่น)
'use strict';

require('dotenv').config();

// DB_PASSWORD ไม่อยู่ในลิสต์เพราะ user ที่ตั้งแบบไม่มีรหัสผ่านก็มีจริง
const REQUIRED = ['DB_HOST', 'DB_USER', 'DB_NAME'];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[env] ขาดค่าใน backend/.env : ${missing.join(', ')}`);
  console.error('[env] ดูเทมเพลตได้ที่ backend/.env.example');
  process.exit(1);
}

const env = {
  PORT: parseInt(process.env.PORT, 10) || 3011,

  // prefix ที่แอปถูก mount ไว้หลัง Apache reverse proxy
  // ⚠️ ต้องตรงกับ APP_BASE ใน frontend/src/utils/config.js และ homepage ใน frontend/package.json
  APP_BASE: (process.env.APP_BASE || '/PROJECT-MANAGEMENT').replace(/\/+$/, ''),

  // Database (MariaDB)
  DB_HOST: process.env.DB_HOST,
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 3306,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME,
  DB_POOL_MAX: parseInt(process.env.DB_POOL_MAX, 10) || 10,
};

module.exports = env;
