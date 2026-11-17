// Project Owner and Team Leader closure workflow for the shared mock Project.
import { useState } from 'react';
import { Alert, Button, Card, Form, Modal } from 'react-bootstrap';
import { MOCK_EMPLOYEES } from '../../data/mockData';
import { useMockData } from '../../context/MockDataContext';
import { statusLabel } from '../../utils/config';

const personName = (id) => MOCK_EMPLOYEES.find((person) => String(person.id) === String(id))?.name || id;

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
  const completedDeliverables = deliverables.filter((item) => item.status === 'completed').length;
  const deliverablesRequired = Boolean(project.requiresDeliverables || deliverables.length);
  const deliverablesDone = !deliverablesRequired || (deliverables.length > 0 && deliverables.every((item) => item.status === 'completed'));
  const canSubmit = Boolean(tasksDone && deliverablesDone && closure.ownerReviewedAt
    && (!deliverablesRequired || closure.deliverablesReviewedAt) && project.teamLeadId);
  const mutate = (nextClosure, type, description, extra = {}) => updateProject(project.id, { closure: nextClosure }, {
    type, description, ...extra,
  });

  const execute = () => {
    setError('');
    const timestamp = new Date().toISOString();
    let result = null;
    if (action === 'owner_review') {
      if (!isOwner) return setError('เฉพาะ Project Owner เท่านั้นที่ยืนยันการตรวจสรุปได้');
      result = mutate({
        ...closure,
        status: closure.status === 'returned' ? 'draft' : closure.status || 'draft',
        ownerReviewedAt: timestamp,
        ownerReviewedBy: actorId,
        returnReason: null,
      }, 'project_closure_summary_reviewed', `Project Owner ตรวจสรุปโปรเจกต์ “${project.name}”`);
    } else if (action === 'submit') {
      if (!isOwner || !canSubmit) return setError('ยังไม่ครบเงื่อนไขการส่งปิดโปรเจกต์');
      result = mutate({ ...closure, status: 'pending_approval', submittedAt: timestamp, submittedBy: actorId, returnReason: null },
        'project_closure_submitted', `ส่งโปรเจกต์ “${project.name}” ให้ Team Leader อนุมัติ`);
    } else if (action === 'approve') {
      if (!isTeamLead || closure.status !== 'pending_approval') return setError('เฉพาะ Team Leader ที่ได้รับมอบหมายเท่านั้น');
      result = mutate({ ...closure, status: 'approved', approvedAt: timestamp, approvedBy: actorId },
        'project_closure_approved', `Team Leader อนุมัติการปิดโปรเจกต์ “${project.name}”`);
    } else if (action === 'return') {
      if (!reason.trim()) return setError('กรุณาระบุเหตุผลที่ส่งกลับ');
      if (!isTeamLead || closure.status !== 'pending_approval') return setError('เฉพาะ Team Leader ที่ได้รับมอบหมายเท่านั้น');
      result = mutate({
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
      const closed = mutate({ ...closure, status: 'closed', closedAt: timestamp, closedBy: actorId },
        'project_closed', `Project Owner ปิดโปรเจกต์ “${project.name}”`);
      if (!closed) return setError('ปิดโปรเจกต์ไม่สำเร็จ กรุณาตรวจสอบเงื่อนไขอีกครั้ง');
      result = updateProject(project.id, { status: 'done' }, {
        type: 'project_status_changed', description: `เปลี่ยนสถานะโปรเจกต์ “${project.name}” เป็น ${statusLabel('done')}`,
      });
    }
    if (!result) return setError('ดำเนินการไม่สำเร็จ กรุณาตรวจสอบสิทธิ์และเงื่อนไขของโปรเจกต์');
    setAction('');
    setReason('');
  };

  const summaryReviewed = Boolean(closure.ownerReviewedAt)
    && (!deliverablesRequired || (Boolean(closure.deliverablesReviewedAt) && deliverablesDone));
  const submitted = ['pending_approval', 'approved', 'closed'].includes(closure.status);
  const approved = ['approved', 'closed'].includes(closure.status);
  const closed = closure.status === 'closed';
  const steps = [
    {
      label: 'ทุกงานเป็น “เสร็จแล้ว”',
      detail: tasksDone ? 'ครบแล้ว' : `เสร็จ ${completedTasks}/${tasks.length} งาน`,
      state: tasksDone ? 'complete' : 'current',
    },
    {
      label: 'Owner ตรวจสรุปโปรเจกต์และสิ่งที่ส่งมอบ',
      detail: `ส่งมอบแล้ว ${completedDeliverables}/${deliverables.length}`,
      state: summaryReviewed ? 'complete' : tasksDone ? 'current' : 'upcoming',
    },
    {
      label: 'Owner ส่งขออนุมัติปิดโปรเจกต์',
      detail: 'ถึง Team Lead',
      state: submitted ? 'complete' : summaryReviewed && project.teamLeadId ? 'current' : 'upcoming',
    },
    {
      label: 'Team Lead อนุมัติหรือส่งกลับ',
      detail: 'ถ้าส่งกลับ Owner แก้แล้วส่งใหม่',
      state: approved ? 'complete' : closure.status === 'pending_approval' ? 'current' : 'upcoming',
    },
    {
      label: 'Owner ปิดโปรเจกต์',
      detail: closure.closedBy ? `ปิดโดย ${personName(closure.closedBy)}` : 'ขั้นตอนสุดท้าย',
      state: closed ? 'complete' : approved ? 'current' : 'upcoming',
    },
  ];
  const actionInfo = {
    owner_review: ['ยืนยันตรวจสรุปโปรเจกต์', 'ยืนยันว่าได้ตรวจข้อมูลสรุป สถานะงาน และสิ่งที่ส่งมอบด้านล่างแล้ว'],
    submit: ['ส่งขออนุมัติปิดโปรเจกต์', 'ส่งสรุปและสิ่งที่ส่งมอบให้ Team Leader ตรวจ'],
    approve: ['อนุมัติปิดโปรเจกต์', 'หลังอนุมัติ Project Owner จะเป็นผู้ปิดโปรเจกต์ในขั้นตอนสุดท้าย'],
    return: ['ส่งกลับให้แก้ไข', 'ระบุเหตุผลที่ต้องแก้ไขก่อนส่งอนุมัติใหม่'],
    close: ['ปิดโปรเจกต์', 'Project Owner จะปิดโปรเจกต์หลัง Team Leader อนุมัติ'],
  }[action] || [];

  return (
    <Card id="project-closure" className="workspace-panel workspace-closure" tabIndex="-1">
      <Card.Body>
        <h2 className="workspace-closure-title">ขั้นตอนการปิดโปรเจกต์</h2>
        {closure.returnReason && <Alert variant="warning">เหตุผลที่ส่งกลับ: {closure.returnReason}</Alert>}
        <ol className="project-detail-closure-list">
          {steps.map((step, index) => (
            <li className={`closure-${step.state}`} key={step.label}>
              <span className="project-detail-closure-marker">
                <span className="project-detail-closure-number">{step.state === 'complete' ? '✓' : index + 1}</span>
                {index < steps.length - 1 && <span className="project-detail-closure-line" aria-hidden="true" />}
              </span>
              <span className="project-detail-closure-copy"><strong>{step.label}</strong><small>{step.detail}</small></span>
            </li>
          ))}
        </ol>
        <div className="workspace-closure-actions">
          {isOwner && !['pending_approval', 'approved', 'closed'].includes(closure.status) && <><Button variant="outline-primary" disabled={!tasksDone} onClick={() => setAction('owner_review')}>{closure.ownerReviewedAt ? 'ตรวจสรุปอีกครั้ง' : 'ยืนยันตรวจสรุป'}</Button>{closure.status !== 'returned' && deliverablesRequired && <small>ยืนยันการตรวจสิ่งที่ส่งมอบได้ในแท็บ สิ่งที่ส่งมอบ</small>}<Button disabled={!canSubmit} onClick={() => setAction('submit')}>ส่งขออนุมัติ</Button></>}
          {isTeamLead && closure.status === 'pending_approval' && <><Button variant="success" onClick={() => setAction('approve')}>อนุมัติ</Button><Button variant="outline-warning" onClick={() => setAction('return')}>ส่งกลับให้แก้ไข</Button></>}
          {isOwner && closure.status === 'approved' && <Button onClick={() => setAction('close')}>ปิดโปรเจกต์</Button>}
          {closure.status === 'closed' && <span className="workspace-closure-complete">ปิดโดย {personName(closure.closedBy)}</span>}
        </div>
      </Card.Body>
      {action && <Modal show centered onHide={() => setAction('')} className="mecha-confirm-modal"><Modal.Header closeButton><Modal.Title>{actionInfo[0]}</Modal.Title></Modal.Header><Modal.Body>{actionInfo[1]}{action === 'return' && <Form.Group className="mt-3"><Form.Label htmlFor="closure-return-reason">เหตุผลที่ส่งกลับ <span aria-hidden="true">*</span></Form.Label><Form.Control as="textarea" id="closure-return-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></Form.Group>}{error && <Alert variant="danger" className="mt-3">{error}</Alert>}</Modal.Body><Modal.Footer><Button variant="outline-secondary" onClick={() => setAction('')}>ยกเลิก</Button><Button disabled={action === 'return' && !reason.trim()} onClick={execute}>ยืนยัน</Button></Modal.Footer></Modal>}
    </Card>
  );
}
