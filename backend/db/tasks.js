// backend/db/tasks.js — SQL อ่านงานของโปรเจกต์ (+ collaborators + labels + checklist)
//
// ⚠️ ฟังก์ชันในไฟล์นี้ไม่เช็คสิทธิ์ — เรียกหลัง db/projects.findVisibleById() ผ่านแล้วเท่านั้น
'use strict';

const { query } = require('./pool');

const listByProject = async (projectId) => {
  const [rows] = await query(
    `SELECT t.id, t.project_id, p.name AS project_name, t.title, t.description, t.category, t.status, t.priority,
       t.assignee_id, t.reviewer_id,
       DATE_FORMAT(t.start_date, '%Y-%m-%d') AS start_date, DATE_FORMAT(t.due_date, '%Y-%m-%d') AS due_date,
       t.progress, t.estimated_hours, t.planned_allocations, t.assignment_history, t.review_history, t.attachments,
       t.review_submitted_by, t.review_submitted_at, t.review_last_reason, t.created_by, t.created_at, t.updated_at,
       (SELECT GROUP_CONCAT(tc.userid ORDER BY tc.sort, tc.userid SEPARATOR ',') FROM task_collaborators tc WHERE tc.task_id = t.id) AS collaborator_ids,
       (SELECT GROUP_CONCAT(tl.label_id ORDER BY tl.label_id SEPARATOR ',') FROM task_labels tl WHERE tl.task_id = t.id) AS label_ids
     FROM tasks t JOIN projects p ON p.id = t.project_id
     WHERE t.project_id = ? ORDER BY t.id`,
    [Number(projectId)]
  );
  return rows;
};

// checklist ของหลายงานในครั้งเดียว — คืนแถวดิบ ให้ services/tasks.js จับกลุ่มตาม task_id
const listChecklistByTaskIds = async (taskIds) => {
  if (!taskIds.length) return [];
  const [rows] = await query(
    `SELECT id, task_id, title, completed, created_by, owner_id FROM task_checklist_items
     WHERE task_id IN (?) ORDER BY task_id, sort, id`,
    [taskIds.map(Number)]
  );
  return rows;
};

module.exports = { listByProject, listChecklistByTaskIds };
