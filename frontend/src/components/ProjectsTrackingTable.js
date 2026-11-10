// frontend/src/components/ProjectsTrackingTable.js — ตารางติดตามโปรเจกต์ 8 คอลัมน์ (ผู้รับผิดชอบ/ชื่อ/หมวด/ลำดับความสำคัญ/สถานะ/ความคืบหน้า/เริ่มต้น/กำหนดส่ง)
// อ่านข้อมูลจาก MockDataContext (แหล่งเดียวร่วมกับหน้าโปรเจกต์) · สถานะ "ล่าช้า" คือการแสดงผลจากวันกำหนดส่งแล้ว ไม่แก้ข้อมูลจริง
import { Badge, ProgressBar, Table } from 'react-bootstrap';
import { useMockData } from '../context/MockDataContext';
import { MOCK_EMPLOYEES } from '../data/mockData';
import { statusLabel } from '../utils/config';

// วันนี้ตามเวลาเครื่อง (YYYY-MM-DD) — เทคนิคเดียวกับ Projects.js
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// แสดงวันที่เป็น yyyy/mm/dd — รูปแบบเดิมของแอป
const ymd = (v) => (v ? v.replace(/-/g, '/') : '-');

// ล่าช้า = ยังไม่เสร็จ/ยกเลิก พร้อมเลยกำหนดแล้ว — เฉพาะการแสดงผล (คงสถานะ mock ต้นทางเดิม)
const isDelayed = (p) => {
  const t = today();
  return !['done', 'cancelled'].includes(p.status) && p.dueDate && p.dueDate < t;
};

// ผู้รับผิดชอบ: ตรวจสอบจาก managerId ก่อน หากไม่พบตรวจสอบชื่อจาก owner เดิม (รองรับกรณีข้อมูล legacy / unmatched)
const ownerOf = (p) => {
  if (p.managerId) {
    const found = MOCK_EMPLOYEES.find((e) => e.id === p.managerId);
    if (found) return found;
  }
  if (p.owner) {
    const exact = MOCK_EMPLOYEES.find((e) => e.name === p.owner);
    if (exact) return exact;
  }
  return null;
};

// อักษรย่อจากชื่อ-นามสกุล (2 ตัว)
const initials = (name) => {
  const parts = String(name || '').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name || '?').slice(0, 2).toUpperCase();
};

// ลำดับความสำคัญรายโปรเจกต์ = อนุพันธ์จากงานทั้งหมดในโปรเจกต์ (เอาลำดับสูงสุด)
const RANK = { urgent: 3, high: 2, normal: 1, medium: 1, low: 0 };
const PRIORITY_BADGES = {
  urgent: { label: 'ด่วนมาก', variant: 'urgent' },
  high: { label: 'สูง', variant: 'high' },
  normal: { label: 'ปกติ (Medium)', variant: 'medium' },
  medium: { label: 'ปกติ (Medium)', variant: 'medium' },
  low: { label: 'ต่ำ', variant: 'low' },
};

// ฟังก์ชัน normalize ระดับความสำคัญ: รองรับทั้ง string, object ที่มี label/value/name/key
const normalizePriorityKey = (val) => {
  if (!val) return 'low';
  if (typeof val === 'string') {
    const k = val.toLowerCase().trim();
    if (k === 'ด่วนมาก' || k === 'urgent') return 'urgent';
    if (k === 'สูง' || k === 'high') return 'high';
    if (k === 'ปกติ' || k === 'ปานกลาง' || k === 'medium' || k === 'normal') return 'normal';
    if (k === 'ต่ำ' || k === 'low') return 'low';
    return RANK[k] !== undefined ? k : 'low';
  }
  if (typeof val === 'object') {
    return normalizePriorityKey(val.key || val.value || val.variant || val.label || val.name || '');
  }
  return 'low';
};

const priorityOf = (relatedTasks, project) => {
  // หากไม่มีงานที่ผูก ให้ fallback ตรวจสอบ priority ของ project (ถ้ามี)
  if (!relatedTasks || relatedTasks.length === 0) {
    if (project && project.priority) {
      const norm = normalizePriorityKey(project.priority);
      return PRIORITY_BADGES[norm] || { label: 'ต่ำ', variant: 'low' };
    }
    return { label: '-', variant: 'low' };
  }

  // หา priority สูงสุดในงานทั้งหมดที่เกี่ยวข้อง (ป้องกันกรณี reduce คืน task object)
  const topTask = relatedTasks.reduce((highest, current) => {
    const rCurrent = RANK[normalizePriorityKey(current.priority)] ?? 0;
    const rHighest = RANK[normalizePriorityKey(highest.priority)] ?? 0;
    return rCurrent >= rHighest ? current : highest;
  });

  const topKey = normalizePriorityKey(topTask.priority);
  return PRIORITY_BADGES[topKey] || { label: 'ต่ำ', variant: 'low' };
};

export default function ProjectsTrackingTable() {
  const { projects, tasks } = useMockData();

  // ความคืบหน้ารายโปรเจกต์: งานที่ผูกอยู่ = ขั้นตอน (steps) — อิง logic รวมเดิมของ MOCK_PROJECTS (เฉลี่ย progress รายงาน)
  const statsFrom = (related, status) => {
    const total = related.length;
    const completed = related.filter((t) => t.status === 'completed').length;
    const progress = total > 0
      ? Math.round(related.reduce((sum, t) => sum + (t.progress || 0), 0) / total)
      : (status === 'done' ? 100 : 0);
    return { total, completed, progress };
  };

  return (
    <div className="tracking-table-card shadow-sm">
      <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
        <h2 className="panel-title mb-0">ตารางติดตามโปรเจกต์ (Project Tracking)</h2>
        <Badge bg="light" text="dark" className="border fw-normal">{projects.length} โปรเจกต์</Badge>
      </div>
      <Table responsive className="tracking-table align-middle mb-0">
        <thead>
          <tr>
            <th>ผู้รับผิดชอบ</th>
            <th>ชื่อโปรเจกต์</th>
            <th>หมวดหมู่</th>
            <th>ลำดับความสำคัญ</th>
            <th>สถานะ</th>
            <th style={{ minWidth: 170 }}>ความคืบหน้า (Milestone)</th>
            <th>เริ่มต้น</th>
            <th>กำหนดส่ง</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const owner = ownerOf(p);
            const related = tasks.filter((t) => String(t.projectId) === String(p.id));
            const stats = statsFrom(related, p.status);
            const delayed = isDelayed(p);
            const priority = priorityOf(related, p);
            return (
              <tr key={p.id}>
                {/* ── 1. ผู้รับผิดชอบ: อวตารอักษรย่อ + อีเมล (หรือ fallback ชื่อ/owner เดิม) ── */}
                <td className="text-nowrap">
                  {owner ? (
                    <div className="tracking-owner d-flex align-items-center gap-2">
                      <span className="tracking-avatar flex-shrink-0">{initials(owner.name)}</span>
                      <span className="text-truncate">{owner.email || owner.name}</span>
                    </div>
                  ) : p.owner ? (
                    <div className="tracking-owner d-flex align-items-center gap-2">
                      <span className="tracking-avatar flex-shrink-0">{initials(p.owner)}</span>
                      <span className="text-truncate text-muted">{p.owner}</span>
                    </div>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
                {/* ── 2. ชื่อโปรเจกต์ ── */}
                <td className="tracking-project-name">{p.name}</td>
                {/* ── 3. หมวดหมู่ (pastel badge) ── */}
                <td>
                  <Badge bg="" className="tracking-pill tracking-pill-category text-nowrap">{p.category || '-'}</Badge>
                </td>
                {/* ── 4. ลำดับความสำคัญ (pastel badge) ── */}
                <td>
                  <Badge bg="" className={`tracking-pill tracking-pill-priority variant-${priority.variant} text-nowrap`}>{priority.label}</Badge>
                </td>
                {/* ── 5. สถานะ (pastel badge · ล่าช้าเน้นที่คอลัมน์กำหนดส่ง) ── */}
                <td>
                  <Badge bg="" className={`tracking-pill tracking-pill-status status-${p.status} ${delayed ? 'is-delayed' : ''} text-nowrap`}>
                    {statusLabel(p.status)}
                  </Badge>
                </td>
                {/* ── 6. ความคืบหน้า: แถบ + เปอร์เซ็นต์ + งานเสร็จ/ทั้งหมด ── */}
                <td>
                  <div className="tracking-progress d-flex align-items-center gap-2">
                    <ProgressBar
                      now={stats.progress}
                      style={{ height: 6 }}
                      className="tracking-progress-bar flex-fill"
                      variant={stats.progress === 100 ? 'success' : 'primary'}
                      aria-label={`ความคืบหน้า ${stats.progress}%`}
                    />
                    <span className="small text-nowrap tracking-progress-label">
                      {stats.progress}% · {stats.completed}/{stats.total} งาน
                    </span>
                  </div>
                </td>
                {/* ── 7. วันเริ่มต้น ── */}
                <td className="text-nowrap tracking-date">{ymd(p.startDate)}</td>
                {/* ── 8. กำหนดส่ง (ล่าช้า = แดงตาม text-overdue เดิม) ── */}
                <td className={`text-nowrap tracking-date ${delayed ? 'text-overdue' : ''}`}>{ymd(p.dueDate)}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
