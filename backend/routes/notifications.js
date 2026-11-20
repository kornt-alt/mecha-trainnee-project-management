// backend/routes/notifications.js — แจ้งเตือนรายคนของผู้ใช้ที่ login (ต้อง login ทั้งไฟล์)
//
// mount ที่ `${API}/notifications` · การทำเครื่องหมายว่าอ่านแล้ว (markNotificationsRead) อยู่ใน Phase B
'use strict';

const express = require('express');
const notifications = require('../db/notifications');
const { notificationView } = require('../services/views');
const { requireLogin } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');

const router = express.Router();
router.use(requireLogin);

router.get('/', wrap(async (req, res) => {
  res.json((await notifications.listForUser(req.user.userid)).map(notificationView));
}));

module.exports = router;
