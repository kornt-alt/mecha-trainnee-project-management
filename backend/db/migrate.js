// backend/db/migrate.js — รันไฟล์ .sql ในโฟลเดอร์นี้ (ลอกจาก MECHA2_QC_GAUGE_SYSTEM)
//
// ทำไมต้องมี: เครื่องที่ใช้งานไม่มี mysql CLI จึงต้องยิง DDL ผ่าน mysql2 แทน
//
// ใช้:
//   npm run db:apply          = node db/migrate.js schema.sql (รันซ้ำได้ ปลอดภัย)
'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../config/env');

const main = async () => {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('ใช้: node db/migrate.js <ไฟล์.sql>   เช่น schema.sql');
    process.exit(1);
  }

  // กัน path traversal — รับเฉพาะชื่อไฟล์ในโฟลเดอร์ db/ เท่านั้น
  const fileName = path.basename(fileArg);
  const filePath = path.join(__dirname, fileName);
  if (!fs.existsSync(filePath)) {
    console.error(`ไม่พบไฟล์ ${filePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf8');

  // connection แยกจาก pool หลักเพราะต้องเปิด multipleStatements (pool.js ปิดไว้โดยตั้งใจ)
  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true,
  });

  try {
    console.log(`[migrate] ${fileName} → ${env.DB_USER}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
    await conn.query(sql);
    console.log('[migrate] สำเร็จ');
  } catch (err) {
    console.error(`[migrate] ล้มเหลว: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
};

main().catch((err) => {
  console.error(`[migrate] ${err.message}`);
  process.exit(1);
});
