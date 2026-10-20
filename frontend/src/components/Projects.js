// frontend/src/components/Projects.js — รายการโปรเจกต์: กรองสถานะ, เพิ่ม/แก้ไข (Modal), เปลี่ยนสถานะ, ลบ
//
// เป็นตัวอย่าง CRUD ครบวงจร — หน้าใหม่ลอกแบบนี้ได้: useLoad() โหลด → api.post/patch/del → reload()
import { useState } from 'react';
import { Alert, Button, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { api, useLoad } from '../utils/api';
import { PROJECT_STATUSES, statusLabel } from '../utils/config';

const EMPTY = { name: '', owner: '', status: 'planning', startDate: '', dueDate: '', description: '' };

// วันนี้ตามเวลาเครื่อง (YYYY-MM-DD) — ไม่ใช้ toISOString() เพราะเป็น UTC ช่วงเช้าจะได้วันก่อนหน้า
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// แสดงวันที่เป็น yyyy/mm/dd · null = '-'
const ymd = (v) => (v ? v.replace(/-/g, '/') : '-');

const isOverdue = (p) => p.dueDate && p.dueDate < today() && !['done', 'cancelled'].includes(p.status);

export default function Projects() {
  const [filter, setFilter] = useState('');
  const { data, error, loading, reload } = useLoad(`/projects${filter ? `?status=${filter}` : ''}`);
  const [editing, setEditing] = useState(null); // null = ปิด Modal · {} ไม่มี id = เพิ่มใหม่
  const [actionError, setActionError] = useState('');

  const changeStatus = async (p, status) => {
    setActionError('');
    try {
      await api.patch(`/projects/${p.id}`, { status });
      reload();
    } catch (e) {
      setActionError(e.message);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`ลบโปรเจกต์ "${p.name}" ?`)) return;
    setActionError('');
    try {
      await api.del(`/projects/${p.id}`);
      reload();
    } catch (e) {
      setActionError(e.message);
    }
  };

  return (
    <>
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <h1 className="page-title mb-0 me-auto">โปรเจกต์</h1>
        <Form.Select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 180 }}>
          <option value="">ทุกสถานะ</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </Form.Select>
        <Button onClick={() => setEditing({ ...EMPTY })}>+ เพิ่มโปรเจกต์</Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {actionError && <Alert variant="danger" dismissible onClose={() => setActionError('')}>{actionError}</Alert>}

      {loading && !data ? (
        <Spinner animation="border" size="sm" />
      ) : data && data.length === 0 ? (
        <Alert variant="secondary">ยังไม่มีโปรเจกต์</Alert>
      ) : data && (
        <Table hover responsive className="bg-white align-middle">
          <thead>
            <tr>
              <th>ชื่อโปรเจกต์</th>
              <th>ผู้รับผิดชอบ</th>
              <th>วันที่เริ่ม</th>
              <th>กำหนดส่ง</th>
              <th>สถานะ</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="fw-medium">{p.name}</div>
                  {p.description && <div className="small text-muted">{p.description}</div>}
                </td>
                <td>{p.owner || '-'}</td>
                <td>{ymd(p.startDate)}</td>
                {/* ใส่สีที่ span ไม่ใช่ td — bootstrap .table ตั้งสีที่ td ด้วย selector ที่ชนะคลาสเดี่ยว */}
                <td>
                  <span className={isOverdue(p) ? 'text-overdue' : ''}>
                    {ymd(p.dueDate)}{isOverdue(p) && ' (เลยกำหนด)'}
                  </span>
                </td>
                <td>
                  <Form.Select
                    size="sm"
                    value={p.status}
                    onChange={(e) => changeStatus(p, e.target.value)}
                    className={`status-select status-${p.status}`}
                    style={{ width: 130 }}
                    aria-label={`สถานะ: ${statusLabel(p.status)}`}
                  >
                    {PROJECT_STATUSES.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </Form.Select>
                </td>
                <td className="text-end text-nowrap">
                  <Button size="sm" variant="outline-primary" className="me-1" onClick={() => setEditing(p)}>แก้ไข</Button>
                  <Button size="sm" variant="outline-danger" onClick={() => remove(p)}>ลบ</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {editing && (
        <ProjectForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
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
      onSaved();
    } catch (err) {
      // ข้อความ validate ภาษาไทยมาจาก backend/services/projects.js
      setError(err.message);
      setSaving(false);
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
