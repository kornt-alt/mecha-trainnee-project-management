// backend/services/projects.js — กติกาของโปรเจกต์ + แปลงแถว DB เป็น JSON ตาม docs/api-contract.md
//
// shape ที่ส่งออก = shape ของ project ใน frontend/src/data/mockData.js (camelCase) + visibility
'use strict';

const { parseJson, splitList } = require('../utils/json');

// ⚠️ ต้องตรงกับ ENUM ใน db/schema.sql และ PROJECT_STATUSES ใน frontend/src/utils/config.js
const STATUSES = ['planning', 'in_progress', 'on_hold', 'done', 'cancelled'];
const VISIBILITIES = ['public', 'private'];

// metrics ตาม calculateProjectMetrics() ใน frontend/src/data/mockData.js —
// progress = ค่าเฉลี่ย progress ของงาน (ไม่มีงานแต่โปรเจกต์ done ถือ 100%)
// ⚠️ แก้สูตรที่นี่ต้องแก้ฝั่ง frontend ด้วย ไม่งั้นตัวเลขสองฝั่งไม่ตรงกัน
const metrics = (row) => {
  const totalTasks = Number(row.total_tasks) || 0;
  const completedTasks = Number(row.completed_tasks) || 0;
  const progress = totalTasks > 0 ? Math.round(Number(row.avg_progress) || 0) : (row.status === 'done' ? 100 : 0);
  return { totalTasks, completedTasks, unfinishedTasks: totalTasks - completedTasks, progress };
};

const view = (p) => ({
  id: p.id,
  name: p.name,
  description: p.description ?? '',
  category: p.category ?? '',
  status: p.status,
  priority: p.priority ?? null,
  visibility: p.visibility,
  departmentId: p.department_id ?? null,
  managerId: p.manager_id ?? null,
  teamLeadId: p.team_lead_id ?? null,
  teamMemberIds: splitList(p.member_ids),
  // owner = ชื่อ Project Owner (mock เก็บเป็นข้อความ) — ส่งชื่อจาก users แทน ไม่เก็บซ้ำ
  owner: p.manager_name ?? '',
  startDate: p.start_date ?? null,
  dueDate: p.due_date ?? null,
  plannedBudget: p.planned_budget === null || p.planned_budget === undefined ? null : Number(p.planned_budget),
  requiresDeliverables: !!Number(p.requires_deliverables),
  deliverableDescription: p.deliverable_description ?? '',
  closure: parseJson(p.closure, null),
  createdBy: p.created_by ?? null,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
  ...metrics(p),
});

module.exports = { STATUSES, VISIBILITIES, metrics, view };
