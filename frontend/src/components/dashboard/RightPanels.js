// frontend/src/components/dashboard/RightPanels.js — แผงข้อมูลเสริมฝั่งขวา (3 การ์ดแนวตั้ง)
import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  ChartPie,
  Activity,
  Folder,
  CircleCheck,
  CircleAlert,
  Clock,
  ArrowUpRight,
  ChevronRight,
  ClipboardList
} from '../common/Icons';

export default function RightPanels({ tasks = [], projects = [], activities = [] }) {
  // 1. คำนวณภาพรวมความคืบหน้า
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const pendingReviewTasks = tasks.filter((t) => t.status === 'pending_review').length;
  const notStartedTasks = tasks.filter((t) => t.status === 'not_started').length;

  // เปอร์เซ็นต์ความคืบหน้ารวมเฉลี่ย
  const averageProgress = totalTasks > 0
    ? Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / totalTasks)
    : 0;

  // วาด Circular Progress ด้วย SVG
  const circleRadius = 45;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (averageProgress / 100) * circumference;

  return (
    <div className="right-panels-column d-flex flex-column gap-4">
      {/* ── แผงที่ 1: ภาพรวมความคืบหน้า (Overall Project Progress) ─────────── */}
      <Card className="border-0 shadow-sm side-panel-card">
        <Card.Header className="bg-white border-bottom py-3 px-3">
          <div className="d-flex align-items-center gap-2">
            <div className="panel-icon-wrap text-primary">
              <ChartPie size={18} />
            </div>
            <h3 className="panel-title mb-0">ภาพรวมความคืบหน้า</h3>
          </div>
        </Card.Header>
        <Card.Body className="p-3">
          {/* วงแหวน Circular Progress Indicator */}
          <div className="progress-ring-wrap text-center py-2">
            <svg width="120" height="120" className="progress-ring">
              <circle
                stroke="var(--blue-tint)"
                strokeWidth="10"
                fill="transparent"
                r={circleRadius}
                cx="60"
                cy="60"
              />
              <circle
                stroke="var(--blue)"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                r={circleRadius}
                cx="60"
                cy="60"
                style={{
                  transition: 'stroke-dashoffset 0.6s ease',
                  transform: 'rotate(-90deg)',
                  transformOrigin: '50% 50%',
                }}
              />
            </svg>
            <div className="progress-ring-center">
              <span className="progress-number fw-bold text-ink">{averageProgress}%</span>
              <span className="progress-label small text-muted d-block">ความคืบหน้าเฉลี่ย</span>
            </div>
          </div>

          {/* สรุปจำนวนงานตามสถานะ */}
          <div className="status-breakdown-list mt-3 pt-2 border-top">
            <div className="status-item d-flex justify-content-between align-items-center py-1">
              <span className="d-flex align-items-center gap-2 small text-ink">
                <span className="status-indicator-dot dot-blue" />
                กำลังดำเนินการ
              </span>
              <span className="badge bg-light text-dark fw-semibold">{inProgressTasks}</span>
            </div>

            <div className="status-item d-flex justify-content-between align-items-center py-1">
              <span className="d-flex align-items-center gap-2 small text-ink">
                <span className="status-indicator-dot dot-orange" />
                รอการตรวจสอบ
              </span>
              <span className="badge bg-light text-dark fw-semibold">{pendingReviewTasks}</span>
            </div>

            <div className="status-item d-flex justify-content-between align-items-center py-1">
              <span className="d-flex align-items-center gap-2 small text-ink">
                <span className="status-indicator-dot dot-gray" />
                รอเริ่มทำ
              </span>
              <span className="badge bg-light text-dark fw-semibold">{notStartedTasks}</span>
            </div>

            <div className="status-item d-flex justify-content-between align-items-center py-1">
              <span className="d-flex align-items-center gap-2 small text-ink">
                <span className="status-indicator-dot dot-green" />
                เสร็จสิ้นแล้ว
              </span>
              <span className="badge bg-light text-dark fw-semibold">{completedTasks}</span>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* ── แผงที่ 2: กิจกรรมล่าสุด (Recent Activity) ──────────────────────── */}
      <Card className="border-0 shadow-sm side-panel-card">
        <Card.Header className="bg-white border-bottom py-3 px-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <div className="panel-icon-wrap text-primary">
                <Activity size={18} />
              </div>
              <h3 className="panel-title mb-0">กิจกรรมล่าสุด</h3>
            </div>
            <span className="small text-muted">{activities.length} รายการ</span>
          </div>
        </Card.Header>
        <Card.Body className="p-3">
          <div className="activity-timeline">
            {activities.map((act, idx) => (
              <div key={act.id || idx} className="activity-item d-flex gap-3 pb-3">
                <div className="activity-icon-container">
                  <div className={`activity-icon-dot ${act.type === 'completed' ? 'dot-green' : act.type === 'assignment' ? 'dot-blue' : 'dot-orange'}`}>
                    {act.type === 'completed' ? (
                      <CircleCheck size={14} color="#1F7A4D" />
                    ) : act.type === 'assignment' ? (
                      <ClipboardList size={14} color="#1B4FA0" />
                    ) : (
                      <Clock size={14} color="#C42032" />
                    )}
                  </div>
                  {idx < activities.length - 1 && <div className="activity-line" />}
                </div>

                <div className="activity-content flex-grow-1">
                  <div className="d-flex justify-content-between align-items-baseline">
                    <span className="activity-title fw-semibold small text-ink">{act.title}</span>
                    <span className="activity-time text-muted small" style={{ fontSize: '0.75rem' }}>{act.time}</span>
                  </div>
                  <p className="activity-desc text-muted small mb-0 mt-1">{act.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>

      {/* ── แผงที่ 3: โปรเจกต์ที่รับผิดชอบ (Assigned Projects) ─────────────── */}
      <Card className="border-0 shadow-sm side-panel-card">
        <Card.Header className="bg-white border-bottom py-3 px-3 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <div className="panel-icon-wrap text-primary">
              <Folder size={18} />
            </div>
            <h3 className="panel-title mb-0">โปรเจกต์ที่รับผิดชอบ</h3>
          </div>
          <Link to="/projects" className="small text-primary text-decoration-none fw-medium d-inline-flex align-items-center gap-1">
            <span>ดูทั้งหมด</span>
            <ChevronRight size={14} />
          </Link>
        </Card.Header>
        <Card.Body className="p-3">
          <div className="assigned-projects-list d-flex flex-column gap-2">
            {projects.slice(0, 4).map((proj) => {
              // นับจำนวนงานค้างของโปรเจกต์นี้
              const projTasks = tasks.filter((t) => t.projectId === proj.id || t.projectName === proj.name);
              const pendingCount = projTasks.length > 0
                ? projTasks.filter((t) => t.status !== 'completed').length
                : (proj.unfinishedTasks ?? 1);

              return (
                <div key={proj.id} className="project-item p-2 rounded border bg-white">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <span className="project-name fw-semibold small text-ink text-truncate" style={{ maxWidth: 180 }}>
                      {proj.name}
                    </span>
                    <span className={`status-badge status-${proj.status} text-nowrap`} style={{ fontSize: '0.75rem', padding: '1px 8px' }}>
                      {proj.status === 'in_progress' ? 'กำลังทำ' : proj.status === 'planning' ? 'วางแผน' : proj.status}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <span className="small text-muted d-inline-flex align-items-center gap-1" style={{ fontSize: '0.78rem' }}>
                      <CircleAlert size={12} className="text-warning" />
                      งานค้าง: <strong className="text-ink">{pendingCount}</strong> รายการ
                    </span>

                    <Button as={Link} to="/projects" variant="link" size="sm" className="p-0 text-decoration-none small d-inline-flex align-items-center">
                      <span>รายละเอียด</span>
                      <ArrowUpRight size={12} className="ms-1" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
