// backend/routes/projects.js — อ่านโปรเจกต์ + ข้อมูลใน workspace (tasks / deliverables / activities)
//
// mount ที่ `${APP_BASE}/api/projects` · guest อ่านได้เฉพาะ public (optionalLogin + services/visibility.js)
// เส้นเขียน (POST / PATCH / DELETE) ยังไม่ทำ — Phase B ย้ายกฎจาก frontend/src/context/MockDataContext.js มา
// ตามตารางใน docs/api-contract.md · ระหว่างนี้ middleware/notImplemented.js ตอบ 501
'use strict';

const express = require('express');
const projects = require('../db/projects');
const tasks = require('../db/tasks');
const workspace = require('../db/workspace');
const { STATUSES, view } = require('../services/projects');
const taskService = require('../services/tasks');
const { deliverableView, activityView } = require('../services/views');
const { optionalLogin } = require('../middleware/auth');
const { AppError, wrap } = require('../middleware/errorHandler');

const router = express.Router();
router.use(optionalLogin);

const NOT_FOUND = 'ไม่พบโปรเจกต์';

// id ต้องเป็นเลขจำนวนเต็มบวก — กัน /projects/abc ไปถึง SQL
const parseId = (v) => {
  const id = Number(v);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(NOT_FOUND, 404);
  return id;
};

// ⚠️ ทุกเส้นลูกต้องผ่านตัวนี้ก่อน — ไม่มีสิทธิ์เห็น = 404 เหมือนไม่มีอยู่
const mustSee = async (req) => {
  const row = await projects.findVisibleById(req.user, parseId(req.params.id));
  if (!row) throw new AppError(NOT_FOUND, 404);
  return row;
};

// GET /projects?status=in_progress
router.get('/', wrap(async (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  if (status && !STATUSES.includes(status)) throw new AppError('สถานะไม่ถูกต้อง', 400);
  res.json((await projects.listVisible(req.user, { status })).map(view));
}));

router.get('/:id', wrap(async (req, res) => {
  res.json(view(await mustSee(req)));
}));

router.get('/:id/tasks', wrap(async (req, res) => {
  const project = await mustSee(req);
  const rows = await tasks.listByProject(project.id);
  const checklist = taskService.groupChecklist(await tasks.listChecklistByTaskIds(rows.map((t) => t.id)));
  res.json(rows.map((t) => taskService.view(t, checklist)));
}));

router.get('/:id/deliverables', wrap(async (req, res) => {
  const project = await mustSee(req);
  res.json((await workspace.listDeliverables(project.id)).map(deliverableView));
}));

router.get('/:id/activities', wrap(async (req, res) => {
  const project = await mustSee(req);
  res.json((await workspace.listActivities(project.id)).map(activityView));
}));

module.exports = router;
