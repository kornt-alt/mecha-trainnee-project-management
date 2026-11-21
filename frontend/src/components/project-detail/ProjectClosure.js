// frontend/src/components/project-detail/ProjectClosure.js — ขั้นตอนปิดโปรเจกต์ (Owner ส่งขออนุมัติ → Team Lead อนุมัติ = ปิดทันที)
//
// เดิมมี 5 ขั้น ยืนยันทุกขั้น (~8 คลิกจาก 2 คน) และปิดโปรเจกต์ที่มีสิ่งส่งมอบไม่ได้เพราะไม่มีปุ่มตรวจสิ่งส่งมอบ
// ตอนนี้: ตรวจงาน + สิ่งส่งมอบอัตโนมัติจากสถานะจริง → Owner กดส่ง 1 ครั้ง → Team Lead อนุมัติ 1 ครั้ง (หรือส่งกลับพร้อมเหตุผล)
// ⚠️ กฎฝั่ง context อยู่ที่ MockDataContext.updateProject (closure) — แก้ขั้นตอนต้องแก้ทั้งสองที่ + docs/api-contract.md
import { useState } from 'react';
import { Alert, Button, Card, Form, Modal } from 'react-bootstrap';
import { currentEmployees } from '../../data/employeeStore';
import { useMockData } from '../../context/MockDataContext';
import { statusLabel } from '../../utils/config';

const personName = (id) => currentEmployees().find((person) => String(person.id) === String(id))?.name || id;

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
  const ready = tasksDone && deliverablesDone;
  const pending = closure.status === 'pending_approval';
  const closed = closure.status === 'closed';
  const canSubmit = isOwner && ready && Boolean(project.teamLeadId) && !pending && !closed;

  const execute = () => {
    setError('');
    const timestamp = new Date().toISOString();
    let result = null;
    if (action === 'submit') {
      if (!canSubmit) return setError('ยังไม่ครบเงื่อนไขการส่งปิดโปรเจกต์');
      // ส่ง = ยืนยันว่าตรวจสรุปและสิ่งส่งมอบแล้วในคราวเดียว (ไม่แยกเป็นปุ่มตรวจทีละขั้นแบบเดิม)
      result = updateProject(project.id, {
        closure: {
          ...closure,
          status: 'pending_approval',
          ownerReviewedAt: timestamp,
          ownerReviewedBy: actorId,
          deliverablesReviewedAt: deliverablesRequired ? timestamp : null,
          submittedAt: timestamp,
          submittedBy: actorId,
          returnReason: null,
        },
      }, { type: 'project_closure_submitted', description: `ส่งโปรเจกต์ “${project.name}” ให้ Team Lead อนุมัติปิด` });
    } else if (action === 'approve') {
      if (!isTeamLead || !pending) return setError('เฉพาะ Team Lead ของโปรเจกต์เท่านั้น');
      result = updateProject(project.id, {
        status: 'done',
        closure: { ...closure, status: 'closed', approvedAt: timestamp, approvedBy: actorId, closedAt: timestamp, closedBy: actorId },
      }, { type: 'project_closure_approved', description: `Team Lead อนุมัติและปิดโปรเจกต์ “${project.name}” (${statusLabel('done')})` });
    } else if (action === 'return') {
      if (!reason.trim()) return setError('กรุณาระบุเหตุผลที่ส่งกลับ');
      if (!isTeamLead || !pending) return setError('เฉพาะ Team Lead ของโปรเจกต์เท่านั้น');
      result = updateProject(project.id, {
        closure: {
          ...closure,
          status: 'returned',
          returnedAt: timestamp,
          returnedBy: actorId,
          returnReason: reason.trim(),
          ownerReviewedAt: null,
          deliverablesReviewedAt: null,
        },
      }, { type: 'project_closure_returned', description: `ส่งโปรเจกต์ “${project.name}” กลับให้แก้ไข`, reason: reason.trim() });
    }
    if (!result) return setError('ดำเนินการไม่สำเร็จ กรุณาตรวจสอบสิทธิ์และเงื่อนไขของโปรเจกต์');
    setAction('');
    setReason('');
  };

  const deliverableDetail = deliverablesRequired ? ` · สิ่งที่ส่งมอบ ${completedDeliverables}/${deliverables.length}` : '';
  const steps = [
    {
      label: 'งานและสิ่งที่ส่งมอบเสร็จครบ',
      detail: `งาน ${completedTasks}/${tasks.length}${deliverableDetail}`,
      state: ready ? 'complete' : 'current',
    },
    {
      label: 'Owner ส่งขออนุมัติปิดโปรเจกต์',
      detail: project.teamLeadId ? `ส่งถึง ${personName(project.teamLeadId)}` : 'ต้องตั้ง Team Lead ในแท็บทีมก่อน',
      state: pending || closed ? 'complete' : ready ? 'current' : 'upcoming',
    },
    {
      label: 'Team Lead อนุมัติ แล้วปิดโปรเจกต์ทันที',
      detail: closed ? `ปิดโดย ${personName(closure.closedBy)}` : 'ถ้าส่งกลับ Owner แก้แล้วส่งใหม่',
      state: closed ? 'complete' : pending ? 'current' : 'upcoming',
    },
  ];
  const actionInfo = {
    submit: ['ส่งขออนุมัติปิดโปรเจกต์', 'ยืนยันว่าตรวจงานและสิ่งที่ส่งมอบแล้ว ระบบจะส่งให้ Team Lead อนุมัติ'],
    approve: ['อนุมัติและปิดโปรเจกต์', 'โปรเจกต์จะเปลี่ยนเป็น “เสร็จแล้ว” และแก้สถานะไม่ได้อีก'],
    return: ['ส่งกลับให้แก้ไข', 'ระบุเหตุผลที่ต้องแก้ไขก่อนส่งอนุมัติใหม่'],
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
          {isOwner && !pending && !closed && <Button disabled={!canSubmit} onClick={() => setAction('submit')}>ส่งขออนุมัติปิดโปรเจกต์</Button>}
          {isTeamLead && pending && <><Button variant="success" onClick={() => setAction('approve')}>อนุมัติและปิดโปรเจกต์</Button><Button variant="outline-warning" onClick={() => setAction('return')}>ส่งกลับให้แก้ไข</Button></>}
          {closed && <span className="workspace-closure-complete">ปิดโดย {personName(closure.closedBy)}</span>}
        </div>
      </Card.Body>
      {action && <Modal show centered onHide={() => setAction('')} className="mecha-confirm-modal"><Modal.Header closeButton><Modal.Title>{actionInfo[0]}</Modal.Title></Modal.Header><Modal.Body>{actionInfo[1]}{action === 'return' && <Form.Group className="mt-3"><Form.Label htmlFor="closure-return-reason">เหตุผลที่ส่งกลับ <span aria-hidden="true">*</span></Form.Label><Form.Control as="textarea" id="closure-return-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></Form.Group>}{error && <Alert variant="danger" className="mt-3">{error}</Alert>}</Modal.Body><Modal.Footer><Button variant="outline-secondary" onClick={() => setAction('')}>ยกเลิก</Button><Button disabled={action === 'return' && !reason.trim()} onClick={execute}>ยืนยัน</Button></Modal.Footer></Modal>}
    </Card>
  );
}
