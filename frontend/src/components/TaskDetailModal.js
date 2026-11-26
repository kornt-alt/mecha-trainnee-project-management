// frontend/src/components/TaskDetailModal.js — แผงรายละเอียดงานใน Project Workspace (แผงเดียวครบ: ปุ่ม เช็กลิสต์ ความคิดเห็น ระยะเวลา ประวัติ)
// ข้อมูลสำหรับผู้บริหารเก็บจากการกดปุ่มปกติ: ระยะเวลาแต่ละสถานะจับเองจาก statusHistory · ปุ่ม "แจ้งติดปัญหา" ตั้ง task.blocked
// (ไม่มีการกรอกชั่วโมงทำงานแล้ว)
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import { currentEmployees } from '../data/employeeStore';
import { useMockData } from '../context/MockDataContext';
import { TaskBlockedBadge, TaskPriorityBadge, TaskStatusBadge, workspaceLabelColor as getWorkspaceLabelColor } from './TaskBadges';
import { Plus, Trash2 } from './common/Icons';
import { checklistProgressPercent } from '../utils/projectTrackingUtils';
import { formatDuration, statusDurations } from '../utils/executiveMetrics';
import { taskSizeLabel, taskStatusLabel } from '../utils/labels';
import { attachmentService } from '../utils/attachmentService';

const employee = (id) => currentEmployees().find((item) => String(item.id) === String(id));
const checklistDate = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleString('th-TH') : '';
};

export default function TaskDetailModal({
  task: selectedTask,
  onClose,
  projectId,
  onEdit,
  initialAction = '',
  onClearInitialAction,
  workEntries = { comments: [] },
  onAddComment,
  actorId: workspaceActorId,
}) {
  const {
    projects, tasks, labels, activity, actorId: contextActorId, updateTask, deleteTask,
    access,
  } = useMockData();
  const actorId = workspaceActorId ?? contextActorId;
  const [checklistTitle, setChecklistTitle] = useState('');
  const [notice, setNotice] = useState(''); // แจ้งผลหลังกดเริ่มงาน / ส่งตรวจ (ไม่มีแผงยืนยันแล้ว)
  const [editingChecklistId, setEditingChecklistId] = useState(null);
  const [editingChecklistTitle, setEditingChecklistTitle] = useState('');
  const [pendingChecklistDelete, setPendingChecklistDelete] = useState(null);
  const [reason, setReason] = useState('');
  const [nextAssigneeId, setNextAssigneeId] = useState('');
  const [confirmAction, setConfirmAction] = useState('');
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const task = selectedTask ? tasks.find((item) => String(item.id) === String(selectedTask.id)
    && (projectId == null || String(item.projectId) === String(projectId))) : null;
  const resolvedProjectId = projectId ?? task?.projectId;
  const project = projects.find((item) => String(item.id) === String(resolvedProjectId));
  const ownerId = project?.managerId;
  const teamLeadId = project?.teamLeadId;
  // ADMIN / Management ในขอบเขต = สิทธิ์เท่า Owner (utils/access.js)
  const isOwner = String(actorId) === String(ownerId) || Boolean(project && access.ownsByScope(project));
  const isTeamLead = String(actorId) === String(teamLeadId);
  const isReviewLocked = task?.status === 'pending_review';
  const isTaskLocked = ['pending_review', 'completed'].includes(task?.status);
  const canManageAssignment = Boolean(resolvedProjectId && (isOwner || isTeamLead) && !isReviewLocked && task?.status !== 'completed');
  const canEditTask = Boolean(resolvedProjectId && !isReviewLocked && task?.status !== 'completed' && (
    isOwner || isTeamLead || String(actorId) === String(task?.assigneeId)
  ));
  const canDeleteTask = Boolean(resolvedProjectId && !isReviewLocked && (
    isOwner || isTeamLead || String(actorId) === String(task?.createdBy)
  ));
  const canStart = Boolean(task?.status === 'not_started' && (String(actorId) === String(task?.assigneeId)
    || (task?.collaborators || []).some((id) => String(id) === String(actorId))));
  const canSubmitReview = Boolean(resolvedProjectId && task?.status === 'in_progress' && task?.reviewerId
    && (String(actorId) === String(task?.assigneeId) || (task?.collaborators || []).some((id) => String(id) === String(actorId))));
  // งานตรวจเอง (ผู้ตรวจ = ผู้รับผิดชอบ): ไม่มีขั้นรอตรวจ — ปุ่ม "ทำเสร็จ" แทน "ส่งตรวจ"
  const isSelfReview = Boolean(task?.assigneeId) && String(task?.reviewerId) === String(task?.assigneeId);
  const canSelfComplete = Boolean(resolvedProjectId && isSelfReview && task?.status === 'in_progress'
    && (String(actorId) === String(task?.assigneeId) || isOwner || isTeamLead));
  const canReview = Boolean(resolvedProjectId && isReviewLocked && String(actorId) === String(task?.reviewerId));
  // แจ้งติดปัญหา: คนในงาน + Owner / Team Lead · งานรอตรวจ / เสร็จแล้วแจ้งไม่ได้ (งานถูกล็อก)
  const canFlagBlocked = Boolean(resolvedProjectId && !isTaskLocked && (
    isOwner || isTeamLead || String(actorId) === String(task?.assigneeId)
    || (task?.collaborators || []).some((id) => String(id) === String(actorId))
  ));
  const canWithdraw = Boolean(resolvedProjectId && isReviewLocked && (
    String(actorId) === String(task?.reviewSubmittedBy) || isOwner || isTeamLead
  ));
  const projectMembers = useMemo(() => {
    const ids = new Set([...(project?.teamMemberIds || []).map(String), String(ownerId || ''), String(teamLeadId || ''), String(task?.assigneeId || '')]);
    // บัญชีที่ปิดเลือกเป็นผู้รับผิดชอบใหม่ไม่ได้ (ผู้รับผิดชอบปัจจุบันยังแสดง)
    return currentEmployees().filter((person) => ids.has(String(person.id)) && (person.isActive !== false || String(person.id) === String(task?.assigneeId)));
  }, [project, ownerId, teamLeadId, task?.assigneeId]);

  useEffect(() => {
    setChecklistTitle('');
    setEditingChecklistId(null);
    setEditingChecklistTitle('');
    setPendingChecklistDelete(null);
    setReason('');
    setNextAssigneeId('');
    setConfirmAction(initialAction || '');
    setError('');
    setCommentText('');
    return () => attachmentService.cleanupAttachmentService();
  }, [selectedTask?.id, initialAction]);

  // Render one attachment row in the read-only task detail panel.
  const renderDetailAttachmentRow = (attachment) => {
    const content = attachmentService.getAttachmentContent(attachment.id);
    const available = Boolean(content && content.status === 'available' && content.file);
    return (
      <span key={attachment.id} className="workspace-attachment-row">
        <span>
          <span aria-hidden="true">⌁</span>
          <b>{attachment.name}</b>
          <small>{attachment.category || attachment.type || 'ไฟล์'}</small>
          {available && <small className="workspace-attachment-size"> · {attachmentService.formatFileSize(content.file.size)}</small>}
          {!available && <span className="workspace-attachment-unavailable">ไม่มีเนื้อหา</span>}
        </span>
        {available && (
          <span className="workspace-attachment-row-controls">
            <button type="button" aria-label={`ตัวอย่าง ${attachment.name}`} title="ตัวอย่างไฟล์" onClick={() => { const url = attachmentService.getAttachmentObjectUrl(attachment.id); if (url) window.open(url, '_blank'); }}>ตัวอย่าง</button>
            <button type="button" aria-label={`ดาวน์โหลด ${attachment.name}`} title="ดาวน์โหลดไฟล์" onClick={() => attachmentService.downloadAttachment(attachment.id)}>ดาวน์โหลด</button>
          </span>
        )}
      </span>
    );
  };

  if (!task) return null;

  const update = (patch, event) => {
    const result = updateTask(task.id, patch, event && {
      taskId: task.id,
      description: event.description,
      type: event.type,
      reason: event.reason,
    });
    if (!result) setError('ดำเนินการไม่สำเร็จ กรุณาตรวจสอบสิทธิ์และข้อมูลของงาน');
    return result;
  };

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
      createdBy: actorId, ownerId: actorId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const result = update({ checklist: [...(task.checklist || []), item] }, {
      type: 'checklist_created', description: `เพิ่มรายการตรวจสอบ “${title}” ในงาน “${task.title}”`,
    });
    if (result) setChecklistTitle('');
  };

  const toggleChecklistItem = (item) => {
    if (isReviewLocked) return;
    const canEdit = isOwner || String(item.ownerId || item.createdBy) === String(actorId);
    if (!canEdit) return;
    const completed = !item.completed;
    update({ checklist: task.checklist.map((entry) => entry.id === item.id ? {
      ...entry, completed, updatedAt: new Date().toISOString(), completedBy: completed ? actorId : null,
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

  // UX-06: เริ่มงาน / ส่งตรวจ ย้อนได้ (เปิดกลับ / ถอนจากการตรวจ) จึงกดแล้วทำทันที ไม่ถามยืนยัน
  // อนุมัติ (ล็อกงานถาวร) / ลบ / action ที่ต้องมีเหตุผล ยังเปิดแผงยืนยันก่อน — เรียกผ่าน runAction() เหมือนกัน
  const runAction = (action = confirmAction) => {
    setError('');
    const stamp = new Date().toISOString();
    const reviewHistory = [...(task.reviewHistory || [])];
    if (action === 'start') {
      if (!canStart) return setError('เฉพาะผู้รับผิดชอบหลักหรือผู้ร่วมงานเท่านั้นที่เริ่มงานได้');
      update({ status: 'in_progress', progress: Math.max(1, Number(task.progress) || 0) }, {
        type: 'task_started', description: `เริ่มทำงาน “${task.title}”`,
      });
    } else if (action === 'submit') {
      if (!canSubmitReview) return setError('ผู้รับผิดชอบหลักหรือผู้ร่วมงานเท่านั้นที่ส่งงานตรวจได้');
      if (!task.reviewerId) return setError('กรุณากำหนดผู้ตรวจงานก่อนส่งตรวจ');
      reviewHistory.push({ action: 'submitted', actorId, reviewerId: task.reviewerId, timestamp: stamp });
      // ส่งตรวจแล้วถือว่าปัญหาที่แจ้งไว้จบแล้ว (blocked: null)
      const submitted = update({ status: 'pending_review', reviewSubmittedBy: actorId, reviewSubmittedAt: stamp, reviewHistory, blocked: null }, {
        type: 'task_review_submitted', description: `ส่งงาน “${task.title}” ให้ ${employee(task.reviewerId)?.name || 'ผู้ตรวจ'} ตรวจ`,
      });
      if (!submitted) return;
    } else if (action === 'block') {
      if (!canFlagBlocked) return setError('คุณไม่มีสิทธิ์แจ้งปัญหาของงานนี้');
      const cleanReason = reason.trim();
      if (!update({ blocked: { reason: cleanReason, by: actorId, at: stamp } }, {
        type: 'task_blocked', description: `แจ้งว่างาน “${task.title}” ติดปัญหา${cleanReason ? `: ${cleanReason}` : ''}`, reason: cleanReason || undefined,
      })) return;
    } else if (action === 'unblock') {
      if (!canFlagBlocked) return setError('คุณไม่มีสิทธิ์แก้สถานะปัญหาของงานนี้');
      if (!update({ blocked: null }, { type: 'task_unblocked', description: `แก้ปัญหาของงาน “${task.title}” แล้ว` })) return;
    } else if (action === 'complete') {
      if (!canSelfComplete) return setError('เฉพาะผู้รับผิดชอบงาน (หรือ Owner / Team Lead) ที่กดทำเสร็จได้');
      reviewHistory.push({ action: 'submitted', actorId, reviewerId: task.reviewerId, timestamp: stamp }, { action: 'approved', actorId, reviewerId: task.reviewerId, timestamp: stamp });
      if (!update({ status: 'completed', progress: 100, completedAt: stamp, reviewApprovedBy: actorId, reviewApprovedAt: stamp, reviewHistory, blocked: null }, {
        type: 'task_completed_self_review', description: `ทำงาน “${task.title}” เสร็จ (ตรวจเอง)`,
      })) return;
    } else if (action === 'approve') {
      if (!canReview) return setError('เฉพาะผู้ตรวจงานที่กำหนดเท่านั้นที่อนุมัติได้');
      reviewHistory.push({ action: 'approved', actorId, reviewerId: task.reviewerId, timestamp: stamp });
      update({ status: 'completed', progress: 100, completedAt: stamp, reviewApprovedBy: actorId, reviewApprovedAt: stamp, reviewHistory }, {
        type: 'task_review_approved', description: `อนุมัติงาน “${task.title}”`,
      });
    } else if (action === 'request_changes' || action === 'withdraw') {
      const cleanReason = reason.trim();
      if (!cleanReason) return setError('กรุณาระบุเหตุผล');
      const requested = action === 'request_changes';
      if ((requested && !canReview) || (!requested && !canWithdraw)) return setError('คุณไม่มีสิทธิ์ดำเนินการกับสถานะตรวจงานนี้');
      reviewHistory.push({ action: requested ? 'changes_requested' : 'withdrawn', actorId, reviewerId: task.reviewerId, reason: cleanReason, timestamp: stamp });
      update({ status: 'in_progress', reviewHistory, reviewLastReason: cleanReason }, {
        type: requested ? 'task_changes_requested' : 'task_review_withdrawn',
        description: requested ? `ขอแก้ไขงาน “${task.title}”` : `ถอนงาน “${task.title}” ออกจากการตรวจ`, reason: cleanReason,
      });
    } else if (action === 'reassign') {
      const cleanReason = reason.trim();
      if (!nextAssigneeId || !cleanReason) return setError('เลือกผู้รับผิดชอบใหม่และระบุเหตุผล');
      if (!canManageAssignment || !projectMembers.some((person) => String(person.id) === String(nextAssigneeId)) || String(nextAssigneeId) === String(task.assigneeId)) return setError('เลือกสมาชิกโปรเจกต์คนอื่นและตรวจสอบสิทธิ์ก่อนบันทึก');
      const previousAssigneeId = task.assigneeId;
      update({ assigneeId: nextAssigneeId }, {
        type: 'task_assignee_changed', description: `เปลี่ยนผู้รับผิดชอบ “${task.title}” จาก ${employee(previousAssigneeId)?.name || previousAssigneeId} เป็น ${employee(nextAssigneeId)?.name || nextAssigneeId}`,
        reason: cleanReason,
      });
    } else if (action === 'delete') {
      if (!canDeleteTask || !deleteTask(task.id, { actorId, type: 'task_deleted', description: `ลบงาน “${task.title}”` })) {
        return setError('คุณไม่มีสิทธิ์ลบงานนี้ หรือไม่สามารถลบงานที่รอตรวจได้');
      }
      onClose();
    } else if (action === 'delete_checklist') {
      if (!pendingChecklistDelete) return setError('ไม่พบรายการตรวจสอบที่ต้องการลบ');
      const item = task.checklist.find((entry) => entry.id === pendingChecklistDelete);
      const canEdit = item && (isOwner || String(item.ownerId || item.createdBy) === String(actorId));
      if (!item || !canEdit || isReviewLocked) return setError('คุณไม่มีสิทธิ์ลบรายการตรวจสอบนี้');
      update({ checklist: task.checklist.filter((entry) => entry.id !== item.id) }, {
        type: 'checklist_deleted', description: `ลบรายการตรวจสอบ “${item.title}” จากงาน “${task.title}”`,
      });
      setPendingChecklistDelete(null);
    }
    if (action === 'start') setNotice('เริ่มงานแล้ว');
    if (action === 'submit') setNotice('ส่งตรวจแล้ว · ส่งผิดกด “ถอนจากการตรวจ” ได้');
    if (action === 'block') setNotice('แจ้งติดปัญหาแล้ว · หัวหน้าจะเห็นในหน้ารายงาน');
    if (action === 'unblock') setNotice('บันทึกว่าแก้ปัญหาแล้ว');
    setConfirmAction('');
    setReason('');
    setNextAssigneeId('');
    onClearInitialAction?.();
  };

  const addWorkspaceComment = (event) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    onAddComment?.(task.id, {
      id: `comment-${Date.now()}`,
      actorId,
      text,
      timestamp: new Date().toISOString(),
    });
    setCommentText('');
  };


  const actionDescription = {
    block: 'แจ้งว่างานนี้ติดปัญหา — Owner / Team Lead และหน้ารายงานจะเห็นทันที',
    start: 'เปลี่ยนสถานะงานเป็นกำลังทำ',
    submit: 'ส่งงานให้ผู้ตรวจที่ระบุไว้ และล็อกการแก้ไขระหว่างรอตรวจ',
    approve: 'อนุมัติงานและเปลี่ยนสถานะเป็นเสร็จแล้ว (แก้ไขต่อไม่ได้)',
    complete: 'ทำงานนี้เสร็จ (ตรวจเอง) — เปลี่ยนเป็นเสร็จแล้วทันที แก้ไขต่อไม่ได้',
    request_changes: 'ส่งงานกลับไปกำลังทำพร้อมเหตุผลที่ระบุ',
    withdraw: 'ถอนงานออกจากการตรวจและเปลี่ยนกลับเป็นกำลังทำ',
    reassign: 'บันทึกการเปลี่ยนผู้รับผิดชอบพร้อมเหตุผล',
    delete: `ลบ “${task.title}” ออกจากโปรเจกต์`,
    delete_checklist: 'ลบรายการตรวจสอบนี้ออกจากงาน',
  }[confirmAction];

  const checklistItems = Array.isArray(task.checklist) ? task.checklist : [];
  const checklistDone = checklistItems.filter((item) => item.completed).length;
  const checklistPercent = checklistProgressPercent(checklistItems);
  const workComments = workEntries.comments || [];
  // ระยะเวลาแต่ละสถานะ (null = งานเก่าที่ไม่มีประวัติสถานะ)
  const durations = statusDurations(task);
  const taskEvents = activity.filter((item) => String(item.taskId) === String(task.id)
    && String(item.projectId) === String(resolvedProjectId));
  const taskLockMessage = task.status === 'completed'
    ? 'งานเสร็จแล้ว แก้ไขเช็กลิสต์ไม่ได้'
    : 'งานถูกล็อกระหว่างรอตรวจ แก้ไขเช็กลิสต์ไม่ได้ จนกว่าจะอนุมัติหรือส่งกลับ';
  const taskHistoryBase = taskEvents.length ? taskEvents : [
    ...(task.reviewHistory || []).map((item) => ({
      actorId: item.actorId,
      description: item.action,
      timestamp: item.timestamp,
      reason: item.reason,
    })),
    ...(task.assignmentHistory || []).map((item) => ({
      actorId: item.actorId,
      description: `เปลี่ยนผู้รับผิดชอบจาก ${employee(item.previousAssigneeId)?.name || item.previousAssigneeId} เป็น ${employee(item.newAssigneeId)?.name || item.newAssigneeId}`,
      timestamp: item.timestamp,
      reason: item.reason,
    })),
  ].sort((left, right) => String(right.timestamp || '').localeCompare(String(left.timestamp || '')));
  const taskHistory = [...taskHistoryBase,
    ...workComments.map((comment) => ({ actorId: comment.actorId, description: `แสดงความคิดเห็นในงาน “${task.title}”`, timestamp: comment.timestamp })),
  ].sort((left, right) => String(right.timestamp || '').localeCompare(String(left.timestamp || '')));
  const assignee = employee(task.assigneeId);
  const reviewer = employee(task.reviewerId);
  const workspaceTaskActions = (
    <div className="workspace-task-actions">
      {notice && <Alert variant="success" className="workspace-task-notice w-100 py-2 mb-0" dismissible onClose={() => setNotice('')}>{notice}</Alert>}
      {canEditTask && onEdit && <Button variant="outline-primary" onClick={() => onEdit(task)}>แก้ไขงาน</Button>}
      {canStart && checklistItems.length === 0 && <Button variant="outline-primary" onClick={() => runAction('start')}>เริ่มงาน</Button>}
      {canDeleteTask && <Button variant="outline-danger" onClick={() => setConfirmAction('delete')}><Trash2 size={14} /> ลบงาน</Button>}
      {canSubmitReview && !isSelfReview && <Button onClick={() => runAction('submit')}>ส่งตรวจ</Button>}
      {canSelfComplete && <Button variant="success" onClick={() => setConfirmAction('complete')}>ทำเสร็จ</Button>}
      {canReview && <><Button variant="success" onClick={() => setConfirmAction('approve')}>อนุมัติ</Button><Button variant="outline-warning" onClick={() => setConfirmAction('request_changes')}>ขอแก้ไข</Button></>}
      {canWithdraw && <Button variant="outline-secondary" onClick={() => setConfirmAction('withdraw')}>ถอนจากการตรวจ</Button>}
      {canManageAssignment && <Button variant="outline-secondary" onClick={() => setConfirmAction('reassign')}>เปลี่ยนผู้รับผิดชอบ</Button>}
      {canFlagBlocked && (task.blocked
        ? <Button variant="outline-success" onClick={() => runAction('unblock')}>แก้ปัญหาแล้ว</Button>
        : <Button variant="outline-danger" onClick={() => setConfirmAction('block')}>แจ้งติดปัญหา</Button>)}
    </div>
  );
  const workspaceActionPanel = confirmAction && (
    <section className="workspace-task-action-panel" aria-label="ยืนยันการดำเนินการ">
      <strong>{actionDescription}</strong>
      {confirmAction === 'delete' && <p>เมื่อลบแล้ว งานจะถูกนำออกจาก Workspace นี้</p>}
      {confirmAction === 'reassign' && <Form.Select aria-label="ผู้รับผิดชอบใหม่" value={nextAssigneeId} onChange={(event) => setNextAssigneeId(event.target.value)}>
        <option value="">เลือกสมาชิก</option>
        {projectMembers.filter((person) => String(person.id) !== String(task.assigneeId)
          && String(person.id) !== String(task.reviewerId)).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
      </Form.Select>}
      {confirmAction === 'block' && <Form.Group>
        <Form.Label htmlFor="workspace-task-block-reason">ติดอะไร (ไม่บังคับ)</Form.Label>
        <Form.Control id="workspace-task-block-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} placeholder="เช่น รออะไหล่จากผู้ขาย" />
      </Form.Group>}
      {['request_changes', 'withdraw', 'reassign'].includes(confirmAction) && <Form.Group>
        <Form.Label htmlFor="workspace-task-action-reason">เหตุผล <span aria-hidden="true">*</span></Form.Label>
        <Form.Control id="workspace-task-action-reason" as="textarea" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="ระบุเหตุผล (จำเป็น)..." />
      </Form.Group>}
      {error && <Alert variant="danger" role="alert">{error}</Alert>}
      <div>
        <Button variant="outline-secondary" onClick={() => { setConfirmAction(''); setReason(''); setNextAssigneeId(''); setError(''); onClearInitialAction?.(); }}>ยกเลิก</Button>
        <Button variant={['delete', 'delete_checklist', 'block'].includes(confirmAction) ? 'danger' : 'primary'} disabled={((confirmAction === 'request_changes' || confirmAction === 'withdraw') && !reason.trim()) || (confirmAction === 'reassign' && (!nextAssigneeId || !reason.trim()))} onClick={() => runAction()}>ยืนยัน</Button>
      </div>
    </section>
  );
  const workspaceChecklist = (
    <section className="workspace-task-work-panel workspace-task-compact-checklist" aria-labelledby="workspace-task-checklist-heading">
      <div className="workspace-task-work-panel-heading"><h2 id="workspace-task-checklist-heading">เช็กลิสต์</h2><span>{checklistDone}/{checklistItems.length}</span></div>
      <div className="workspace-task-work-progress"><span style={{ width: `${checklistPercent}%` }} /></div>
      {checklistItems.length === 0 ? <p className="workspace-task-work-empty">ยังไม่มีรายการเช็กลิสต์ เพิ่มรายการแรกด้านล่าง</p> : (
        <ul className="workspace-checklist">
          {checklistItems.map((item) => {
            const canEditItem = !isTaskLocked && (isOwner || String(item.ownerId || item.createdBy) === String(actorId));
            return <li key={item.id}>
              {editingChecklistId === item.id
                ? <Form onSubmit={(event) => { event.preventDefault(); saveChecklistTitle(item); }} className="workspace-checklist-edit"><Form.Control autoFocus aria-label={`แก้ไขรายการ ${item.title}`} value={editingChecklistTitle} onChange={(event) => setEditingChecklistTitle(event.target.value)} /><Button size="sm" type="submit" disabled={!editingChecklistTitle.trim()}>บันทึก</Button><Button size="sm" type="button" variant="outline-secondary" onClick={() => setEditingChecklistId(null)}>ยกเลิก</Button></Form>
                : <Form.Check type="checkbox" label={item.title} checked={Boolean(item.completed)} disabled={!canEditItem} onChange={() => toggleChecklistItem(item)} />}
              <small>{canEditItem ? (isOwner ? 'Project Owner' : 'รายการของคุณ') : `เป็นของ ${employee(item.ownerId || item.createdBy)?.name || 'สมาชิกอื่น'}`}{item.completedAt && ` · เสร็จ ${checklistDate(item.completedAt)}`}</small>
              {canEditItem && editingChecklistId !== item.id && <span className="workspace-checklist-actions"><Button size="sm" variant="link" onClick={() => { setEditingChecklistId(item.id); setEditingChecklistTitle(item.title); }}>แก้ไข</Button><Button size="sm" variant="link" className="text-danger" onClick={() => { setPendingChecklistDelete(item.id); setConfirmAction('delete_checklist'); }}>ลบ</Button></span>}
            </li>;
          })}
        </ul>
      )}
      {!isTaskLocked && (isOwner || String(actorId) === String(task.assigneeId) || (task.collaborators || []).some((id) => String(id) === String(actorId)) || String(actorId) === String(task.reviewerId) || (project?.teamMemberIds || []).some((id) => String(id) === String(actorId))) && <Form onSubmit={addChecklistItem} className="workspace-inline-form"><Form.Control aria-label="เพิ่มรายการ Checklist" value={checklistTitle} onChange={(event) => setChecklistTitle(event.target.value)} placeholder="เพิ่มรายการย่อย..." /><Button type="submit" aria-label="เพิ่ม Checklist"><Plus size={16} /> เพิ่ม</Button></Form>}
      <p className="workspace-muted-copy">{isTaskLocked ? 'เช็กลิสต์ถูกล็อก' : `ติ๊กข้อแรกแล้วงานเริ่มเอง · ครบแล้วกด “${isSelfReview ? 'ทำเสร็จ' : 'ส่งตรวจ'}”`}</p>
    </section>
  );
  const initialsOf = (id) => employee(id)?.name?.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || '?';

  // แผงเดียวครบทุกอย่าง (เดิม 2 ชั้น: แผงข้าง → "เปิดหน้าทำงาน" ถึงเห็นความคิดเห็น / ระยะเวลา / ประวัติ)
  return (
    <aside className="workspace-task-detail" aria-label="รายละเอียดงาน">
      <div className="workspace-task-detail-heading">
        <div><span className="workspace-task-detail-badges"><TaskStatusBadge task={task} className="task-detail-status" /><TaskBlockedBadge task={task} /></span><h2>{task.title}</h2></div>
        <Button type="button" variant="link" className="workspace-task-detail-close" aria-label="ปิดรายละเอียดงาน" onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></Button>
      </div>
      <p className={`workspace-task-detail-description${task.description ? '' : ' is-empty'}`}>{task.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
      <dl className="workspace-task-detail-meta">
        <dt>ผู้รับผิดชอบหลัก</dt><dd>{assignee && <span className="project-detail-avatar" data-person-id={assignee.id} aria-hidden="true">{initialsOf(assignee.id)}</span>}{assignee?.name || 'ไม่ระบุ'}{assignee?.isActive === false && <span className="inactive-person-badge">ปิดบัญชี</span>}</dd>
        <dt>ผู้ร่วมงาน</dt><dd>{(task.collaborators || []).map((id) => employee(id)?.name).filter(Boolean).join(', ') || 'ไม่มี'}</dd>
        <dt>ผู้ตรวจ (Reviewer)</dt><dd>{isSelfReview ? 'ตรวจเอง' : reviewer?.name || 'ยังไม่ได้กำหนด'}</dd>
        <dt>กำหนด</dt><dd>{task.startDate || '—'}{task.dueDate ? ` – ${task.dueDate}` : ''}</dd>
        <dt>ขนาดงาน</dt><dd>{taskSizeLabel(task.size)}</dd>
        {task.priority && <><dt>ความสำคัญ</dt><dd><TaskPriorityBadge priority={task.priority} workspaceMode /></dd></>}
      </dl>
      {(task.labelIds || []).length > 0 && <div className="workspace-task-label-list">{task.labelIds.map((id) => labels.find((label) => String(label.id) === String(id))).filter(Boolean).map((label) => { const color = getWorkspaceLabelColor(label); return <span className="workspace-task-label" key={label.id} style={{ borderColor: color, color, backgroundColor: `${color}26` }}>{label.name}</span>; })}</div>}
      {task.attachments?.length > 0 && <div className="workspace-task-detail-files"><strong>ไฟล์แนบ</strong>{task.attachments.map(renderDetailAttachmentRow)}</div>}
      {task.blocked && task.status !== 'completed' && <Alert variant="danger" className="py-2 mb-0 small">ติดปัญหา{task.blocked.reason ? `: ${task.blocked.reason}` : ''} · แจ้งโดย {employee(task.blocked.by)?.name || 'ไม่ระบุ'}</Alert>}
      {task.status === 'in_progress' && task.reviewLastReason && <Alert variant="warning" className="py-2 mb-0 small">ถูกส่งกลับ: {task.reviewLastReason}</Alert>}
      {isTaskLocked && <div className="workspace-task-work-lock">{taskLockMessage}</div>}
      {workspaceActionPanel}
      {!confirmAction && workspaceTaskActions}
      {workspaceChecklist}

      <section className="workspace-task-work-panel workspace-task-compact-checklist" aria-labelledby="workspace-task-comments-heading">
        <div className="workspace-task-work-panel-heading"><h2 id="workspace-task-comments-heading">ความคิดเห็น · {workComments.length}</h2></div>
        {workComments.length > 0 && <div className="workspace-task-comments">{workComments.map((comment) => <article key={comment.id}><span className="project-detail-avatar" data-person-id={comment.actorId} aria-hidden="true">{initialsOf(comment.actorId)}</span><div><strong>{employee(comment.actorId)?.name || 'ผู้ใช้งาน'} <small>· {checklistDate(comment.timestamp)}</small></strong><p>{comment.text}</p></div></article>)}</div>}
        <Form onSubmit={addWorkspaceComment} className="workspace-task-comment-form"><Form.Control id="workspace-task-comment" as="textarea" rows={2} aria-label="เขียนความคิดเห็น" value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="อัปเดตความคืบหน้า ถามคำถาม หรือแจ้งปัญหา..." /><Button type="submit" disabled={!commentText.trim()}>ส่งความคิดเห็น</Button></Form>
      </section>

      {/* ระยะเวลาแต่ละสถานะ — ระบบจับเองตอนเปลี่ยนสถานะ ไม่ต้องกรอก · สรุปเวลารวมเมื่องานเสร็จ */}
      <section className="workspace-task-work-panel workspace-task-compact-checklist" aria-labelledby="workspace-task-time-heading">
        <div className="workspace-task-work-panel-heading"><h2 id="workspace-task-time-heading">ระยะเวลาแต่ละสถานะ</h2>{durations && <span>{durations.finished ? `รวม ${formatDuration(durations.total)}` : 'ยังไม่เสร็จ'}</span>}</div>
        {!durations ? <p className="workspace-task-work-empty">งานนี้สร้างก่อนเริ่มเก็บประวัติสถานะ จึงไม่มีข้อมูลระยะเวลา</p> : (
          <dl className="workspace-task-durations">
            {['not_started', 'in_progress', 'pending_review'].map((status) => (
              <div key={status} className={!durations.finished && durations.currentStatus === status ? 'is-current' : ''}>
                <dt>{taskStatusLabel(status)}</dt>
                <dd>{formatDuration(durations.segments[status])}{!durations.finished && durations.currentStatus === status ? ' (ตอนนี้)' : ''}</dd>
              </div>
            ))}
            {durations.reviewRounds > 1 && <div><dt>ส่งตรวจ</dt><dd>{durations.reviewRounds} รอบ</dd></div>}
          </dl>
        )}
        {durations && !durations.finished && <p className="workspace-muted-copy mb-0">สรุปเวลารวมจะแสดงเมื่องานผ่านการตรวจ</p>}
      </section>

      <details className="workspace-task-work-panel workspace-task-compact-checklist workspace-task-history-panel">
        <summary><h2 id="workspace-task-history-heading">ประวัติของงานนี้ · {taskHistory.length}</h2></summary>
        {taskHistory.length ? <ul className="workspace-task-history workspace-history-scroll">{taskHistory.map((entry, index) => <li key={`${entry.type || entry.action || 'event'}-${entry.timestamp || index}-${index}`}><span className="project-detail-avatar" data-person-id={entry.actorId} aria-hidden="true">{initialsOf(entry.actorId)}</span><span><strong>{entry.description || entry.action || 'อัปเดตงาน'}</strong><small>{employee(entry.actorId)?.name || entry.actorId || 'ผู้ใช้งาน'} · {checklistDate(entry.timestamp)}{entry.reason ? ` · ${entry.reason}` : ''}</small></span></li>)}</ul> : <p className="workspace-task-work-empty">ยังไม่มีประวัติ</p>}
      </details>
    </aside>
  );
}
