// frontend/src/utils/executiveMetrics.js — ตัวเลขสำหรับผู้บริหาร คำนวณจากข้อมูลที่มีอยู่แล้ว (ไม่ต้องให้ผู้ใช้กรอกเพิ่ม)
//
// ฟังก์ชัน pure ทั้งหมด (ไม่อ่าน context) — ใช้ได้ทั้งหน้าเว็บ, unit test และเป็นสูตรอ้างอิงให้ backend Phase B
//   projectHealth      — ปกติ / เสี่ยง / ล่าช้า / ปิดแล้ว + เหตุผล
//   projectSpend       — งบ vs ยอดจ่ายรายเดือน
//   statusDurations    — งานอยู่ในแต่ละสถานะนานเท่าไร (จาก task.statusHistory ที่ระบบบันทึกเองตอนเปลี่ยนสถานะ)
//   averageCycle       — เวลาเฉลี่ยต่องานที่เสร็จแล้ว (รวม / รอตรวจ) ใช้ในหน้ารายงาน
//   (เลิกเก็บชั่วโมงทำงานจริงแล้ว — ผู้ใช้ไม่ต้องกรอก ระยะเวลาแต่ละสถานะได้ข้อมูลที่ผู้บริหารใช้มากกว่า)
//   pendingDecisions   — รายการที่รอผู้บริหาร / หัวหน้าตัดสินใจ

const localISO = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dayNumber = (iso) => Date.parse(`${iso}T00:00:00Z`) / 86400000;

// ระยะเวลาแต่ละสถานะ — statusHistory = [{ status, at }] เรียงตามเวลา (MockDataContext เติมให้ทุกครั้งที่สถานะเปลี่ยน)
// คืน null ถ้างานไม่มีประวัติ (งานตัวอย่างที่สร้างก่อนเริ่มเก็บ) · สถานะล่าสุดที่ยังไม่จบนับถึง now
// segments นับรวมทุกรอบ เช่น ส่งตรวจ → ขอแก้ → ส่งใหม่ จะรวมเวลารอตรวจทั้งสองรอบ
export function statusDurations(task, now = new Date()) {
  const history = (task?.statusHistory || []).filter((entry) => entry?.status && !Number.isNaN(Date.parse(entry.at)));
  if (!history.length) return null;
  const segments = { not_started: 0, in_progress: 0, pending_review: 0 };
  history.forEach((entry, index) => {
    if (entry.status === 'completed') return;
    const end = index + 1 < history.length ? Date.parse(history[index + 1].at) : now.getTime();
    segments[entry.status] = (segments[entry.status] || 0) + Math.max(0, end - Date.parse(entry.at));
  });
  const last = history[history.length - 1];
  return {
    segments,
    total: segments.not_started + segments.in_progress + segments.pending_review,
    reviewRounds: history.filter((entry) => entry.status === 'pending_review').length,
    finished: last.status === 'completed',
    currentStatus: last.status,
    currentSince: last.at,
  };
}

// เวลาเฉลี่ยของงานที่เสร็จแล้ว — { count, total, review } (ms) · ไม่มีงานที่มีข้อมูล = count 0
export function averageCycle(tasks = [], now = new Date()) {
  const finished = tasks.map((task) => statusDurations(task, now)).filter((item) => item?.finished);
  if (!finished.length) return { count: 0, total: 0, review: 0 };
  const avg = (pick) => finished.reduce((sum, item) => sum + pick(item), 0) / finished.length;
  return { count: finished.length, total: avg((item) => item.total), review: avg((item) => item.segments.pending_review) };
}

// แสดงระยะเวลาแบบอ่านง่าย: ไม่ถึง 1 ชม. / X ชม. / X.X วัน (นับตามปฏิทิน ไม่หักวันหยุด)
export function formatDuration(ms) {
  const hours = Number(ms) / 3600000;
  if (!Number.isFinite(hours) || hours < 1) return 'ไม่ถึง 1 ชม.';
  if (hours < 24) return `${Math.round(hours)} ชม.`;
  return `${(hours / 24).toLocaleString('th-TH', { maximumFractionDigits: 1 })} วัน`;
}

// งบ vs ใช้จริง — costs = [{ projectId, month: 'YYYY-MM', amount }]
export function projectSpend(project, costs = []) {
  const budget = Number(project?.plannedBudget) || 0;
  const spent = costs.filter((item) => String(item.projectId) === String(project?.id))
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  return { budget, spent, remaining: budget - spent, percent: budget > 0 ? Math.round((spent / budget) * 100) : null };
}

export const HEALTH_ORDER = { late: 0, at_risk: 1, on_track: 2, done: 3 };

// สุขภาพโปรเจกต์ — ใช้ % งานเสร็จ (นับงาน completed) เทียบ % เวลาที่ผ่านไปของโปรเจกต์
//   late    : เลยวันส่งแล้วยังไม่ปิด · หรือมีงานความสำคัญสูง/เร่งด่วนเลยกำหนด
//   at_risk : งานตามหลังเวลาเกิน 15 จุด · มีงานเลยกำหนด · มีงานติดปัญหา · ใช้งบเกิน 90%
export function projectHealth(project, tasks = [], { today = localISO(new Date()), costs = [] } = {}) {
  if (!project) return { level: 'on_track', reasons: [] };
  if (['done', 'cancelled'].includes(project.status)) return { level: 'done', reasons: [] };
  const open = tasks.filter((task) => task.status !== 'completed');
  const overdue = open.filter((task) => task.dueDate && task.dueDate < today);
  const overdueImportant = overdue.filter((task) => ['high', 'urgent'].includes(task.priority));
  const blocked = open.filter((task) => task.blocked);
  const late = [];
  const risk = [];

  if (project.dueDate && project.dueDate < today) late.push('เลยวันส่งโปรเจกต์แล้ว');
  if (overdueImportant.length) late.push(`งานสำคัญเลยกำหนด ${overdueImportant.length} งาน`);

  if (tasks.length && project.startDate && project.dueDate && project.dueDate > project.startDate) {
    const elapsed = Math.min(100, Math.max(0, ((dayNumber(today) - dayNumber(project.startDate)) / (dayNumber(project.dueDate) - dayNumber(project.startDate))) * 100));
    const done = (tasks.filter((task) => task.status === 'completed').length / tasks.length) * 100;
    if (elapsed - done > 15) risk.push(`งานเสร็จ ${Math.round(done)}% แต่เวลาผ่านไป ${Math.round(elapsed)}%`);
  }
  if (overdue.length > overdueImportant.length) risk.push(`งานเลยกำหนด ${overdue.length - overdueImportant.length} งาน`);
  if (blocked.length) risk.push(`งานติดปัญหา ${blocked.length} งาน`);
  const spend = projectSpend(project, costs);
  if (spend.percent !== null && spend.percent > 90) risk.push(`ใช้งบไปแล้ว ${spend.percent}%`);

  if (late.length) return { level: 'late', reasons: [...late, ...risk] };
  if (risk.length) return { level: 'at_risk', reasons: risk };
  return { level: 'on_track', reasons: [] };
}

// รายการรอตัดสินใจ: คำขอปิดโปรเจกต์รออนุมัติ · งานรอตรวจนานเกิน staleDays วัน · งานติดปัญหา
export function pendingDecisions(projects = [], tasks = [], { now = new Date(), staleDays = 3 } = {}) {
  const projectName = (id) => projects.find((project) => String(project.id) === String(id))?.name || '';
  const items = [];
  projects.filter((project) => project.closure?.status === 'pending_approval').forEach((project) => items.push({
    kind: 'closure', id: `closure-${project.id}`, projectId: project.id, title: project.name,
    detail: 'ขออนุมัติปิดโปรเจกต์', since: project.closure.submittedAt || null,
  }));
  tasks.filter((task) => task.status !== 'completed' && task.blocked).forEach((task) => items.push({
    kind: 'blocked', id: `blocked-${task.id}`, projectId: task.projectId, taskId: task.id, title: task.title,
    detail: `ติดปัญหา${task.blocked.reason ? `: ${task.blocked.reason}` : ''} · ${projectName(task.projectId)}`, since: task.blocked.at || null,
  }));
  const staleBefore = now.getTime() - staleDays * 86400000;
  tasks.filter((task) => task.status === 'pending_review' && task.reviewSubmittedAt && Date.parse(task.reviewSubmittedAt) < staleBefore).forEach((task) => items.push({
    kind: 'stale_review', id: `review-${task.id}`, projectId: task.projectId, taskId: task.id, title: task.title,
    detail: `รอตรวจเกิน ${staleDays} วัน · ${projectName(task.projectId)}`, since: task.reviewSubmittedAt,
  }));
  return items;
}
