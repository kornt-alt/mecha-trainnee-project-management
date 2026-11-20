// backend/routes/reference.js — ข้อมูลอ้างอิงที่ทุกหน้าใช้: พนักงาน แผนก ทีม ป้ายงาน
//
// mount ที่ `${API}` (ได้ /employees, /departments, /teams, /labels) · guest อ่านได้ —
// หน้าโปรเจกต์ public ต้องแสดงชื่อคนกับป้ายงาน · guest ไม่ได้ email
'use strict';

const express = require('express');
const users = require('../db/users');
const reference = require('../db/reference');
const { employeeView, departmentView, teamView, labelView } = require('../services/views');
const { optionalLogin } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/employees', optionalLogin, wrap(async (req, res) => {
  const includeEmail = !!req.user;
  res.json((await users.list({ activeOnly: true })).map((u) => employeeView(u, { includeEmail })));
}));

router.get('/departments', wrap(async (req, res) => {
  res.json((await reference.listDepartments()).map(departmentView));
}));

router.get('/teams', wrap(async (req, res) => {
  res.json((await reference.listTeams()).map(teamView));
}));

router.get('/labels', wrap(async (req, res) => {
  res.json((await reference.listLabels()).map(labelView));
}));

module.exports = router;
