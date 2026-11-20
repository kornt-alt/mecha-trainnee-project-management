// frontend/src/components/Tasks.js — หน้าตารางงานรวมทุกโปรเจกต์ (ตาราง / บอร์ด)
//
// UX-10: เปิดที่ "งานของฉัน" เป็นค่าเริ่มต้น · คลิกงานแล้วพาไปที่งานนั้นใน Project Workspace (รายละเอียดงานมีที่เดียว)
// · เปลี่ยนสถานะทำใน workspace (มีกฎสิทธิ์ครบ) หน้านี้ไว้ดูภาพรวมและเพิ่มงานเร็ว ๆ
// · progress ใช้ % เช็กลิสต์ สูตรเดียวกับ workspace
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Col,
  Form,
  InputGroup,
  ProgressBar,
  Row,
  Table,
} from 'react-bootstrap';
import {
  MOCK_EMPLOYEES,
} from '../data/mockData';
import { useMockData } from '../context/MockDataContext';
import TaskFormModal from './project-detail/TaskFormModal';
import { PRIORITY_LABELS, TASK_STATUS_LABELS, priorityLabel } from '../utils/labels';
import { checklistProgressPercent } from '../utils/projectTrackingUtils';
import {
  CalendarDays,
  CircleCheck,
  Eye,
  Folder,
  Plus,
  Search,
  UserRound,
} from './common/Icons';

// สถานะงานทั้งหมดในระบบ
const TASK_COLUMNS = [
  { key: 'not_started', label: TASK_STATUS_LABELS.not_started, badgeClass: 'status-pill-gray', headerBg: '#F1F5F9' },
  { key: 'in_progress', label: TASK_STATUS_LABELS.in_progress, badgeClass: 'status-pill-blue', headerBg: 'var(--blue-tint)' },
  { key: 'pending_review', label: TASK_STATUS_LABELS.pending_review, badgeClass: 'status-pill-orange', headerBg: 'var(--amber-tint)' },
  { key: 'completed', label: TASK_STATUS_LABELS.completed, badgeClass: 'status-pill-green', headerBg: 'var(--green-tint)' },
];
const PRIORITY_BADGE_BG = { urgent: 'danger', high: 'warning', normal: 'primary', medium: 'primary', low: 'secondary', none: 'secondary' };

// ขอบเขตงาน — ค่าเริ่มต้นคืองานของฉัน (เดิมเห็นงานทุกคนปนกัน หาไม่เจอว่าตัวเองต้องทำอะไร)
const SCOPES = [
  { key: 'mine', label: 'งานของฉัน' },
  { key: 'review', label: 'รอฉันตรวจ' },
  { key: 'all', label: 'ทั้งหมด' },
];

// % เช็กลิสต์ — งานที่เสร็จแล้วนับ 100 เสมอ (สูตรเดียวกับ workspace)
const taskProgress = (task) => (task.status === 'completed' ? 100 : checklistProgressPercent(task.checklist || []));

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Tasks() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tasks: taskList, projects, actorId, createTask } = useMockData();
  const [currentView, setCurrentView] = useState('list'); // 'list' หรือ 'kanban'
  const [scope, setScope] = useState('mine');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // เปิดงานใน workspace ของโปรเจกต์ (หน้ารายละเอียดงานมีที่เดียว)
  const openTask = (task) => navigate(`/projects/${task.projectId}`, { state: { openTaskId: task.id } });

  // ลิงก์เก่าที่ส่ง { selectedTaskId } มาที่หน้านี้ → ส่งต่อไปที่ workspace
  useEffect(() => {
    const requestedId = location.state?.selectedTaskId;
    if (requestedId === undefined || requestedId === null) return;
    const target = taskList.find((task) => String(task.id) === String(requestedId));
    if (target) navigate(`/projects/${target.projectId}`, { replace: true, state: { openTaskId: target.id } });
    else navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate, taskList]);

  const todayStr = today();

  // กรองงานตามเงื่อนไขที่เลือก
  const isMine = (t) => String(t.assigneeId) === String(actorId) || (t.collaborators || []).some((id) => String(id) === String(actorId));
  const isMyReview = (t) => String(t.reviewerId) === String(actorId) && t.status === 'pending_review';

  const filteredTasks = useMemo(() => {
    let list = [...taskList];

    if (scope === 'mine') list = list.filter(isMine);
    if (scope === 'review') list = list.filter(isMyReview);

    if (projectFilter) {
      list = list.filter((t) => String(t.projectId) === String(projectFilter));
    }

    if (statusFilter !== 'all') {
      list = list.filter((t) => t.status === statusFilter);
    }

    if (priorityFilter) {
      list = list.filter((t) => priorityFilter === 'medium'
        ? ['medium', 'normal'].includes(t.priority)
        : t.priority === priorityFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((t) =>
        [t.title, t.projectName, t.description]
          .some((f) => (f || '').toLowerCase().includes(q))
      );
    }

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isMine / isMyReview อ่าน actorId ซึ่งอยู่ใน deps แล้ว
  }, [taskList, scope, actorId, projectFilter, statusFilter, priorityFilter, searchTerm]);

  const renderStatusBadge = (status) => {
    const column = TASK_COLUMNS.find((item) => item.key === status);
    return <span className={`status-pill ${column?.badgeClass || 'status-pill-gray'}`}>{column?.label || status}</span>;
  };

  const renderPriorityBadge = (p) => <Badge bg={PRIORITY_BADGE_BG[p] || 'secondary'}>{priorityLabel(p)}</Badge>;

  // นับจำนวนงาน
  const totalCount = taskList.length;
  const completedCount = taskList.filter((t) => t.status === 'completed').length;
  const unfinishedCount = totalCount - completedCount;

  return (
    <div className="tasks-page-container">
      {/* ── แถบหัวข้อและสถิติรวม ─────────────────────────────────── */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h1 className="page-title mb-1">ตารางงาน</h1>
          <p className="text-muted small mb-0">งานจากทุกโปรเจกต์ · คลิกงานเพื่อไปทำต่อในหน้าโปรเจกต์</p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* ปุ่มสลับโหมด List / Kanban */}
          <div className="btn-group" role="group" aria-label="รูปแบบมุมมอง">
            <button
              type="button"
              className={`btn btn-sm ${currentView === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setCurrentView('list')}
            >
              ตาราง
            </button>
            <button
              type="button"
              className={`btn btn-sm ${currentView === 'kanban' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setCurrentView('kanban')}
            >
              บอร์ด
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
            <div className="small text-muted">{TASK_STATUS_LABELS.in_progress}</div>
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
            <div className="small text-muted">{TASK_STATUS_LABELS.completed}</div>
            <div className="h4 fw-bold text-success mb-0">{completedCount} <small className="small fw-normal text-muted">รายการ</small></div>
          </Card>
        </Col>
      </Row>

      {/* ── แถบตัวกรองและค้นหา ──────────────────────────────────── */}
      <Card className="border-0 shadow-sm mb-3">
        <Card.Body className="p-3">
          <div className="btn-group mb-2" role="group" aria-label="ขอบเขตงาน">
            {SCOPES.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`btn btn-sm ${scope === item.key ? 'btn-primary' : 'btn-outline-primary'}`}
                aria-pressed={scope === item.key}
                onClick={() => setScope(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
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
                <option value="">ทุกโปรเจกต์ ({projects.length})</option>
                {projects.map((p) => (
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
                <option value="urgent">{PRIORITY_LABELS.urgent}</option>
                <option value="high">{PRIORITY_LABELS.high}</option>
                <option value="medium">{PRIORITY_LABELS.medium}</option>
                <option value="low">{PRIORITY_LABELS.low}</option>
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
                <h6 className="fw-semibold text-ink">{scope === 'mine' ? 'ยังไม่มีงานที่คุณรับผิดชอบ' : scope === 'review' ? 'ไม่มีงานที่รอคุณตรวจ' : 'ไม่พบงานที่ตรงกับเงื่อนไขการค้นหา'}</h6>
                <p className="text-muted small mb-0">{scope === 'all' ? 'ลองปรับตัวกรองหรือล้างคำค้นหา' : 'กด “ทั้งหมด” เพื่อดูงานของทุกคน'}</p>
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
                            <span className="small text-muted">{taskProgress(task)}%</span>
                          </div>
                          <ProgressBar
                            now={taskProgress(task)}
                            variant={taskProgress(task) === 100 ? 'success' : taskProgress(task) > 50 ? 'primary' : 'warning'}
                            style={{ height: 6 }}
                          />
                        </td>
                        <td className="text-center">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="py-1 px-2"
                            onClick={() => openTask(task)}
                            title="เปิดงานในโปรเจกต์"
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
                                onClick={() => openTask(task)}
                                role="button"
                                tabIndex={0}
                              >
                                {task.title}
                              </div>

                              {/* ความคืบหน้า */}
                              <div className="mb-2">
                                <div className="d-flex justify-content-between small text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                                  <span>ความคืบหน้า</span>
                                  <span>{taskProgress(task)}%</span>
                                </div>
                                <ProgressBar
                                  now={taskProgress(task)}
                                  variant={taskProgress(task) === 100 ? 'success' : taskProgress(task) > 50 ? 'primary' : 'warning'}
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
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="py-0 px-1"
                                    style={{ fontSize: '0.7rem' }}
                                    onClick={() => openTask(task)}
                                    title="ดูรายละเอียดงาน"
                                  >
                                    <Eye size={12} />
                                  </Button>
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

      {/* ── Modal เพิ่มงานใหม่ (New Task Modal) ─────────────────── */}
      {isAdding && (
        <TaskFormModal projects={projects} onClose={() => setIsAdding(false)} onSave={(values) => {
          const result = createTask({ ...values, status: 'not_started' });
          if (result) setIsAdding(false);
          return result;
        }} />
      )}
    </div>
  );
}
