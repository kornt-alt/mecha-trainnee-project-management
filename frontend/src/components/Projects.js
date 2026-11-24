// frontend/src/components/Projects.js — รายการโปรเจกต์: ค้นหา + กรองสถานะ, เพิ่ม/แก้ไข (Modal), เปลี่ยนสถานะ (ผ่านเมนูแถว), ลบ
// รองรับทั้งข้อมูลจริงจาก API และ Mock Data กลางที่เชื่อมโยงกับ Tasks เมื่อยังไม่ต่อ backend
import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { PRIORITY_LABELS } from '../utils/labels';
import { useMockData } from '../context/MockDataContext';
import { currentEmployees } from '../data/employeeStore';
import { MOCK_DEPARTMENTS, MOCK_DIVISIONS } from '../data/mockData';
import ProjectsTrackingTable from './ProjectsTrackingTable';
import ProjectCard from './ProjectCard';
import {
  Folder,
  Plus,
  Search,
  Trash2,
  X,
  Check,
  FolderPlus,
  User,
  Users,
  Calendar,
  LayoutGrid,
  List,
  FileText,
  Clock,
  AlertCircle,
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
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState('card'); // 'table' | 'card'
  const { data, error, loading, reload } = useLoad(`/projects${filter ? `?status=${filter}` : ''}`);
  const [editing, setEditing] = useState(null); // null = ปิด Modal · {} ไม่มี id = เพิ่มใหม่
  const [deleting, setDeleting] = useState(null); // โปรเจกต์ที่รอยืนยันการลบ
  const [deleteError, setDeleteError] = useState(''); // Policy B / ลบไม่สำเร็จ — แสดงใน modal เอง (คง popup เปิดไว้ให้ผู้ใช้เห็นบริบท)
  const [actionError, setActionError] = useState('');
  // เปิดฟอร์มแก้ไขมาจากหน้า workspace → ปิด / บันทึกแล้วพากลับไปที่เดิม (เดิมค้างอยู่หน้ารายการ)
  const [returnTo, setReturnTo] = useState(null);

  // Mock Mode ใช้ชุดข้อมูลกลางจาก MockDataContext (แชร์ข้ามหน้า กับ Tasks) — ไม่มี local copy อีกต่อไป
  const { projects, setProjects, tasks, deliverables, actorId } = useMockData();

  useEffect(() => {
    const requestedId = location.state?.editProjectId;
    if (requestedId === undefined || requestedId === null) return;
    const target = projects.find((project) => String(project.id) === String(requestedId));
    if (target) setEditing(target);
    setReturnTo(location.state?.returnTo || null);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, projects]);

  // Empty API responses do not replace the existing mock records in frontend-only mode.
  // A non-empty array is the only API result that can become the current project source.
  // The workspace renders from the shared mock workspace records (visibleProjects), so the
  // list must not link to projects the workspace cannot open — otherwise a click lands on
  // "ไม่พบโปรเจกต์". When the backend is connected, surface only API projects that also
  // exist in the shared mock workspace, using the mock records as the single source of truth.
  const isApiConnected = Array.isArray(data) && data.length > 0;
  const apiProjectIds = new Set(Array.isArray(data) ? data.map((d) => String(d.id)) : []);
  const baseProjects = isApiConnected
    ? projects.filter((p) => apiProjectIds.has(String(p.id)))
    : projects.filter((p) => !filter || p.status === filter);

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
      const hasRelatedDeliverables = deliverables.some((item) => String(item.projectId) === String(p.id));
      if (hasRelatedTasks || hasRelatedDeliverables) {
        // ลบถูกบล็อค — คง popup เปิดไว้และแสดงเหตุผลใน popup (ข้อความ/พฤติกรรม Policy B ไม่เปลี่ยน)
        setDeleteError('ไม่สามารถลบโปรเจกต์ได้ เนื่องจากยังมีงานหรือสิ่งที่ส่งมอบผูกอยู่ — กรุณาจัดการข้อมูลที่เกี่ยวข้องก่อนลบโปรเจกต์');
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
          {/* ── แถบค้นหาและตัวกรอง + สลับมุมมอง ───────────────────── */}
          <Card className="border-0 shadow-sm mb-3 projects-toolbar">
            <Card.Body className="p-3">
              <Row className="g-2 align-items-center">
                <Col xs={12} md={5}>
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
                <Col xs={7} md={3}>
                  <Form.Select size="sm" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="กรองตามสถานะ">
                    <option value="">ทุกสถานะ</option>
                    {PROJECT_STATUSES.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col xs={5} md={4} className="d-flex align-items-center justify-content-end gap-2">
                  {filtersActive && (
                    <Button variant="link" size="sm" className="text-decoration-none p-0 d-inline-flex align-items-center gap-1 me-2" onClick={clearFilters}>
                      <X size={14} />
                      <span>ล้างตัวกรอง</span>
                    </Button>
                  )}
                  {/* ปุ่มสลับมุมมอง Card / Table */}
                  <div className="btn-group projects-view-toggle" role="group" aria-label="รูปแบบมุมมองโปรเจกต์">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className={`d-inline-flex align-items-center gap-1.5 ${viewMode === 'card' ? 'active' : ''}`}
                      onClick={() => setViewMode('card')}
                      aria-label="มุมมองการ์ด (Card View)"
                      title="มุมมองการ์ด"
                    >
                      <LayoutGrid size={15} />
                      <span className="d-none d-sm-inline">การ์ด</span>
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className={`d-inline-flex align-items-center gap-1.5 ${viewMode === 'table' ? 'active' : ''}`}
                      onClick={() => setViewMode('table')}
                      aria-label="มุมมองตาราง (Table View)"
                      title="มุมมองตาราง"
                    >
                      <List size={15} />
                      <span className="d-none d-sm-inline">ตาราง</span>
                    </Button>
                  </div>
                </Col>
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

          {/* ── มุมมองโปรเจกต์: ตาราง (Table View) หรือ การ์ด (Card View) ── */}
          {!loading && !noProjectsAtAll && (
            viewMode === 'card' ? (
              sortedProjects.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <Card.Body className="text-center py-5">
                    <Folder size={36} className="text-muted mb-2" />
                    <div className="fw-medium">ไม่พบโปรเจกต์ที่ตรงกับเงื่อนไขการค้นหา</div>
                    <p className="text-muted small mb-0">ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองสถานะ</p>
                  </Card.Body>
                </Card>
              ) : (
                <Row className="g-3">
                  {sortedProjects.map((p) => (
                    <Col key={p.id} xs={12} md={6} lg={4}>
                      <ProjectCard
                        project={p}
                        onEdit={(proj) => setEditing(proj)}
                        onDelete={(proj) => setDeleting(proj)}
                      />
                    </Col>
                  ))}
                </Row>
              )
            ) : (
              <ProjectsTrackingTable projects={sortedProjects} onEdit={(proj) => setEditing(proj)} onDelete={(proj) => setDeleting(proj)} />
            )
          )}
        </>
      )}

      {/* ── Modal เพิ่ม / แก้ไข ───────────────────────────────────── */}
      {editing && (
        <ProjectForm
          initial={editing}
          actorId={actorId}
          onClose={() => {
            setEditing(null);
            if (returnTo) navigate(returnTo);
          }}
          mockMode={!isApiConnected}
          onSaved={(savedProject) => {
            setEditing(null);
            if (returnTo) navigate(returnTo);
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
                โปรเจกต์ที่ยังมีงานหรือสิ่งที่ส่งมอบอยู่จะลบไม่ได้ — ต้องลบงานและสิ่งที่ส่งมอบออกก่อน
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

function ProjectForm({ initial, actorId, onClose, onSaved, mockMode = false }) {
  const isEditing = Boolean(initial.id);

  const initialManagerId = (() => {
    if (initial.managerId) return String(initial.managerId);

    if (initial.owner) {
      const matches = currentEmployees().filter((e) => e.name === initial.owner);
      if (matches.length === 1) return String(matches[0].id);
    }

    return initial.id ? '' : String(actorId || '');
  })();

  const [form, setForm] = useState({
    name: initial.name ?? '',
    category: initial.category ?? '',
    managerId: initialManagerId,
    owner: initial.owner ?? (currentEmployees().find((employee) => String(employee.id) === String(initialManagerId))?.name || ''),
    status: initial.id ? (initial.status ?? 'planning') : 'planning',
    priority: initial.priority ?? 'normal',
    teamLeadId: initial.teamLeadId ? String(initial.teamLeadId) : '',
    teamMemberIds: Array.isArray(initial.teamMemberIds)
      ? initial.teamMemberIds.map(String)
      : initialManagerId ? [String(initialManagerId)] : [],
    requiresDeliverables: initial.requiresDeliverables ?? false,
    // วันเริ่มของโปรเจกต์ใหม่ = วันนี้ (แก้ได้) — เดิมว่างให้กรอกเอง
    startDate: initial.startDate || (initial.id ? '' : today()),
    dueDate: initial.dueDate ?? '',
    description: initial.description ?? '',
    plannedBudget: initial.plannedBudget ?? '',
    // การเห็นโปรเจกต์ (utils/access.js): public = ทุกคนเห็น · private = เฉพาะคนในโปรเจกต์ + Management ในขอบเขต + ADMIN
    // โปรเจกต์ใหม่เริ่มที่ private (ตรงกับ schema) — ผู้สร้างถูกใส่เป็นสมาชิกตอนบันทึก จึงไม่หลุดจากโปรเจกต์ที่ตัวเองสร้าง
    visibility: initial.visibility || 'private',
    // Section ที่เกี่ยวข้อง (ไม่บังคับ เลือกได้หลายอัน) — Management ของ Section นั้นเห็นโปรเจกต์ private นี้
    sectionIds: Array.isArray(initial.sectionIds) ? initial.sectionIds.map(String) : [],
  });
  const toggleSection = (sectionId) => setForm((previous) => ({
    ...previous,
    sectionIds: previous.sectionIds.includes(sectionId) ? previous.sectionIds.filter((id) => id !== sectionId) : [...previous.sectionIds, sectionId],
  }));

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

  const isMatchedEmployee = currentEmployees().some(
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

  // เปลี่ยน Project Owner พร้อมซิงก์สมาชิก Owner ใน Team
  const handleOwnerChange = (e) => {
    const selectedId = e.target.value;

    if (!selectedId) {
      setForm((prev) => ({
        ...prev,
        managerId: '',
        owner: '',
        teamMemberIds: [...new Set(
          prev.teamMemberIds.filter((memberId) => memberId !== prev.managerId)
        )],
      }));
      return;
    }

    if (selectedId === legacyOptionValue) return;

    const employee = currentEmployees().find(
      (emp) => String(emp.id) === selectedId
    );

    if (!employee) return;

    setForm((prev) => {
      const otherMemberIds = prev.teamMemberIds.filter(
        (memberId) => memberId !== prev.managerId && memberId !== selectedId
      );

      return {
        ...prev,
        managerId: selectedId,
        owner: employee.name,
        teamMemberIds: [...new Set([...otherMemberIds, selectedId])],
      };
    });

    if (fieldErrors.managerId) {
      setFieldErrors((prev) => ({ ...prev, managerId: '' }));
    }
  };

  // ค้นหาพนักงานด้วยชื่อหรือแผนก
  const filteredEmployees = currentEmployees().filter((emp) => {
    const term = teamFilter.trim().toLowerCase();
    // บัญชีที่ปิดแล้วเลือกเพิ่มไม่ได้ (คนที่อยู่ในทีมอยู่แล้วยังแสดงให้เอาออกได้)
    if (emp.isActive === false && !form.teamMemberIds.includes(String(emp.id))) return false;

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
        // นำคนที่เป็น Team Lead ออกจากทีม → ล้าง Team Lead ด้วย (Team Lead ต้องเป็นสมาชิก)
        teamLeadId: exists && prev.teamLeadId === id ? '' : prev.teamLeadId,
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
    return currentEmployees().find((e) => String(e.id) === form.managerId);
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

    const budgetText = String(form.plannedBudget ?? '').trim();
    if (budgetText && !(Number(budgetText) >= 0)) {
      errors.plannedBudget = 'งบประมาณต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const validEmployeeIds = new Set(
      currentEmployees().map((emp) => String(emp.id))
    );

    let teamMemberIds = [...new Set(
      form.teamMemberIds
        .map(String)
        .filter((id) => validEmployeeIds.has(id))
    )];

    if (form.managerId && validEmployeeIds.has(form.managerId)) {
      teamMemberIds = [...new Set([...teamMemberIds, form.managerId])];
    }
    // สร้างโปรเจกต์ใหม่: ผู้สร้างเป็นสมาชิกเสมอ (โปรเจกต์ private ที่ตั้ง Owner เป็นคนอื่น ผู้สร้างยังเห็น — utils/access.js)
    if (!initial.id && actorId && validEmployeeIds.has(String(actorId))) {
      teamMemberIds = [...new Set([...teamMemberIds, String(actorId)])];
    }

    const payload = {
      ...form,
      managerId: form.managerId,
      owner: form.owner,
      name: trimmedName,
      description: trimmedDescription,
      teamMemberIds,
      teamLeadId: form.teamLeadId && teamMemberIds.includes(form.teamLeadId) ? form.teamLeadId : null,
      status: initial.id ? form.status : 'planning',
      plannedBudget: budgetText ? Number(budgetText) : null,
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
              </div>
              <p className="text-muted small mb-0 mt-0.5">
                {isEditing
                  ? 'แก้ไขรายละเอียดโปรเจกต์และข้อมูลสมาชิกทีม'
                  : 'กรอกข้อมูลรายละเอียดของโปรเจกต์ กำหนดผู้รับผิดชอบ และสร้างทีมงาน'}
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 gap-sm-3">
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
        {(
          <>
            {/* Stepper Body Container */}
            <div className="flex-grow-1 overflow-y-auto px-4 px-md-5 py-4 custom-scrollbar" style={{ maxHeight: 'calc(85vh - 160px)' }}>
              {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

              {/* STEP 1: Basic Information */}
              {(
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
                      <h4 className="fs-6 fw-bold m-0 text-dark">ข้อมูลทั่วไป</h4>
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
                        ระดับความสำคัญ
                      </label>
                      <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                        {/* ชื่อจาก utils/labels.js — โปรเจกต์เก็บระดับปกติเป็น 'normal' (งานใช้ 'medium') */}
                        {['low', 'normal', 'high', 'urgent'].map((id) => ({ id, labelTh: PRIORITY_LABELS[id] })).map((prio) => (
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
                          {PROJECT_STATUSES.filter((s) => (s.key !== 'done' || form.status === 'done') && (initial.closure?.status !== 'closed' || s.key === 'done')).map((s) => (
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
              {(
                <div className={`d-flex flex-column gap-4 mt-4 pt-3 border-top`}>
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
                      <h4 className="fs-6 fw-bold m-0 text-dark">ผู้รับผิดชอบและทีมงาน</h4>
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
                        {!isEditing ? 'ผู้สร้างจะเป็น Project Owner และสมาชิกทีมโดยอัตโนมัติ' : 'Project Owner จะเป็นสมาชิกทีมโดยอัตโนมัติ'}
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
                          {currentEmployees().filter((emp) => emp.isActive !== false || String(emp.id) === String(form.managerId)).map((emp) => (
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
                              Owner
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

                  {/* Team Lead — เลือกจากสมาชิกในทีม (การปิดโปรเจกต์ต้องมี Team Lead เป็นผู้อนุมัติ) */}
                  <div>
                    <label htmlFor="project-team-lead" className="form-label small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1.5">
                      <User size={15} className="text-primary" />
                      <span>Team Lead</span>
                    </label>
                    <select
                      id="project-team-lead"
                      className="stepper-fld"
                      value={form.teamLeadId}
                      onChange={(e) => setForm((prev) => ({ ...prev, teamLeadId: e.target.value }))}
                    >
                      <option value="">ยังไม่กำหนด</option>
                      {currentEmployees().filter((emp) => form.teamMemberIds.includes(String(emp.id))).map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                    <span className="text-muted d-block mt-1" style={{ fontSize: '11px' }}>
                      ผู้อนุมัติการปิดโปรเจกต์ · Owner เป็น Team Lead เองก็ได้
                    </span>
                  </div>

                  {/* Team Members Selection */}
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <label className="form-label small fw-bold text-dark mb-0 d-flex align-items-center gap-1.5">
                        <Users size={15} className="text-primary" />
                        <span>สมาชิกทีมโปรเจกต์</span>
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
                                        Owner
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
              {(
                <div className={`d-flex flex-column gap-4 mt-4 pt-3 border-top`}>
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
                      <h4 className="fs-6 fw-bold m-0 text-dark">สิ่งที่ส่งมอบและกำหนดเวลา</h4>
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
                        เปิดไว้ถ้าต้องส่งมอบเอกสาร / ซอฟต์แวร์ — เพิ่มรายการได้ในแท็บสิ่งที่ส่งมอบของโปรเจกต์
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

                  {/* Schedule Date Range Selector */}
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-1.5">
                      <label className="form-label small fw-bold text-dark mb-0 d-flex align-items-center gap-1.5">
                        <Calendar size={15} className="text-primary" />
                        <span>ระยะเวลาดำเนินงาน</span>
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
                          วันที่เริ่มต้น
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
                          วันที่กำหนดส่ง
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

                  {/* งบประมาณ — ไม่บังคับ · ใช้คำนวณ "งบใช้ไป" ในภาพรวมโปรเจกต์ / กราฟงบหน้าหลัก / หน้ารายงาน */}
                  <div>
                    <label htmlFor="project-planned-budget" className="form-label small fw-bold text-dark mb-1">
                      งบประมาณ (บาท) <span className="text-muted fw-normal">· ไม่บังคับ</span>
                    </label>
                    <input
                      id="project-planned-budget"
                      type="number"
                      min="0"
                      step="1000"
                      inputMode="numeric"
                      className={`stepper-fld ${fieldErrors.plannedBudget ? 'is-invalid' : ''}`}
                      placeholder="เช่น 50000"
                      value={form.plannedBudget}
                      onChange={set('plannedBudget')}
                    />
                    {fieldErrors.plannedBudget && <div className="text-danger small mt-1">{fieldErrors.plannedBudget}</div>}
                  </div>

                  {/* ใครเห็นโปรเจกต์นี้ — กฎอยู่ที่ utils/access.js */}
                  <div className="project-form-access">
                    <span id="project-visibility-label" className="form-label small fw-bold text-dark mb-1 d-block">การมองเห็น</span>
                    <div role="group" aria-labelledby="project-visibility-label" className="project-form-visibility">
                      {[['public', 'ทุกคนเห็น'], ['private', 'เฉพาะทีมโปรเจกต์']].map(([value, label]) => (
                        <button key={value} type="button" aria-pressed={form.visibility === value} className={form.visibility === value ? 'is-selected' : ''} onClick={() => setForm((previous) => ({ ...previous, visibility: value }))}>{label}</button>
                      ))}
                    </div>
                    <div className="text-muted small mt-1">{form.visibility === 'private' ? 'เห็นเฉพาะสมาชิก Owner Team Lead · Management ของ Section ที่เลือกหรือของสมาชิก · ผู้ดูแลระบบ' : 'ทุกคนที่เข้าระบบ (และผู้เยี่ยมชม) เห็นโปรเจกต์นี้'}</div>
                    <span id="project-sections-label" className="form-label small fw-bold text-dark mt-2 mb-1 d-block">Section ที่เกี่ยวข้อง <span className="text-muted fw-normal">· ไม่บังคับ · เลือกได้หลายอัน</span></span>
                    <div role="group" aria-labelledby="project-sections-label" className="project-form-sections">
                      {MOCK_DIVISIONS.map((division) => (
                        <div key={division.id} className="project-form-division">
                          <span className="project-form-division-name">{division.name}</span>
                          {MOCK_DEPARTMENTS.filter((section) => section.divisionId === division.id).map((section) => (
                            <label key={section.id} className="project-form-section">
                              <input type="checkbox" checked={form.sectionIds.includes(section.id)} onChange={() => toggleSection(section.id)} /> {section.name}
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
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
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-light btn-sm text-muted fw-bold px-3 py-1.5"
                >
                  ยกเลิก
                </button>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary btn-sm px-4 py-1.5 d-flex align-items-center gap-1.5 fw-bold shadow-sm"
                >
                  <Check size={16} strokeWidth={2.5} />
                  <span>{saving ? 'กำลังบันทึก…' : 'บันทึก'}</span>
                </button>
              </div>
            </div>
          </>
        )}

      </Form>
    </Modal>
  );
}
