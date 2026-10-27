// frontend/src/components/dashboard/SummaryCards.js — การ์ดสรุปโปรเจกต์ 4 ใบสำหรับ Dashboard
import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { FolderKanban, Clock, ClipboardCheck, CalendarClock } from '../common/Icons';

// สถานะที่นับเป็น "กำลังทำ" และ "พักไว้ / รอรีวิว" ตามสถานะโปรเจกต์ที่ระบบใช้อยู่
const IN_PROGRESS_STATUSES = ['in_progress'];
const REVIEW_STATUSES = ['on_hold', 'pending_review', 'review'];
// สถานะที่ตัดออกจากการนับ "ใกล้ถึงกำหนดส่ง" เพราะงานจบแล้วหรือยกเลิกแล้ว
const CLOSED_STATUSES = ['done', 'completed', 'cancelled'];
// เกณฑ์เตือนกำหนดส่ง: ภายใน 7 วันข้างหน้า (รวมวันนี้)
const DEADLINE_THRESHOLD_DAYS = 7;

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function SummaryCards({ projects = [] }) {
  // วันนี้และวันสิ้นสุดเกณฑ์ 7 วันข้างหน้า (เทียบเป็น YYYY-MM-DD ตามเวลาเครื่อง)
  const today = toDateKey(new Date());
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + DEADLINE_THRESHOLD_DAYS);
  const deadlineLimit = toDateKey(thresholdDate);

  // นับแต่ละมิติจากข้อมูลโปรเจกต์จริง (ไม่ hardcode ตัวเลข)
  const totalProjects = projects.length;
  const inProgressCount = projects.filter((p) => IN_PROGRESS_STATUSES.includes(p.status)).length;
  const awaitingReviewCount = projects.filter((p) => REVIEW_STATUSES.includes(p.status)).length;
  const dueSoonCount = projects.filter((p) => {
    if (CLOSED_STATUSES.includes(p.status)) return false;
    // ไม่มีกำหนดส่ง → ข้ามอย่างปลอดภัย
    if (!p.dueDate) return false;
    return p.dueDate >= today && p.dueDate <= deadlineLimit;
  }).length;

  const cards = [
    {
      id: 'total',
      title: 'โปรเจกต์ทั้งหมด',
      value: totalProjects,
      unit: 'โปรเจกต์',
      description: 'โปรเจกต์ทั้งหมดที่บันทึกในระบบ',
      icon: FolderKanban,
      colorClass: 'card-icon-blue',
    },
    {
      id: 'in-progress',
      title: 'โปรเจกต์ที่กำลังทำ',
      value: inProgressCount,
      unit: 'โปรเจกต์',
      description: 'โปรเจกต์ที่อยู่ระหว่างดำเนินการ',
      icon: Clock,
      colorClass: 'card-icon-amber',
    },
    {
      id: 'review',
      title: 'โปรเจกต์ที่พักไว้ / รอรีวิว',
      value: awaitingReviewCount,
      unit: 'โปรเจกต์',
      description: 'โปรเจกต์ที่พักไว้หรือรอการตรวจสอบ',
      icon: ClipboardCheck,
      colorClass: 'card-icon-green',
    },
    {
      id: 'due-soon',
      title: 'โปรเจกต์ใกล้ถึงกำหนดส่ง',
      value: dueSoonCount,
      unit: 'โปรเจกต์',
      description: `กำหนดส่งภายใน ${DEADLINE_THRESHOLD_DAYS} วันข้างหน้า`,
      icon: CalendarClock,
      colorClass: dueSoonCount > 0 ? 'card-icon-red' : 'card-icon-blue',
    },
  ];

  return (
    <Row className="g-3 mb-4 summary-cards-row">
      {cards.map((c) => {
        const IconComponent = c.icon;
        return (
          <Col key={c.id} xs={12} sm={6} lg={3}>
            <Card className="summary-card h-100 border-0 shadow-sm">
              <Card.Body className="d-flex flex-column justify-content-between p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="summary-card-title text-muted fw-medium small">{c.title}</span>
                  <div className={`summary-card-icon-wrap ${c.colorClass}`}>
                    <IconComponent size={20} />
                  </div>
                </div>

                <div className="d-flex align-items-baseline gap-2 mb-1">
                  <span className="summary-card-value fw-bold text-ink">{c.value}</span>
                  <span className="summary-card-unit text-muted small">{c.unit}</span>
                </div>

                <div className="summary-card-desc text-muted small text-truncate" title={c.description}>
                  {c.description}
                </div>
              </Card.Body>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}
