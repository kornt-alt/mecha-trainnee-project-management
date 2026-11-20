// frontend/src/components/ProjectsTrackingTable.js — ตารางติดตามโปรเจกต์ (ผู้รับผิดชอบ/ชื่อ/หมวด/ความสำคัญ/สถานะ/ความคืบหน้า/วันที่ + ปุ่มแก้ไข/ลบ เหมือนมุมมองการ์ด)
// อ่านข้อมูลจาก MockDataContext (แหล่งเดียวร่วมกับหน้าโปรเจกต์) · สถานะ "ล่าช้า" คือการแสดงผลจากวันกำหนดส่งแล้ว ไม่แก้ข้อมูลจริง
import { Badge, Button, ProgressBar, Table } from 'react-bootstrap';
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

export default function ProjectsTrackingTable({ projects: propProjects, onEdit, onDelete }) {
  const { projects: contextProjects, tasks } = useMockData();
  const displayProjects = propProjects !== undefined ? propProjects : contextProjects;

  return (
    <div className="tracking-table-card shadow-sm">
      <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
        <h2 className="panel-title mb-0">ตารางติดตามโปรเจกต์</h2>
        <Badge bg="light" text="dark" className="border fw-normal">{displayProjects.length} โปรเจกต์</Badge>
      </div>
      <Table responsive className="tracking-table align-middle mb-0">
        <thead>
          <tr>
            <th>ผู้รับผิดชอบ</th>
            <th>ชื่อโปรเจกต์</th>
            <th>หมวดหมู่</th>
            <th>ความสำคัญ</th>
            <th>สถานะ</th>
            <th style={{ minWidth: 170 }}>ความคืบหน้า</th>
            <th>เริ่มต้น</th>
            <th>กำหนดส่ง</th>
            {(onEdit || onDelete) && <th aria-label="จัดการ" />}
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
                {/* ── 1. ผู้รับผิดชอบ: อวตารอักษรย่อ + ชื่อ (เดิมแสดงอีเมล ไม่ตรงกับการ์ด) ── */}
                <td className="text-nowrap">
                  {owner ? (
                    <div className="tracking-owner d-flex align-items-center gap-2">
                      <span className="tracking-avatar flex-shrink-0">{initials(owner.name)}</span>
                      <span className="text-truncate">{owner.name}</span>
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
                {(onEdit || onDelete) && (
                  <td className="text-nowrap text-end">
                    {onEdit && <Button size="sm" variant="outline-primary" className="me-1" aria-label={`แก้ไข ${p.name}`} onClick={() => onEdit(p)}>แก้ไข</Button>}
                    {onDelete && <Button size="sm" variant="outline-danger" aria-label={`ลบ ${p.name}`} onClick={() => onDelete(p)}>ลบ</Button>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
