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

const RADIUS = 76;
const STROKE_WIDTH = 19;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ระบบพิกัด SVG ของกราฟ — ศูนย์กลางวงอยู่กึ่งกลาง viewBox พอดี เพื่อให้ตัวเลขรวมที่ซ้อนทับ (donut-center) ยังอยู่กลางรู
// ขอบพื้นที่ป้ายแต่ละฝั่ง (TEXT_X) เผื่อความกว้างข้อความไทยยาวสุด ~18 ตัวอักษรของป้ายสถานะ
const VIEW_W = 380;
const VIEW_H = 260;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;
// จุดเริ่มเส้นเชื่อม = ขอบนอกของวงแหวน แล้วยื่นออกนอกรอบวง (STUB) ก่อนไปที่ป้าย
const EDGE_R = RADIUS + STROKE_WIDTH / 2;
const STUB = 14;
// กรอบแนวตั้งที่ป้ายกำกับแต่ละฝั่งกระจายได้ (กันป้ายล้นขอบบน/ล่าง) และระยะห่างสูงสุดระหว่างแถว
const LABEL_TOP = 28;
const LABEL_BOTTOM = VIEW_H - 28;
const MAX_ROW_GAP = 76;
const TEXT_X = { left: 96, right: VIEW_W - 96 };

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

  // ✅ Dashoffset ค่าลบเพื่อวาดตามเข็มนาฬิกาต่อเนื่องจากจุดเริ่มบนสุด
  let currentOffset = 0;
  const arcs = statusData
    .filter((s) => s.count > 0)
    .map((s) => {
      const percentage = s.count / total;
      const dashLength = percentage * CIRCUMFERENCE;

      const arc = {
        ...s,
        dashLength,
        dashoffset: -currentOffset,
      };

      currentOffset += dashLength;
      return arc;
    });

  // ป้ายกำกับภายนอก: ตำแหน่งจุดเริ่มเส้นเชื่อมคำนวณจากมุมกึ่งกลางของส่วนจริงทุกครั้ง
  // (ไม่มีพิกัดตายตัว — ข้อมูลเปลี่ยน มุม/ตำแหน่งเปลี่ยนตาม)
  // รัศมี stub ถูก clamp ไม่ให้ยื่นเลยคอลัมน์ป้าย (เว้นระยะ 2 หน่วย) — กัน stub พาดผ่านแนวเส้นดิ่งของป้ายอื่น
  const toRad = (deg) => (deg * Math.PI) / 180;
  const DOT_X = { left: TEXT_X.left + 6, right: TEXT_X.right - 6 };
  const labels = [];
  let cumFraction = 0;
  arcs.forEach((arc) => {
    const fraction = arc.count / total;
    const midAngleDeg = -90 + 360 * (cumFraction + fraction / 2);
    cumFraction += fraction;
    const rad = toRad(midAngleDeg);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const colX = cos >= 0 ? DOT_X.right : DOT_X.left;
    const rCap = cos >= 0
      ? (colX - 2 - CX) / Math.max(cos, 1e-9)
      : (CX - colX - 2) / Math.max(-cos, 1e-9);
    const rStub = Math.max(EDGE_R, Math.min(EDGE_R + STUB, rCap));
    labels.push({
      ...arc,
      px: CX + EDGE_R * cos,
      py: CY + EDGE_R * sin,
      ex: CX + rStub * cos,
      ey: CY + rStub * sin,
      colX,
      side: cos >= 0 ? 'right' : 'left',
    });
  });

  // เรียงแถวป้ายของแต่ละฝั่งตามแนวตั้งให้ห่างเท่ากัน (จำกัดระยะห่างสูงสุดต่อแถวและกึ่งกลางแนวตั้ง)
  // — ลดการซ้อนทับและเส้นเชื่อมไขว้
  ['left', 'right'].forEach((side) => {
    const group = labels.filter((l) => l.side === side).sort((a, b) => a.py - b.py);
    if (group.length === 0) return;
    const span = Math.min(LABEL_BOTTOM - LABEL_TOP, (group.length - 1) * MAX_ROW_GAP);
    const startY = CY - span / 2;
    group.forEach((l, i) => {
      l.labelY = group.length > 1 ? startY + (span / (group.length - 1)) * i : CY;
    });
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
          {/* ไม่มี legend ใต้กราฟแล้ว — ชื่อสถานะ/เปอร์เซ็นต์อยู่ที่ป้ายรอบวงพร้อมเส้นเชื่อมแทน */}
          <div className="donut-chart position-relative">
            <svg className="status-donut-svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label="สัดส่วนสถานะโปรเจกต์">
              {/* พื้นหลังเทาอ่อนรองรับช่องว่างจากการวาดเส้น (Anti-aliasing) */}
              <circle cx={CX} cy={CY} r={RADIUS} fill="none" stroke="#e9ecef" strokeWidth={STROKE_WIDTH} />

              {arcs.map((a) => (
                <circle
                  key={a.key}
                  cx={CX}
                  cy={CY}
                  r={RADIUS}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${a.dashLength} ${CIRCUMFERENCE}`}
                  strokeDashoffset={a.dashoffset}
                  transform={`rotate(-90 ${CX} ${CY})`}
                  className="donut-segment"
                >
                  <title>{`${a.label}: ${a.count} โปรเจกต์ (${a.pct.toFixed(1)}%)`}</title>
                </circle>
              ))}

              {labels.map((l) => (
                <g key={`label-${l.key}`}>
                  <title>{`${l.label}: ${l.count} โปรเจกต์ (${l.pct.toFixed(1)}%)`}</title>
                  {/* เส้นเชื่อมแบบ elbow: ออกจากขอบวงตามแนวรัศมี (stub) → แนวนอนเข้าคอลัมน์ป้าย → แนวดิ่งลงแถวป้าย
                      — ลำดับแถวฝั่งละด้านเรียงตาม py แบบ monotonic ทำให้เส้นเชื่อมตัดกันไม่ได้ */}
                  <path
                    className="donut-connector"
                    d={`M ${l.px.toFixed(2)} ${l.py.toFixed(2)} L ${l.ex.toFixed(2)} ${l.ey.toFixed(2)} L ${l.colX.toFixed(2)} ${l.ey.toFixed(2)} L ${l.colX.toFixed(2)} ${l.labelY.toFixed(2)}`}
                  />
                  <circle cx={l.colX} cy={l.labelY} r="2.4" fill={l.color} />
                  <text x={TEXT_X[l.side]} y={l.labelY - 2} textAnchor={l.side === 'left' ? 'end' : 'start'} className="donut-label-name">
                    {l.label}
                  </text>
                  <text x={TEXT_X[l.side]} y={l.labelY + 11} textAnchor={l.side === 'left' ? 'end' : 'start'} className="donut-label-value">
                    {l.pct.toFixed(1)}%
                  </text>
                </g>
              ))}
            </svg>
            <div className="donut-center">
              <span className="donut-total fw-bold text-ink">{total}</span>
              <span className="donut-label small text-muted d-block">โปรเจกต์ทั้งหมด</span>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
