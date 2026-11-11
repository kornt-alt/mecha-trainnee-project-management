// frontend/src/components/Projects.js — รายการโปรเจกต์: ค้นหา + กรองสถานะ, เพิ่ม/แก้ไข (Modal), เปลี่ยนสถานะ (ผ่านเมนูแถว), ลบ
// รองรับทั้งข้อมูลจริงจาก API และ Mock Data กลางที่เชื่อมโยงกับ Tasks เมื่อยังไม่ต่อ backend
import { useState, useEffect } from 'react';
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
import { Folder, Plus, Search, Trash2, X } from './common/Icons';

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
  };

  // ค้นหาพนักงานด้วยชื่อหรือแผนก
  const filteredEmployees = MOCK_EMPLOYEES.filter((emp) => {
    const term = teamFilter.trim().toLowerCase();

    if (!term) return true;

    return (
      emp.name.toLowerCase().includes(term) ||
      (emp.department || '').toLowerCase().includes(term)
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

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    const errors = {};
    const trimmedName = form.name.trim();
    const trimmedDescription = form.description.trim();

    if (!trimmedName) {
      errors.name = 'กรุณาระบุชื่อโปรเจกต์';
    }

    // โปรเจกต์ใหม่ต้องเลือก Owner
    // โปรเจกต์เก่าที่มีข้อมูล Owner แบบ Legacy สามารถคงค่าเดิมไว้ได้
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

    // ตรวจสอบ ID สมาชิกกับพนักงานที่มีอยู่จริง และตัด ID ซ้ำ
    const validEmployeeIds = new Set(
      MOCK_EMPLOYEES.map((emp) => String(emp.id))
    );

    let teamMemberIds = [...new Set(
      form.teamMemberIds
        .map(String)
        .filter((id) => validEmployeeIds.has(id))
    )];

    // บังคับให้ Owner อยู่ใน Team เสมอ
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
      size="lg"
      centered
      dialogClassName="mecha-form-modal"
    >
      <Form onSubmit={submit}>
        <Modal.Header closeButton>
          <Modal.Title>
            {initial.id ? 'แก้ไขโปรเจกต์' : 'เพิ่มโปรเจกต์'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          {/* ข้อมูลหลัก */}
          <div className="mecha-form-section">ข้อมูลหลัก</div>

          <Form.Group className="mb-3">
            <Form.Label className="mecha-form-required">
              ชื่อโปรเจกต์
            </Form.Label>
            <Form.Control
              value={form.name}
              onChange={set('name')}
              maxLength={200}
              isInvalid={!!fieldErrors.name}
              autoFocus
            />
            <Form.Control.Feedback type="invalid">
              {fieldErrors.name}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>หมวดหมู่โปรเจกต์</Form.Label>
            <Form.Select
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
            </Form.Select>
          </Form.Group>

          {/* ผู้รับผิดชอบและทีม */}
          <div className="mecha-form-section">
            ผู้รับผิดชอบและทีม
          </div>

          <Form.Group className="mb-3">
            <Form.Label className="mecha-form-required">
              Project Owner
            </Form.Label>
            <Form.Select
              value={isLegacyOwner ? legacyOptionValue : form.managerId}
              onChange={handleOwnerChange}
              isInvalid={!!fieldErrors.managerId}
              aria-label="เลือก Project Owner"
            >
              <option value="">เลือกผู้รับผิดชอบโปรเจกต์</option>

              {isLegacyOwner && (
                <option value={legacyOptionValue}>
                  {legacyOptionLabel}
                </option>
              )}

              {MOCK_EMPLOYEES.map((emp) => (
                <option key={emp.id} value={String(emp.id)}>
                  {emp.name} ({emp.position})
                </option>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">
              {fieldErrors.managerId}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Project Team</Form.Label>

            <Form.Control
              type="search"
              placeholder="ค้นหาชื่อพนักงานหรือแผนก..."
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="mb-2"
            />

            <div
              className="border rounded p-3"
              style={{ maxHeight: '220px', overflowY: 'auto' }}
            >
              {filteredEmployees.length === 0 ? (
                <div className="text-muted small">
                  ไม่พบพนักงานที่ค้นหา
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const id = String(emp.id);
                  const isOwner = id === form.managerId;

                  return (
                    <Form.Check
                      key={id}
                      type="checkbox"
                      className="mb-2"
                      id={`project-team-${id}`}
                      label={
                        <span>
                          {emp.name}
                          <span className="text-muted small ms-2">
                            {emp.department || emp.position}
                          </span>
                          {isOwner && (
                            <Badge bg="light" text="dark" className="ms-2">
                              Owner
                            </Badge>
                          )}
                        </span>
                      }
                      checked={form.teamMemberIds.includes(id)}
                      disabled={isOwner}
                      onChange={() => toggleTeamMember(id)}
                    />
                  );
                })
              )}
            </div>

            <Form.Text className="text-muted">
              เลือกสมาชิกได้หลายคน โดย Project Owner จะเป็นสมาชิกทีมอัตโนมัติ
              และไม่สามารถนำ Owner ปัจจุบันออกจากทีมได้
            </Form.Text>

            <div className="small mt-2">
              สมาชิกที่เลือก: {form.teamMemberIds.length} คน
            </div>
          </Form.Group>

          {/* สถานะไม่ให้เลือกตอนสร้างใหม่ */}
          {initial.id && (
            <Form.Group className="mb-3">
              <Form.Label>สถานะ</Form.Label>
              <Form.Select
                value={form.status}
                onChange={set('status')}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}

          <Form.Group className="mb-3">
            <Form.Label>ระดับความสำคัญ</Form.Label>
            <Form.Select
              value={form.priority}
              onChange={set('priority')}
              isInvalid={!!fieldErrors.priority}
            >
              <option value="urgent">เร่งด่วนมาก (Urgent)</option>
              <option value="high">สูง (High)</option>
              <option value="normal">ปกติ (Normal)</option>
              <option value="low">ต่ำ (Low)</option>
            </Form.Select>
            <Form.Control.Feedback type="invalid">
              {fieldErrors.priority}
            </Form.Control.Feedback>
          </Form.Group>

          {/* กำหนดเวลา */}
          <div className="mecha-form-section">กำหนดเวลา</div>

          <Row className="g-3 mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>วันที่เริ่ม</Form.Label>
                <Form.Control
                  type="date"
                  value={form.startDate}
                  onChange={set('startDate')}
                  isInvalid={!!fieldErrors.dateRange}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>กำหนดส่ง</Form.Label>
                <Form.Control
                  type="date"
                  value={form.dueDate}
                  onChange={set('dueDate')}
                  isInvalid={!!fieldErrors.dateRange}
                />
              </Form.Group>
            </Col>
          </Row>

          {fieldErrors.dateRange && (
            <div className="text-danger small mb-3">
              {fieldErrors.dateRange}
            </div>
          )}

          {/* Deliverables */}
          <div className="mecha-form-section">Deliverables</div>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="โปรเจกต์นี้มีสิ่งที่ต้องส่งมอบ"
              checked={form.requiresDeliverables}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  requiresDeliverables: e.target.checked,
                }))
              }
            />

            <Form.Control
              as="textarea"
              rows={2}
              className="mt-2"
              placeholder="ระบุรายละเอียดสิ่งที่ต้องส่งมอบ (ไม่บังคับ)"
              value={form.deliverableDescription}
              onChange={set('deliverableDescription')}
            />
            <Form.Text className="text-muted">
              สามารถเว้นว่างไว้ได้ และไม่ส่งผลต่อการสร้างโปรเจกต์
            </Form.Text>
          </Form.Group>

          {/* รายละเอียด */}
          <div className="mecha-form-section">รายละเอียด</div>

          <Form.Group className="mt-3">
            <Form.Label>รายละเอียดโปรเจกต์</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={form.description}
              onChange={set('description')}
              maxLength={5000}
              isInvalid={!!fieldErrors.description}
            />
            <Form.Control.Feedback type="invalid">
              {fieldErrors.description}
            </Form.Control.Feedback>
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={onClose}
            disabled={saving}
          >
            ยกเลิก
          </Button>

          <Button type="submit" disabled={saving}>
            {saving ? 'กำลังบันทึก…' : 'บันทึก'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
