// frontend/src/components/dashboard/UnfinishedTasks.js — ตารางงานที่ยังไม่เสร็จ (Unfinished Tasks)
import React, { useState, useMemo } from 'react';
import { Card, Table, Badge, ProgressBar, Button, Modal, Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Eye,
  ArrowUpRight,
  CircleCheck,
  Folder,
  UserRound
} from '../common/Icons';

// วันนี้ตามเวลาเครื่อง (YYYY-MM-DD)
const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function UnfinishedTasks({ tasks = [] }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const today = getTodayString();

  // จัดเรียงงาน: งานที่เลยกำหนด (overdue) ขึ้นก่อน ตามด้วยงานที่ใกล้กำหนดส่งที่สุด
  const sortedAndFilteredTasks = useMemo(() => {
    let list = [...tasks];

    // กรองเฉพาะงานที่ยังไม่เสร็จสำหรับหน้านี้ (ยกเว้นผู้ใช้เลือกแท็บ filter อื่น)
    if (activeFilter === 'all') {
      list = list.filter((t) => t.status !== 'completed');
    } else {
      list = list.filter((t) => t.status === activeFilter);
    }

    // เรียงลำดับ: งานเลยกำหนด -> งานใกล้วันส่ง -> งานวันที่ไกลออกไป
    return list.sort((a, b) => {
      const isOverdueA = a.dueDate < today && a.status !== 'completed';
      const isOverdueB = b.dueDate < today && b.status !== 'completed';

      if (isOverdueA && !isOverdueB) return -1;
      if (!isOverdueA && isOverdueB) return 1;

      return (a.dueDate || '').localeCompare(b.dueDate || '');
    });
  }, [tasks, activeFilter, today]);

  // ฟังก์ชันจัดสีและข้อความของสถานะงาน
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'in_progress':
        return <span className="status-pill status-pill-blue">กำลังดำเนินการ</span>;
      case 'pending_review':
        return <span className="status-pill status-pill-orange">รอการตรวจสอบ</span>;
      case 'not_started':
        return <span className="status-pill status-pill-gray">รอเริ่มทำ</span>;
      case 'completed':
        return <span className="status-pill status-pill-green">เสร็จสิ้น</span>;
      default:
        return <span className="status-pill status-pill-gray">{status}</span>;
    }
  };

  // หมวดหมู่งาน
  const renderCategoryBadge = (category) => {
    const colors = {
      Frontend: 'category-frontend',
      Backend: 'category-backend',
      Testing: 'category-testing',
      Documentation: 'category-doc',
      Design: 'category-design',
    };
    return (
      <span className={`category-pill ${colors[category] || 'category-default'}`}>
        {category}
      </span>
    );
  };

  // แสดงผลวันที่กำหนดส่งพร้อมตรวจ overdue
  const renderDueDate = (dueDate, status) => {
    if (!dueDate) return <span className="text-muted">-</span>;
    const isOverdue = dueDate < today && status !== 'completed';
    const isDueToday = dueDate === today && status !== 'completed';

    const formattedDate = dueDate.replace(/-/g, '/');

    if (isOverdue) {
      return (
        <span className="due-date-text text-danger fw-semibold d-inline-flex align-items-center gap-1">
          <CalendarDays size={14} />
          {formattedDate} (เลยกำหนด)
        </span>
      );
    }

    if (isDueToday) {
      return (
        <span className="due-date-text text-warning fw-semibold d-inline-flex align-items-center gap-1">
          <CalendarDays size={14} />
          {formattedDate} (ครบกำหนดวันนี้)
        </span>
      );
    }

    return (
      <span className="due-date-text text-muted d-inline-flex align-items-center gap-1">
        <CalendarDays size={14} />
        {formattedDate}
      </span>
    );
  };

  return (
    <>
      <Card className="border-0 shadow-sm unfinished-tasks-card mb-4">
        <Card.Header className="bg-white border-bottom py-3 px-3 px-md-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="d-flex align-items-center gap-2">
              <h2 className="section-title mb-0">งานที่ยังไม่เสร็จ (Unfinished Tasks)</h2>
              <Badge bg="primary" className="rounded-pill px-2 py-1">
                {sortedAndFilteredTasks.length} รายการ
              </Badge>
            </div>

            <div className="d-flex align-items-center gap-2">
              <Link to="/projects" className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1">
                <span>ดูทั้งหมด</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>

          {/* Filter Bar */}
          <Nav
            variant="pills"
            className="filter-nav mt-3 gap-1"
            activeKey={activeFilter}
            onSelect={(k) => setActiveFilter(k || 'all')}
          >
            <Nav.Item>
              <Nav.Link eventKey="all" className="filter-pill-btn">ทั้งหมดที่ยังไม่เสร็จ</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="in_progress" className="filter-pill-btn">กำลังทำ</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="pending_review" className="filter-pill-btn">รอการตรวจสอบ</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="not_started" className="filter-pill-btn">รอเริ่มทำ</Nav.Link>
            </Nav.Item>
          </Nav>
        </Card.Header>

        <Card.Body className="p-0">
          {sortedAndFilteredTasks.length === 0 ? (
            <div className="text-center py-5 px-3">
              <div className="empty-state-icon mx-auto mb-2 text-muted">
                <CircleCheck size={36} color="var(--green)" />
              </div>
              <h6 className="fw-semibold text-ink">ไม่มีงานค้างในหมวดหมู่นี้</h6>
              <p className="text-muted small mb-3">ยอดเยี่ยมมาก งานทั้งหมดในส่วนนี้เสร็จสมบูรณ์แล้ว</p>
              <Button as={Link} to="/projects" variant="outline-primary" size="sm">
                ไปยังหน้าโปรเจกต์
              </Button>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0 task-table">
                <thead className="table-header">
                  <tr>
                    <th style={{ minWidth: 220 }}>ชื่องาน / รายละเอียด</th>
                    <th style={{ width: 110 }}>ประเภท</th>
                    <th style={{ width: 150 }}>กำหนดส่ง</th>
                    <th style={{ width: 130 }}>สถานะ</th>
                    <th style={{ width: 140 }}>ความคืบหน้า</th>
                    <th style={{ width: 90 }} className="text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAndFilteredTasks.map((task) => (
                    <tr key={task.id} className="task-row">
                      {/* ชื่องานและโปรเจกต์ */}
                      <td>
                        <div className="task-title-wrap">
                          <span className="task-title fw-semibold text-ink d-block">
                            {task.title}
                          </span>
                          <div className="d-flex align-items-center gap-2 mt-1">
                            <span className="task-project-name text-muted small">
                              <Folder size={12} className="me-1" />
                              {task.projectName}
                            </span>
                          </div>
                          {task.description && (
                            <p className="task-desc small text-muted mb-0 mt-1 text-truncate" style={{ maxWidth: 320 }}>
                              {task.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* ประเภทงาน */}
                      <td>{renderCategoryBadge(task.category)}</td>

                      {/* กำหนดส่ง */}
                      <td>{renderDueDate(task.dueDate, task.status)}</td>

                      {/* สถานะ */}
                      <td>{renderStatusBadge(task.status)}</td>

                      {/* ความคืบหน้า */}
                      <td>
                        <div className="progress-container">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="small text-muted">{task.progress}%</span>
                          </div>
                          <ProgressBar
                            now={task.progress}
                            variant={task.progress === 100 ? 'success' : task.progress > 50 ? 'primary' : 'warning'}
                            className="task-progress-bar"
                          />
                        </div>
                      </td>

                      {/* ปุ่มดูรายละเอียด */}
                      <td className="text-center">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="btn-action-view"
                          onClick={() => setSelectedTask(task)}
                          title="ดูรายละเอียดงาน"
                        >
                          <Eye size={14} className="me-1" />
                          <span>ดูงาน</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal แสดงรายละเอียดงาน */}
      {selectedTask && (
        <Modal show onHide={() => setSelectedTask(null)} centered>
          <Modal.Header closeButton className="border-bottom">
            <Modal.Title className="h5 fw-bold text-ink">รายละเอียดงาน</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <div className="mb-3">
              <span className="small text-muted d-block mb-1">ชื่องาน</span>
              <h5 className="fw-semibold text-ink">{selectedTask.title}</h5>
            </div>

            <div className="mb-3">
              <span className="small text-muted d-block mb-1">โปรเจกต์ต้นสังกัด</span>
              <div className="d-flex align-items-center gap-2 fw-medium text-ink">
                <Folder size={16} className="text-primary" />
                <span>{selectedTask.projectName}</span>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-6">
                <span className="small text-muted d-block mb-1">ประเภทงาน</span>
                {renderCategoryBadge(selectedTask.category)}
              </div>
              <div className="col-6">
                <span className="small text-muted d-block mb-1">สถานะปัจจุบัน</span>
                {renderStatusBadge(selectedTask.status)}
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-6">
                <span className="small text-muted d-block mb-1">กำหนดส่ง</span>
                {renderDueDate(selectedTask.dueDate, selectedTask.status)}
              </div>
              <div className="col-6">
                <span className="small text-muted d-block mb-1">หัวหน้าผู้มอบหมาย</span>
                <div className="d-flex align-items-center gap-1 text-ink small">
                  <UserRound size={14} className="text-muted" />
                  <span>{selectedTask.supervisor || 'Supervisor'}</span>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between mb-1">
                <span className="small text-muted">ความคืบหน้า</span>
                <span className="small fw-semibold">{selectedTask.progress}%</span>
              </div>
              <ProgressBar
                now={selectedTask.progress}
                variant={selectedTask.progress === 100 ? 'success' : 'primary'}
                className="task-progress-bar"
              />
            </div>

            <div className="mb-2">
              <span className="small text-muted d-block mb-1">รายละเอียดและคำอธิบาย</span>
              <div className="p-3 bg-light rounded small text-ink" style={{ lineHeight: 1.6 }}>
                {selectedTask.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-top">
            <Button variant="outline-secondary" size="sm" onClick={() => setSelectedTask(null)}>
              ปิดหน้าต่าง
            </Button>
            <Button as={Link} to="/projects" variant="primary" size="sm" onClick={() => setSelectedTask(null)}>
              ไปยังหน้ารายการโปรเจกต์
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
}
