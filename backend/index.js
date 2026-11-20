// backend/index.js — bootstrap เท่านั้น: mount routes, จับ error, เช็ค DB แล้ว listen
//
// ⚠️ Apache เสิร์ฟ frontend/build เอง Express ทำแค่ API
//    ห้ามใส่ express.static หรือ React fallback route เข้ามา
//
// เพิ่มหมวดใหม่: สร้าง routes/<หมวด>.js แล้ว mount ที่ `${API}/<หมวด>` ข้างล่าง (ก่อน notFoundApi)
'use strict';

const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const { ping } = require('./db/pool');
const { errorHandler, notFoundApi } = require('./middleware/errorHandler');
const { notImplemented } = require('./middleware/notImplemented');

const app = express();
const API = `${env.APP_BASE}/api`;

app.use(express.json());
app.use(cors());

// ── routes ────────────────────────────────────────────────────────────────

app.get(`${API}/health`, health);

app.use(`${API}/auth`, require('./routes/auth'));
app.use(`${API}/users`, require('./routes/users'));
app.use(`${API}/projects`, require('./routes/projects'));
app.use(`${API}/notifications`, require('./routes/notifications'));
app.use(API, require('./routes/reference')); // /employees, /departments, /teams, /labels

// เส้นเขียนที่ยังไม่ทำตอบ 501 (รอ Phase B) — ต้องอยู่หลัง router จริง
app.use(API, notImplemented);
// ต้องอยู่หลัง route ทั้งหมด — เส้นที่ไม่มีจริงใต้ /api ตอบ JSON ไม่ใช่ HTML
app.use(API, notFoundApi);
app.use(errorHandler);

// health บอกด้วยว่าต่อ DB ได้ไหม — หน้า Home ใช้เช็คว่า setup ครบหรือยัง (ไม่โชว์ข้อความ error ของ DB)
async function health(req, res) {
  const dbErr = await ping();
  res.json({ ok: true, appBase: env.APP_BASE, db: dbErr ? 'down' : 'up' });
}

// ── start ─────────────────────────────────────────────────────────────────

app.listen(env.PORT, async () => {
  console.log(`[server] พร้อมใช้งานที่ port ${env.PORT} · API อยู่ที่ ${API}`);
  // เตือนอย่างเดียว ไม่ล้ม startup — DB ล่มชั่วคราวแล้วกลับมา server ใช้ต่อได้เอง (pool ต่อใหม่ให้)
  const dbErr = await ping();
  if (dbErr) console.warn(`[db] ต่อ ${env.DB_HOST}/${env.DB_NAME} ไม่ได้: ${dbErr} — ทุก API ที่แตะ DB จะตอบ 500`);
  else console.log(`[db] ต่อ ${env.DB_HOST}/${env.DB_NAME} ได้`);
});
