// frontend/src/components/dashboard/EmployeeWorkloadChart.js — กล่อง "สมาชิกที่งานหนักสุด" บนหน้าหลัก
// ใช้กฎเดียวกับหน้า Workload (utils/workload.js memberWorkload — แต้มตามขนาดงานที่เหลือ เทียบค่ากลางทีม) — เดิมเป็นกราฟชั่วโมงวางแผนที่ขึ้น 0 หมดเพราะไม่มีใครกรอกชั่วโมง
import React, { useMemo } from 'react';
import { Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { UserRound, ChevronRight } from '../common/Icons';
import { useMockData } from '../../context/MockDataContext';
import { memberWorkload } from '../../utils/workload';
import { WorkloadLevelBadge } from '../Workload';

const TOP = 5;

export default function EmployeeWorkloadChart() {
  const { peopleInView: employees, tasks } = useMockData(); // เฉพาะคนที่ผู้ใช้ปัจจุบันเห็น (utils/access.js)
  const rows = useMemo(() => memberWorkload(employees, tasks), [employees, tasks]);
  const top = rows.filter((row) => row.level !== 'free').slice(0, TOP);
  const over = rows.filter((row) => row.level === 'over').length;

  return (
    <Card className="border-0 shadow-sm side-panel-card workload-card h-100">
      <Card.Header className="bg-white border-bottom py-2 px-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <div className="panel-icon-wrap text-primary"><UserRound size={18} /></div>
            <h3 className="panel-title mb-0">สมาชิกที่งานหนักสุด</h3>
          </div>
          <Link to="/workload" className="small text-decoration-none d-inline-flex align-items-center">ดูทั้งทีม <ChevronRight size={14} /></Link>
        </div>
      </Card.Header>
      <Card.Body className="p-3">
        <p className="small text-muted mb-2">{over ? `งานเกิน ${over} คน — ควรกระจายงาน` : 'ยังไม่มีใครงานเกิน'}</p>
        {top.length === 0 ? <p className="small text-muted mb-0">ยังไม่มีงานค้าง</p> : (
          <ul className="list-unstyled mb-0 d-flex flex-column gap-2" aria-label="สมาชิกที่งานหนักสุด">
            {top.map((row) => (
              <li key={row.employee.id} className="d-flex justify-content-between align-items-center gap-2">
                <span className="text-truncate">
                  <span className="fw-semibold text-ink">{row.employee.name}</span>
                  <span className="d-block small text-muted text-truncate">ภาระ {row.points} แต้ม · ค้าง {row.open} งาน{row.overdue ? ` · เลยกำหนด ${row.overdue}` : ''}</span>
                </span>
                <WorkloadLevelBadge level={row.level} />
              </li>
            ))}
          </ul>
        )}
      </Card.Body>
    </Card>
  );
}
