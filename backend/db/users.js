// backend/db/users.js — SQL ทั้งหมดของตาราง users (= พนักงาน) + logs อยู่ที่นี่ที่เดียว
//
// ⚠️ ห้าม SELECT password ออกไปนอก findByIdWithPassword — ที่อื่นใช้ COLUMNS ที่ไม่มี password
'use strict';

const { query, execute } = require('./pool');

const COLUMNS = `u.userid, u.rfid, u.name, u.position, u.department_id, d.name AS department_name, u.email,
  u.role, u.is_active, u.created_at, u.updated_at`;
const FROM = 'FROM users u LEFT JOIN departments d ON d.id = u.department_id';

const findById = async (userid) => {
  const [rows] = await query(`SELECT ${COLUMNS} ${FROM} WHERE u.userid = ?`, [String(userid)]);
  return rows[0] ?? null;
};

// login ด้วยบัตร — ค้นจาก rfid อย่างเดียว (ไม่ fallback ไป userid โดยตั้งใจ)
const findByRfid = async (rfid) => {
  const [rows] = await query(`SELECT ${COLUMNS} ${FROM} WHERE u.rfid = ?`, [String(rfid)]);
  return rows[0] ?? null;
};

// บัตรนี้ผูกกับคนอื่นอยู่ไหม (ไม่นับตัวเอง) — ใช้ตอนแก้ไข
const findByRfidExcept = async (rfid, userid) => {
  const [rows] = await query('SELECT userid FROM users WHERE rfid = ? AND userid <> ?', [String(rfid), String(userid)]);
  return rows[0] ?? null;
};

const findByIdWithPassword = async (userid) => {
  const [rows] = await query(`SELECT ${COLUMNS}, u.password ${FROM} WHERE u.userid = ?`, [String(userid)]);
  return rows[0] ?? null;
};

// activeOnly = รายชื่อพนักงานที่หน้าเว็บใช้ (GET /employees) · ADMIN ดูทั้งหมดใน GET /users
const list = async ({ activeOnly = false } = {}) => {
  const where = activeOnly ? 'WHERE u.is_active = 1' : '';
  const [rows] = await query(`SELECT ${COLUMNS} ${FROM} ${where} ORDER BY u.userid`);
  return rows;
};

const departmentExists = async (id) => {
  const [rows] = await query('SELECT id FROM departments WHERE id = ?', [String(id)]);
  return rows.length > 0;
};

const insert = async ({ userid, rfid, passwordHash, name, position, departmentId, email, role }) => {
  await execute(
    `INSERT INTO users (userid, rfid, password, name, position, department_id, email, role, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
    [userid, rfid ?? null, passwordHash, name, position ?? null, departmentId ?? null, email ?? null, role]
  );
};

// fields = เฉพาะคอลัมน์ที่อนุญาต (routes/users.js กรองมาแล้ว) · passwordHash แยกต่างหาก
const update = async (userid, fields, passwordHash) => {
  const sets = Object.keys(fields).map((k) => `${k} = ?`);
  const params = Object.values(fields);
  if (passwordHash) { sets.push('password = ?'); params.push(passwordHash); }
  if (!sets.length) return findById(userid);
  sets.push('updated_at = NOW()');
  await execute(`UPDATE users SET ${sets.join(', ')} WHERE userid = ?`, [...params, userid]);
  return findById(userid);
};

// log การ login / register / logout / แก้ user — พังแค่ console.error, log เขียนไม่ได้ต้องไม่ทำให้ login ล้ม
const logAction = async (action, targetId, targetType, comment) => {
  try {
    await execute(
      'INSERT INTO logs (action, target_id, target_type, comment, created_at) VALUES (?, ?, ?, ?, NOW())',
      [action, targetId ?? null, targetType, comment ?? null]
    );
  } catch (err) {
    console.error('[log] เขียน log ไม่ได้:', err.message);
  }
};

module.exports = { findById, findByRfid, findByRfidExcept, findByIdWithPassword, list, departmentExists, insert, update, logAction };
