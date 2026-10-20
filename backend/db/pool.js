// backend/db/pool.js — mysql2 pool + helper (ลอกจาก MECHA2_QC_GAUGE_SYSTEM)
//
// กติกา: เรียกผ่าน query() / execute() เท่านั้น ห้าม require('mysql2') ตรง ๆ ที่อื่น
// (ยกเว้น db/migrate.js ที่ต้องมี connection ของตัวเอง)
'use strict';

const mysql = require('mysql2/promise');
const env = require('../config/env');

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: env.DB_POOL_MAX,
  queueLimit: 0,
  charset: 'utf8mb4_unicode_ci',
  // ⚠️ ห้ามเปิด multipleStatements ที่ pool หลัก — db/migrate.js สร้าง connection ของตัวเองต่างหาก
  multipleStatements: false,
});

const query = (sql, params = []) => pool.query(sql, params);
const execute = (sql, params = []) => pool.execute(sql, params);

/** งานหลายคำสั่งที่ต้องสำเร็จพร้อมกัน — fn(conn) ใช้ conn.execute/query · throw = rollback ทั้งหมด */
const withTx = async (fn) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
};

// เช็คตอน start ว่าต่อ DB ได้ — คืน error message หรือ null
const ping = async () => {
  try {
    await pool.query('SELECT 1');
    return null;
  } catch (err) {
    return err.message;
  }
};

module.exports = { pool, query, execute, withTx, ping };
