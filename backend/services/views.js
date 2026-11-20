// backend/services/views.js — แปลงแถว DB เป็น JSON (camelCase) ของ entity เล็ก ๆ ตาม docs/api-contract.md
//
// entity ใหญ่แยกไฟล์: services/projects.js, services/tasks.js
'use strict';

const { parseJson, splitList } = require('../utils/json');

// guest ไม่ได้ email — เห็นแค่ข้อมูลที่ต้องใช้แสดงชื่อในโปรเจกต์ public
const employeeView = (u, { includeEmail = true } = {}) => ({
  id: u.userid,
  name: u.name,
  departmentId: u.department_id ?? null,
  department: u.department_name ?? '',
  position: u.position ?? '',
  ...(includeEmail ? { email: u.email ?? '' } : {}),
});

const departmentView = (d) => ({ id: d.id, name: d.name, code: d.code ?? '' });

const teamView = (t) => ({ id: t.id, name: t.name, memberEmployeeIds: splitList(t.member_ids) });

const labelView = (l) => ({ id: l.id, name: l.name, color: l.color });

const deliverableView = (d) => ({
  id: d.id,
  projectId: d.project_id,
  title: d.title,
  description: d.description ?? '',
  relatedTaskId: d.related_task_id ?? null,
  responsibleId: d.responsible_id ?? null,
  dueDate: d.due_date ?? null,
  status: d.status,
  attachments: parseJson(d.attachments, []),
  createdAt: d.created_at,
  updatedAt: d.updated_at,
});

// meta แผ่เป็น field ระดับบน (เหมือน recordActivity ใน MockDataContext ที่ ...event) — field หลักทับ meta เสมอ
const activityView = (a) => ({
  ...parseJson(a.meta, {}),
  id: a.id,
  type: a.type,
  projectId: a.project_id,
  projectName: a.project_name ?? '',
  taskId: a.task_id ?? undefined,
  deliverableId: a.deliverable_id ?? undefined,
  actorId: a.actor_id ?? null,
  timestamp: a.created_at,
  description: a.description ?? '',
});

// time = ข้อความวันที่แบบไทยเหมือน mock (Header.js แสดง item.time) · createdAt สำหรับเรียง/คำนวณ
const notificationView = (n) => ({
  id: n.id,
  employeeId: n.userid,
  title: n.title,
  message: n.message ?? '',
  projectId: n.project_id ?? null,
  taskId: n.task_id ?? null,
  unread: !Number(n.is_read),
  createdAt: n.created_at,
  time: n.created_at ? new Date(n.created_at).toLocaleString('th-TH') : '',
});

module.exports = { employeeView, departmentView, teamView, labelView, deliverableView, activityView, notificationView };
