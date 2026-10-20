// backend/db/projects.js — SQL ทั้งหมดของตาราง projects อยู่ที่นี่ที่เดียว
//
// route / service ห้ามเขียน SQL เอง เรียกผ่านฟังก์ชันในไฟล์นี้เท่านั้น
// ค่าจากผู้ใช้ส่งผ่าน ? เสมอ (parameterize) — ห้ามต่อ string เข้า SQL
'use strict';

const { query, execute } = require('./pool');

// DATE_FORMAT ให้ได้ 'YYYY-MM-DD' ตรง ๆ — ถ้าปล่อยเป็น DATE, mysql2 แปลงเป็น Date แล้วโดน timezone เลื่อนวัน
const COLUMNS = `id, name, description, owner, status,
  DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
  DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date,
  created_at, updated_at`;

// ⚠️ คอลัมน์ที่ update() ยอมให้แก้ — ชื่อคอลัมน์ถูกต่อเข้า SQL ตรง ๆ จึงต้อง whitelist
const EDITABLE = ['name', 'description', 'owner', 'status', 'start_date', 'due_date'];

// status = null → ทั้งหมด
const list = async (status = null) => {
  const where = status ? 'WHERE status = ?' : '';
  const [rows] = await query(
    `SELECT ${COLUMNS} FROM projects ${where} ORDER BY due_date IS NULL, due_date, id DESC`,
    status ? [status] : []
  );
  return rows;
};

const findById = async (id) => {
  const [rows] = await query(`SELECT ${COLUMNS} FROM projects WHERE id = ?`, [Number(id)]);
  return rows[0] ?? null;
};

// p = ผลจาก services/projects.js cleanProject() (snake_case ครบทุก key ใน EDITABLE)
const insert = async (p) => {
  const [r] = await execute(
    `INSERT INTO projects (name, description, owner, status, start_date, due_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [p.name, p.description, p.owner, p.status, p.start_date, p.due_date]
  );
  return findById(r.insertId);
};

const update = async (id, fields) => {
  const keys = Object.keys(fields).filter((k) => EDITABLE.includes(k));
  if (!keys.length) return findById(id);
  const sets = keys.map((k) => `${k} = ?`);
  sets.push('updated_at = NOW()');
  await execute(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`, [...keys.map((k) => fields[k]), Number(id)]);
  return findById(id);
};

// คืน true ถ้าลบได้จริง
const remove = async (id) => {
  const [r] = await execute('DELETE FROM projects WHERE id = ?', [Number(id)]);
  return r.affectedRows > 0;
};

module.exports = { list, findById, insert, update, remove };
