// frontend/src/components/Projects.js — รายการโปรเจกต์: ค้นหา + กรองสถานะ, เพิ่ม/แก้ไข (Modal), เปลี่ยนสถานะ (ผ่านเมนูแถว), ลบ
// รองรับทั้งข้อมูลจริงจาก API และ Mock Data กลางที่เชื่อมโยงกับ Tasks เมื่อยังไม่ต่อ backend
import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Dropdown,
  Form,
  InputGroup,
  Modal,
  ProgressBar,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap';
import { api, useLoad } from '../utils/api';
import { PROJECT_STATUSES, statusLabel } from '../utils/config';
import { MOCK_PROJECTS_FALLBACK } from '../data/mockData';
import { Check, Folder, MoreVertical, Pencil, Plus, Search, Trash2, X } from './common/Icons';

const EMPTY = { name: '', owner: '', status: 'planning', startDate: '', dueDate: '', description: '' };

// วันนี้ตามเวลาเครื่อง (YYYY-MM-DD)
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// แสดงวันที่เป็น yyyy/mm/dd · null = '-'
const ymd = (v) => (v ? v.replace(/-/g, '/') : '-');

// จำนวนวันถึงกำหนดส่ง (ลบ = เลยกำหนด) · null = ไม่มีกำหนดส่ง
const daysUntil = (dueDate) => {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  const t = new Date(today());
  return Math.round((d - t) / 86400000);
};

// เฉพาะโปรเจกต์ที่ยังไม่เสร็จ/ยกเลิก = เลยกำหนดได้
const hasDeadline = (p) => !['done', 'cancelled'].includes(p.status);
const isOverdue = (p) => {
  const n = daysUntil(p.dueDate);
  return n !== null && n < 0 && hasDeadline(p);
};

// เรียงลำดับตามความเร่งด่วนของกำหนดส่ง: เลยกำหนด → ภายใน 7 วัน → อนาคต → ไม่มีกำหนดส่ง
// ทุกกลุ่มเรียงวันที่กำหนดส่งจากน้อยไปมาก · stable เมื่อกำหนดส่งเท่ากัน · ไม่แก้ array เดิม
const sortProjectsByUrgency = (projects) => {
  const t = today();
  // วันที่แบบ calendar date (ไม่ใช้ timezone): แปลง "YYYY-MM-DD" เป็นจำนวนวัน · คืน null เมื่อว่าง/ไม่ถูกต้อง
  const dueDay = (v) => {
    if (!v || typeof v !== 'string') return null;
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? null : Math.floor(d.getTime() / 86400000) - new Date(0).getTimezoneOffset() / 1440;
    }
    return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1970, 0, 1)) / 86400000);
  };
  const tDay = dueDay(t);
  const groupOf = (p) => {
    const diff = dueDay(p.dueDate) - tDay; // null ต่างกัน = NaN → กลุ่มสุดท้าย
    if (Number.isNaN(diff)) return 3; // ไม่มีวันที่ถูกต้อง
    if (diff < 0) return 0; // เลยกำหนด
    if (diff <= 7) return 1; // ภายใน 7 วัน (รวมวันนี้)
    return 2; // อนาคต
  };
  return projects
    .map((p, i) => ({ p, i, group: groupOf(p), day: dueDay(p.dueDate) }))
    .sort((a, b) =>
      a.group - b.group // ลำดับความสำคัญของกลุ่ม
      || a.day - b.day // ภายในกลุ่ม + กลุ่มอนาคต: ใกล้สุดก่อน (null จะอยู่กลุ่ม 3 อยู่แล้ว)
      || a.i - b.i // stable: ลำดับเดิมเมื่อเท่ากัน
    )
    .map((x) => x.p);
};

// ข้อความบริบทกำหนดส่ง: เหลือ 5 วัน · เลยกำหนด 3 วัน · ครบกำหนดวันนี้ — คืน null เมื่อไม่มีอะไรแสดง
const dueContext = (p) => {
  const n = daysUntil(p.dueDate);
  if (n === null) return null;
  if (!hasDeadline(p)) return null; // done/cancelled — แสดงแค่วันที่พอ
  if (n < 0) return `เลยกำหนด ${Math.abs(n)} วัน`;
  if (n === 0) return 'ครบกำหนดวันนี้';
  if (n <= 30) return `เหลือ ${n} วัน`;
  return null;
};

export default function Projects() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const { data, error, loading, reload } = useLoad(`/projects${filter ? `?status=${filter}` : ''}`);
  const [editing, setEditing] = useState(null); // null = ปิด Modal · {} ไม่มี id = เพิ่มใหม่
  const [deleting, setDeleting] = useState(null); // โปรเจกต์ที่รอยืนยันการลบ
  const [actionError, setActionError] = useState('');

  // สำรอง mock projects ในกรณีที่ยังไม่ได้รัน backend
  const [mockList, setMockList] = useState(MOCK_PROJECTS_FALLBACK);

  // เลือกว่าใช้ข้อมูลจาก API หรือ mockData กลาง
  const isApiConnected = Array.isArray(data) && data.length > 0;
  const baseProjects = isApiConnected ? data : mockList.filter((p) => !filter || p.status === filter);

  // ค้นหา (ชื่อและผู้รับผิดชอบ) — ค้นหาแบบ client-side ทับทั้งแถวที่มาจาก API และ mock
  const q = search.trim().toLowerCase();
  const currentProjects = q
    ? baseProjects.filter(
        (p) => (p.name ?? '').toLowerCase().includes(q) || (p.owner ?? '').toLowerCase().includes(q)
      )
    : baseProjects;

  // เรียงตามความเร่งด่วนของกำหนดส่ง (คำนวณใหม่ทุก render เมื่อข้อมูล/ตัวกรองเปลี่ยน)
  const sortedProjects = sortProjectsByUrgency(
    Array.isArray(currentProjects) ? [...currentProjects] : []
  );

  const filtersActive = Boolean(search.trim() || filter);
  const clearFilters = () => {
    setSearch('');
    setFilter('');
  };

  const changeStatus = async (p, status) => {
    setActionError('');
    try {
      await api.patch(`/projects/${p.id}`, { status });
      reload();
    } catch {
      // โหมดตัวอย่าง: อัปเดตใน frontend state เพื่อให้ทดสอบ interactive ได้
      setMockList((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, status } : item))
      );
    }
  };

  const confirmDelete = async () => {
    const p = deleting;
    if (!p) return;
    setDeleting(null);
    setActionError('');
    try {
      await api.del(`/projects/${p.id}`);
      reload();
    } catch {
      // โหมดตัวอย่าง: ลบจาก frontend state
      setMockList((prev) => prev.filter((item) => item.id !== p.id));
    }
  };

  // สถานะของลิสต์: ยังไม่มีโปรเจกต์เลยในระบบ (ไม่มี mock ก็คือไม่มีข้อมูล API ด้วย)
  const noProjectsAtAll = !isApiConnected && mockList.length === 0;

  return (
    <>
      {/* ── แถบหัวข้อ ─────────────────────────────────────────────── */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h1 className="page-title mb-1">โปรเจกต์</h1>
          <p className="text-muted small mb-0">ระบบบริหารและติดตามสถานะโปรเจกต์ทั้งหมดในองค์กร</p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })} className="d-inline-flex align-items-center gap-1">
          <Plus size={16} />
          <span>เพิ่มโปรเจกต์</span>
        </Button>
      </div>

      {!isApiConnected && error && (
        <Alert variant="info" dismissible className="py-2 small">
          โหมดข้อมูลจำลอง: กำลังแสดงชุดข้อมูลตัวอย่าง — จะซิงก์กับฐานข้อมูลจริงเมื่อเปิด Backend
        </Alert>
      )}

      {noProjectsAtAll ? (
        // ── Empty state: ยังไม่มีโปรเจกต์เลย ─────────────────────────
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center py-5">
            <div className="project-empty-icon mb-3">
              <Folder size={40} className="text-muted" />
            </div>
            <div className="fw-medium mb-1">ยังไม่มีโปรเจกต์ในระบบ</div>
            <p className="text-muted small mb-3">สร้างโปรเจกต์แรกของคุณเพื่อเริ่มบันทึกงานและความคืบหน้า</p>
            <Button onClick={() => setEditing({ ...EMPTY })} className="d-inline-flex align-items-center gap-1">
              <Plus size={16} />
              <span>เพิ่มโปรเจกต์</span>
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <>
          {/* ── แถบค้นหาและตัวกรอง ─────────────────────────────────── */}
          <Card className="border-0 shadow-sm mb-3 projects-toolbar">
            <Card.Body className="p-3">
              <Row className="g-2 align-items-center">
                <Col xs={12} md={6}>
                  <InputGroup size="sm">
                    <InputGroup.Text className="bg-white border-end-0">
                      <Search size={14} className="text-muted" />
                    </InputGroup.Text>
                    <Form.Control
                      type="search"
                      placeholder="ค้นหาชื่อโปรเจกต์ หรือผู้รับผิดชอบ..."
                      className="border-start-0"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      aria-label="ค้นหาโปรเจกต์"
                    />
                  </InputGroup>
                </Col>
                <Col xs={7} md={4}>
                  <Form.Select size="sm" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="กรองตามสถานะ">
                    <option value="">ทุกสถานะ</option>
                    {PROJECT_STATUSES.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </Form.Select>
                </Col>
                {filtersActive && (
                  <Col xs={5} md={2} className="text-end">
                    <Button variant="link" size="sm" className="text-decoration-none p-0 d-inline-flex align-items-center gap-1" onClick={clearFilters}>
                      <X size={14} />
                      <span>ล้างตัวกรอง</span>
                    </Button>
                  </Col>
                )}
              </Row>
            </Card.Body>
          </Card>

          {/* ── บรรทัดสรุปจำนวนที่แสดง ─────────────────────────────── */}
          {loading && !data ? (
            <Spinner animation="border" size="sm" className="mb-3" />
          ) : (
            <div className="d-flex align-items-center gap-2 mb-2 small">
              <span className="fw-medium">{sortedProjects.length}</span>
              <span className="text-muted">โปรเจกต์{q || filter ? 'ที่ตรงเงื่อนไข' : ''}</span>
              {filter && <Badge bg="light" text="dark" className="border fw-normal">{statusLabel(filter)}</Badge>}
            </div>
          )}

          {actionError && <Alert variant="danger" dismissible onClose={() => setActionError('')}>{actionError}</Alert>}

          {sortedProjects.length === 0 && !loading ? (
            // ── Empty state: ไม่มีโปรเจกต์ที่ตรงกับการค้นหา/ตัวกรอง ─────
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center py-5">
                <div className="project-empty-icon mb-3">
                  <Search size={40} className="text-muted" />
                </div>
                <div className="fw-medium mb-1">ไม่พบโปรเจกต์ที่ตรงกับเงื่อนไข</div>
                <p className="text-muted small mb-3">ลองเปลี่ยนคำค้นหาหรือปรับตัวกรองสถานะ</p>
                <Button variant="outline-primary" onClick={clearFilters}>
                  ล้างตัวกรอง
                </Button>
              </Card.Body>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm project-table-card">
              <Table hover responsive className="projects-table align-middle mb-0">
                <thead>
                  <tr>
                    <th>ชื่อโปรเจกต์</th>
                    <th>ผู้รับผิดชอบ</th>
                    <th>กำหนดส่ง</th>
                    <th style={{ minWidth: 170 }}>ความคืบหน้า</th>
                    <th>สถานะ</th>
                    <th className="text-center" style={{ width: 56 }} aria-label="การกระทำ" />
                  </tr>
                </thead>
                <tbody>
                  {sortedProjects.map((p) => {
                    const ctx = dueContext(p);
                    return (
                      <tr key={p.id}>
                        <td>
                          <div className="project-name">{p.name}</div>
                          {p.description && (
                            <div className="project-desc small">{p.description}</div>
                          )}
                        </td>
                        <td className="project-owner text-nowrap">{p.owner || '-'}</td>
                        <td className="text-nowrap">
                          <div className={`project-date ${isOverdue(p) ? 'text-overdue' : ''}`}>
                            {ymd(p.dueDate)}
                          </div>
                          {ctx && (
                            <div className={`small ${isOverdue(p) ? 'text-overdue' : 'project-date-muted'}`}>{ctx}</div>
                          )}
                        </td>
                        <td>
                          {p.totalTasks !== undefined && p.totalTasks > 0 ? (
                            <div className="project-progress-line d-flex align-items-center gap-2">
                              <ProgressBar
                                now={p.progress ?? 0}
                                style={{ height: 5 }}
                                className="project-progress-bar flex-fill"
                                aria-label={`ความคืบหน้า ${p.progress ?? 0}%`}
                              />
                              <span className="project-progress-label small text-nowrap">{p.progress ?? 0}%</span>
                              <span className="project-task-count small text-nowrap">
                                {p.completedTasks ?? 0}/{p.totalTasks}
                                {p.unfinishedTasks > 0 && (
                                  <span className="project-pending"> · ค้าง {p.unfinishedTasks}</span>
                                )}
                              </span>
                            </div>
                          ) : (
                            <span className="project-date-muted small">-</span>
                          )}
                        </td>
                        <td>
                          <Badge bg="" className={`status-badge status-${p.status}`}>
                            {statusLabel(p.status)}
                          </Badge>
                        </td>
                        <td className="text-center text-nowrap">
                          <Dropdown align="end" className="d-inline-flex project-row-dropdown">
                            <Dropdown.Toggle
                              variant=""
                              size="sm"
                              className="project-row-menu"
                              aria-label={`การกระทำของ ${p.name}`}
                            >
                              <MoreVertical size={16} />
                            </Dropdown.Toggle>
                            <Dropdown.Menu fixed>
                              <Dropdown.Header>เปลี่ยนสถานะเป็น</Dropdown.Header>
                              {PROJECT_STATUSES.map((s) => (
                                <Dropdown.Item
                                  key={s.key}
                                  disabled={s.key === p.status}
                                  onClick={() => s.key !== p.status && changeStatus(p, s.key)}
                                >
                                  {s.key === p.status && <Check size={14} className="me-2" />}
                                  {statusLabel(s.key)}
                                </Dropdown.Item>
                              ))}
                              <Dropdown.Divider />
                              <Dropdown.Item onClick={() => setEditing(p)}>
                                <Pencil size={14} className="me-2" />
                                แก้ไข
                              </Dropdown.Item>
                              <Dropdown.Item
                                onClick={() => setDeleting(p)}
                              >
                                <Trash2 size={14} className="me-2" />
                                ลบ
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card>
          )}
        </>
      )}

      {/* ── Modal เพิ่ม / แก้ไข ───────────────────────────────────── */}
      {editing && (
        <ProjectForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={(savedProject) => {
            setEditing(null);
            if (isApiConnected) {
              reload();
            } else {
              // อัปเดตใน mockList
              if (savedProject.id) {
                setMockList((prev) => prev.map((item) => item.id === savedProject.id ? { ...item, ...savedProject } : item));
              } else {
                const newId = Math.max(0, ...mockList.map((m) => m.id)) + 1;
                setMockList((prev) => [...prev, { ...savedProject, id: newId, totalTasks: 0, completedTasks: 0, unfinishedTasks: 0, progress: 0 }]);
              }
            }
          }}
        />
      )}

      {/* ── Modal ยืนยันการลบ ─────────────────────────────────────── */}
      <Modal show={deleting !== null} onHide={() => setDeleting(null)} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-semibold">ยืนยันการลบโปรเจกต์</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleting && (
            <>
              <p className="mb-1">
                คุณต้องการลบโปรเจกต์ <strong>“{deleting.name}”</strong> ใช่หรือไม่?
              </p>
              <p className="text-muted small mb-0">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setDeleting(null)}>ยกเลิก</Button>
          <Button variant="danger" onClick={confirmDelete}>ลบโปรเจกต์</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

// Modal เพิ่ม / แก้ไข — initial.id มี = แก้ไข (PATCH) · ไม่มี = เพิ่มใหม่ (POST)
function ProjectForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: initial.name ?? '',
    owner: initial.owner ?? '',
    status: initial.status ?? 'planning',
    startDate: initial.startDate ?? '',
    dueDate: initial.dueDate ?? '',
    description: initial.description ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (initial.id) await api.patch(`/projects/${initial.id}`, form);
      else await api.post('/projects', form);
      onSaved({ ...form, id: initial.id });
    } catch {
      // โหมดตัวอย่าง: บันทึกสำเร็จในหน่วยความจำ
      onSaved({ ...form, id: initial.id });
    }
  };

  return (
    <Modal show onHide={onClose} backdrop="static">
      <Form onSubmit={submit}>
        <Modal.Header closeButton>
          <Modal.Title>{initial.id ? 'แก้ไขโปรเจกต์' : 'เพิ่มโปรเจกต์'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label>ชื่อโปรเจกต์ *</Form.Label>
            <Form.Control value={form.name} onChange={set('name')} maxLength={200} required autoFocus />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>ผู้รับผิดชอบ</Form.Label>
            <Form.Control value={form.owner} onChange={set('owner')} maxLength={100} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>สถานะ</Form.Label>
            <Form.Select value={form.status} onChange={set('status')}>
              {PROJECT_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <div className="d-flex gap-3 mb-3">
            <Form.Group className="flex-fill">
              <Form.Label>วันที่เริ่ม</Form.Label>
              <Form.Control type="date" value={form.startDate} onChange={set('startDate')} />
            </Form.Group>
            <Form.Group className="flex-fill">
              <Form.Label>กำหนดส่ง</Form.Label>
              <Form.Control type="date" value={form.dueDate} onChange={set('dueDate')} />
            </Form.Group>
          </div>
          <Form.Group>
            <Form.Label>รายละเอียด</Form.Label>
            <Form.Control as="textarea" rows={3} value={form.description} onChange={set('description')} maxLength={5000} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onClose} disabled={saving}>ยกเลิก</Button>
          <Button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึก'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
