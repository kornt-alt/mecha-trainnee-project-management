// frontend/src/components/Tasks.js — หน้าตารางงาน (Tasks) และกระดานคานบัน (Kanban Board)
// เชื่อมโยงกับ MOCK_TASKS, MOCK_PROJECTS และ MOCK_EMPLOYEES (Single Source of Truth)
import React, { useState, useMemo } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Form,
  InputGroup,
  Modal,
  ProgressBar,
  Row,
  Table,
} from 'react-bootstrap';
import {
  MOCK_TASKS,
  MOCK_PROJECTS,
  MOCK_EMPLOYEES,
} from '../data/mockData';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Eye,
  Folder,
  Plus,
  Search,
  UserRound,
} from './common/Icons';

// สถานะงานทั้งหมดในระบบ
const TASK_COLUMNS = [
  { key: 'not_started', label: 'รอเริ่มทำ', badgeClass: 'status-pill-gray', headerBg: '#F1F5F9' },
  { key: 'in_progress', label: 'กำลังดำเนินการ', badgeClass: 'status-pill-blue', headerBg: 'var(--blue-tint)' },
  { key: 'pending_review', label: 'รอการตรวจสอบ', badgeClass: 'status-pill-orange', headerBg: 'var(--amber-tint)' },
  { key: 'completed', label: 'เสร็จสิ้น', badgeClass: 'status-pill-green', headerBg: 'var(--green-tint)' },
];

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Tasks() {
  const [taskList, setTaskList] = useState(MOCK_TASKS);
  const [currentView, setCurrentView] = useState('list'); // 'list' หรือ 'kanban'
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const todayStr = today();

  // กรองงานตามเงื่อนไขที่เลือก
  const filteredTasks = useMemo(() => {
    let list = [...taskList];

    if (projectFilter) {
      list = list.filter((t) => String(t.projectId) === String(projectFilter));
    }

    if (statusFilter !== 'all') {
      list = list.filter((t) => t.status === statusFilter);
    }

    if (priorityFilter) {
      list = list.filter((t) => t.priority === priorityFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((t) =>
        [t.title, t.projectName, t.description]
          .some((f) => (f || '').toLowerCase().includes(q))
      );
    }

    return list;
  }, [taskList, projectFilter, statusFilter, priorityFilter, searchTerm]);

  // ฟังก์ชันย้ายสถานะของงาน (สำหรับ Kanban Board)
  const moveTaskStatus = (taskId, newStatus) => {
    setTaskList((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        let newProgress = t.progress;
        let newLabel = t.statusLabel;

        if (newStatus === 'completed') {
          newProgress = 100;
          newLabel = 'เสร็จสิ้น';
        } else if (newStatus === 'not_started') {
          newProgress = 0;
          newLabel = 'รอเริ่มทำ';
        } else if (newStatus === 'pending_review') {
          newProgress = t.progress < 80 ? 90 : t.progress;
          newLabel = 'รอการตรวจสอบ';
        } else if (newStatus === 'in_progress') {
          newProgress = t.progress === 0 || t.progress === 100 ? 50 : t.progress;
          newLabel = 'กำลังดำเนินการ';
        }

        return {
          ...t,
          status: newStatus,
          statusLabel: newLabel,
          progress: newProgress,
        };
      })
    );
  };

  // ฟังก์ชันหาคอลัมน์ก่อนหน้า/ถัดไป
  const getPrevStatus = (currentStatus) => {
    const idx = TASK_COLUMNS.findIndex((c) => c.key === currentStatus);
    return idx > 0 ? TASK_COLUMNS[idx - 1].key : null;
  };

  const getNextStatus = (currentStatus) => {
    const idx = TASK_COLUMNS.findIndex((c) => c.key === currentStatus);
    return idx < TASK_COLUMNS.length - 1 ? TASK_COLUMNS[idx + 1].key : null;
  };

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

  const renderPriorityBadge = (p) => {
    const map = {
      urgent: { label: 'ด่วนมาก', bg: 'danger' },
      high: { label: 'สูง', bg: 'warning' },
      normal: { label: 'ปกติ', bg: 'primary' },
      low: { label: 'ต่ำ', bg: 'secondary' },
    };
    const item = map[p] || { label: p, bg: 'secondary' };
    return <Badge bg={item.bg}>{item.label}</Badge>;
  };

  // นับจำนวนงาน
  const totalCount = taskList.length;
  const completedCount = taskList.filter((t) => t.status === 'completed').length;
  const unfinishedCount = totalCount - completedCount;

  return (
    <div className="tasks-page-container">
      {/* ── แถบหัวข้อและสถิติรวม ─────────────────────────────────── */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h1 className="page-title mb-1">ตารางงาน (Tasks)</h1>
          <p className="text-muted small mb-0">
            ระบบบริหารจัดการงานย่อย รายละเอียดความคืบหน้า และกระดานคานบัน (Kanban Board)
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* ปุ่มสลับโหมด List / Kanban */}
          <div className="btn-group" role="group" aria-label="รูปแบบมุมมอง">
            <button
              type="button"
              className={`btn btn-sm ${currentView === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setCurrentView('list')}
            >
              ตารางงาน (List)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${currentView === 'kanban' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setCurrentView('kanban')}
            >
              กระดานคานบัน (Kanban)
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="d-inline-flex align-items-center gap-1"
            onClick={() => setIsAdding(true)}
          >
            <Plus size={16} />
            <span>เพิ่มงานใหม่</span>
          </Button>
        </div>
      </div>

      {/* ── สถิติภาพรวมด้านบน ───────────────────────────────────── */}
      <Row className="g-3 mb-3">
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm p-3 bg-white">
            <div className="small text-muted">งานทั้งหมด</div>
            <div className="h4 fw-bold text-ink mb-0">{totalCount} <small className="small fw-normal text-muted">รายการ</small></div>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm p-3 bg-white">
            <div className="small text-muted">กำลังดำเนินการ</div>
            <div className="h4 fw-bold text-primary mb-0">{taskList.filter((t) => t.status === 'in_progress').length} <small className="small fw-normal text-muted">รายการ</small></div>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm p-3 bg-white">
            <div className="small text-muted">งานที่ยังไม่เสร็จ</div>
            <div className="h4 fw-bold text-warning mb-0">{unfinishedCount} <small className="small fw-normal text-muted">รายการ</small></div>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm p-3 bg-white">
            <div className="small text-muted">เสร็จสิ้นแล้ว</div>
            <div className="h4 fw-bold text-success mb-0">{completedCount} <small className="small fw-normal text-muted">รายการ</small></div>
          </Card>
        </Col>
      </Row>

      {/* ── แถบตัวกรองและค้นหา ──────────────────────────────────── */}
      <Card className="border-0 shadow-sm mb-3">
        <Card.Body className="p-3">
          <Row className="g-2 align-items-center">
            {/* ค้นหา */}
            <Col xs={12} md={4}>
              <InputGroup size="sm">
                <InputGroup.Text className="bg-white border-end-0">
                  <Search size={14} className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="search"
                  placeholder="ค้นหาชื่องาน รายละเอียด..."
                  className="border-start-0"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>

            {/* กรองโปรเจกต์ */}
            <Col xs={6} md={3}>
              <Form.Select
                size="sm"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
              >
                <option value="">ทุกโปรเจกต์ ({MOCK_PROJECTS.length})</option>
                {MOCK_PROJECTS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Form.Select>
            </Col>

            {/* กรองสถานะ */}
            <Col xs={6} md={3}>
              <Form.Select
                size="sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">ทุกสถานะ</option>
                {TASK_COLUMNS.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </Form.Select>
            </Col>

            {/* กรองความสำคัญ */}
            <Col xs={12} md={2}>
              <Form.Select
                size="sm"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="">ทุกความสำคัญ</option>
                <option value="urgent">ด่วนมาก</option>
                <option value="high">สูง</option>
                <option value="normal">ปกติ</option>
                <option value="low">ต่ำ</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* ── มุมมองที่ 1: ตารางงาน (Table View) ──────────────────── */}
      {currentView === 'list' && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-5 px-3">
                <CircleCheck size={36} className="text-muted mb-2" />
                <h6 className="fw-semibold text-ink">ไม่พบงานที่ตรงกับเงื่อนไขการค้นหา</h6>
                <p className="text-muted small mb-0">ลองปรับตัวกรองหรือล้างคำค้นหา</p>
              </div>
            ) : (
              <Table hover responsive className="align-middle mb-0 task-table bg-white">
                <thead className="table-header">
                  <tr>
                    <th style={{ minWidth: 240 }}>ชื่องาน / โปรเจกต์</th>
                    <th style={{ width: 140 }}>ผู้รับผิดชอบ</th>
                    <th style={{ width: 110 }}>ความสำคัญ</th>
                    <th style={{ width: 130 }}>กำหนดส่ง</th>
                    <th style={{ width: 130 }}>สถานะ</th>
                    <th style={{ width: 130 }}>ความคืบหน้า</th>
                    <th style={{ width: 80 }} className="text-center">ดูงาน</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => {
                    const isTaskOverdue = task.dueDate < todayStr && task.status !== 'completed';
                    const assignee = MOCK_EMPLOYEES.find((e) => e.id === task.assigneeId);

                    return (
                      <tr key={task.id}>
                        <td>
                          <div className="fw-semibold text-ink">{task.title}</div>
                          <div className="small text-muted d-flex align-items-center gap-1 mt-1">
                            <Folder size={12} className="text-primary" />
                            <span>{task.projectName}</span>
                          </div>
                        </td>
                        <td>
                          <div className="small d-flex align-items-center gap-1 text-ink">
                            <UserRound size={13} className="text-muted" />
                            <span>{assignee ? assignee.name : '-'}</span>
                          </div>
                        </td>
                        <td>{renderPriorityBadge(task.priority)}</td>
                        <td>
                          <span className={`small ${isTaskOverdue ? 'text-danger fw-semibold' : 'text-muted'}`}>
                            {task.dueDate.replace(/-/g, '/')}
                            {isTaskOverdue && ' (เลยกำหนด)'}
                          </span>
                        </td>
                        <td>{renderStatusBadge(task.status)}</td>
                        <td>
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="small text-muted">{task.progress}%</span>
                          </div>
                          <ProgressBar
                            now={task.progress}
                            variant={task.progress === 100 ? 'success' : task.progress > 50 ? 'primary' : 'warning'}
                            style={{ height: 6 }}
                          />
                        </td>
                        <td className="text-center">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="py-1 px-2"
                            onClick={() => setSelectedTask(task)}
                            title="ดูรายละเอียด"
                          >
                            <Eye size={14} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      )}

      {/* ── มุมมองที่ 2: กระดานคานบัน (Kanban Board View) ────────── */}
      {currentView === 'kanban' && (
        <div className="kanban-board-wrapper">
          <Row className="g-3">
            {TASK_COLUMNS.map((col) => {
              const colTasks = filteredTasks.filter((t) => t.status === col.key);

              return (
                <Col key={col.key} xs={12} md={6} xl={3}>
                  <Card className="border-0 shadow-sm h-100 bg-white kanban-column-card">
                    {/* ส่วนหัวของคอลัมน์ */}
                    <Card.Header
                      className="py-2 px-3 border-bottom d-flex align-items-center justify-content-between"
                      style={{ backgroundColor: col.headerBg }}
                    >
                      <span className="fw-semibold small text-ink">{col.label}</span>
                      <Badge bg="light" text="dark" className="border fw-bold">
                        {colTasks.length}
                      </Badge>
                    </Card.Header>

                    {/* การ์ดงานในแต่ละคอลัมน์ */}
                    <Card.Body className="p-2 d-flex flex-column gap-2" style={{ minHeight: 460, maxHeight: 720, overflowY: 'auto' }}>
                      {colTasks.length === 0 ? (
                        <div className="text-center text-muted small py-4 my-auto">
                          ไม่มีงานในหมวดนี้
                        </div>
                      ) : (
                        colTasks.map((task) => {
                          const isTaskOverdue = task.dueDate < todayStr && task.status !== 'completed';
                          const prevStatus = getPrevStatus(task.status);
                          const nextStatus = getNextStatus(task.status);

                          return (
                            <Card key={task.id} className="border shadow-none kanban-card p-2">
                              {/* หัวการ์ด: โปรเจกต์และความสำคัญ */}
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="small text-muted text-truncate" style={{ maxWidth: 140 }}>
                                  <Folder size={11} className="me-1 text-primary" />
                                  {task.projectName}
                                </span>
                                {renderPriorityBadge(task.priority)}
                              </div>

                              {/* ชื่องาน */}
                              <div
                                className="fw-semibold text-ink small mb-2 cursor-pointer"
                                onClick={() => setSelectedTask(task)}
                                role="button"
                                tabIndex={0}
                              >
                                {task.title}
                              </div>

                              {/* ความคืบหน้า */}
                              <div className="mb-2">
                                <div className="d-flex justify-content-between small text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                                  <span>ความคืบหน้า</span>
                                  <span>{task.progress}%</span>
                                </div>
                                <ProgressBar
                                  now={task.progress}
                                  variant={task.progress === 100 ? 'success' : task.progress > 50 ? 'primary' : 'warning'}
                                  style={{ height: 4 }}
                                />
                              </div>

                              {/* ส่วนล่างของการ์ด: กำหนดส่งและปุ่มย้าย */}
                              <div className="d-flex justify-content-between align-items-center pt-1 border-top mt-1" style={{ fontSize: '0.75rem' }}>
                                <div className="d-flex align-items-center gap-1">
                                  <CalendarDays size={12} className={isTaskOverdue ? 'text-danger' : 'text-muted'} />
                                  <span className={isTaskOverdue ? 'text-danger fw-semibold' : 'text-muted'}>
                                    {task.dueDate.slice(5).replace(/-/g, '/')}
                                  </span>
                                </div>

                                <div className="d-flex align-items-center gap-1">
                                  {prevStatus && (
                                    <Button
                                      variant="outline-secondary"
                                      size="sm"
                                      className="py-0 px-1"
                                      style={{ fontSize: '0.7rem' }}
                                      onClick={() => moveTaskStatus(task.id, prevStatus)}
                                      title="ย้ายไปสถานะก่อนหน้า"
                                    >
                                      <ChevronLeft size={12} />
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="py-0 px-1"
                                    style={{ fontSize: '0.7rem' }}
                                    onClick={() => setSelectedTask(task)}
                                    title="ดูรายละเอียดงาน"
                                  >
                                    <Eye size={12} />
                                  </Button>
                                  {nextStatus && (
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      className="py-0 px-1"
                                      style={{ fontSize: '0.7rem' }}
                                      onClick={() => moveTaskStatus(task.id, nextStatus)}
                                      title="ย้ายไปสถานะถัดไป"
                                    >
                                      <ChevronRight size={12} />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </Card>
                          );
                        })
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>
      )}

      {/* ── Modal แสดงรายละเอียดงาน (Task Detail Modal) ─────────── */}
      {selectedTask && (
        <Modal show onHide={() => setSelectedTask(null)} centered>
          <Modal.Header closeButton>
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
                <span className="small text-muted d-block mb-1">หมวดหมู่</span>
                <span className="badge bg-light text-dark border">{selectedTask.category}</span>
              </div>
              <div className="col-6">
                <span className="small text-muted d-block mb-1">ระดับความสำคัญ</span>
                {renderPriorityBadge(selectedTask.priority)}
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-6">
                <span className="small text-muted d-block mb-1">สถานะปัจจุบัน</span>
                {renderStatusBadge(selectedTask.status)}
              </div>
              <div className="col-6">
                <span className="small text-muted d-block mb-1">ผู้รับผิดชอบ</span>
                <div className="small fw-medium text-ink">
                  {MOCK_EMPLOYEES.find((e) => e.id === selectedTask.assigneeId)?.name || selectedTask.assigneeId}
                </div>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-6">
                <span className="small text-muted d-block mb-1">วันที่เริ่ม</span>
                <span className="small text-ink">{selectedTask.startDate}</span>
              </div>
              <div className="col-6">
                <span className="small text-muted d-block mb-1">กำหนดส่ง</span>
                <span className="small text-ink">{selectedTask.dueDate}</span>
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
                style={{ height: 8 }}
              />
            </div>

            <div className="mb-2">
              <span className="small text-muted d-block mb-1">คำอธิบายรายละเอียด</span>
              <div className="p-3 bg-light rounded small text-ink" style={{ lineHeight: 1.6 }}>
                {selectedTask.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" size="sm" onClick={() => setSelectedTask(null)}>
              ปิดหน้าต่าง
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* ── Modal เพิ่มงานใหม่ (New Task Modal) ─────────────────── */}
      {isAdding && (
        <NewTaskModal
          onClose={() => setIsAdding(false)}
          onAdd={(newTask) => {
            setTaskList((prev) => [newTask, ...prev]);
            setIsAdding(false);
          }}
        />
      )}
    </div>
  );
}

function NewTaskModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    title: '',
    projectId: MOCK_PROJECTS[0]?.id || 1,
    assigneeId: MOCK_EMPLOYEES[0]?.id || 'emp-001',
    category: 'Frontend',
    startDate: today(),
    dueDate: today(),
    priority: 'normal',
    description: '',
  });

  const set = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const proj = MOCK_PROJECTS.find((p) => String(p.id) === String(form.projectId));
    const newTask = {
      ...form,
      id: `task-${Date.now()}`,
      projectId: Number(form.projectId),
      projectName: proj ? proj.name : '',
      status: 'not_started',
      statusLabel: 'รอเริ่มทำ',
      progress: 0,
      estimatedHours: 16,
      supervisor: 'Supachai M.',
    };
    onAdd(newTask);
  };

  return (
    <Modal show onHide={onClose} backdrop="static">
      <Form onSubmit={submit}>
        <Modal.Header closeButton>
          <Modal.Title className="h5 fw-bold text-ink">เพิ่มงานใหม่</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>ชื่องาน *</Form.Label>
            <Form.Control required autoFocus value={form.title} onChange={set('title')} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>โปรเจกต์ต้นสังกัด *</Form.Label>
            <Form.Select value={form.projectId} onChange={set('projectId')}>
              {MOCK_PROJECTS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Row className="g-2 mb-3">
            <Col xs={6}>
              <Form.Label>ผู้รับผิดชอบ</Form.Label>
              <Form.Select value={form.assigneeId} onChange={set('assigneeId')}>
                {MOCK_EMPLOYEES.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={6}>
              <Form.Label>ระดับความสำคัญ</Form.Label>
              <Form.Select value={form.priority} onChange={set('priority')}>
                <option value="urgent">ด่วนมาก</option>
                <option value="high">สูง</option>
                <option value="normal">ปกติ</option>
                <option value="low">ต่ำ</option>
              </Form.Select>
            </Col>
          </Row>

          <Row className="g-2 mb-3">
            <Col xs={6}>
              <Form.Label>วันที่เริ่ม</Form.Label>
              <Form.Control type="date" value={form.startDate} onChange={set('startDate')} />
            </Col>
            <Col xs={6}>
              <Form.Label>กำหนดส่ง</Form.Label>
              <Form.Control type="date" value={form.dueDate} onChange={set('dueDate')} />
            </Col>
          </Row>

          <Form.Group>
            <Form.Label>รายละเอียดงาน</Form.Label>
            <Form.Control as="textarea" rows={3} value={form.description} onChange={set('description')} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" size="sm" onClick={onClose}>ยกเลิก</Button>
          <Button type="submit" variant="primary" size="sm">เพิ่มงาน</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
