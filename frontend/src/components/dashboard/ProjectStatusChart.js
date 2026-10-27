// frontend/src/components/dashboard/ProjectStatusChart.js

import React from 'react';
import { Card } from 'react-bootstrap';
import { ChartPie } from '../common/Icons';

const PROJECT_STATUSES = [
  { key: 'in_progress', label: 'กำลังดำเนินการ', color: 'var(--blue)', matches: ['in_progress'] },
  { key: 'on_hold', label: 'พักไว้ / รอตรวจสอบ', color: 'var(--amber)', matches: ['on_hold', 'pending_review', 'review'] },
  { key: 'planning', label: 'วางแผน', color: 'var(--muted)', matches: ['planning'] },
  { key: 'done', label: 'เสร็จสิ้น', color: 'var(--green)', matches: ['done', 'completed'] },
  { key: 'cancelled', label: 'ยกเลิก', color: 'var(--red)', matches: ['cancelled'] },
];

const RADIUS = 52;
const STROKE_WIDTH = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ProjectStatusChart({ projects = [] }) {
  const total = projects.length;

  if (total === 0) {
    return (
      <Card className="border-0 shadow-sm side-panel-card h-100">
        <Card.Header className="bg-white border-bottom py-3 px-3">
          <div className="d-flex align-items-center gap-2">
            <div className="panel-icon-wrap text-primary">
              <ChartPie size={18} />
            </div>
            <h3 className="panel-title mb-0">สถานะโปรเจกต์</h3>
          </div>
        </Card.Header>
        <Card.Body className="p-3 d-flex flex-column align-items-center justify-content-center text-center">
          <div className="panel-icon-wrap text-muted mb-2">
            <ChartPie size={36} />
          </div>
          <h6 className="fw-semibold text-ink mb-1">ยังไม่มีข้อมูลโปรเจกต์</h6>
          <p className="text-muted small mb-0">เมื่อมีโปรเจกต์ในระบบ สัดส่วนสถานะจะแสดงที่นี่</p>
        </Card.Body>
      </Card>
    );
  }

  // นับจำนวนแต่ละสถานะอย่างยืดหยุ่น (รองรับทั้ง done/completed และ on_hold/pending_review)
  const statusCounts = {};
  projects.forEach((p) => {
    const matched = PROJECT_STATUSES.find((s) => s.matches.includes(p.status));
    const k = matched ? matched.key : p.status;
    statusCounts[k] = (statusCounts[k] || 0) + 1;
  });

  const statusData = PROJECT_STATUSES.map((s) => {
    const count = statusCounts[s.key] || 0;
    return {
      ...s,
      count,
      pct: (count / total) * 100,
    };
  });

  // ✅ 2. แก้ไขการคำนวณ Dashoffset สำหรับ SVG (ใช้ค่าลบเพื่อวาดตามเข็มนาฬิกา)
  let currentOffset = 0;
  const arcs = statusData
    .filter((s) => s.count > 0)
    .map((s) => {
      const percentage = s.count / total;
      const dashLength = percentage * CIRCUMFERENCE;
      
      const arc = {
        ...s,
        dashLength,
        dashoffset: -currentOffset, // ใช้ค่าลบเพื่อให้คำนวณตำแหน่งต่อเนื่องได้แม่นยำขึ้น
      };
      
      currentOffset += dashLength;
      return arc;
    });

  return (
    <Card className="border-0 shadow-sm side-panel-card h-100">
      <Card.Header className="bg-white border-bottom py-3 px-3">
        <div className="d-flex align-items-center gap-2">
          <div className="panel-icon-wrap text-primary">
            <ChartPie size={18} />
          </div>
          <h3 className="panel-title mb-0">สถานะโปรเจกต์</h3>
        </div>
      </Card.Header>
      {/* d-flex + justify-content-center: เมื่อการ์ดถูก stretch ให้สูงเท่าการ์ด Workload เนื้อหาจะกึ่งกลางแนวตั้ง ไม่ทิ้งช่องว่างด้านล่าง */}
      <Card.Body className="p-3 d-flex flex-column justify-content-center">
        <div className="donut-chart-wrap d-flex justify-content-center py-2">
          <div className="donut-chart position-relative">
            <svg width="150" height="150" viewBox="0 0 150 150">
              {/* เพิ่มพื้นหลังสีเทาอ่อนๆ รองรับกรณีที่มีช่องว่างจากการวาดเส้น (Anti-aliasing) */}
              <circle cx="75" cy="75" r={RADIUS} fill="none" stroke="#e9ecef" strokeWidth={STROKE_WIDTH} />
              
              {arcs.map((a) => (
                <circle
                  key={a.key}
                  cx="75"
                  cy="75"
                  r={RADIUS}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={STROKE_WIDTH}
                  // ✅ 3. ลบ + 0.5 ออก เพื่อไม่ให้เส้นทับซ้อนกันจนเกิดบัคในการเรนเดอร์
                  strokeDasharray={`${a.dashLength} ${CIRCUMFERENCE}`}
                  strokeDashoffset={a.dashoffset}
                  transform="rotate(-90 75 75)"
                  className="donut-segment"
                >
                  <title>{`${a.label}: ${a.count} โปรเจกต์ (${a.pct.toFixed(1)}%)`}</title>
                </circle>
              ))}
            </svg>
            <div className="donut-center">
              <span className="donut-total fw-bold text-ink">{total}</span>
              <span className="donut-label small text-muted d-block">โปรเจกต์ทั้งหมด</span>
            </div>
          </div>
        </div>

        <div className="donut-legend mt-3 pt-2 border-top">
          {statusData.map((s) => {
            return (
              <div key={s.key} className="status-item d-flex justify-content-between align-items-center py-1">
                <span className="d-flex align-items-center gap-2 small text-ink">
                  <span className="status-indicator-dot" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
                <span className="d-flex align-items-center gap-2">
                  <span className="badge bg-light text-dark fw-semibold">{s.count} โปรเจกต์</span>
                  <span className="small text-muted" style={{ minWidth: 48, textAlign: 'right' }}>
                    {s.pct.toFixed(1)}%
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </Card.Body>
    </Card>
  );
}