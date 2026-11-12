// frontend/src/components/Projects.js — รายการโปรเจกต์: ค้นหา + กรองสถานะ, เพิ่ม/แก้ไข (Modal), เปลี่ยนสถานะ (ผ่านเมนูแถว), ลบ
// รองรับทั้งข้อมูลจริงจาก API และ Mock Data กลางที่เชื่อมโยงกับ Tasks เมื่อยังไม่ต่อ backend
import { useState, useMemo } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Modal,
  Spinner,
  Row,
  Col,
  InputGroup,
  Form,
} from 'react-bootstrap';
import { api, useLoad } from '../utils/api';
import { PROJECT_CATEGORIES, PROJECT_STATUSES, statusLabel } from '../utils/config';
import { useMockData } from '../context/MockDataContext';
import { MOCK_EMPLOYEES } from '../data/mockData';
import ProjectsTrackingTable from './ProjectsTrackingTable';
import {
  Folder,
  Plus,
  Search,
  Trash2,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  User,
  Users,
  Calendar,
  Sliders,
  LayoutGrid,
  CheckSquare,
  FileText,
  Clock,
  Sparkles,
  AlertCircle,
  Info,
} from './common/Icons';

const EMPTY = { name: '', category: '', managerId: '', owner: '', status: 'planning', startDate: '', dueDate: '', description: '' };

// วันนี้ตามเวลาเครื่อง (YYYY-MM-DD)
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

export default function Projects() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const { data, error, loading, reload } = useLoad(`/projects${filter ? `?status=${filter}` : ''}`);
  const [editing, setEditing] = useState(null); // null = ปิด Modal · {} ไม่มี id = เพิ่มใหม่
  const [deleting, setDeleting] = useState(null); // โปรเจกต์ที่รอยืนยันการลบ
  const [deleteError, setDeleteError] = useState(''); // Policy B / ลบไม่สำเร็จ — แสดงใน modal เอง (คง popup เปิดไว้ให้ผู้ใช้เห็นบริบท)
  const [actionError, setActionError] = useState('');

  // Mock Mode ใช้ชุดข้อมูลกลางจาก MockDataContext (แชร์ข้ามหน้า กับ Tasks) — ไม่มี local copy อีกต่อไป
  const { projects, setProjects, tasks } = useMockData();

  // API Mode = คำขอล่าสุด "สำเร็จ" (data ไม่ใช่ null) · ห้ามใช้ data.length ตัดสินการเชื่อมต่อ
  // เพราะ backend ตอบ array ว่าง [] เมื่อ DB ยังไม่มีโปรเจกต์ — ยังเป็นคำตอบที่สำเร็จเสมอ
  // ตอนโหลดครั้งแรก/คำขอล้มเหลว data = null → ใช้ mockData กลาง (ระหว่าง reload คง data เดิมไว้)
  const isApiConnected = data !== null;
  const baseProjects = isApiConnected ? data : projects.filter((p) => !filter || p.status === filter);

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

  const confirmDelete = async () => {
    const p = deleting;
    if (!p) return;
    setActionError('');
    setDeleteError('');
    if (!isApiConnected) {
      // Policy B (ผ่านการอนุมัติ): มีงาน (Tasks) ผูกกับโปรเจกต์นี้อยู่ → ห้ามลบ ให้จัดการงานก่อน
      // (เช็คเฉพาะ Mock Mode เพราะ tasks ใน Context คือ mock; ฝั่ง API ต้องตรวจที่ backend — deferred)
      // (id เทียบแบบ String เพราะ project.id และ task.projectId ผ่านฟอร์ม input เป็น string ได้)
      const hasRelatedTasks = tasks.some((t) => String(t.projectId) === String(p.id));
      if (hasRelatedTasks) {
        // ลบถูกบล็อค — คง popup เปิดไว้และแสดงเหตุผลใน popup (ข้อความ/พฤติกรรม Policy B ไม่เปลี่ยน)
        setDeleteError('ไม่สามารถลบโปรเจกต์ได้ เนื่องจากยังมีงาน (Tasks) ที่ผูกกับโปรเจกต์นี้อยู่ — กรุณาจัดการงานที่เกี่ยวข้องก่อนลบโปรเจกต์');
        return;
      }
      // โหมดตัวอย่าง: ลบจาก shared mock state โดยตรง (ไม่ยิง API) — immutable update; ลบสำเร็จจึงปิด popup
      setProjects((prev) => prev.filter((item) => item.id !== p.id));
      setDeleting(null);
      return;
    }
    try {
      await api.del(`/projects/${p.id}`);
      setDeleting(null);
      reload();
    } catch (err) {
      // API ล้มเหลว: แสดงข้อความจริง — ไม่แตะ mock state ที่แชร์อยู่
      // (คง popup เปิดไว้ผ่าน deleteError เพื่อให้ลองใหม่ในบริบทเดิม)
      setDeleteError(err?.message || 'ลบโปรเจกต์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  };

  // สถานะของลิสต์: ยังไม่มีโปรเจกต์เลยในระบบ (ไม่มี mock ก็คือไม่มีข้อมูล API ด้วย)
  const noProjectsAtAll = !isApiConnected && projects.length === 0;

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
                  <Form.Group className="mb-3">
                    <Form.Label className="mecha-form-required">สถานะ</Form.Label>
                    <Form.Select size="sm" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="กรองตามสถานะ">
                      <option value="">ทุกสถานะ</option>
                      {PROJECT_STATUSES.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
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



          {/* ── ตารางติดตามโปรเจกต์ 8 คอลัมน์ (โหมด mock — อ่านจาก Context กลาง) ── */}
          {!loading && !noProjectsAtAll && <ProjectsTrackingTable />}
        </>
      )}

      {/* ── Modal เพิ่ม / แก้ไข ───────────────────────────────────── */}
      {editing && (
        <ProjectForm
          initial={editing}
          onClose={() => setEditing(null)}
          mockMode={!isApiConnected}
          onSaved={(savedProject) => {
            setEditing(null);
            if (isApiConnected) {
              reload();
            } else {
              // อัปเดตใน shared mock state (Context) — immutable update ทุกเส้นทาง
              setProjects((prev) => {
                if (savedProject.id) {
                  return prev.map((item) => (item.id === savedProject.id ? { ...item, ...savedProject } : item));
                }
                // create: id ใหม่ต่อจากตัวใหญ่สุดของชุดปัจจุบัน (เทคนิคเดิม)
                const newId = Math.max(0, ...prev.map((m) => m.id)) + 1;
                return [...prev, { ...savedProject, id: newId, totalTasks: 0, completedTasks: 0, unfinishedTasks: 0, progress: 0 }];
              });
            }
          }}
        />
      )}

      {/* ── Modal ยืนยันการลบ — ใช้ mecha-confirm-modal (Phase A) · destructive = ขอบบนแดง ── */}
      <Modal
        show={deleting !== null}
        onHide={() => { setDeleting(null); setDeleteError(''); }}
        centered
        backdrop="static"
        className="mecha-confirm-modal is-destructive"
      >
        <Modal.Header closeButton>
          <div className="w-100">
            <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2 text-dark">
              <Trash2 size={16} /> ยืนยันการลบโปรเจกต์
            </Modal.Title>
            <div className="text-muted" style={{ fontSize: '.78rem', marginTop: '2px' }}>
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </div>
          </div>
        </Modal.Header>
        <Modal.Body>
          {deleting && (
            <>
              <p className="mb-2">
                คุณต้องการลบโปรเจกต์ <strong>“{deleting.name}”</strong> ใช่หรือไม่?
              </p>
              <p className="text-muted small mb-0">
                โปรเจกต์ที่เกี่ยวข้องกับงาน (Tasks) จะไม่สามารถลบได้ — การลบจะไม่ลบงานที่ผูกอยู่ (ไม่มี cascading delete)
              </p>
              {deleteError && <Alert variant="danger" className="mt-3 mb-0 small">{deleteError}</Alert>}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => { setDeleting(null); setDeleteError(''); }}>ยกเลิก</Button>
          <Button variant="danger" onClick={confirmDelete}>ลบโปรเจกต์</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

// Modal เพิ่ม / แก้ไข — initial.id มี = แก้ไข (PATCH) · ไม่มี = เพิ่มใหม่ (POST)
// mockMode = ยังไม่ต่อ backend → บันทึกในหน่วยความจำผ่าน onSaved() โดยตรง (parent อัปเดต mock state ที่แชร์เอง)
// ปกติ (API mode): ยิง POST/PATCH จริง — ล้มเหลวแสดง error และค้างฟอร์มไว้แก้/ลองใหม่

function ProjectForm({ initial, onClose, onSaved, mockMode = false }) {
  const isEditing = Boolean(initial.id);
  const [viewMode, setViewMode] = useState('stepper'); // 'stepper' | 'single'
  const [currentStep, setCurrentStep] = useState(1); // 1, 2, 3 for stepper

  const initialManagerId = (() => {
    if (initial.managerId) return String(initial.managerId);

    if (initial.owner) {
      const matches = MOCK_EMPLOYEES.filter((e) => e.name === initial.owner);
      if (matches.length === 1) return String(matches[0].id);
    }

    return '';
  })();

  const [form, setForm] = useState({
    name: initial.name ?? '',
    category: initial.category ?? '',
    managerId: initialManagerId,
    owner: initial.owner ?? '',
    status: initial.id ? (initial.status ?? 'planning') : 'planning',
    priority: initial.priority ?? 'normal',
    teamMemberIds: Array.isArray(initial.teamMemberIds)
      ? initial.teamMemberIds.map(String)
      : [],
    requiresDeliverables: initial.requiresDeliverables ?? false,
    deliverableDescription: initial.deliverableDescription ?? '',
    startDate: initial.startDate ?? '',
    dueDate: initial.dueDate ?? '',
    description: initial.description ?? '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const categoryOptions = (() => {
    const list = [...PROJECT_CATEGORIES];

    if (form.category && !list.includes(form.category)) {
      list.push(form.category);
    }

    return list;
  })();

  const isMatchedEmployee = MOCK_EMPLOYEES.some(
    (e) => String(e.id) === form.managerId
  );

  const isLegacyOwner = Boolean(
    form.managerId ? !isMatchedEmployee : form.owner
  );

  const legacyOptionValue = form.managerId || '__legacy__';
  const legacyOptionLabel = form.owner
    ? `${form.owner} (ข้อมูลเดิม)`
    : `${form.managerId} (ข้อมูลเดิม)`;

  const set = (key) => (e) => {
    const value = e.target.value;

    setForm((prev) => ({ ...prev, [key]: value }));

    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: '' }));
    }

    if (
      (key === 'startDate' || key === 'dueDate') &&
      fieldErrors.dateRange
    ) {
      setFieldErrors((prev) => ({ ...prev, dateRange: '' }));
    }
  };

  // เปลี่ยน Project Owner และเพิ่ม Owner คนใหม่เข้า Team
  // ไม่ลบ Owner คนเก่าออกจาก Team
  const handleOwnerChange = (e) => {
    const selectedId = e.target.value;

    if (!selectedId) {
      setForm((prev) => ({
        ...prev,
        managerId: '',
        owner: '',
      }));
      return;
    }

    if (selectedId === legacyOptionValue) return;

    const employee = MOCK_EMPLOYEES.find(
      (emp) => String(emp.id) === selectedId
    );

    if (!employee) return;

    setForm((prev) => ({
      ...prev,
      managerId: selectedId,
      owner: employee.name,
      teamMemberIds: prev.teamMemberIds.includes(selectedId)
        ? prev.teamMemberIds
        : [...prev.teamMemberIds, selectedId],
    }));

    if (fieldErrors.managerId) {
      setFieldErrors((prev) => ({ ...prev, managerId: '' }));
    }
  };

  // ค้นหาพนักงานด้วยชื่อหรือแผนก
  const filteredEmployees = MOCK_EMPLOYEES.filter((emp) => {
    const term = teamFilter.trim().toLowerCase();

    if (!term) return true;

    return (
      emp.name.toLowerCase().includes(term) ||
      (emp.department || '').toLowerCase().includes(term) ||
      (emp.position || '').toLowerCase().includes(term)
    );
  });

  // เพิ่ม/นำสมาชิกออกจาก Team โดยห้ามนำ Owner ปัจจุบันออก
  const toggleTeamMember = (id) => {
    setForm((prev) => {
      if (id === prev.managerId) return prev;

      const exists = prev.teamMemberIds.includes(id);

      return {
        ...prev,
        teamMemberIds: exists
          ? prev.teamMemberIds.filter((memberId) => memberId !== id)
          : [...prev.teamMemberIds, id],
      };
    });
  };

  // Quick Date Shortcut
  const applyDateShortcut = (daysToAdd) => {
    const start = form.startDate ? new Date(form.startDate) : new Date();
    const end = new Date(start.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    setForm((prev) => ({
      ...prev,
      startDate: prev.startDate || startStr,
      dueDate: endStr,
    }));
    if (fieldErrors.dateRange) {
      setFieldErrors((prev) => ({ ...prev, dateRange: '' }));
    }
  };

  // Pre-fill Sample Data for Testing
  const fillSampleData = () => {
    const todayDate = new Date();
    const futureDate = new Date(todayDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sDate = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
    const eDate = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;

    const defaultOwner = MOCK_EMPLOYEES[0];
    const otherMembers = MOCK_EMPLOYEES.slice(1, 4).map((m) => String(m.id));

    setForm({
      name: 'ระบบตรวจสอบคุณภาพชิ้นส่วน AI Vision System V2',
      category: PROJECT_CATEGORIES[0] || 'ระบบซอฟต์แวร์',
      managerId: String(defaultOwner.id),
      owner: defaultOwner.name,
      status: initial.id ? form.status : 'planning',
      priority: 'high',
      teamMemberIds: Array.from(new Set([String(defaultOwner.id), ...otherMembers])),
      requiresDeliverables: true,
      deliverableDescription: '1. โมเดล AI ตรวจจับรอยตำหนิความแม่นยำ >98%\n2. Dashboard แสดงสถิติคลังสินค้า\n3. รายงานการทดสอบและคู่มือผู้ใช้งานภาษาไทย',
      startDate: sDate,
      dueDate: eDate,
      description: 'โครงการพัฒนาระบบตรวจสอบคุณภาพผลิตภัณฑ์ด้วย AI และกล้องความละเอียดสูง เพื่อลดข้อผิดพลาดในกระบวนการผลิต',
    });
    setFieldErrors({});
  };

  // Validate Step before advancing in Stepper mode
  const validateStep = (step) => {
    const errors = {};
    if (step === 1) {
      if (!form.name.trim()) {
        errors.name = 'กรุณาระบุชื่อโปรเจกต์';
      }
    }
    if (step === 2) {
      if (!form.managerId && !(initial.id && form.owner.trim())) {
        errors.managerId = 'กรุณาเลือกผู้รับผิดชอบโปรเจกต์';
      }
    }
    if (step === 3) {
      if (form.startDate && form.dueDate && form.startDate > form.dueDate) {
        errors.dateRange = 'วันที่เริ่มต้นต้องไม่มากกว่ากำหนดส่ง';
      }
    }
    setFieldErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  // Calculate Duration in Days
  const calculatedDuration = useMemo(() => {
    if (!form.startDate || !form.dueDate) return null;
    const start = new Date(form.startDate);
    const end = new Date(form.dueDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }, [form.startDate, form.dueDate]);

  // Current Owner Object
  const currentOwnerObj = useMemo(() => {
    return MOCK_EMPLOYEES.find((e) => String(e.id) === form.managerId);
  }, [form.managerId]);

  // Helper avatar generator
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const avatarTints = [
    { bg: '#DBEAFE', fg: '#1E3A8A' },
    { bg: '#D5F5E3', fg: '#14532D' },
    { bg: '#FEE9B8', fg: '#78350F' },
    { bg: '#FBD5E6', fg: '#831843' },
  ];

  const getAvatarStyle = (idx, size = 36, fontSize = 13) => {
    const tint = avatarTints[idx % avatarTints.length];
    return {
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '999px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: `${fontSize}px`,
      fontWeight: '700',
      background: tint.bg,
      color: tint.fg,
      flexShrink: 0,
    };
  };

  const submit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const errors = {};
    const trimmedName = form.name.trim();
    const trimmedDescription = form.description.trim();

    if (!trimmedName) {
      errors.name = 'กรุณาระบุชื่อโปรเจกต์';
    }

    if (!form.managerId && !(initial.id && form.owner.trim())) {
      errors.managerId = 'กรุณาเลือกผู้รับผิดชอบโปรเจกต์';
    }

    if (!['urgent', 'high', 'normal', 'low'].includes(form.priority)) {
      errors.priority = 'กรุณาเลือกระดับความสำคัญที่ถูกต้อง';
    }

    if (
      form.startDate &&
      form.dueDate &&
      form.startDate > form.dueDate
    ) {
      errors.dateRange = 'วันที่เริ่มต้นต้องไม่มากกว่ากำหนดส่ง';
    }

    if (trimmedName.length > 200) {
      errors.name = 'ชื่อโปรเจกต์ต้องไม่เกิน 200 ตัวอักษร';
    }

    if (trimmedDescription.length > 5000) {
      errors.description = 'รายละเอียดต้องไม่เกิน 5,000 ตัวอักษร';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const validEmployeeIds = new Set(
      MOCK_EMPLOYEES.map((emp) => String(emp.id))
    );

    let teamMemberIds = [...new Set(
      form.teamMemberIds
        .map(String)
        .filter((id) => validEmployeeIds.has(id))
    )];

    if (form.managerId && validEmployeeIds.has(form.managerId)) {
      teamMemberIds = [...new Set([...teamMemberIds, form.managerId])];
    }

    const payload = {
      ...form,
      name: trimmedName,
      description: trimmedDescription,
      teamMemberIds,
      status: initial.id ? form.status : 'planning',
    };

    setSaving(true);
    setFieldErrors({});

    try {
      if (mockMode) {
        onSaved({ ...payload, id: initial.id });
        return;
      }

      if (initial.id) {
        await api.patch(`/projects/${initial.id}`, payload);
      } else {
        await api.post('/projects', payload);
      }

      onSaved({ ...payload, id: initial.id });
    } catch (err) {
      setError(
        err?.message || 'บันทึกโปรเจกต์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show
      onHide={onClose}
      backdrop="static"
      centered
      dialogClassName="dual-mode-modal-dialog"
      contentClassName="dual-mode-modal-content"
    >
      <Form onSubmit={submit} className="d-flex flex-column m-0 p-0" style={{ maxHeight: '92vh' }}>
        {/* ── MODAL HEADER ── */}
        <div className="px-4 py-3 border-bottom d-flex align-items-center justify-content-between bg-white sticky-top z-3">
          <div className="d-flex align-items-center gap-3">
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '14px',
                background: '#eef2ff',
                border: '1px solid #e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4f46e5',
                flexShrink: 0,
              }}
            >
              <FolderPlus size={22} />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h3 className="m-0 fs-5 fw-bold text-dark tracking-tight">
                  {isEditing ? 'แก้ไขโปรเจกต์' : 'เพิ่มโปรเจกต์ใหม่'}
                </h3>
                {!isEditing && (
                  <span className="stepper-badge-new d-none d-sm-inline-block">
                    New Project
                  </span>
                )}
              </div>
              <p className="text-muted small mb-0 mt-0.5">
                {isEditing
                  ? 'แก้ไขรายละเอียดโปรเจกต์และข้อมูลสมาชิกทีม'
                  : 'กรอกข้อมูลรายละเอียดของโปรเจกต์ กำหนดผู้รับผิดชอบ และสร้างทีมงาน'}
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 gap-sm-3">
            {/* View Mode Switcher Toggle Pill (Only in Add Project Mode) */}
            {!isEditing && (
              <div className="view-mode-pill-container">
                <button
                  type="button"
                  onClick={() => setViewMode('stepper')}
                  className={`view-mode-pill-btn ${viewMode === 'stepper' ? 'active' : ''}`}
                  title="โหมดแบ่งขั้นตอน Wizard"
                >
                  <Sliders size={14} />
                  <span>แบบขั้นตอน</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('single')}
                  className={`view-mode-pill-btn ${viewMode === 'single' ? 'active' : ''}`}
                  title="โหมดแสดงทั้งหมดในหน้าเดียว"
                >
                  <LayoutGrid size={14} />
                  <span>หน้าเดียว</span>
                </button>
              </div>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="btn btn-light rounded-circle p-1 d-flex align-items-center justify-content-center text-muted"
              style={{ width: '36px', height: '36px' }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* VIEW MODE 1: STEPPER MODE (modal_redesign.tsx)                       */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {(viewMode === 'stepper' || isEditing) && (
          <>
            {/* Stepper Progress Bar (Only visible in Add Mode) */}
            {!isEditing && (
              <div className="stepper-progress-bar">
                <div className="d-flex align-items-center justify-content-between mx-auto" style={{ maxWidth: '720px' }}>
                  {/* Step 1 Indicator */}
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="stepper-nav-step"
                  >
                    <div
                      className={`stepper-step-circle ${
                        currentStep === 1
                          ? 'active'
                          : currentStep > 1
                          ? 'completed'
                          : 'inactive'
                      }`}
                    >
                      {currentStep > 1 ? <Check size={18} strokeWidth={2.5} /> : '01'}
                    </div>
                    <div>
                      <span className="d-block text-muted text-uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
                        STEP 1
                      </span>
                      <span className={`fw-bold small ${currentStep === 1 ? 'text-primary' : 'text-dark'}`}>
                        ข้อมูลทั่วไป
                      </span>
                    </div>
                  </button>

                  <div className="stepper-divider">
                    <div
                      className="stepper-divider-fill"
                      style={{ width: currentStep > 1 ? '100%' : '0%' }}
                    />
                  </div>

                  {/* Step 2 Indicator */}
                  <button
                    type="button"
                    onClick={() => validateStep(1) && setCurrentStep(2)}
                    className="stepper-nav-step"
                  >
                    <div
                      className={`stepper-step-circle ${
                        currentStep === 2
                          ? 'active'
                          : currentStep > 2
                          ? 'completed'
                          : 'inactive'
                      }`}
                    >
                      {currentStep > 2 ? <Check size={18} strokeWidth={2.5} /> : '02'}
                    </div>
                    <div>
                      <span className="d-block text-muted text-uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
                        STEP 2
                      </span>
                      <span className={`fw-bold small ${currentStep === 2 ? 'text-primary' : 'text-dark'}`}>
                        ทีมงาน & ผู้รับผิดชอบ
                      </span>
                    </div>
                  </button>

                  <div className="stepper-divider">
                    <div
                      className="stepper-divider-fill"
                      style={{ width: currentStep > 2 ? '100%' : '0%' }}
                    />
                  </div>

                  {/* Step 3 Indicator */}
                  <button
                    type="button"
                    onClick={() => validateStep(1) && validateStep(2) && setCurrentStep(3)}
                    className="stepper-nav-step"
                  >
                    <div
                      className={`stepper-step-circle ${
                        currentStep === 3
                          ? 'active'
                          : 'inactive'
                      }`}
                    >
                      03
                    </div>
                    <div>
                      <span className="d-block text-muted text-uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
                        STEP 3
                      </span>
                      <span className={`fw-bold small ${currentStep === 3 ? 'text-primary' : 'text-dark'}`}>
                        กำหนดเวลา & รายละเอียด
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Stepper Body Container */}
            <div className="flex-grow-1 overflow-y-auto px-4 px-md-5 py-4 custom-scrollbar" style={{ maxHeight: 'calc(85vh - 160px)' }}>
              {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

              {/* Sample Fill Banner from modal_redesign */}
              {!isEditing && (
                <div
                  className="rounded-3 p-3 mb-4 d-flex align-items-center justify-content-between"
                  style={{
                    background: 'linear-gradient(to right, #eef2ff, #eff6ff)',
                    border: '1px solid #e0e7ff',
                  }}
                >
                  <div className="d-flex align-items-center gap-2 small text-dark">
                    <Sparkles size={16} className="text-primary" />
                    <span>ต้องการทดสอบเร็ว? คลิกปุ่มเพื่อเติมข้อมูลตัวอย่างได้ทันที</span>
                  </div>
                  <button
                    type="button"
                    onClick={fillSampleData}
                    className="btn btn-sm btn-white text-primary border fw-semibold shadow-sm"
                    style={{ background: '#fff' }}
                  >
                    เติมข้อมูลตัวอย่าง
                  </button>
                </div>
              )}

              {/* STEP 1: Basic Information */}
              {(isEditing || currentStep === 1) && (
                <div className="d-flex flex-column gap-4">
                  <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                    <div className="d-flex align-items-center gap-2">
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: '#e0e7ff',
                          color: '#4338ca',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: '700',
                        }}
                      >
                        01
                      </div>
                      <h4 className="fs-6 fw-bold m-0 text-dark">ข้อมูลทั่วไป (Basic Information)</h4>
                    </div>
                  </div>

                  {/* Project Name */}
                  <div>
                    <label className="form-label small fw-bold text-dark mb-1">
                      ชื่อโปรเจกต์ <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`stepper-fld ${fieldErrors.name ? 'is-invalid' : ''}`}
                      placeholder="ระบุชื่อโปรเจกต์ เช่น ระบบบริหารคลังสินค้าอัตโนมัติ V2"
                      value={form.name}
                      onChange={set('name')}
                      maxLength={200}
                      autoFocus
                    />
                    {fieldErrors.name && (
                      <div className="text-danger small mt-1 d-flex align-items-center gap-1 fw-medium">
                        <AlertCircle size={14} />
                        <span>{fieldErrors.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Category & Priority Grid */}
                  <Row className="g-3">
                    <Col md={6}>
                      <label className="form-label small fw-bold text-dark mb-1">
                        หมวดหมู่โปรเจกต์
                      </label>
                      <select
                        className="stepper-fld"
                        value={form.category}
                        onChange={set('category')}
                        aria-label="เลือกหมวดหมู่โปรเจกต์"
                      >
                        <option value="">-- เลือกหมวดหมู่โปรเจกต์ --</option>
                        {categoryOptions.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </Col>

                    <Col md={6}>
                      <label className="form-label small fw-bold text-dark mb-1">
                        ระดับความสำคัญ (Priority Level)
                      </label>
                      <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                        {[
                          { id: 'low', labelTh: 'ต่ำ', labelEn: 'Low' },
                          { id: 'normal', labelTh: 'ปกติ', labelEn: 'Normal' },
                          { id: 'high', labelTh: 'สูง', labelEn: 'High' },
                          { id: 'urgent', labelTh: 'ด่วนที่สุด', labelEn: 'Urgent' },
                        ].map((prio) => (
                          <button
                            key={prio.id}
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({ ...prev, priority: prio.id }));
                              if (fieldErrors.priority) setFieldErrors((prev) => ({ ...prev, priority: '' }));
                            }}
                            className={`stepper-prio-btn prio-${prio.id} ${form.priority === prio.id ? 'active' : ''}`}
                          >
                            <span className="fw-bold" style={{ fontSize: '12px' }}>{prio.labelTh}</span>
                            <span style={{ fontSize: '10px', opacity: 0.8 }}>{prio.labelEn}</span>
                          </button>
                        ))}
                      </div>
                    </Col>
                  </Row>

                  {/* Status Selector: Only visible in Edit Mode */}
                  {isEditing && (
                    <Row className="mt-1">
                      <Col md={6}>
                        <label className="form-label small fw-bold text-dark mb-1">
                          สถานะโปรเจกต์
                        </label>
                        <select
                          className="stepper-fld"
                          value={form.status}
                          onChange={set('status')}
                        >
                          {PROJECT_STATUSES.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </Col>
                    </Row>
                  )}
                </div>
              )}

              {/* STEP 2: Ownership & Team */}
              {(isEditing || currentStep === 2) && (
                <div className={`d-flex flex-column gap-4 ${isEditing ? 'mt-4 pt-3 border-top' : ''}`}>
                  <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                    <div className="d-flex align-items-center gap-2">
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: '#e0e7ff',
                          color: '#4338ca',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: '700',
                        }}
                      >
                        02
                      </div>
                      <h4 className="fs-6 fw-bold m-0 text-dark">ผู้รับผิดชอบโปรเจกต์ & ทีมงาน (Ownership & Team)</h4>
                    </div>
                  </div>

                  {/* Project Owner Selector & Preview */}
                  <div
                    className="p-3 rounded-3"
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <label className="form-label small fw-bold text-dark mb-0 d-flex align-items-center gap-1.5">
                        <User size={15} className="text-primary" />
                        <span>Project Owner (ผู้รับผิดชอบหลัก)</span>
                        <span className="text-danger">*</span>
                      </label>
                      <span className="text-muted" style={{ fontSize: '11px' }}>
                        *จะเป็นสมาชิกในทีมโดยอัตโนมัติ
                      </span>
                    </div>

                    <Row className="g-3 align-items-center">
                      <Col sm={7}>
                        <select
                          className={`stepper-fld ${fieldErrors.managerId ? 'is-invalid' : ''}`}
                          value={isLegacyOwner ? legacyOptionValue : form.managerId}
                          onChange={handleOwnerChange}
                          aria-label="เลือก Project Owner"
                        >
                          <option value="">เลือกผู้รับผิดชอบโปรเจกต์</option>
                          {isLegacyOwner && (
                            <option value={legacyOptionValue}>{legacyOptionLabel}</option>
                          )}
                          {MOCK_EMPLOYEES.map((emp) => (
                            <option key={emp.id} value={String(emp.id)}>
                              {emp.name} - {emp.position} ({emp.department})
                            </option>
                          ))}
                        </select>
                        {fieldErrors.managerId && (
                          <div className="text-danger small mt-1 d-flex align-items-center gap-1 fw-medium">
                            <AlertCircle size={14} />
                            <span>{fieldErrors.managerId}</span>
                          </div>
                        )}
                      </Col>

                      <Col sm={5}>
                        {currentOwnerObj ? (
                          <div className="d-flex align-items-center gap-2 p-2 rounded-3 bg-white border shadow-sm">
                            <div style={getAvatarStyle(0, 34, 12)}>
                              {getInitials(currentOwnerObj.name)}
                            </div>
                            <div className="overflow-hidden">
                              <p className="m-0 small fw-bold text-dark text-truncate">{currentOwnerObj.name}</p>
                              <p className="m-0 text-primary" style={{ fontSize: '11px' }}>{currentOwnerObj.position}</p>
                            </div>
                            <span className="ms-auto badge bg-primary-subtle text-primary border" style={{ fontSize: '10px' }}>
                              OWNER
                            </span>
                          </div>
                        ) : (
                          <div className="text-muted small p-2 text-center border rounded-3 bg-white">
                            ยังไม่ได้เลือก Owner
                          </div>
                        )}
                      </Col>
                    </Row>
                  </div>

                  {/* Team Members Selection */}
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <label className="form-label small fw-bold text-dark mb-0 d-flex align-items-center gap-1.5">
                        <Users size={15} className="text-primary" />
                        <span>ค้นหาและเลือกสมาชิกทีมโปรเจกต์ (Project Team)</span>
                      </label>
                      <span className="badge bg-primary-subtle text-primary border px-2.5 py-1 rounded-pill" style={{ fontSize: '12px' }}>
                        สมาชิกที่เลือก: {form.teamMemberIds.length} คน
                      </span>
                    </div>

                    {/* Search Field */}
                    <div className="position-relative mb-2">
                      <Search size={15} className="position-absolute text-muted" style={{ left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        className="stepper-fld ps-5"
                        placeholder="ค้นหาชื่อพนักงาน ตำแหน่ง หรือแผนก..."
                        value={teamFilter}
                        onChange={(e) => setTeamFilter(e.target.value)}
                        style={{ height: '42px', fontSize: '13px' }}
                      />
                      {teamFilter && (
                        <button
                          type="button"
                          onClick={() => setTeamFilter('')}
                          className="btn btn-link p-0 position-absolute text-muted text-decoration-none"
                          style={{ right: '14px', top: '50%', transform: 'translateY(-50%)' }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Team Members List */}
                    <div
                      className="border rounded-3 bg-white overflow-y-auto custom-scrollbar"
                      style={{ maxHeight: '220px' }}
                    >
                      {filteredEmployees.length === 0 ? (
                        <div className="p-4 text-center text-muted small">
                          ไม่พบข้อมูลสมาชิกพนักงานที่ตรงกับเงื่อนไขค้นหา
                        </div>
                      ) : (
                        filteredEmployees.map((emp, i) => {
                          const id = String(emp.id);
                          const isOwner = id === form.managerId;
                          const isChecked = form.teamMemberIds.includes(id);

                          return (
                            <div
                              key={id}
                              onClick={() => {
                                if (!isOwner) toggleTeamMember(id);
                              }}
                              className={`p-2.5 px-3 d-flex align-items-center justify-content-between border-bottom ${
                                isChecked ? 'bg-light' : ''
                              }`}
                              style={{ cursor: isOwner ? 'default' : 'pointer', transition: 'background 0.1s' }}
                            >
                              <div className="d-flex align-items-center gap-3 overflow-hidden">
                                <Form.Check
                                  type="checkbox"
                                  id={`project-team-${id}`}
                                  checked={isChecked}
                                  disabled={isOwner}
                                  onChange={() => toggleTeamMember(id)}
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label={`เลือก ${emp.name}`}
                                  className="m-0"
                                />
                                <div style={getAvatarStyle(i, 30, 11)}>
                                  {getInitials(emp.name)}
                                </div>
                                <div className="overflow-hidden">
                                  <div className="d-flex align-items-center gap-1.5">
                                    <span className="small fw-bold text-dark text-truncate">{emp.name}</span>
                                    {isOwner && (
                                      <span className="badge bg-warning-subtle text-warning-emphasis border" style={{ fontSize: '9px' }}>
                                        OWNER
                                      </span>
                                    )}
                                  </div>
                                  <p className="m-0 text-muted" style={{ fontSize: '11px' }}>
                                    {emp.position} · <span className="opacity-75">{emp.department}</span>
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`badge ${
                                  isChecked
                                    ? 'bg-primary-subtle text-primary border'
                                    : 'bg-light text-muted border'
                                }`}
                                style={{ fontSize: '11px' }}
                              >
                                {isChecked ? 'เลือกแล้ว' : '+ เลือก'}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Deliverables & Schedule */}
              {(isEditing || currentStep === 3) && (
                <div className={`d-flex flex-column gap-4 ${isEditing ? 'mt-4 pt-3 border-top' : ''}`}>
                  <div className="d-flex align-items-center justify-content-between border-bottom pb-2">
                    <div className="d-flex align-items-center gap-2">
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: '#e0e7ff',
                          color: '#4338ca',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: '700',
                        }}
                      >
                        03
                      </div>
                      <h4 className="fs-6 fw-bold m-0 text-dark">สิ่งส่งมอบ & กำหนดเวลา (Deliverables & Schedule)</h4>
                    </div>
                  </div>

                  {/* Deliverables Toggle Card — matches Single Page Mode design */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      background: '#FFF9EE',
                      border: '1px solid #FDE8C0',
                      borderRadius: '14px',
                      padding: '12px 14px',
                    }}
                  >
                    <div className="flex-grow-1 d-flex flex-column gap-1">
                      <span className="small fw-bold text-dark">โปรเจกต์นี้มีสิ่งที่ต้องส่งมอบ</span>
                      <span className="text-muted" style={{ fontSize: '12px', lineHeight: 1.4 }}>
                        ส่วนนี้เป็นตัวเลือกเพิ่มเติม (Optional) สามารถเว้นว่างไว้ได้โดยไม่ส่งผลต่อการสร้างโปรเจกต์
                      </span>
                    </div>
                    {/* Toggle Switch */}
                    <button
                      type="button"
                      id="stepper-deliverables-toggle"
                      aria-pressed={form.requiresDeliverables}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          requiresDeliverables: !prev.requiresDeliverables,
                        }))
                      }
                      style={{
                        width: '50px',
                        height: '28px',
                        border: 'none',
                        borderRadius: '99px',
                        padding: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0,
                        justifyContent: form.requiresDeliverables ? 'flex-end' : 'flex-start',
                        background: form.requiresDeliverables ? '#2F5BD0' : '#CBD5E1',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <span
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '99px',
                          background: '#ffffff',
                          boxShadow: '0 1px 3px rgba(15,23,42,0.3)',
                        }}
                      />
                    </button>
                  </div>

                  {form.requiresDeliverables && (
                    <div className="mt-2 pt-2 border-top">
                      <textarea
                        rows={3}
                        className="stepper-fld"
                        placeholder="ระบุรายละเอียดสิ่งที่ต้องส่งมอบ เช่น 1. คู่มือการใช้งาน 2. ซอฟต์แวร์ V1..."
                        value={form.deliverableDescription}
                        onChange={set('deliverableDescription')}
                      />
                      <span className="text-muted d-block mt-1" style={{ fontSize: '11px' }}>
                        * ส่วนนี้เป็นตัวเลือกเพิ่มเติม สามารถแก้ไขภายหลังในโปรเจกต์ได้
                      </span>
                    </div>
                  )}

                  {/* Schedule Date Range Selector */}
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-1.5">
                      <label className="form-label small fw-bold text-dark mb-0 d-flex align-items-center gap-1.5">
                        <Calendar size={15} className="text-primary" />
                        <span>กำหนดระยะเวลาดำเนินงาน (Schedule)</span>
                      </label>

                      {/* Quick Shortcuts */}
                      <div className="d-flex align-items-center gap-1">
                        <span className="text-muted" style={{ fontSize: '11px' }}>เพิ่มเร็ว:</span>
                        <button
                          type="button"
                          onClick={() => applyDateShortcut(7)}
                          className="btn btn-sm btn-light border py-0 px-2"
                          style={{ fontSize: '11px' }}
                        >
                          +7 วัน
                        </button>
                        <button
                          type="button"
                          onClick={() => applyDateShortcut(14)}
                          className="btn btn-sm btn-light border py-0 px-2"
                          style={{ fontSize: '11px' }}
                        >
                          +14 วัน
                        </button>
                        <button
                          type="button"
                          onClick={() => applyDateShortcut(30)}
                          className="btn btn-sm btn-light border py-0 px-2"
                          style={{ fontSize: '11px' }}
                        >
                          +30 วัน
                        </button>
                      </div>
                    </div>

                    <Row className="g-3">
                      <Col sm={6}>
                        <label className="form-label text-muted mb-1" style={{ fontSize: '11px' }}>
                          วันที่เริ่มต้น (Start Date)
                        </label>
                        <input
                          type="date"
                          className="stepper-fld"
                          value={form.startDate}
                          onChange={set('startDate')}
                        />
                      </Col>

                      <Col sm={6}>
                        <label className="form-label text-muted mb-1" style={{ fontSize: '11px' }}>
                          วันที่กำหนดส่ง (Due Date)
                        </label>
                        <input
                          type="date"
                          className={`stepper-fld ${fieldErrors.dateRange ? 'is-invalid' : ''}`}
                          value={form.dueDate}
                          onChange={set('dueDate')}
                        />
                      </Col>
                    </Row>

                    {fieldErrors.dateRange && (
                      <div className="text-danger small mt-1 d-flex align-items-center gap-1 fw-medium">
                        <AlertCircle size={14} />
                        <span>{fieldErrors.dateRange}</span>
                      </div>
                    )}

                    {/* Calculated Duration Banner */}
                    {calculatedDuration !== null && calculatedDuration > 0 && (
                      <div className="p-2.5 mt-2 bg-success-subtle border border-success-subtle rounded-3 d-flex align-items-center justify-content-between small text-success-emphasis">
                        <div className="d-flex align-items-center gap-2">
                          <Clock size={15} />
                          <span className="fw-semibold">
                            ระยะเวลาโปรเจกต์รวม: {calculatedDuration} วัน
                          </span>
                        </div>
                        <span style={{ fontSize: '11px' }}>
                          (~{(calculatedDuration / 7).toFixed(1)} สัปดาห์)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Project Description Textarea */}
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="form-label small fw-bold text-dark mb-0 d-flex align-items-center gap-1.5">
                        <FileText size={15} className="text-primary" />
                        <span>รายละเอียดโปรเจกต์ (Project Description)</span>
                      </label>
                      <span className="text-muted" style={{ fontSize: '11px' }}>
                        {form.description.length} / 5,000 ตัวอักษร
                      </span>
                    </div>

                    <textarea
                      rows={3}
                      maxLength={5000}
                      className="stepper-fld"
                      placeholder="ระบุวัตถุประสงค์ ขอบเขต หรือคำอธิบายเพิ่มเติมเกี่ยวกับโปรเจกต์นี้..."
                      value={form.description}
                      onChange={set('description')}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Stepper Footer Action Buttons */}
            <div className="px-4 py-3 bg-light border-top d-flex align-items-center justify-content-between sticky-bottom z-2">
              <div>
                {!isEditing && currentStep > 1 ? (
                  <button
                    key="stepper-prev-btn"
                    type="button"
                    onClick={handlePrevStep}
                    className="btn btn-outline-secondary btn-sm px-3 py-1.5 d-flex align-items-center gap-1.5 fw-bold"
                  >
                    <ChevronLeft size={16} />
                    <span>ย้อนกลับ</span>
                  </button>
                ) : (
                  <button
                    key="stepper-cancel-btn"
                    type="button"
                    onClick={onClose}
                    className="btn btn-light btn-sm text-muted fw-bold px-3 py-1.5"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>

              <div className="d-flex align-items-center gap-2">
                {!isEditing && currentStep < 3 ? (
                  <button
                    key="stepper-next-btn"
                    type="button"
                    onClick={handleNextStep}
                    className="btn btn-primary btn-sm px-4 py-1.5 d-flex align-items-center gap-1.5 fw-bold shadow-sm"
                  >
                    <span>ถัดไป</span>
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    key="stepper-submit-btn"
                    type="submit"
                    disabled={saving}
                    className="btn btn-primary btn-sm px-4 py-1.5 d-flex align-items-center gap-1.5 fw-bold shadow-sm"
                  >
                    <Check size={16} strokeWidth={2.5} />
                    <span>{saving ? 'กำลังบันทึก…' : 'บันทึก'}</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* VIEW MODE 2: SINGLE PAGE MODE (ฟอร์มเพิ่มโปรเจกต์ – เวอร์ชัน 2)      */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {!isEditing && viewMode === 'single' && (
          <div className="single-page-layout">
            {/* LEFT PANEL: HERO + LIVE PREVIEW */}
            <aside className="single-page-aside">
              <div
                style={{
                  position: 'absolute',
                  width: '260px',
                  height: '260px',
                  borderRadius: '999px',
                  right: '-80px',
                  top: '-80px',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.22), rgba(255,255,255,0) 70%)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: '220px',
                  height: '220px',
                  borderRadius: '999px',
                  left: '-70px',
                  bottom: '-70px',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.16), rgba(255,255,255,0) 70%)',
                  pointerEvents: 'none',
                }}
              />

              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FolderPlus size={24} color="#ffffff" />
                </div>
                <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
                  เพิ่มโปรเจกต์
                </h2>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'rgba(255,255,255,0.9)' }}>
                  สร้างโปรเจกต์ใหม่และจัดทีมงานของคุณ<br />
                  <span style={{ opacity: 0.8, fontSize: '11.5px' }}>Create a new project and organize your team</span>
                </p>
              </div>

              <div style={{ position: 'relative', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.9)' }}>
                ตัวอย่างการ์ดโปรเจกต์ · อัปเดตสด
              </div>

              {/* LIVE PREVIEW CARD */}
              <div className="single-page-preview-card">
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      borderRadius: '99px',
                      padding: '3px 10px',
                      background: form.category ? '#E3ECFF' : '#F1F5F9',
                      color: form.category ? '#1B3A8A' : '#475569',
                    }}
                  >
                    {form.category || 'ยังไม่เลือกหมวดหมู่'}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      borderRadius: '99px',
                      padding: '3px 10px',
                      background:
                        form.priority === 'urgent'
                          ? '#FFDCE2'
                          : form.priority === 'high'
                          ? '#FFEBC8'
                          : form.priority === 'low'
                          ? '#EEF2F7'
                          : '#E3ECFF',
                      color:
                        form.priority === 'urgent'
                          ? '#8A1030'
                          : form.priority === 'high'
                          ? '#7A3A06'
                          : form.priority === 'low'
                          ? '#334155'
                          : '#1B3A8A',
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '99px',
                        background:
                          form.priority === 'urgent'
                            ? '#BE123C'
                            : form.priority === 'high'
                            ? '#B45309'
                            : form.priority === 'low'
                            ? '#64748B'
                            : '#2F5BD0',
                      }}
                    />
                    {form.priority === 'urgent'
                      ? 'เร่งด่วน'
                      : form.priority === 'high'
                      ? 'สูง'
                      : form.priority === 'low'
                      ? 'ต่ำ'
                      : 'ปกติ'}
                  </span>
                </div>

                {/* Project Name Preview */}
                <div
                  style={{
                    fontSize: '17px',
                    fontWeight: 600,
                    lineHeight: 1.35,
                    wordBreak: 'break-word',
                    color: form.name.trim() ? '#0F172A' : '#94A3B8',
                    minHeight: '44px',
                  }}
                >
                  {form.name.trim() || 'ชื่อโปรเจกต์ของคุณ'}
                </div>

                <div style={{ height: '1px', background: '#E2E8F0' }} />

                {/* Owner Preview */}
                <div className="d-flex flex-column gap-1">
                  <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>ผู้รับผิดชอบ</span>
                  <div className="d-flex align-items-center gap-2">
                    <div style={currentOwnerObj ? getAvatarStyle(0, 28, 11) : getAvatarStyle(0, 28, 11)}>
                      {currentOwnerObj ? getInitials(currentOwnerObj.name) : '?'}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: currentOwnerObj ? 600 : 400, color: currentOwnerObj ? '#0F172A' : '#64748B' }}>
                      {currentOwnerObj ? currentOwnerObj.name : 'ยังไม่ได้เลือก'}
                    </span>
                  </div>
                </div>

                {/* Team Avatars Stack Preview */}
                <div className="d-flex flex-column gap-1">
                  <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
                    ทีมงาน · {form.teamMemberIds.length} คน
                  </span>
                  <div className="d-flex align-items-center" style={{ minHeight: '30px' }}>
                    {form.teamMemberIds.length === 0 ? (
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>ยังไม่ได้เลือกสมาชิก</span>
                    ) : (
                      form.teamMemberIds.slice(0, 6).map((mId, idx) => {
                        const mObj = MOCK_EMPLOYEES.find((e) => String(e.id) === String(mId));
                        return (
                          <span
                            key={mId}
                            style={{
                              ...getAvatarStyle(idx, 28, 11),
                              border: '2px solid #ffffff',
                              marginLeft: idx === 0 ? 0 : '-7px',
                            }}
                            title={mObj ? mObj.name : mId}
                          >
                            {mObj ? getInitials(mObj.name) : mId}
                          </span>
                        );
                      })
                    )}
                    {form.teamMemberIds.length > 6 && (
                      <span
                        style={{
                          ...getAvatarStyle(7, 28, 10),
                          border: '2px solid #ffffff',
                          marginLeft: '-7px',
                          background: '#cbd5e1',
                          color: '#334155',
                        }}
                      >
                        +{form.teamMemberIds.length - 6}
                      </span>
                    )}
                  </div>
                </div>

                {/* Date Preview */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#F4F6FB',
                    borderRadius: '12px',
                    padding: '8px 10px',
                  }}
                >
                  <Calendar size={15} color="#2F5BD0" />
                  <span style={{ fontSize: '12px', color: '#1E293B', fontWeight: 500 }}>
                    {form.startDate && form.dueDate && form.startDate <= form.dueDate
                      ? `${form.startDate} → ${form.dueDate} · ${calculatedDuration} วัน`
                      : form.startDate
                      ? `เริ่ม ${form.startDate}`
                      : form.dueDate
                      ? `ส่ง ${form.dueDate}`
                      : 'ยังไม่ได้กำหนดวัน'}
                  </span>
                </div>
              </div>

              <div style={{ flex: 1 }} />
            </aside>

            {/* RIGHT PANEL: 5 NUMBERED SECTIONS FORM */}
            <div className="single-page-form-body">
              {/* Top Progress Requirement Indicator */}
              <div className="d-flex align-items-center justify-content-between px-4 pt-3 pb-2 border-bottom">
                <div className="d-flex align-items-center gap-2 small text-muted">
                  <span>
                    กรอก <strong className="text-dark">{(form.name.trim() ? 1 : 0) + (form.managerId ? 1 : 0)}/2</strong> ช่องที่จำเป็น
                  </span>
                  <div style={{ width: '90px', height: '6px', borderRadius: '99px', background: '#E2E8F0', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: '99px',
                        background: 'linear-gradient(90deg, #2F5BD0, #6D5BE0)',
                        transition: 'width 0.25s',
                        width: `${((form.name.trim() ? 1 : 0) + (form.managerId ? 1 : 0)) * 50}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Scrollable Form Sections Area */}
              <div className="single-page-content-scroll custom-scrollbar">
                {error && <Alert variant="danger" className="mb-2">{error}</Alert>}

                {/* 01 — ข้อมูลทั่วไป (Basic Information) */}
                <section className="sp-section-box">
                  <div className="sp-section-header">
                    <span className="sp-section-icon-badge" style={{ background: '#E6EEFF', color: '#2F5BD0' }}>
                      <FileText size={20} />
                    </span>
                    <div>
                      <h4 className="m-0 fs-6 fw-bold text-dark">ข้อมูลทั่วไป</h4>
                      <span className="text-muted" style={{ fontSize: '12px' }}>Basic Information</span>
                    </div>
                  </div>

                  <div>
                    <label className="form-label small fw-bold text-dark mb-1">
                      ชื่อโปรเจกต์ <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="sp-fld"
                      placeholder="ระบุชื่อโปรเจกต์..."
                      value={form.name}
                      onChange={set('name')}
                      maxLength={200}
                    />
                    {fieldErrors.name && (
                      <div className="text-danger small mt-1 d-flex align-items-center gap-1 fw-medium">
                        <AlertCircle size={14} />
                        <span>{fieldErrors.name}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="form-label small fw-bold text-dark mb-1">
                      หมวดหมู่โปรเจกต์
                    </label>
                    <div className="position-relative">
                      <select
                        className="sp-fld"
                        value={form.category}
                        onChange={set('category')}
                        aria-label="เลือกหมวดหมู่โปรเจกต์"
                      >
                        <option value="">เลือกหมวดหมู่</option>
                        {categoryOptions.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <span className="d-block small fw-bold text-dark mb-1.5">ระดับความสำคัญ</span>
                    <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                      {[
                        { id: 'low', th: 'ต่ำ', dot: '#64748B', bg: '#EEF2F7', fg: '#334155', bd: '#64748B' },
                        { id: 'normal', th: 'ปกติ', dot: '#2F5BD0', bg: '#E3ECFF', fg: '#1B3A8A', bd: '#2F5BD0' },
                        { id: 'high', th: 'สูง', dot: '#B45309', bg: '#FFEBC8', fg: '#7A3A06', bd: '#B45309' },
                        { id: 'urgent', th: 'เร่งด่วน', dot: '#BE123C', bg: '#FFDCE2', fg: '#8A1030', bd: '#BE123C' },
                      ].map((p) => {
                        const isSelected = form.priority === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({ ...prev, priority: p.id }));
                              if (fieldErrors.priority) setFieldErrors((prev) => ({ ...prev, priority: '' }));
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              height: '46px',
                              padding: '0 8px',
                              borderRadius: '12px',
                              fontSize: '13.5px',
                              fontWeight: 600,
                              color: isSelected ? p.fg : '#0F172A',
                              background: isSelected ? p.bg : '#ffffff',
                              border: `1.5px solid ${isSelected ? p.bd : '#CBD5E1'}`,
                              boxShadow: isSelected ? `0 0 0 1px ${p.bd}` : 'none',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span style={{ width: '8px', height: '8px', borderRadius: '99px', background: p.dot }} />
                            <span>{p.th}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>

                {/* 02 — ผู้รับผิดชอบโปรเจกต์ (Project Ownership) */}
                <section className="sp-section-box">
                  <div className="sp-section-header">
                    <span className="sp-section-icon-badge" style={{ background: '#EEE8FF', color: '#6D3FC7' }}>
                      <User size={20} />
                    </span>
                    <div>
                      <h4 className="m-0 fs-6 fw-bold text-dark">ผู้รับผิดชอบโปรเจกต์</h4>
                      <span className="text-muted" style={{ fontSize: '12px' }}>Project Ownership</span>
                    </div>
                  </div>

                  <div>
                    <label className="form-label small fw-bold text-dark mb-1">
                      Project Owner <span className="text-danger">*</span>
                    </label>
                    <select
                      className="sp-fld"
                      value={isLegacyOwner ? legacyOptionValue : form.managerId}
                      onChange={handleOwnerChange}
                      aria-label="เลือก Project Owner"
                    >
                      <option value="">เลือกผู้รับผิดชอบโปรเจกต์</option>
                      {isLegacyOwner && (
                        <option value={legacyOptionValue}>{legacyOptionLabel}</option>
                      )}
                      {MOCK_EMPLOYEES.map((emp) => (
                        <option key={emp.id} value={String(emp.id)}>
                          {emp.name} — {emp.position} ({emp.department})
                        </option>
                      ))}
                    </select>
                    {fieldErrors.managerId && (
                      <div className="text-danger small mt-1 d-flex align-items-center gap-1 fw-medium">
                        <AlertCircle size={14} />
                        <span>{fieldErrors.managerId}</span>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                      background: '#F4F0FF',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      fontSize: '12.5px',
                      color: '#3B2A6B',
                    }}
                  >
                    <Info size={16} color="#6D3FC7" />
                    <span>Project Owner จะเป็นสมาชิกในทีมโปรเจกต์โดยอัตโนมัติ และไม่สามารถนำออกจากทีมได้</span>
                  </div>
                </section>

                {/* 03 — ทีมงานโปรเจกต์ (Project Team) */}
                <section className="sp-section-box">
                  <div className="sp-section-header">
                    <span className="sp-section-icon-badge" style={{ background: '#DDF5F0', color: '#0F766E' }}>
                      <Users size={20} />
                    </span>
                    <div className="flex-grow-1">
                      <h4 className="m-0 fs-6 fw-bold text-dark">ทีมงานโปรเจกต์</h4>
                      <span className="text-muted" style={{ fontSize: '12px' }}>Project Team</span>
                    </div>
                    <span className="badge bg-success-subtle text-success-emphasis border px-3 py-1.5 rounded-pill" style={{ fontSize: '12px' }}>
                      สมาชิกที่เลือก: {form.teamMemberIds.length} คน
                    </span>
                  </div>

                  <div>
                    <label className="form-label small fw-bold text-dark mb-1">ค้นหาและเลือกสมาชิกทีม</label>
                    <div className="position-relative">
                      <Search size={16} className="position-absolute text-muted" style={{ left: '16px', top: '16px' }} />
                      <input
                        type="text"
                        className="sp-fld"
                        placeholder="ค้นหาชื่อพนักงานหรือแผนก..."
                        value={teamFilter}
                        onChange={(e) => setTeamFilter(e.target.value)}
                        style={{ paddingLeft: '44px' }}
                      />
                    </div>
                  </div>

                  {/* 2-column Member Cards Grid */}
                  <div
                    className="d-grid gap-2 custom-scrollbar"
                    style={{
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      padding: '2px',
                    }}
                  >
                    {filteredEmployees.map((emp, i) => {
                      const id = String(emp.id);
                      const isOwner = id === form.managerId;
                      const isChecked = form.teamMemberIds.includes(id);

                      return (
                        <div
                          key={id}
                          id={`sp-team-member-${id}`}
                          className={`sp-member-card ${isOwner ? 'is-owner' : isChecked ? 'is-selected' : ''}`}
                          onClick={() => {
                            if (!isOwner) toggleTeamMember(id);
                          }}
                        >
                          <div style={getAvatarStyle(i, 38, 13)}>
                            {getInitials(emp.name)}
                          </div>
                          <div className="d-flex flex-column overflow-hidden flex-grow-1">
                            <span className="small fw-bold text-dark text-truncate">{emp.name}</span>
                            <span className="text-muted text-truncate" style={{ fontSize: '11.5px', lineHeight: 1.3 }}>
                              {emp.position}
                            </span>
                            <span className="text-muted text-truncate" style={{ fontSize: '10.5px', lineHeight: 1.3, opacity: 0.8 }}>
                              {emp.department}
                            </span>
                          </div>

                          {/* Owner Badge or Check Icon */}
                          {isOwner && (
                            <span
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#ffffff',
                                background: '#6D3FC7',
                                borderRadius: '99px',
                                padding: '2px 8px',
                              }}
                            >
                              Owner
                            </span>
                          )}
                          {!isOwner && isChecked && (
                            <span
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                width: '20px',
                                height: '20px',
                                borderRadius: '99px',
                                background: '#2F5BD0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                              }}
                            >
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-muted small">คลิกเพื่อเลือกหรือยกเลิกสมาชิก</span>
                </section>

                {/* 04 — สิ่งที่ต้องส่งมอบ (Deliverables) */}
                <section className="sp-section-box">
                  <div className="sp-section-header">
                    <span className="sp-section-icon-badge" style={{ background: '#FFF1D6', color: '#B45309' }}>
                      <CheckSquare size={20} />
                    </span>
                    <div className="flex-grow-1">
                      <h4 className="m-0 fs-6 fw-bold text-dark">สิ่งที่ต้องส่งมอบ</h4>
                      <span className="text-muted" style={{ fontSize: '12px' }}>Deliverables</span>
                    </div>
                    <span className="badge bg-light text-muted border px-3 py-1 rounded-pill" style={{ fontSize: '11.5px' }}>
                      ไม่บังคับ
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      background: '#FFF9EC',
                      borderRadius: '14px',
                      padding: '12px 14px',
                    }}
                  >
                    <div className="flex-grow-1 d-flex flex-column gap-1">
                      <span className="small fw-bold text-dark">โปรเจกต์นี้มีสิ่งที่ต้องส่งมอบ</span>
                      <span className="text-muted" style={{ fontSize: '12px', lineHeight: 1.4 }}>
                        ส่วนนี้เป็นตัวเลือกเพิ่มเติม (Optional) สามารถเว้นว่างไว้ได้โดยไม่ส่งผลต่อการสร้างโปรเจกต์
                      </span>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      aria-pressed={form.requiresDeliverables}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          requiresDeliverables: !prev.requiresDeliverables,
                        }))
                      }
                      style={{
                        width: '50px',
                        height: '28px',
                        border: 'none',
                        borderRadius: '99px',
                        padding: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: form.requiresDeliverables ? 'flex-end' : 'flex-start',
                        background: form.requiresDeliverables ? '#2F5BD0' : '#CBD5E1',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <span
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '99px',
                          background: '#ffffff',
                          boxShadow: '0 1px 3px rgba(15,23,42,0.3)',
                        }}
                      />
                    </button>
                  </div>

                  {form.requiresDeliverables && (
                    <div>
                      <label className="form-label small fw-bold text-dark mb-1">
                        รายละเอียดสิ่งที่ต้องส่งมอบ
                      </label>
                      <textarea
                        className="sp-fld"
                        rows={3}
                        placeholder="ระบุรายละเอียดสิ่งที่ต้องส่งมอบ (Deliverable Description)..."
                        value={form.deliverableDescription}
                        onChange={set('deliverableDescription')}
                      />
                    </div>
                  )}
                </section>

                {/* 05 — กำหนดเวลาและรายละเอียด (Schedule & Description) */}
                <section className="sp-section-box">
                  <div className="sp-section-header">
                    <span className="sp-section-icon-badge" style={{ background: '#FFE5EE', color: '#BE185D' }}>
                      <Calendar size={20} />
                    </span>
                    <div>
                      <h4 className="m-0 fs-6 fw-bold text-dark">กำหนดเวลาและรายละเอียด</h4>
                      <span className="text-muted" style={{ fontSize: '12px' }}>Schedule & Description</span>
                    </div>
                  </div>

                  <Row className="g-3">
                    <Col sm={6}>
                      <label className="form-label small fw-bold text-dark mb-1">วันที่เริ่ม</label>
                      <input
                        type="date"
                        className="sp-fld"
                        value={form.startDate}
                        onChange={set('startDate')}
                      />
                    </Col>

                    <Col sm={6}>
                      <label className="form-label small fw-bold text-dark mb-1">กำหนดส่ง</label>
                      <input
                        type="date"
                        className={`sp-fld ${fieldErrors.dateRange ? 'is-invalid' : ''}`}
                        value={form.dueDate}
                        onChange={set('dueDate')}
                      />
                    </Col>
                  </Row>

                  {fieldErrors.dateRange && (
                    <div className="text-danger small mt-1 d-flex align-items-center gap-1 fw-medium">
                      <AlertCircle size={14} />
                      <span>{fieldErrors.dateRange}</span>
                    </div>
                  )}

                  {calculatedDuration !== null && calculatedDuration > 0 && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: 600,
                        background: '#FFE9F1',
                        color: '#8A1248',
                      }}
                    >
                      ระยะเวลาโปรเจกต์ {calculatedDuration} วัน (~{(calculatedDuration / 7).toFixed(1)} สัปดาห์)
                    </div>
                  )}

                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label className="form-label small fw-bold text-dark mb-0">รายละเอียดโปรเจกต์</label>
                      <span className="text-muted" style={{ fontSize: '11px' }}>
                        {form.description.length} / 5,000
                      </span>
                    </div>
                    <textarea
                      className="sp-fld"
                      rows={4}
                      maxLength={5000}
                      placeholder="ระบุวัตถุประสงค์ ขอบเขต หรือคำอธิบายเพิ่มเติม..."
                      value={form.description}
                      onChange={set('description')}
                    />
                  </div>
                </section>
              </div>

              {/* SINGLE PAGE FOOTER */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 28px',
                  borderTop: '1px solid #E2E8F0',
                  background: '#ffffff',
                }}
              >
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  {form.name.trim() && form.managerId ? (
                    <div className="d-flex align-items-center gap-1.5 text-success fw-bold">
                      <Check size={16} strokeWidth={2.5} />
                      <span>พร้อมบันทึกแล้ว</span>
                    </div>
                  ) : (
                    <div className="d-flex align-items-center gap-1.5 text-muted">
                      <Info size={16} />
                      <span>
                        ยังต้องกรอก: {[!form.name.trim() && 'ชื่อโปรเจกต์', !form.managerId && 'Project Owner'].filter(Boolean).join(' และ ')}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-outline-secondary btn-sm px-4 py-2 rounded-3 fw-bold"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary btn-sm px-4 py-2 rounded-3 fw-bold d-flex align-items-center gap-1.5 shadow-sm"
                  style={{
                    background: 'linear-gradient(135deg, #2F5BD0, #6D5BE0)',
                    border: 'none',
                  }}
                >
                  <Check size={16} strokeWidth={2.5} />
                  <span>{saving ? 'กำลังบันทึก…' : 'บันทึก'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Form>
    </Modal>
  );
}