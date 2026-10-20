// backend/routes/projects.js — CRUD ของ project (ตัวอย่างหมวดแรก ใช้เป็นแบบเวลาเพิ่มหมวดใหม่)
//
// mount ที่ `${APP_BASE}/api/projects` (index.js)
// แบบที่ทุก route ต้องทำตาม:
//   - ครอบด้วย wrap() — error เด้งเข้า errorHandler เอง (wrap ไม่ได้ส่ง json ให้ ต้อง res.json เอง)
//   - error ที่ให้ผู้ใช้เห็น throw new AppError('ข้อความไทย', status) เท่านั้น
//   - SQL อยู่ใน db/projects.js · กติกา/validate อยู่ใน services/projects.js
'use strict';

const express = require('express');
const projects = require('../db/projects');
const { STATUSES, cleanProject, view } = require('../services/projects');
const { AppError, wrap } = require('../middleware/errorHandler');

const router = express.Router();

// id ต้องเป็นเลขจำนวนเต็มบวก — กัน /projects/abc ไปถึง SQL
const parseId = (v) => {
  const id = Number(v);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('ไม่พบโปรเจกต์', 404);
  return id;
};

const mustFind = async (id) => {
  const p = await projects.findById(id);
  if (!p) throw new AppError('ไม่พบโปรเจกต์', 404);
  return p;
};

// GET /projects?status=in_progress
router.get('/', wrap(async (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  if (status && !STATUSES.includes(status)) throw new AppError('สถานะไม่ถูกต้อง', 400);
  res.json((await projects.list(status)).map(view));
}));

router.get('/:id', wrap(async (req, res) => {
  res.json(view(await mustFind(parseId(req.params.id))));
}));

// body: { name, description?, owner?, status?, startDate?, dueDate? }
router.post('/', wrap(async (req, res) => {
  const p = await projects.insert(cleanProject(req.body));
  res.status(201).json(view(p));
}));

// body: เฉพาะ field ที่จะแก้ (ไม่ส่ง key = ไม่แตะ)
router.patch('/:id', wrap(async (req, res) => {
  const current = await mustFind(parseId(req.params.id));
  const fields = cleanProject(req.body, { partial: true, current });
  res.json(view(await projects.update(current.id, fields)));
}));

router.delete('/:id', wrap(async (req, res) => {
  const ok = await projects.remove(parseId(req.params.id));
  if (!ok) throw new AppError('ไม่พบโปรเจกต์', 404);
  res.json({ ok: true });
}));

module.exports = router;
