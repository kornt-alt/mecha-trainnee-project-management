// backend/db/workspace.js — SQL อ่านข้อมูลลูกของโปรเจกต์ที่ไม่ใช่งาน: deliverables, activities
//
// ⚠️ ไม่เช็คสิทธิ์ — เรียกหลัง db/projects.findVisibleById() ผ่านแล้วเท่านั้น
'use strict';

const { query } = require('./pool');

const listDeliverables = async (projectId) => {
  const [rows] = await query(
    `SELECT id, project_id, title, description, related_task_id, responsible_id,
       DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date, status, attachments, created_at, updated_at
     FROM deliverables WHERE project_id = ? ORDER BY id`,
    [Number(projectId)]
  );
  return rows;
};

// ใหม่ → เก่า (เหมือน activity ใน MockDataContext ที่ prepend เสมอ)
const listActivities = async (projectId) => {
  const [rows] = await query(
    `SELECT a.id, a.project_id, p.name AS project_name, a.task_id, a.deliverable_id, a.actor_id, a.type,
       a.description, a.meta, a.created_at
     FROM activities a JOIN projects p ON p.id = a.project_id
     WHERE a.project_id = ? ORDER BY a.created_at DESC, a.id DESC`,
    [Number(projectId)]
  );
  return rows;
};

module.exports = { listDeliverables, listActivities };
