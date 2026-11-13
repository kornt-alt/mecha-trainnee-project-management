// frontend/src/components/ProjectsTrackingTable.js — ตารางติดตามโปรเจกต์ 8 คอลัมน์ (ผู้รับผิดชอบ/ชื่อ/หมวด/ลำดับความสำคัญ/สถานะ/ความคืบหน้า/เริ่มต้น/กำหนดส่ง)
// อ่านข้อมูลจาก MockDataContext (แหล่งเดียวร่วมกับหน้าโปรเจกต์) · สถานะ "ล่าช้า" คือการแสดงผลจากวันกำหนดส่งแล้ว ไม่แก้ข้อมูลจริง
import { Badge, ProgressBar, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useMockData } from '../context/MockDataContext';
import { statusLabel } from '../utils/config';
import {
  isDelayed,
  ownerOf,
  initials,
  priorityOf,
  statsFrom,
  ymd,
} from '../utils/projectTrackingUtils';

export default function ProjectsTrackingTable({ projects: propProjects }) {
  const { projects: contextProjects, tasks } = useMockData();
  const displayProjects = propProjects !== undefined ? propProjects : contextProjects;

  return (
    <div className="tracking-table-card shadow-sm">
      <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
        <h2 className="panel-title mb-0">ตารางติดตามโปรเจกต์ (Project Tracking)</h2>
        <Badge bg="light" text="dark" className="border fw-normal">{displayProjects.length} โปรเจกต์</Badge>
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
          {displayProjects.map((p) => {
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
                <td className="tracking-project-name">
                  <Link className="tracking-project-link" to={`/projects/${p.id}`}>
                    {p.name}
                  </Link>
                </td>
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
