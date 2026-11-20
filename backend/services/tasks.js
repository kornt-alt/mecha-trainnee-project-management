// backend/services/tasks.js — แปลงแถวงาน + checklist จาก DB เป็น JSON ตาม docs/api-contract.md
//
// shape = task ใน frontend/src/data/mockData.js / MockDataContext.createTask()
// statusLabel ไม่ส่ง — frontend แปลงจาก status เอง (TaskBadges.js STATUS_LABELS)
'use strict';

const { parseJson, splitList } = require('../utils/json');

// ⚠️ ต้องตรงกับ ENUM ใน db/schema.sql และ taskStatuses ใน frontend/src/context/MockDataContext.js
const TASK_STATUSES = ['not_started', 'in_progress', 'pending_review', 'completed'];

const checklistView = (c) => ({
  id: c.id,
  title: c.title,
  completed: !!Number(c.completed),
  createdBy: c.created_by ?? null,
  ownerId: c.owner_id ?? c.created_by ?? null,
});

// checklistByTask = Map<task_id, rows[]> จาก groupChecklist()
const view = (t, checklistByTask = new Map()) => ({
  id: t.id,
  projectId: t.project_id,
  projectName: t.project_name ?? '',
  title: t.title,
  description: t.description ?? '',
  category: t.category ?? null,
  status: t.status,
  priority: t.priority ?? 'none',
  assigneeId: t.assignee_id ?? null,
  reviewerId: t.reviewer_id ?? null,
  collaborators: splitList(t.collaborator_ids),
  startDate: t.start_date ?? null,
  dueDate: t.due_date ?? null,
  progress: Number(t.progress) || 0,
  estimatedHours: Number(t.estimated_hours) || 0,
  plannedAllocations: parseJson(t.planned_allocations, []),
  assignmentHistory: parseJson(t.assignment_history, []),
  reviewHistory: parseJson(t.review_history, []),
  attachments: parseJson(t.attachments, []),
  labelIds: splitList(t.label_ids, { asNumber: true }),
  checklist: (checklistByTask.get(t.id) || []).map(checklistView),
  reviewSubmittedBy: t.review_submitted_by ?? null,
  reviewSubmittedAt: t.review_submitted_at ?? null,
  reviewLastReason: t.review_last_reason ?? null,
  createdBy: t.created_by ?? null,
  createdAt: t.created_at,
  updatedAt: t.updated_at,
});

const groupChecklist = (rows) => {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.task_id)) map.set(row.task_id, []);
    map.get(row.task_id).push(row);
  }
  return map;
};

module.exports = { TASK_STATUSES, view, groupChecklist, checklistView };
