// frontend/src/components/DonutChart/donutChartData.js
// สถานะโปรเจกต์ของระบบ (ต้องตรงกับ PROJECT_STATUSES ใน src/utils/config.js และ ENUM ใน db/schema.sql)
// + adapter แปลงรายการโปรเจกต์ที่ Dashboard ใช้อยู่เป็น items ของ DonutChart

// สีอ้างอิง design token จาก src/styles/tokens.css (แก้สีที่ token เดียว กราฟเปลี่ยนตาม)
export const PROJECT_STATUS_META = [
  { id: 'in_progress', label: 'กำลังดำเนินการ', color: 'var(--blue)', matches: ['in_progress'] },
  { id: 'on_hold', label: 'พักไว้ / รอตรวจสอบ', color: 'var(--amber)', matches: ['on_hold', 'pending_review', 'review'] },
  { id: 'planning', label: 'วางแผน', color: 'var(--muted)', matches: ['planning'] },
  { id: 'completed', label: 'เสร็จสิ้น', color: 'var(--green)', matches: ['done', 'completed'] },
  { id: 'cancelled', label: 'ยกเลิก', color: 'var(--red)', matches: ['cancelled'] },
];

/**
 * Adapter: turn a plain `{ statusId: count }` object into chart items.
 * Missing statuses become 0 so the summary still lists them (the chart hides zero slices).
 *
 * @param {Object<string, number>} countsById e.g. { in_progress: 11, completed: 9 }
 * @returns {Array<{id: string, label: string, color: string, count: number}>}
 */
export const buildStatusItems = (countsById) => {
  const counts = countsById && typeof countsById === 'object' ? countsById : {};
  return PROJECT_STATUS_META.map((meta) => ({
    id: meta.id,
    label: meta.label,
    color: meta.color,
    count: counts[meta.id] ?? 0,
  }));
};

/**
 * นับโปรเจกต์แต่ละสถานะแบบยืดหยุ่น (matches รองรับทั้ง done/completed และ on_hold/pending_review)
 * — ใช้ข้อมูลชุดเดียวกับ SummaryCards/กราฟอื่น ไม่สร้าง mock dataset ซ้ำ
 */
export const buildProjectStatusItems = (projects) => {
  const counts = {};
  (Array.isArray(projects) ? projects : []).forEach((project) => {
    if (!project) return;
    const matched = PROJECT_STATUS_META.find((meta) => meta.matches.includes(project.status));
    if (!matched) return;
    counts[matched.id] = (counts[matched.id] || 0) + 1;
  });
  return buildStatusItems(counts);
};
