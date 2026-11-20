// backend/db/projects.js — SQL อ่านโปรเจกต์ (+ สมาชิก + metrics) อยู่ที่นี่ที่เดียว
//
// ทุก query รับ user แล้วกรองด้วย services/visibility.js — ห้ามเขียน SELECT projects ที่ไม่ผ่าน visibleWhere
// metrics (total / completed / avg progress) คำนวณจาก tasks ตอนอ่าน ไม่เก็บซ้ำในตาราง — สูตรอยู่ใน services/projects.js
'use strict';

const { query } = require('./pool');
const { visibleWhere } = require('../services/visibility');

// DATE_FORMAT ให้ได้ 'YYYY-MM-DD' ตรง ๆ — ถ้าปล่อยเป็น DATE, mysql2 แปลงเป็น Date แล้วโดน timezone เลื่อนวัน
const SELECT = `SELECT p.id, p.name, p.description, p.category, p.status, p.priority, p.visibility,
    p.department_id, p.manager_id, m.name AS manager_name, p.team_lead_id,
    DATE_FORMAT(p.start_date, '%Y-%m-%d') AS start_date, DATE_FORMAT(p.due_date, '%Y-%m-%d') AS due_date,
    p.planned_budget, p.requires_deliverables, p.deliverable_description, p.closure,
    p.created_by, p.created_at, p.updated_at,
    (SELECT GROUP_CONCAT(pm.userid ORDER BY pm.sort, pm.userid SEPARATOR ',') FROM project_members pm WHERE pm.project_id = p.id) AS member_ids,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS total_tasks,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed') AS completed_tasks,
    (SELECT AVG(t.progress) FROM tasks t WHERE t.project_id = p.id) AS avg_progress
  FROM projects p LEFT JOIN users m ON m.userid = p.manager_id`;

// status = null → ทุกสถานะ (routes ตรวจค่ามาแล้ว)
const listVisible = async (user, { status = null } = {}) => {
  const vis = visibleWhere(user, 'p');
  const params = [...vis.params];
  let where = vis.sql;
  if (status) { where += ' AND p.status = ?'; params.push(status); }
  const [rows] = await query(`${SELECT} WHERE ${where} ORDER BY p.id`, params);
  return rows;
};

// null = ไม่มี หรือ user ไม่มีสิทธิ์เห็น (routes ตอบ 404 เหมือนกัน)
const findVisibleById = async (user, id) => {
  const vis = visibleWhere(user, 'p');
  const [rows] = await query(`${SELECT} WHERE p.id = ? AND ${vis.sql}`, [Number(id), ...vis.params]);
  return rows[0] ?? null;
};

module.exports = { listVisible, findVisibleById };
