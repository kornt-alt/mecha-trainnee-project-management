// frontend/src/utils/labels.js — ชื่อสถานะ / ความสำคัญที่แสดงบนหน้าจอ (แหล่งเดียวของทั้งแอป)
//
// ทำไมมีไฟล์นี้: เดิมแต่ละ component ประกาศชื่อเอง ทำให้สถานะเดียวกันมีหลายชื่อ
//   (เช่น not_started = "รอเริ่มทำ" ใน TaskBadges.js แต่ "ยังไม่เริ่ม" ใน ProjectTasks.js) — รวมมาที่นี่แล้ว (UX-08)
// ⚠️ ห้ามประกาศ map ชื่อสถานะ / ความสำคัญใน component อีก — import จากไฟล์นี้
// ⚠️ ห้ามเก็บ statusLabel ไว้ใน task — แปลงจาก status ด้วย taskStatusLabel() ตอนแสดงผลเสมอ


// ⚠️ key ต้องตรงกับ status ใน MockDataContext.js และ backend/db/schema.sql (tasks.status)
export const TASK_STATUS_LABELS = {
  not_started: 'ยังไม่เริ่ม',
  in_progress: 'กำลังทำ',
  pending_review: 'รอตรวจ',
  completed: 'เสร็จแล้ว',
};

// ลำดับที่ใช้แสดงในตัวกรอง / คอลัมน์บอร์ด
export const TASK_STATUS_ORDER = ['not_started', 'in_progress', 'pending_review', 'completed'];

// ความสำคัญ (ใช้ทั้งงานและโปรเจกต์) — 'normal' กับ 'medium' คือระดับเดียวกัน (ข้อมูลเก่าใช้ทั้งสองแบบ)
// 'none' ยังรองรับเพื่ออ่านข้อมูลเก่า แต่ไม่ควรมีให้เลือกในฟอร์มแล้ว (งาน UX-04)
export const PRIORITY_LABELS = {
  low: 'ต่ำ',
  medium: 'ปกติ',
  normal: 'ปกติ',
  high: 'สูง',
  urgent: 'เร่งด่วน',
  none: 'ไม่ระบุ',
};

// ตัวเลือกในฟอร์ม (ไม่มี 'none' และไม่ซ้ำ normal/medium)
export const PRIORITY_OPTIONS = [
  { key: 'low', label: PRIORITY_LABELS.low },
  { key: 'medium', label: PRIORITY_LABELS.medium },
  { key: 'high', label: PRIORITY_LABELS.high },
  { key: 'urgent', label: PRIORITY_LABELS.urgent },
];

export const taskStatusLabel = (status) => TASK_STATUS_LABELS[status] || status || 'ไม่ระบุสถานะ';
export const priorityLabel = (priority) => PRIORITY_LABELS[priority] || PRIORITY_LABELS.none;
