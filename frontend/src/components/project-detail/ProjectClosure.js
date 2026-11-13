// Project Owner and Team Leader closure workflow for the shared mock Project.
import { useState } from 'react';
import { Alert, Button, Card, Form, Modal } from 'react-bootstrap';
import { MOCK_EMPLOYEES } from '../../data/mockData';
import { useMockData } from '../../context/MockDataContext';
import { statusLabel } from '../../utils/config';

const personName = (id) => MOCK_EMPLOYEES.find((person) => String(person.id) === String(id))?.name || id;
const deliverableLabel = { pending: 'รอเริ่ม', in_progress: 'กำลังทำ', completed: 'เสร็จแล้ว' };

export default function ProjectClosure({ projectId, tasks, deliverables }) {
  const { projects, actorId, updateProject } = useMockData();
  const project = projects.find((item) => String(item.id) === String(projectId));
  const [action, setAction] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  if (!project) return null;

  const closure = project.closure || { status: 'draft' };
  const isOwner = String(actorId) === String(project.managerId);
  const isTeamLead = Boolean(project.teamLeadId) && String(actorId) === String(project.teamLeadId);
  const tasksDone = tasks.length > 0 && tasks.every((task) => task.status === 'completed');
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const deliverablesRequired = Boolean(project.requiresDeliverables || deliverables.length);
  const deliverablesDone = !deliverablesRequired || (deliverables.length > 0 && deliverables.every((item) => item.status === 'completed'));
  const canSubmit = Boolean(tasksDone && deliverablesDone && closure.ownerReviewedAt
    && (!deliverablesRequired || closure.deliverablesReviewedAt) && project.teamLeadId);
  const statusText = {
    draft: 'กำลังเตรียมตรวจสอบ', returned: 'ส่งกลับให้แก้ไข', pending_approval: 'รอ Team Leader อนุมัติ',
    approved: 'Team Leader อนุมัติแล้ว · รอ Owner ปิด', closed: 'ปิดโปรเจกต์แล้ว',
  }[closure.status || 'draft'];

  const mutate = (nextClosure, type, description, extra = {}) => updateProject(project.id, { closure: nextClosure }, {
    type, description, ...extra,
  });

  const execute = () => {
    setError('');
    const timestamp = new Date().toISOString();
    if (action === 'owner_review') {
      if (!isOwner) return setError('เฉพาะ Project Owner เท่านั้นที่ยืนยันการตรวจสรุปได้');
      mutate({
        ...closure,
        status: closure.status === 'returned' ? 'draft' : closure.status || 'draft',
        ownerReviewedAt: timestamp,
        ownerReviewedBy: actorId,
        returnReason: null,
      }, 'project_closure_summary_reviewed', `Project Owner ตรวจสรุปโปรเจกต์ “${project.name}”`);
    } else if (action === 'submit') {
      if (!isOwner || !canSubmit) return setError('ยังไม่ครบเงื่อนไขการส่งปิดโปรเจกต์');
      mutate({ ...closure, status: 'pending_approval', submittedAt: timestamp, submittedBy: actorId, returnReason: null },
        'project_closure_submitted', `ส่งโปรเจกต์ “${project.name}” ให้ Team Leader อนุมัติ`);
    } else if (action === 'approve') {
      if (!isTeamLead || closure.status !== 'pending_approval') return setError('เฉพาะ Team Leader ที่ได้รับมอบหมายเท่านั้น');
      mutate({ ...closure, status: 'approved', approvedAt: timestamp, approvedBy: actorId },
        'project_closure_approved', `Team Leader อนุมัติการปิดโปรเจกต์ “${project.name}”`);
    } else if (action === 'return') {
      if (!reason.trim()) return setError('กรุณาระบุเหตุผลที่ส่งกลับ');
      if (!isTeamLead || closure.status !== 'pending_approval') return setError('เฉพาะ Team Leader ที่ได้รับมอบหมายเท่านั้น');
      mutate({
        ...closure,
        status: 'returned',
        returnedAt: timestamp,
        returnedBy: actorId,
        returnReason: reason.trim(),
        ownerReviewedAt: null,
        deliverablesReviewedAt: null,
      }, 'project_closure_returned', `ส่งโปรเจกต์ “${project.name}” กลับให้แก้ไข`, { reason: reason.trim() });
    } else if (action === 'close') {
      if (!isOwner || closure.status !== 'approved') return setError('Project Owner เท่านั้นที่ปิดโปรเจกต์หลังการอนุมัติได้');
      mutate({ ...closure, status: 'closed', closedAt: timestamp, closedBy: actorId },
        'project_closed', `Project Owner ปิดโปรเจกต์ “${project.name}”`);
      updateProject(project.id, { status: 'done' }, {
        type: 'project_status_changed', description: `เปลี่ยนสถานะโปรเจกต์ “${project.name}” เป็น ${statusLabel('done')}`,
      });
    }
    setAction('');
    setReason('');
  };

  const steps = [
    { label: 'งานทั้งหมดเสร็จแล้ว', done: tasksDone, detail: `${completedTasks}/${tasks.length} งาน` },
    { label: 'Project Owner ตรวจสรุป', done: Boolean(closure.ownerReviewedAt), detail: closure.ownerReviewedAt ? `ตรวจโดย ${personName(closure.ownerReviewedBy)}` : 'ยังไม่ได้ตรวจ' },
    { label: 'สิ่งที่ส่งมอบผ่านการตรวจ', done: !deliverablesRequired || (Boolean(closure.deliverablesReviewedAt) && deliverablesDone), detail: deliverablesRequired ? `${deliverables.filter((item) => item.status === 'completed').length}/${deliverables.length} เสร็จ` : 'โปรเจกต์นี้ไม่กำหนดสิ่งที่ส่งมอบ' },
    { label: 'Team Leader อนุมัติ', done: ['approved', 'closed'].includes(closure.status), detail: closure.status === 'pending_approval' ? 'รอพิจารณา' : closure.approvedAt ? `อนุมัติโดย ${personName(closure.approvedBy)}` : 'ยังไม่ส่งอนุมัติ' },
    { label: 'Project Owner ปิดโปรเจกต์', done: closure.status === 'closed', detail: closure.closedAt ? `ปิดเมื่อ ${new Date(closure.closedAt).toLocaleString('th-TH')}` : 'ขั้นตอนสุดท้าย' },
  ];
  const actionInfo = {
    owner_review: ['ยืนยันตรวจสรุปโปรเจกต์', 'ยืนยันว่าได้ตรวจข้อมูลสรุป สถานะงาน และสิ่งที่ส่งมอบด้านล่างแล้ว'],
    submit: ['ส่งขออนุมัติปิดโปรเจกต์', 'ส่งสรุปและสิ่งที่ส่งมอบให้ Team Leader ตรวจ'],
    approve: ['อนุมัติปิดโปรเจกต์', 'หลังอนุมัติ Project Owner จะเป็นผู้ปิดโปรเจกต์ในขั้นตอนสุดท้าย'],
    return: ['ส่งกลับให้แก้ไข', 'ระบุเหตุผลที่ต้องแก้ไขก่อนส่งอนุมัติใหม่'],
    close: ['ปิดโปรเจกต์', 'Project Owner จะปิดโปรเจกต์หลัง Team Leader อนุมัติ'],
  }[action] || [];

  return (
    <Card className="workspace-panel workspace-closure">
      <Card.Body>
        <div className="workspace-panel-heading">
          <div><h3>ขั้นตอนการปิดโปรเจกต์</h3><p>งานเสร็จและ Project Closure เป็นคนละสถานะ</p></div>
          <span className={`workspace-closure-state state-${closure.status || 'draft'}`}>{statusText}</span>
        </div>
        {closure.returnReason && <Alert variant="warning">เหตุผลที่ส่งกลับ: {closure.returnReason}</Alert>}
        <div className="workspace-closure-summary">
          <div><h4>สรุปโปรเจกต์</h4><p>{project.description || 'ไม่มีรายละเอียดโปรเจกต์'}</p><small>{[project.category, project.startDate, project.dueDate].filter(Boolean).join(' · ') || 'ไม่มีข้อมูลหมวดหมู่หรือกำหนดการ'}</small></div>
          <div><h4>สิ่งที่ส่งมอบ</h4>{deliverables.length ? <ul>{deliverables.map((item) => <li key={item.id}>{item.title}<span>{deliverableLabel[item.status] || item.status}</span></li>)}</ul> : <p>{project.requiresDeliverables ? 'ยังไม่มีรายการสิ่งที่ส่งมอบ' : 'โปรเจกต์นี้ไม่มีรายการสิ่งที่ส่งมอบ'}</p>}</div>
        </div>
        <ol className="project-detail-closure-list mb-3">{steps.map((step, index) => <li className={step.done ? 'closure-complete' : index === steps.findIndex((item) => !item.done) ? 'closure-current' : 'closure-upcoming'} key={step.label}><span className="project-detail-closure-number">{step.done ? '✓' : index + 1}</span><span><strong>{step.label}</strong><small>{step.detail}</small></span></li>)}</ol>
        {tasks.length === 0
          ? <Alert variant="warning">ยังไม่มีงานในโปรเจกต์ จึงยังส่งขออนุมัติปิดไม่ได้</Alert>
          : !tasksDone && <Alert variant="warning">ยังมีงานที่ไม่เสร็จ {tasks.length - completedTasks} งาน</Alert>}
        {deliverablesRequired && !deliverablesDone && <Alert variant="warning">ต้องทำสิ่งที่ส่งมอบให้เสร็จครบก่อนส่งปิดโปรเจกต์</Alert>}
        {!project.teamLeadId && <Alert variant="warning">ยังไม่ได้กำหนด Team Leader สำหรับการอนุมัติปิดโปรเจกต์</Alert>}
        <div className="workspace-closure-actions">
          {isOwner && !['pending_approval', 'approved', 'closed'].includes(closure.status) && <><Button variant="outline-primary" onClick={() => setAction('owner_review')}>{closure.ownerReviewedAt ? 'ตรวจสรุปอีกครั้ง' : 'ยืนยันตรวจสรุป'}</Button>{closure.status !== 'returned' && deliverablesRequired && <small>ยืนยันการตรวจสิ่งที่ส่งมอบได้ในแท็บ สิ่งที่ส่งมอบ</small>}<Button disabled={!canSubmit} onClick={() => setAction('submit')}>ส่งขออนุมัติ</Button></>}
          {isTeamLead && closure.status === 'pending_approval' && <><Button variant="success" onClick={() => setAction('approve')}>อนุมัติ</Button><Button variant="outline-warning" onClick={() => setAction('return')}>ส่งกลับให้แก้ไข</Button></>}
          {isOwner && closure.status === 'approved' && <Button onClick={() => setAction('close')}>ปิดโปรเจกต์</Button>}
          {closure.status === 'closed' && <span className="workspace-closure-complete">ปิดโดย {personName(closure.closedBy)}</span>}
        </div>
      </Card.Body>
      {action && <Modal show centered onHide={() => setAction('')} className="mecha-confirm-modal"><Modal.Header closeButton><Modal.Title>{actionInfo[0]}</Modal.Title></Modal.Header><Modal.Body>{actionInfo[1]}{action === 'return' && <Form.Group className="mt-3"><Form.Label htmlFor="closure-return-reason">เหตุผลที่ส่งกลับ <span aria-hidden="true">*</span></Form.Label><Form.Control as="textarea" id="closure-return-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></Form.Group>}{error && <Alert variant="danger" className="mt-3">{error}</Alert>}</Modal.Body><Modal.Footer><Button variant="outline-secondary" onClick={() => setAction('')}>ยกเลิก</Button><Button disabled={action === 'return' && !reason.trim()} onClick={execute}>ยืนยัน</Button></Modal.Footer></Modal>}
    </Card>
  );
}
