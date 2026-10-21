// frontend/src/components/dashboard/SummaryCards.js — การ์ดสรุปข้อมูล 4 ช่อง
import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { Folder, CircleAlert, CircleCheck, CalendarDays } from '../common/Icons';

export default function SummaryCards({ totalProjects, unfinishedCount, completedCount, dueSoonCount }) {
  const cards = [
    {
      id: 'projects',
      title: 'โปรเจกต์ทั้งหมด',
      value: totalProjects,
      description: 'โปรเจกต์ที่อยู่ระหว่างดำเนินการและวางแผน',
      icon: Folder,
      colorClass: 'card-icon-blue',
      badgeClass: 'badge-blue',
    },
    {
      id: 'unfinished',
      title: 'งานที่ยังไม่เสร็จ',
      value: unfinishedCount,
      description: 'งานที่กำลังทำและรอเริ่มทำ',
      icon: CircleAlert,
      colorClass: 'card-icon-amber',
      badgeClass: 'badge-amber',
    },
    {
      id: 'completed',
      title: 'งานที่เสร็จแล้ว',
      value: completedCount,
      description: 'งานที่ส่งมอบและตรวจผ่านแล้ว',
      icon: CircleCheck,
      colorClass: 'card-icon-green',
      badgeClass: 'badge-green',
    },
    {
      id: 'dueSoon',
      title: 'ใกล้ถึงกำหนดส่ง',
      value: dueSoonCount,
      description: 'งานที่ต้องส่งภายใน 7 วันข้างหน้า',
      icon: CalendarDays,
      colorClass: 'card-icon-red',
      badgeClass: 'badge-red',
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
                  <span className="summary-card-value fw-bold">{c.value}</span>
                  <span className="summary-card-unit text-muted small">รายการ</span>
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
