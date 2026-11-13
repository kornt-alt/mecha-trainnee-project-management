// Shared Task Detail modal with optional Project Workspace workflows.
import { useMemo, useState } from 'react';
import { Alert, Button, Form, Modal, ProgressBar } from 'react-bootstrap';
import { MOCK_EMPLOYEES } from '../data/mockData';
import { useMockData } from '../context/MockDataContext';
import { TaskPriorityBadge, TaskStatusBadge } from './TaskBadges';
import { Folder, Plus, Trash2 } from './common/Icons';

const employee = (id) => MOCK_EMPLOYEES.find((item) => String(item.id) === String(id));
const labelForStatus = { not_started: 'รอเริ่มทำ', in_progress: 'กำลังดำเนินการ', pending_review: 'รอการตรวจสอบ', completed: 'เสร็จสิ้น' };
const checklistDate = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleString('th-TH') : '';
};

export default function TaskDetailModal({ task: selectedTask, onClose, projectId, onEdit }) {
  const {
    projects, tasks, actorId, updateTask, deleteTask,
  } = useMockData();
  const [checklistTitle, setChecklistTitle] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState(null);
  const [editingChecklistTitle, setEditingChecklistTitle] = useState('');
  const [pendingChecklistDelete, setPendingChecklistDelete] = useState(null);
  const [reason, setReason] = useState('');
  const [nextAssigneeId, setNextAssigneeId] = useState('');
  const [confirmAction, setConfirmAction] = useState('');
  const [error, setError] = useState('');
  const task = selectedTask ? tasks.find((item) => String(item.id) === String(selectedTask.id)) : null;
  const project = projects.find((item) => String(item.id) === String(projectId ?? task?.projectId));
  const ownerId = project?.managerId;
  const teamLeadId = project?.teamLeadId;
  const isOwner = String(actorId) === String(ownerId);
  const isTeamLead = String(actorId) === String(teamLeadId);
  const isReviewLocked = task?.status === 'pending_review';
  const canManageAssignment = Boolean(projectId && (isOwner || isTeamLead) && !isReviewLocked && task?.status !== 'completed');
  const canSubmitReview = Boolean(projectId && !isReviewLocked && task?.status !== 'completed' && task?.reviewerId
    && (String(actorId) === String(task?.assigneeId) || (task?.collaborators || []).some((id) => String(id) === String(actorId))));
  const canReview = Boolean(projectId && isReviewLocked && String(actorId) === String(task?.reviewerId));
  const canWithdraw = Boolean(projectId && isReviewLocked && (
    String(actorId) === String(task?.reviewSubmittedBy) || isOwner || isTeamLead
  ));
  const projectMembers = useMemo(() => {
    const ids = new Set([...(project?.teamMemberIds || []).map(String), String(ownerId || ''), String(teamLeadId || ''), String(task?.assigneeId || '')]);
    return MOCK_EMPLOYEES.filter((person) => ids.has(String(person.id)));
  }, [project, ownerId, teamLeadId, task?.assigneeId]);

  if (!task) return null;

  const update = (patch, event) => updateTask(task.id, patch, event && {
    taskId: task.id,
    description: event.description,
    type: event.type,
    reason: event.reason,
  });

  const addChecklistItem = (event) => {
    event.preventDefault();
    const title = checklistTitle.trim();
    const canParticipate = isOwner || String(actorId) === String(task.assigneeId)
      || (task.collaborators || []).some((id) => String(id) === String(actorId))
      || String(actorId) === String(task.reviewerId)
      || (project?.teamMemberIds || []).some((id) => String(id) === String(actorId));
    if (!title || isReviewLocked || !canParticipate) return;
    const item = {
      id: `check-${Date.now()}`, title, completed: false,
      createdBy: actorId, ownerId: actorId, createdAt: new Date().toISOString(),
    };
    update({ checklist: [...(task.checklist || []), item] }, {
      type: 'checklist_created', description: `เพิ่มรายการตรวจสอบ “${title}” ในงาน “${task.title}”`,
    });
    setChecklistTitle('');
  };

  const toggleChecklistItem = (item) => {
    if (isReviewLocked) return;
    const canEdit = isOwner || String(item.ownerId || item.createdBy) === String(actorId);
    if (!canEdit) return;
    const completed = !item.completed;
    update({ checklist: task.checklist.map((entry) => entry.id === item.id ? {
      ...entry, completed, completedBy: completed ? actorId : null,
      completedAt: completed ? new Date().toISOString() : null,
    } : entry) }, {
      type: 'checklist_updated', description: `${completed ? 'ทำเครื่องหมายเสร็จ' : 'ยกเลิกการเสร็จ'}รายการ “${item.title}”`,
    });
  };

  const saveChecklistTitle = (item) => {
    const title = editingChecklistTitle.trim();
    if (!title || isReviewLocked) return;
    const canEdit = isOwner || String(item.ownerId || item.createdBy) === String(actorId);
    if (!canEdit || title === item.title) {
      setEditingChecklistId(null);
      return;
    }
    update({ checklist: task.checklist.map((entry) => entry.id === item.id ? { ...entry, title, updatedAt: new Date().toISOString() } : entry) }, {
      type: 'checklist_updated', description: `แก้ไขรายการตรวจสอบ “${item.title}” ในงาน “${task.title}”`,
    });
    setEditingChecklistId(null);
  };

  const runConfirmedAction = () => {
    setError('');
    const stamp = new Date().toISOString();
    const reviewHistory = [...(task.reviewHistory || [])];
    if (confirmAction === 'submit') {
      if (!canSubmitReview) return setError('ผู้รับผิดชอบหลักหรือผู้ร่วมงานเท่านั้นที่ส่งงานตรวจได้');
      if (!task.reviewerId) return setError('กรุณากำหนดผู้ตรวจงานก่อนส่งตรวจ');
      reviewHistory.push({ action: 'submitted', actorId, reviewerId: task.reviewerId, timestamp: stamp });
      update({ status: 'pending_review', statusLabel: labelForStatus.pending_review, reviewSubmittedBy: actorId, reviewSubmittedAt: stamp, reviewHistory }, {
        type: 'task_review_submitted', description: `ส่งงาน “${task.title}” ให้ ${employee(task.reviewerId)?.name || 'ผู้ตรวจ'} ตรวจ`,
      });
    } else if (confirmAction === 'approve') {
      if (!canReview) return setError('เฉพาะผู้ตรวจงานที่กำหนดเท่านั้นที่อนุมัติได้');
      reviewHistory.push({ action: 'approved', actorId, timestamp: stamp });
      update({ status: 'completed', statusLabel: labelForStatus.completed, progress: 100, completedAt: stamp, reviewApprovedBy: actorId, reviewApprovedAt: stamp, reviewHistory }, {
        type: 'task_review_approved', description: `อนุมัติงาน “${task.title}”`,
      });
    } else if (confirmAction === 'request_changes' || confirmAction === 'withdraw') {
      const cleanReason = reason.trim();
      if (!cleanReason) return setError('กรุณาระบุเหตุผล');
      const requested = confirmAction === 'request_changes';
      if ((requested && !canReview) || (!requested && !canWithdraw)) return setError('คุณไม่มีสิทธิ์ดำเนินการกับสถานะตรวจงานนี้');
      reviewHistory.push({ action: requested ? 'changes_requested' : 'withdrawn', actorId, reason: cleanReason, timestamp: stamp });
      update({ status: 'in_progress', statusLabel: labelForStatus.in_progress, reviewHistory, reviewLastReason: cleanReason }, {
        type: requested ? 'task_changes_requested' : 'task_review_withdrawn',
        description: requested ? `ขอแก้ไขงาน “${task.title}”` : `ถอนงาน “${task.title}” ออกจากการตรวจ`, reason: cleanReason,
      });
    } else if (confirmAction === 'reassign') {
      const cleanReason = reason.trim();
      if (!nextAssigneeId || !cleanReason) return setError('เลือกผู้รับผิดชอบใหม่และระบุเหตุผล');
      if (!canManageAssignment || !projectMembers.some((person) => String(person.id) === String(nextAssigneeId)) || String(nextAssigneeId) === String(task.assigneeId)) return setError('เลือกสมาชิกโปรเจกต์คนอื่นและตรวจสอบสิทธิ์ก่อนบันทึก');
      const previousAssigneeId = task.assigneeId;
      const assignmentHistory = [...(task.assignmentHistory || []), {
        previousAssigneeId, newAssigneeId: nextAssigneeId, actorId, reason: cleanReason, timestamp: stamp,
      }];
      update({ assigneeId: nextAssigneeId, assignmentHistory }, {
        type: 'task_assignee_changed', description: `เปลี่ยนผู้รับผิดชอบ “${task.title}” จาก ${employee(previousAssigneeId)?.name || previousAssigneeId} เป็น ${employee(nextAssigneeId)?.name || nextAssigneeId}`,
        reason: cleanReason,
      });
    } else if (confirmAction === 'delete') {
      deleteTask(task.id, { actorId, type: 'task_deleted', description: `ลบงาน “${task.title}”` });
      onClose();
    } else if (confirmAction === 'delete_checklist') {
      if (!pendingChecklistDelete) return setError('ไม่พบรายการตรวจสอบที่ต้องการลบ');
      const item = task.checklist.find((entry) => entry.id === pendingChecklistDelete);
      const canEdit = item && (isOwner || String(item.ownerId || item.createdBy) === String(actorId));
      if (!item || !canEdit || isReviewLocked) return setError('คุณไม่มีสิทธิ์ลบรายการตรวจสอบนี้');
      update({ checklist: task.checklist.filter((entry) => entry.id !== item.id) }, {
        type: 'checklist_deleted', description: `ลบรายการตรวจสอบ “${item.title}” จากงาน “${task.title}”`,
      });
      setPendingChecklistDelete(null);
    }
    setConfirmAction('');
    setReason('');
    setNextAssigneeId('');
  };

  const actionDescription = {
    submit: 'ส่งงานให้ผู้ตรวจที่ระบุไว้ และล็อกการแก้ไขระหว่างรอตรวจ',
    approve: 'อนุมัติงานและเปลี่ยนสถานะเป็นเสร็จสิ้น',
    request_changes: 'ส่งงานกลับไปกำลังดำเนินการพร้อมเหตุผลที่ระบุ',
    withdraw: 'ถอนงานออกจากการตรวจและเปลี่ยนกลับเป็นกำลังดำเนินการ',
    reassign: 'บันทึกการเปลี่ยนผู้รับผิดชอบพร้อมเหตุผล',
    delete: `ลบ “${task.title}” ออกจากโปรเจกต์`,
    delete_checklist: 'ลบรายการตรวจสอบนี้ออกจากงาน',
  }[confirmAction];

  return (
    <>
      <Modal show onHide={onClose} centered className="mecha-detail-modal project-workspace-modal">
        <Modal.Header closeButton>
          <Modal.Title className="h5 fw-bold text-ink">รายละเอียดงาน</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 project-task-detail-body">
          {isReviewLocked && <Alert variant="warning">งานอยู่ระหว่างตรวจสอบ จึงล็อกการแก้ไขไว้</Alert>}
          <div className="mb-3"><span className="small text-muted d-block mb-1">ชื่องาน</span><h5 className="fw-semibold text-ink">{task.title}</h5></div>
          <div className="mb-3"><span className="small text-muted d-block mb-1">โปรเจกต์ต้นสังกัด</span><div className="d-flex align-items-center gap-2 fw-medium text-ink"><Folder size={16} className="text-primary" /><span>{task.projectName}</span></div></div>
          <div className="row g-3 mb-3">
            <div className="col-6"><span className="small text-muted d-block mb-1">หมวดหมู่</span><span className="badge bg-light text-dark border">{task.category || 'ไม่ระบุ'}</span></div>
            <div className="col-6"><span className="small text-muted d-block mb-1">ระดับความสำคัญ</span><TaskPriorityBadge priority={task.priority} className="task-detail-priority" /></div>
          </div>
          <div className="row g-3 mb-3">
            <div className="col-6"><span className="small text-muted d-block mb-1">สถานะปัจจุบัน</span><TaskStatusBadge task={task} className="task-detail-status" /></div>
            <div className="col-6"><span className="small text-muted d-block mb-1">ผู้รับผิดชอบหลัก</span><div className="small fw-medium text-ink">{employee(task.assigneeId)?.name || task.assigneeId || 'ไม่ระบุ'}</div></div>
          </div>
          <div className="row g-3 mb-3">
            <div className="col-6"><span className="small text-muted d-block mb-1">ผู้ร่วมงาน</span><div className="small text-ink">{(task.collaborators || []).map((id) => employee(id)?.name).filter(Boolean).join(', ') || 'ไม่มี'}</div></div>
            <div className="col-6"><span className="small text-muted d-block mb-1">ผู้ตรวจงาน</span><div className="small text-ink">{employee(task.reviewerId)?.name || 'ยังไม่ได้กำหนด'}</div></div>
          </div>
          <div className="row g-3 mb-3">
            <div className="col-6"><span className="small text-muted d-block mb-1">วันที่เริ่ม</span><span className="small text-ink">{task.startDate || '—'}</span></div>
            <div className="col-6"><span className="small text-muted d-block mb-1">กำหนดส่ง</span><span className="small text-ink">{task.dueDate || '—'}</span></div>
            <div className="col-6"><span className="small text-muted d-block mb-1">ชั่วโมงที่วางแผน</span><span className="small text-ink">{task.estimatedHours ?? '—'}</span></div>
          </div>
          {typeof task.progress === 'number' && <div className="mb-3"><div className="d-flex justify-content-between mb-1"><span className="small text-muted">ความคืบหน้า</span><span className="small fw-semibold">{task.progress}%</span></div><ProgressBar now={task.progress} variant={task.progress === 100 ? 'success' : 'primary'} style={{ height: 8 }} /></div>}
          <div className="mb-3"><span className="small text-muted d-block mb-1">คำอธิบายรายละเอียด</span><div className="p-3 bg-light rounded small text-ink" style={{ lineHeight: 1.6 }}>{task.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</div></div>

          {projectId && (
            <>
              <section className="workspace-task-section" aria-labelledby="task-checklist-title">
                <div className="workspace-task-section-heading"><h3 id="task-checklist-title">Checklist</h3><span>{(task.checklist || []).filter((item) => item.completed).length}/{(task.checklist || []).length}</span></div>
                {(task.checklist || []).length === 0 ? <p className="workspace-muted-copy">ยังไม่มีรายการตรวจสอบ</p> : (
                  <ul className="workspace-checklist">
                    {task.checklist.map((item) => {
                      const canEditItem = !isReviewLocked && (isOwner || String(item.ownerId || item.createdBy) === String(actorId));
                      return <li key={item.id}>
                        {editingChecklistId === item.id ? <Form onSubmit={(event) => { event.preventDefault(); saveChecklistTitle(item); }} className="workspace-checklist-edit"><Form.Control autoFocus aria-label={`แก้ไขรายการ ${item.title}`} value={editingChecklistTitle} onChange={(event) => setEditingChecklistTitle(event.target.value)} /><Button size="sm" type="submit" disabled={!editingChecklistTitle.trim()}>บันทึก</Button><Button size="sm" type="button" variant="outline-secondary" onClick={() => setEditingChecklistId(null)}>ยกเลิก</Button></Form>
                          : <Form.Check type="checkbox" label={item.title} checked={Boolean(item.completed)} disabled={!canEditItem} onChange={() => toggleChecklistItem(item)} />}
                        <small>{canEditItem ? (isOwner ? 'Project Owner' : 'รายการของคุณ') : `เป็นของ ${employee(item.ownerId || item.createdBy)?.name || 'สมาชิกอื่น'}`}{item.createdAt && ` · สร้าง ${checklistDate(item.createdAt)}`}{item.completedAt && ` · เสร็จ ${checklistDate(item.completedAt)}`}</small>
                        {canEditItem && editingChecklistId !== item.id && <span className="workspace-checklist-actions"><Button size="sm" variant="link" onClick={() => { setEditingChecklistId(item.id); setEditingChecklistTitle(item.title); }}>แก้ไข</Button><Button size="sm" variant="link" className="text-danger" onClick={() => { setPendingChecklistDelete(item.id); setConfirmAction('delete_checklist'); }}>ลบ</Button></span>}
                      </li>;
                    })}
                  </ul>
                )}
                {!isReviewLocked && (isOwner || String(actorId) === String(task.assigneeId) || (task.collaborators || []).some((id) => String(id) === String(actorId)) || String(actorId) === String(task.reviewerId) || (project?.teamMemberIds || []).some((id) => String(id) === String(actorId))) && <Form onSubmit={addChecklistItem} className="workspace-inline-form"><Form.Control aria-label="เพิ่มรายการ Checklist" value={checklistTitle} onChange={(event) => setChecklistTitle(event.target.value)} placeholder="เพิ่มรายการตรวจสอบ" /><Button type="submit" aria-label="เพิ่ม Checklist"><Plus size={16} /></Button></Form>}
                <p className="workspace-muted-copy">Checklist เสร็จครบแล้วก็ยังต้องส่งงานตรวจด้วยตนเอง</p>
              </section>

              {canManageAssignment && (
                <section className="workspace-task-section" aria-labelledby="task-assignment-title">
                  <div className="workspace-task-section-heading"><h3 id="task-assignment-title">เปลี่ยนผู้รับผิดชอบหลัก</h3></div>
                  <Form.Select aria-label="ผู้รับผิดชอบใหม่" value={nextAssigneeId} onChange={(event) => setNextAssigneeId(event.target.value)}>
                    <option value="">เลือกสมาชิก</option>
                    {projectMembers.filter((person) => String(person.id) !== String(task.assigneeId)).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                  </Form.Select>
                  <Form.Control className="mt-2" aria-label="เหตุผลการเปลี่ยนผู้รับผิดชอบ" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="ระบุเหตุผลที่ต้องเปลี่ยน" />
                  <Button className="mt-2" size="sm" variant="outline-primary" disabled={!nextAssigneeId || !reason.trim()} onClick={() => setConfirmAction('reassign')}>บันทึกการเปลี่ยน</Button>
                </section>
              )}

              {task.status === 'pending_review' && <section className="workspace-task-section" aria-labelledby="task-review-title"><div className="workspace-task-section-heading"><h3 id="task-review-title">การตรวจงาน</h3></div><p className="workspace-muted-copy">ผู้ตรวจ: {employee(task.reviewerId)?.name || 'ไม่ระบุ'} · ส่งเมื่อ {task.reviewSubmittedAt ? new Date(task.reviewSubmittedAt).toLocaleString('th-TH') : 'ไม่ระบุ'}</p>{task.reviewLastReason && <Alert variant="info" className="mb-2">เหตุผลล่าสุด: {task.reviewLastReason}</Alert>}</section>}

              {(canReview || canWithdraw) && <Form.Group className="workspace-task-section"><Form.Label htmlFor="task-review-reason">เหตุผล (จำเป็นสำหรับขอแก้ไขหรือถอนงาน)</Form.Label><Form.Control id="task-review-reason" as="textarea" rows={2} value={reason} onChange={(event) => setReason(event.target.value)} /></Form.Group>}
              {error && <Alert variant="danger" role="alert">{error}</Alert>}
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="project-task-detail-footer">
          {projectId && task.status !== 'pending_review' && task.status !== 'completed' && onEdit && <Button variant="outline-primary" onClick={() => onEdit(task)}>แก้ไขงาน</Button>}
          {projectId && task.status !== 'pending_review' && <Button variant="outline-danger" onClick={() => setConfirmAction('delete')}><Trash2 size={14} /> ลบงาน</Button>}
          {canSubmitReview && <Button onClick={() => setConfirmAction('submit')}>ส่งตรวจ</Button>}
          {canReview && <><Button variant="success" onClick={() => setConfirmAction('approve')}>อนุมัติ</Button><Button variant="outline-warning" disabled={!reason.trim()} onClick={() => setConfirmAction('request_changes')}>ขอแก้ไข</Button></>}
          {canWithdraw && <Button variant="outline-secondary" disabled={!reason.trim()} onClick={() => setConfirmAction('withdraw')}>ถอนจากการตรวจ</Button>}
          <Button variant="outline-secondary" onClick={onClose}>ปิดหน้าต่าง</Button>
        </Modal.Footer>
      </Modal>

      {confirmAction && <Modal show centered className="mecha-confirm-modal" onHide={() => setConfirmAction('')}><Modal.Header closeButton><Modal.Title>ยืนยันการดำเนินการ</Modal.Title></Modal.Header><Modal.Body>{actionDescription}{confirmAction === 'delete' && <p className="mt-2 mb-0">เมื่อลบแล้ว งานจะถูกนำออกจาก Workspace นี้</p>}{error && <Alert variant="danger" className="mt-2">{error}</Alert>}</Modal.Body><Modal.Footer><Button variant="outline-secondary" onClick={() => setConfirmAction('')}>ยกเลิก</Button><Button variant={confirmAction === 'delete' ? 'danger' : 'primary'} onClick={runConfirmedAction}>ยืนยัน</Button></Modal.Footer></Modal>}
    </>
  );
}
