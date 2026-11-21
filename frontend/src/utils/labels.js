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

// สุขภาพโปรเจกต์ (คำนวณใน utils/executiveMetrics.js projectHealth) — สีอยู่ที่ .health-<key> ใน styles/tokens.css
export const PROJECT_HEALTH_LABELS = {
  on_track: 'ปกติ',
  at_risk: 'เสี่ยง',
  late: 'ล่าช้า',
  done: 'ปิดแล้ว',
};

// ขนาดงาน (task.size) — ใช้คิดแต้มภาระงานใน utils/workload.js · งานที่ไม่มีค่า = medium
export const TASK_SIZE_LABELS = {
  small: 'เล็ก',
  medium: 'กลาง',
  large: 'ใหญ่',
};
export const TASK_SIZE_HINTS = {
  small: '≤ ครึ่งวัน',
  medium: '1–3 วัน',
  large: '≥ 1 สัปดาห์',
};
export const taskSizeLabel = (size) => TASK_SIZE_LABELS[size] || TASK_SIZE_LABELS.medium;

// สิทธิ์ผู้ใช้ (utils/access.js USER_ROLES · ต้องตรงกับ ENUM users.role ใน backend — ⏳ MANAGEMENT ยังไม่มีใน schema)
export const USER_ROLE_LABELS = {
  ADMIN: 'ผู้ดูแลระบบ',
  MANAGEMENT: 'Management',
  USER: 'ผู้ใช้ทั่วไป',
};
export const USER_ROLE_HINTS = {
  ADMIN: 'เห็นทุกโปรเจกต์ + จัดการผู้ใช้',
  MANAGEMENT: 'เห็นและจัดการโปรเจกต์ใน Division / Section ที่เลือก',
  USER: 'เห็นเฉพาะโปรเจกต์ที่ตัวเองอยู่ + ที่เปิดให้ทุกคนเห็น',
};

// ระดับภาระงานต่อคน (utils/workload.js memberWorkload) — สีอยู่ที่ .workload-level-<key> ใน styles/tokens.css
export const WORKLOAD_LEVEL_LABELS = {
  over: 'งานเกิน',
  heavy: 'งานหนัก',
  normal: 'ปกติ',
  free: 'ว่าง',
};

export const taskStatusLabel = (status) => TASK_STATUS_LABELS[status] || status || 'ไม่ระบุสถานะ';
export const priorityLabel = (priority) => PRIORITY_LABELS[priority] || PRIORITY_LABELS.none;
