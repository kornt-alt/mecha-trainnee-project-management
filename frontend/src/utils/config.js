// frontend/src/utils/config.js — ค่าคงที่ของแอป + ค่าที่ต้องตรงกับ backend

// origin ของ backend
// production: ค่าว่าง = origin เดียวกับหน้าเว็บ (Apache proxy ให้)
// dev แยกพอร์ต: ตั้ง REACT_APP_API_ORIGIN=http://localhost:3011 ใน frontend/.env.development
// ห้ามใส่ /PROJECT-MANAGEMENT ลงในค่านี้ — prefix ถูกต่อให้ตอนใช้งาน
export const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || '';

// prefix ที่แอปถูก mount ไว้ — ⚠️ ต้องตรงกับ APP_BASE ใน backend/config/env.js,
// homepage ใน frontend/package.json และ config Apache (Router basename ใน App.js อ่านจากตรงนี้)
export const APP_BASE = '/PROJECT-MANAGEMENT';

// สถานะของ project — ⚠️ key ต้องตรงกับ STATUSES ใน backend/services/projects.js และ ENUM ใน db/schema.sql
// ลำดับในลิสต์ = ลำดับที่โชว์ในตัวเลือก
export const PROJECT_STATUSES = [
  { key: 'planning', label: 'วางแผน' },
  { key: 'in_progress', label: 'กำลังทำ' },
  { key: 'on_hold', label: 'พักไว้' },
  { key: 'done', label: 'เสร็จแล้ว' },
  { key: 'cancelled', label: 'ยกเลิก' },
];

export const statusLabel = (key) => PROJECT_STATUSES.find((s) => s.key === key)?.label ?? key;
