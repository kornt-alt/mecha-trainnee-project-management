// Shared create and edit form for Project Workspace Tasks.
import { useMemo, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import { MOCK_EMPLOYEES } from '../../data/mockData';

export default function TaskFormModal({ project, task, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    title: task?.title || '', description: task?.description || '', category: task?.category || '', priority: task?.priority || 'normal',
    assigneeId: task?.assigneeId || '', reviewerId: task?.reviewerId || '',
    collaborators: task?.collaborators || [], startDate: task?.startDate || '', dueDate: task?.dueDate || '',
    estimatedHours: task?.estimatedHours ?? '', progress: task?.progress ?? 0,
  }));
  const [error, setError] = useState('');
  const members = useMemo(() => {
    const ids = new Set([...(project.teamMemberIds || []).map(String), String(project.managerId || ''), String(project.teamLeadId || '')]);
    return MOCK_EMPLOYEES.filter((employee) => ids.has(String(employee.id)));
  }, [project]);
  const reviewers = MOCK_EMPLOYEES.filter((employee) => String(employee.id) !== String(form.assigneeId));
  const eligibleCollaborators = members.filter((employee) => String(employee.id) !== String(form.assigneeId));

  const set = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }));
  const save = (event) => {
    event.preventDefault();
    if (!form.title.trim()) return setError('กรุณาระบุชื่องาน');
    if (!form.assigneeId) return setError('กรุณาเลือกผู้รับผิดชอบหลัก');
    if (!form.reviewerId) return setError('กรุณากำหนดผู้ตรวจงาน');
    if (String(form.reviewerId) === String(form.assigneeId)) return setError('ผู้ตรวจงานต้องไม่ซ้ำกับผู้รับผิดชอบหลัก');
    if (form.startDate && form.dueDate && form.startDate > form.dueDate) return setError('วันเริ่มต้องไม่อยู่หลังวันกำหนดส่ง');
    const hours = form.estimatedHours === '' ? undefined : Number(form.estimatedHours);
    if (hours !== undefined && (!Number.isFinite(hours) || hours < 0)) return setError('ชั่วโมงที่วางแผนต้องเป็นจำนวนตั้งแต่ 0 ขึ้นไป');
    onSave({
      ...form, title: form.title.trim(), description: form.description.trim(), projectId: project.id,
      collaborators: [...new Set(form.collaborators.map(String).filter((id) => id !== String(form.assigneeId)))],
      ...(hours === undefined ? { estimatedHours: undefined } : { estimatedHours: hours }),
      progress: Number(form.progress) || 0,
    });
  };

  return (
    <Modal show onHide={onClose} centered className="mecha-form-modal project-workspace-modal">
      <Form onSubmit={save}>
        <Modal.Header closeButton>
          <Modal.Title>{task ? 'แก้ไขงาน' : 'เพิ่มงานในโปรเจกต์'}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="project-workspace-form-grid">
          {error && <Alert variant="danger" role="alert">{error}</Alert>}
          <Form.Group className="workspace-form-wide">
            <Form.Label htmlFor="workspace-task-title">ชื่องาน <span aria-hidden="true">*</span></Form.Label>
            <Form.Control id="workspace-task-title" value={form.title} onChange={set('title')} maxLength={200} required />
          </Form.Group>
          <Form.Group className="workspace-form-wide">
            <Form.Label htmlFor="workspace-task-description">รายละเอียด</Form.Label>
            <Form.Control id="workspace-task-description" as="textarea" rows={3} value={form.description} onChange={set('description')} />
          </Form.Group>
          <Form.Group>
            <Form.Label htmlFor="workspace-task-category">หมวดหมู่งาน</Form.Label>
            <Form.Control id="workspace-task-category" value={form.category} onChange={set('category')} maxLength={80} />
          </Form.Group>
          <Form.Group>
            <Form.Label htmlFor="workspace-task-assignee">ผู้รับผิดชอบหลัก <span aria-hidden="true">*</span></Form.Label>
            {task ? <Form.Control id="workspace-task-assignee" value={members.find((person) => String(person.id) === String(form.assigneeId))?.name || form.assigneeId} readOnly /> : (
              <Form.Select id="workspace-task-assignee" value={form.assigneeId} onChange={(event) => setForm((previous) => ({ ...previous, assigneeId: event.target.value, collaborators: previous.collaborators.filter((id) => String(id) !== event.target.value) }))} required>
                <option value="">เลือกสมาชิก</option>
                {members.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </Form.Select>
            )}
            {task && <Form.Text>การเปลี่ยนผู้รับผิดชอบต้องบันทึกเหตุผลจากหน้ารายละเอียดงาน</Form.Text>}
          </Form.Group>
          <Form.Group>
            <Form.Label htmlFor="workspace-task-reviewer">ผู้ตรวจงาน <span aria-hidden="true">*</span></Form.Label>
            <Form.Select id="workspace-task-reviewer" value={form.reviewerId} onChange={set('reviewerId')} required>
              <option value="">เลือกผู้ตรวจ</option>
              {reviewers.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group className="workspace-form-wide">
            <Form.Label htmlFor="workspace-task-collaborators">ผู้ร่วมงาน</Form.Label>
            <Form.Select id="workspace-task-collaborators" multiple value={form.collaborators.map(String)} onChange={(event) => setForm((previous) => ({ ...previous, collaborators: Array.from(event.target.selectedOptions, (option) => option.value) }))} aria-describedby="workspace-collaborator-help">
              {eligibleCollaborators.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </Form.Select>
            <Form.Text id="workspace-collaborator-help">เลือกได้หลายคน ผู้รับผิดชอบหลักจะไม่ซ้ำในรายการนี้</Form.Text>
          </Form.Group>
          <Form.Group>
            <Form.Label htmlFor="workspace-task-priority">ความสำคัญ</Form.Label>
            <Form.Select id="workspace-task-priority" value={form.priority} onChange={set('priority')}>
              <option value="urgent">ด่วนมาก</option><option value="high">สูง</option><option value="normal">ปกติ</option><option value="low">ต่ำ</option>
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label htmlFor="workspace-task-hours">ชั่วโมงที่วางแผน</Form.Label>
            <Form.Control id="workspace-task-hours" type="number" min="0" step="0.5" value={form.estimatedHours} onChange={set('estimatedHours')} />
          </Form.Group>
          <Form.Group>
            <Form.Label htmlFor="workspace-task-start">วันเริ่ม</Form.Label>
            <Form.Control id="workspace-task-start" type="date" value={form.startDate} onChange={set('startDate')} />
          </Form.Group>
          <Form.Group>
            <Form.Label htmlFor="workspace-task-due">กำหนดส่ง</Form.Label>
            <Form.Control id="workspace-task-due" type="date" value={form.dueDate} onChange={set('dueDate')} />
          </Form.Group>
          {task && <Form.Group className="workspace-form-wide"><Form.Label htmlFor="workspace-task-progress">ความคืบหน้า · {form.progress}%</Form.Label><Form.Range id="workspace-task-progress" min="0" max="99" step="1" value={form.progress} onChange={set('progress')} /></Form.Group>}
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline-secondary" onClick={onClose}>ยกเลิก</Button>
          <Button type="submit">บันทึกงาน</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
