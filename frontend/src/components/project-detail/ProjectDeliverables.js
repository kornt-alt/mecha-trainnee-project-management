// Project-linked deliverable list and editing workflows.
import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Modal } from 'react-bootstrap';
import { MOCK_EMPLOYEES } from '../../data/mockData';
import { useMockData } from '../../context/MockDataContext';
import { ymd } from '../../utils/projectTrackingUtils';

const statusLabels = { pending: 'รอเริ่ม', in_progress: 'กำลังทำ', completed: 'เสร็จแล้ว' };

function DeliverableForm({ project, tasks, deliverable, memberIds, onClose, onSave }) {
  const [form, setForm] = useState({
    title: deliverable?.title || '', description: deliverable?.description || '', dueDate: deliverable?.dueDate || '',
    responsibleId: deliverable?.responsibleId || '', relatedTaskId: deliverable?.relatedTaskId || '',
  });
  const [error, setError] = useState('');
  const people = MOCK_EMPLOYEES.filter((person) => memberIds.has(String(person.id)));
  const set = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    if (!form.title.trim()) return setError('กรุณาระบุชื่อสิ่งที่ส่งมอบ');
    onSave({ ...form, projectId: project.id, title: form.title.trim(), relatedTaskId: form.relatedTaskId || null, responsibleId: form.responsibleId || null });
  };
  return <Modal show centered onHide={onClose} className="mecha-form-modal project-workspace-modal"><Form onSubmit={submit}><Modal.Header closeButton><Modal.Title>{deliverable ? 'แก้ไขสิ่งที่ส่งมอบ' : 'เพิ่มสิ่งที่ส่งมอบ'}</Modal.Title></Modal.Header><Modal.Body className="project-workspace-form-grid">{error && <Alert variant="danger">{error}</Alert>}<Form.Group className="workspace-form-wide"><Form.Label htmlFor="deliverable-title">ชื่อรายการ <span aria-hidden="true">*</span></Form.Label><Form.Control id="deliverable-title" value={form.title} onChange={set('title')} required maxLength={200} /></Form.Group><Form.Group className="workspace-form-wide"><Form.Label htmlFor="deliverable-description">รายละเอียด</Form.Label><Form.Control as="textarea" id="deliverable-description" rows={3} value={form.description} onChange={set('description')} /></Form.Group><Form.Group><Form.Label htmlFor="deliverable-due">กำหนดส่ง</Form.Label><Form.Control id="deliverable-due" type="date" value={form.dueDate} onChange={set('dueDate')} /></Form.Group><Form.Group><Form.Label htmlFor="deliverable-owner">ผู้รับผิดชอบ</Form.Label><Form.Select id="deliverable-owner" value={form.responsibleId} onChange={set('responsibleId')}><option value="">ไม่ระบุ</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</Form.Select></Form.Group><Form.Group className="workspace-form-wide"><Form.Label htmlFor="deliverable-related-task">งานที่เกี่ยวข้อง</Form.Label><Form.Select id="deliverable-related-task" value={form.relatedTaskId} onChange={set('relatedTaskId')}><option value="">ไม่เชื่อมโยงงาน</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</Form.Select></Form.Group></Modal.Body><Modal.Footer><Button variant="outline-secondary" onClick={onClose}>ยกเลิก</Button><Button type="submit">บันทึก</Button></Modal.Footer></Form></Modal>;
}

export default function ProjectDeliverables({ projectId }) {
  const { projects, tasks, deliverables, actorId, updateProject, createDeliverable, updateDeliverable, deleteDeliverable } = useMockData();
  const project = projects.find((item) => String(item.id) === String(projectId));
  const projectTasks = tasks.filter((task) => String(task.projectId) === String(projectId));
  const projectItems = useMemo(() => deliverables.filter((item) => String(item.projectId) === String(projectId)), [deliverables, projectId]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(null);
  const isOwner = String(actorId) === String(project?.managerId);
  const memberIds = new Set([...(project?.teamMemberIds || []).map(String), String(project?.managerId || ''), String(project?.teamLeadId || '')]);
  const visibleItems = projectItems.filter((item) => (
    (!search.trim() || `${item.title} ${item.description || ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    && (statusFilter === 'all' || item.status === statusFilter)
  ));
  const closure = project?.closure || {};

  if (!project) return <div className="project-detail-empty">ไม่พบโปรเจกต์</div>;

  const reviewed = () => updateProject(project.id, { closure: { ...closure, deliverablesReviewedAt: new Date().toISOString() } }, {
    type: 'project_closure_deliverables_reviewed', description: `Project Owner ตรวจรายการสิ่งที่ส่งมอบของ “${project.name}”`,
  });
  const saveDeliverable = (values) => {
    if (editing?.id) updateDeliverable(editing.id, values, { type: 'deliverable_updated', description: `แก้ไขสิ่งที่ส่งมอบ “${values.title}”` });
    else createDeliverable({ ...values, status: 'pending' });
    setEditing(null);
  };

  return <section className="workspace-section" aria-labelledby="workspace-deliverables-title">
    <div className="workspace-section-heading"><div><span className="project-detail-placeholder-label">PROJECT DELIVERABLES</span><h2 id="workspace-deliverables-title">สิ่งที่ส่งมอบ</h2><p>รายการผลลัพธ์ที่เชื่อมโยงกับโปรเจกต์นี้</p></div><Button onClick={() => setEditing({})}>เพิ่มรายการ</Button></div>
    {project.requiresDeliverables && project.deliverableDescription && <Card className="workspace-panel workspace-legacy-deliverables"><Card.Body><strong>รายละเอียดเดิมจากข้อมูลโปรเจกต์</strong><p className="mb-0">รายการด้านล่างเริ่มจากข้อความที่มีอยู่ในโปรเจกต์ และสามารถปรับสถานะหรือรายละเอียดให้เป็นปัจจุบันได้</p></Card.Body></Card>}
    <Card className="workspace-panel"><Card.Body>
      <div className="workspace-deliverable-toolbar"><Form.Control aria-label="ค้นหาสิ่งที่ส่งมอบ" placeholder="ค้นหารายการ..." value={search} onChange={(event) => setSearch(event.target.value)} /><Form.Select aria-label="กรองสถานะสิ่งที่ส่งมอบ" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">ทุกสถานะ</option><option value="pending">รอเริ่ม</option><option value="in_progress">กำลังทำ</option><option value="completed">เสร็จแล้ว</option></Form.Select></div>
      {projectItems.length === 0 ? <div className="workspace-empty-state"><strong>ยังไม่มีสิ่งที่ส่งมอบ</strong><span>เพิ่มรายการจริงของโปรเจกต์เพื่อใช้ติดตามและประกอบการปิดโปรเจกต์</span></div>
        : visibleItems.length === 0 ? <div className="workspace-empty-state"><strong>ไม่พบรายการ</strong><span>ปรับคำค้นหาหรือตัวกรองแล้วลองอีกครั้ง</span></div>
          : <div className="workspace-deliverable-list">{visibleItems.map((item) => {
            const task = projectTasks.find((record) => String(record.id) === String(item.relatedTaskId));
            return <article className="workspace-deliverable-row" key={item.id}><div className="workspace-deliverable-copy"><div className="workspace-deliverable-title"><h3>{item.title}</h3><Badge className={`workspace-deliverable-status status-${item.status}`}>{statusLabels[item.status] || item.status}</Badge></div>{item.description && <p>{item.description}</p>}<div className="workspace-deliverable-meta"><span>กำหนดส่ง {item.dueDate ? ymd(item.dueDate) : 'ไม่ระบุ'}</span>{item.responsibleId && <span>ผู้รับผิดชอบ {MOCK_EMPLOYEES.find((person) => String(person.id) === String(item.responsibleId))?.name || item.responsibleId}</span>}{task && <span>งานที่เกี่ยวข้อง {task.title}</span>}{item.completedAt && <span>เสร็จเมื่อ {new Date(item.completedAt).toLocaleDateString('th-TH')}</span>}</div></div><div className="workspace-deliverable-actions"><Form.Select aria-label={`สถานะ ${item.title}`} value={item.status} onChange={(event) => { const nextStatus = event.target.value; updateDeliverable(item.id, { status: nextStatus, completedAt: nextStatus === 'completed' ? new Date().toISOString() : null }, { type: 'deliverable_status_changed', description: `เปลี่ยนสถานะสิ่งที่ส่งมอบ “${item.title}” เป็น ${statusLabels[nextStatus]}` }); }}><option value="pending">รอเริ่ม</option><option value="in_progress">กำลังทำ</option><option value="completed">เสร็จแล้ว</option></Form.Select><Button size="sm" variant="outline-primary" onClick={() => setEditing(item)}>แก้ไข</Button><Button size="sm" variant="outline-danger" onClick={() => setConfirmingDelete(item)}>ลบ</Button></div></article>;
          })}</div>}
      <div className="workspace-attachment-note"><strong>ไฟล์แนบ</strong><span>ยังไม่รองรับการจัดเก็บไฟล์ในระบบ Mock Data</span></div>
    </Card.Body></Card>
    {isOwner && <Card className="workspace-panel workspace-deliverable-review"><Card.Body><div><h3>ตรวจรายการก่อนปิดโปรเจกต์</h3><p>Project Owner ยืนยันว่าได้ตรวจสิ่งที่ส่งมอบแล้ว ก่อนส่งโปรเจกต์ให้ Team Leader</p><small>{closure.deliverablesReviewedAt ? `ตรวจแล้ว ${new Date(closure.deliverablesReviewedAt).toLocaleString('th-TH')}` : 'ยังไม่ได้ยืนยันการตรวจ'}</small></div><Button variant={closure.deliverablesReviewedAt ? 'outline-success' : 'primary'} onClick={reviewed}>{closure.deliverablesReviewedAt ? 'ยืนยันตรวจอีกครั้ง' : 'ยืนยันว่าตรวจแล้ว'}</Button></Card.Body></Card>}
    {editing && <DeliverableForm project={project} tasks={projectTasks} memberIds={memberIds} deliverable={editing.id ? editing : null} onClose={() => setEditing(null)} onSave={saveDeliverable} />}
    {confirmingDelete && <Modal show centered onHide={() => setConfirmingDelete(null)} className="mecha-confirm-modal is-destructive"><Modal.Header closeButton><Modal.Title>ลบสิ่งที่ส่งมอบ</Modal.Title></Modal.Header><Modal.Body>ลบ “{confirmingDelete.title}” หรือไม่? การลบจะถูกบันทึกในประวัติโปรเจกต์</Modal.Body><Modal.Footer><Button variant="outline-secondary" onClick={() => setConfirmingDelete(null)}>ยกเลิก</Button><Button variant="danger" onClick={() => { deleteDeliverable(confirmingDelete.id); setConfirmingDelete(null); }}>ยืนยันลบ</Button></Modal.Footer></Modal>}
  </section>;
}
