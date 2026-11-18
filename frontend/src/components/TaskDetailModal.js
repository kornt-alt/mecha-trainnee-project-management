// Shared Task Detail modal with optional Project Workspace workflows.
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Modal, ProgressBar } from 'react-bootstrap';
import { MOCK_EMPLOYEES } from '../data/mockData';
import { useMockData } from '../context/MockDataContext';
import { TaskPriorityBadge, TaskStatusBadge, WORKSPACE_AVATAR_COLORS, WORKSPACE_LABEL_PALETTE, workspaceLabelColor as getWorkspaceLabelColor } from './TaskBadges';
import { Folder, Plus, Trash2 } from './common/Icons';
import { checklistProgressPercent } from '../utils/projectTrackingUtils';

const employee = (id) => MOCK_EMPLOYEES.find((item) => String(item.id) === String(id));
const labelForStatus = { not_started: 'รอเริ่มทำ', in_progress: 'กำลังดำเนินการ', pending_review: 'รอการตรวจสอบ', completed: 'เสร็จสิ้น' };
const checklistDate = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleString('th-TH') : '';
};

export default function TaskDetailModal({
  task: selectedTask,
  onClose,
  projectId,
  onEdit,
  panelMode = false,
  panelContainer,
  workspaceMode = false,
  workPage = false,
  onOpenWork,
  onCloseWork,
  initialAction = '',
  onClearInitialAction,
  workEntries = { comments: [], timeLogs: [] },
  onAddComment,
  onAddTimeLog,
  actorId: workspaceActorId,
}) {
  const {
    projects, tasks, labels, activity, actorId: contextActorId, updateTask, deleteTask, createLabel,
  } = useMockData();
  const actorId = workspaceActorId ?? contextActorId;
  const [checklistTitle, setChecklistTitle] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState(null);
  const [editingChecklistTitle, setEditingChecklistTitle] = useState('');
  const [pendingChecklistDelete, setPendingChecklistDelete] = useState(null);
  const [reason, setReason] = useState('');
  const [nextAssigneeId, setNextAssigneeId] = useState('');
  const [confirmAction, setConfirmAction] = useState('');
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [timeHours, setTimeHours] = useState('');
  const [timeNote, setTimeNote] = useState('');
  const [workspaceDetails, setWorkspaceDetails] = useState(() => ({
    priority: selectedTask?.priority === 'normal' ? 'medium' : selectedTask?.priority || 'none',
    startDate: selectedTask?.startDate || '',
    dueDate: selectedTask?.dueDate || '',
    collaborators: [...new Set((selectedTask?.collaborators || []).map(String))],
    labelIds: [...new Set((selectedTask?.labelIds || []).map(String))],
    attachments: (selectedTask?.attachments || []).map((item) => ({ ...item })),
  }));
  const [workspaceLabelName, setWorkspaceLabelName] = useState('');
  const [workspaceLabelColor, setWorkspaceLabelColor] = useState(() => WORKSPACE_LABEL_PALETTE[labels.length % WORKSPACE_LABEL_PALETTE.length]);
  const [workspaceDetailsError, setWorkspaceDetailsError] = useState('');
  const task = selectedTask ? tasks.find((item) => String(item.id) === String(selectedTask.id)
    && (!workspaceMode || projectId == null || String(item.projectId) === String(projectId))) : null;
  const resolvedProjectId = projectId ?? task?.projectId;
  const project = projects.find((item) => String(item.id) === String(resolvedProjectId));
  const ownerId = project?.managerId;
  const teamLeadId = project?.teamLeadId;
  const isOwner = String(actorId) === String(ownerId);
  const isTeamLead = String(actorId) === String(teamLeadId);
  const isReviewLocked = task?.status === 'pending_review';
  const isTaskLocked = ['pending_review', 'completed'].includes(task?.status);
  const canManageAssignment = Boolean(resolvedProjectId && (isOwner || isTeamLead) && !isReviewLocked && task?.status !== 'completed');
  const canEditTask = Boolean(resolvedProjectId && !isReviewLocked && task?.status !== 'completed' && (
    isOwner || isTeamLead || String(actorId) === String(task?.assigneeId)
    || (!workspaceMode && (task?.collaborators || []).some((id) => String(id) === String(actorId)))
  ));
  const canDeleteTask = Boolean(resolvedProjectId && !isReviewLocked && (
    isOwner || isTeamLead || String(actorId) === String(task?.createdBy)
  ));
  const canStart = Boolean(task?.status === 'not_started' && (String(actorId) === String(task?.assigneeId)
    || (task?.collaborators || []).some((id) => String(id) === String(actorId))));
  const canSubmitReview = Boolean(resolvedProjectId && task?.status === 'in_progress' && task?.reviewerId
    && (String(actorId) === String(task?.assigneeId) || (task?.collaborators || []).some((id) => String(id) === String(actorId))));
  const canReview = Boolean(resolvedProjectId && isReviewLocked && String(actorId) === String(task?.reviewerId));
  const canWithdraw = Boolean(resolvedProjectId && isReviewLocked && (
    String(actorId) === String(task?.reviewSubmittedBy) || isOwner || isTeamLead
  ));
  const projectMembers = useMemo(() => {
    const ids = new Set([...(project?.teamMemberIds || []).map(String), String(ownerId || ''), String(teamLeadId || ''), String(task?.assigneeId || '')]);
    return MOCK_EMPLOYEES.filter((person) => ids.has(String(person.id)));
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
    setTimeHours('');
    setTimeNote('');
  }, [selectedTask?.id, initialAction]);

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

  const runConfirmedAction = () => {
    setError('');
    const stamp = new Date().toISOString();
    const reviewHistory = [...(task.reviewHistory || [])];
    if (confirmAction === 'start') {
      if (!canStart) return setError('เฉพาะผู้รับผิดชอบหลักหรือผู้ร่วมงานเท่านั้นที่เริ่มงานได้');
      update({ status: 'in_progress', statusLabel: labelForStatus.in_progress, progress: Math.max(1, Number(task.progress) || 0) }, {
        type: 'task_started', description: `เริ่มทำงาน “${task.title}”`,
      });
    } else if (confirmAction === 'submit') {
      if (!canSubmitReview) return setError('ผู้รับผิดชอบหลักหรือผู้ร่วมงานเท่านั้นที่ส่งงานตรวจได้');
      if (!task.reviewerId) return setError('กรุณากำหนดผู้ตรวจงานก่อนส่งตรวจ');
      reviewHistory.push({ action: 'submitted', actorId, reviewerId: task.reviewerId, timestamp: stamp });
      update({ status: 'pending_review', statusLabel: labelForStatus.pending_review, reviewSubmittedBy: actorId, reviewSubmittedAt: stamp, reviewHistory }, {
        type: 'task_review_submitted', description: `ส่งงาน “${task.title}” ให้ ${employee(task.reviewerId)?.name || 'ผู้ตรวจ'} ตรวจ`,
      });
    } else if (confirmAction === 'approve') {
      if (!canReview) return setError('เฉพาะผู้ตรวจงานที่กำหนดเท่านั้นที่อนุมัติได้');
      reviewHistory.push({ action: 'approved', actorId, reviewerId: task.reviewerId, timestamp: stamp });
      update({ status: 'completed', statusLabel: labelForStatus.completed, progress: 100, completedAt: stamp, reviewApprovedBy: actorId, reviewApprovedAt: stamp, reviewHistory }, {
        type: 'task_review_approved', description: `อนุมัติงาน “${task.title}”`,
      });
    } else if (confirmAction === 'request_changes' || confirmAction === 'withdraw') {
      const cleanReason = reason.trim();
      if (!cleanReason) return setError('กรุณาระบุเหตุผล');
      const requested = confirmAction === 'request_changes';
      if ((requested && !canReview) || (!requested && !canWithdraw)) return setError('คุณไม่มีสิทธิ์ดำเนินการกับสถานะตรวจงานนี้');
      reviewHistory.push({ action: requested ? 'changes_requested' : 'withdrawn', actorId, reviewerId: task.reviewerId, reason: cleanReason, timestamp: stamp });
      update({ status: 'in_progress', statusLabel: labelForStatus.in_progress, reviewHistory, reviewLastReason: cleanReason }, {
        type: requested ? 'task_changes_requested' : 'task_review_withdrawn',
        description: requested ? `ขอแก้ไขงาน “${task.title}”` : `ถอนงาน “${task.title}” ออกจากการตรวจ`, reason: cleanReason,
      });
    } else if (confirmAction === 'reassign') {
      const cleanReason = reason.trim();
      if (!nextAssigneeId || !cleanReason) return setError('เลือกผู้รับผิดชอบใหม่และระบุเหตุผล');
      if (!canManageAssignment || !projectMembers.some((person) => String(person.id) === String(nextAssigneeId)) || String(nextAssigneeId) === String(task.assigneeId)) return setError('เลือกสมาชิกโปรเจกต์คนอื่นและตรวจสอบสิทธิ์ก่อนบันทึก');
      const previousAssigneeId = task.assigneeId;
      update({ assigneeId: nextAssigneeId }, {
        type: 'task_assignee_changed', description: `เปลี่ยนผู้รับผิดชอบ “${task.title}” จาก ${employee(previousAssigneeId)?.name || previousAssigneeId} เป็น ${employee(nextAssigneeId)?.name || nextAssigneeId}`,
        reason: cleanReason,
      });
    } else if (confirmAction === 'delete') {
      if (!canDeleteTask || !deleteTask(task.id, { actorId, type: 'task_deleted', description: `ลบงาน “${task.title}”` })) {
        return setError('คุณไม่มีสิทธิ์ลบงานนี้ หรือไม่สามารถลบงานที่รอตรวจได้');
      }
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

  const addWorkspaceTimeLog = (event) => {
    event.preventDefault();
    const hours = Number(timeHours);
    const note = timeNote.trim();
    if (!(hours > 0) || !note) return;
    onAddTimeLog?.(task.id, {
      id: `time-${Date.now()}`,
      actorId,
      hours,
      note,
      timestamp: new Date().toISOString(),
    });
    setTimeHours('');
    setTimeNote('');
  };

  const toggleWorkspaceCollaborator = (employeeId) => {
    setWorkspaceDetails((previous) => {
      const selected = previous.collaborators.includes(String(employeeId));
      const collaborators = selected
        ? previous.collaborators.filter((id) => id !== String(employeeId))
        : [...new Set([...previous.collaborators, String(employeeId)])];
      return { ...previous, collaborators };
    });
  };

  const toggleWorkspaceLabel = (labelId) => {
    setWorkspaceDetails((previous) => {
      const selected = previous.labelIds.includes(String(labelId));
      const labelIds = selected
        ? previous.labelIds.filter((id) => id !== String(labelId))
        : [...new Set([...previous.labelIds, String(labelId)])];
      return { ...previous, labelIds };
    });
  };

  const createAndAttachWorkspaceLabel = () => {
    const name = workspaceLabelName.trim();
    if (!name || !canEditTask || isTaskLocked) return;
    const existing = labels.find((label) => label.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase());
    const label = existing || createLabel({ name, color: workspaceLabelColor });
    if (!label) return setWorkspaceDetailsError('สร้างป้ายกำกับไม่สำเร็จ');
    setWorkspaceDetails((previous) => ({ ...previous, labelIds: [...new Set([...previous.labelIds, String(label.id)])] }));
    setWorkspaceLabelName('');
    if (!existing) setWorkspaceLabelColor(WORKSPACE_LABEL_PALETTE[(labels.length + 1) % WORKSPACE_LABEL_PALETTE.length]);
    setWorkspaceDetailsError('');
  };

  const addWorkspaceQuickAttachment = (name) => {
    setWorkspaceDetails((previous) => ({
      ...previous,
      attachments: [...previous.attachments, {
        id: `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        type: 'text/uri-list',
        size: 0,
        category: 'ลิงก์เอกสาร',
        addedAt: new Date().toISOString(),
      }],
    }));
  };

  const addWorkspaceFiles = (event) => {
    const files = Array.from(event.target.files || []).map((file) => ({
      id: `attachment-${Date.now()}-${file.lastModified}-${file.name}`,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      category: 'ไฟล์',
      addedAt: new Date().toISOString(),
    }));
    if (files.length) setWorkspaceDetails((previous) => ({ ...previous, attachments: [...previous.attachments, ...files] }));
    event.target.value = '';
  };

  const workspaceDetailsDateInvalid = !workspaceDetails.dueDate || Boolean(workspaceDetails.startDate
    && workspaceDetails.dueDate < workspaceDetails.startDate);
  const normalizedTaskDetails = {
    priority: task?.priority === 'normal' ? 'medium' : task?.priority || 'none',
    startDate: task?.startDate || '',
    dueDate: task?.dueDate || '',
    collaborators: [...new Set((task?.collaborators || []).map(String))],
    labelIds: [...new Set((task?.labelIds || []).map(String))],
    attachments: task?.attachments || [],
  };
  const workspaceDetailsChanged = Boolean(task && (
    workspaceDetails.priority !== normalizedTaskDetails.priority
    || workspaceDetails.startDate !== normalizedTaskDetails.startDate
    || workspaceDetails.dueDate !== normalizedTaskDetails.dueDate
    || JSON.stringify([...workspaceDetails.collaborators].sort()) !== JSON.stringify([...normalizedTaskDetails.collaborators].sort())
    || JSON.stringify([...workspaceDetails.labelIds].sort()) !== JSON.stringify([...normalizedTaskDetails.labelIds].sort())
    || JSON.stringify(workspaceDetails.attachments) !== JSON.stringify(normalizedTaskDetails.attachments)
  ));
  const saveWorkspaceTaskDetails = () => {
    if (!task || !canEditTask || isTaskLocked) return;
    if (workspaceDetailsDateInvalid) {
      setWorkspaceDetailsError(workspaceDetails.dueDate ? 'วันกำหนดส่งต้องไม่อยู่ก่อนวันเริ่ม' : 'กรุณากำหนดวันส่ง');
      return;
    }
    const collaborators = [...new Set(workspaceDetails.collaborators.map(String))]
      .filter((id) => id !== String(task.assigneeId));
    const contributorIds = new Set([String(task.assigneeId), ...collaborators]);
    const patch = {
      priority: workspaceDetails.priority,
      startDate: workspaceDetails.startDate,
      dueDate: workspaceDetails.dueDate,
      collaborators,
      plannedAllocations: (task.plannedAllocations || []).filter((item) => contributorIds.has(String(item.employeeId))),
      labelIds: [...new Set(workspaceDetails.labelIds.map(String))],
      attachments: workspaceDetails.attachments.map((item) => ({ ...item })),
    };
    const result = update(patch, {
      type: 'workspace_task_details_updated',
      description: `แก้ไขรายละเอียดงาน “${task.title}”`,
    });
    if (!result) {
      setWorkspaceDetailsError('บันทึกรายละเอียดไม่สำเร็จ กรุณาตรวจสอบสิทธิ์และข้อมูล');
      return;
    }
    setWorkspaceDetails({
      priority: result.priority === 'normal' ? 'medium' : result.priority || 'none',
      startDate: result.startDate || '',
      dueDate: result.dueDate || '',
      collaborators: [...new Set((result.collaborators || []).map(String))],
      labelIds: [...new Set((result.labelIds || []).map(String))],
      attachments: (result.attachments || []).map((item) => ({ ...item })),
    });
    setWorkspaceDetailsError('');
  };

  const actionDescription = {
    start: 'เปลี่ยนสถานะงานเป็นกำลังดำเนินการ',
    submit: 'ส่งงานให้ผู้ตรวจที่ระบุไว้ และล็อกการแก้ไขระหว่างรอตรวจ',
    approve: 'อนุมัติงานและเปลี่ยนสถานะเป็นเสร็จสิ้น',
    request_changes: 'ส่งงานกลับไปกำลังดำเนินการพร้อมเหตุผลที่ระบุ',
    withdraw: 'ถอนงานออกจากการตรวจและเปลี่ยนกลับเป็นกำลังดำเนินการ',
    reassign: 'บันทึกการเปลี่ยนผู้รับผิดชอบพร้อมเหตุผล',
    delete: `ลบ “${task.title}” ออกจากโปรเจกต์`,
    delete_checklist: 'ลบรายการตรวจสอบนี้ออกจากงาน',
  }[confirmAction];

  const checklistItems = Array.isArray(task.checklist) ? task.checklist : [];
  const checklistDone = checklistItems.filter((item) => item.completed).length;
  const checklistPercent = checklistProgressPercent(checklistItems);
  const workComments = workEntries.comments || [];
  const workTimeLogs = workEntries.timeLogs || [];
  const totalLoggedHours = workTimeLogs.reduce((total, item) => total + Number(item.hours || 0), 0);
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
    ...workTimeLogs.map((entry) => ({ actorId: entry.actorId, description: `บันทึกเวลาทำงาน ${entry.hours} ชม. ในงาน “${task.title}”`, timestamp: entry.timestamp })),
  ].sort((left, right) => String(right.timestamp || '').localeCompare(String(left.timestamp || '')));
  const assignee = employee(task.assigneeId);
  const reviewer = employee(task.reviewerId);
  const workspaceTaskActions = (
    <div className="workspace-task-actions">
      {canEditTask && onEdit && <Button variant="outline-primary" onClick={() => onEdit(task)}>แก้ไขงาน</Button>}
      {canStart && <Button variant="outline-primary" onClick={() => setConfirmAction('start')}>เริ่มงาน</Button>}
      {canDeleteTask && <Button variant="outline-danger" onClick={() => setConfirmAction('delete')}><Trash2 size={14} /> ลบงาน</Button>}
      {canSubmitReview && <Button onClick={() => setConfirmAction('submit')}>ส่งตรวจ</Button>}
      {canReview && <><Button variant="success" onClick={() => setConfirmAction('approve')}>อนุมัติ</Button><Button variant="outline-warning" onClick={() => setConfirmAction('request_changes')}>ขอแก้ไข</Button></>}
      {canWithdraw && <Button variant="outline-secondary" onClick={() => setConfirmAction('withdraw')}>ถอนจากการตรวจ</Button>}
      {canManageAssignment && <Button variant="outline-secondary" onClick={() => setConfirmAction('reassign')}>เปลี่ยนผู้รับผิดชอบ</Button>}
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
      {['request_changes', 'withdraw', 'reassign'].includes(confirmAction) && <Form.Group>
        <Form.Label htmlFor="workspace-task-action-reason">เหตุผล <span aria-hidden="true">*</span></Form.Label>
        <Form.Control id="workspace-task-action-reason" as="textarea" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="ระบุเหตุผล (จำเป็น)..." />
      </Form.Group>}
      {error && <Alert variant="danger" role="alert">{error}</Alert>}
      <div>
        <Button variant="outline-secondary" onClick={() => { setConfirmAction(''); setReason(''); setNextAssigneeId(''); setError(''); onClearInitialAction?.(); }}>ยกเลิก</Button>
        <Button variant={confirmAction === 'delete' || confirmAction === 'delete_checklist' ? 'danger' : 'primary'} disabled={((confirmAction === 'request_changes' || confirmAction === 'withdraw') && !reason.trim()) || (confirmAction === 'reassign' && (!nextAssigneeId || !reason.trim()))} onClick={runConfirmedAction}>ยืนยัน</Button>
      </div>
    </section>
  );
  const workspaceChecklist = (
    <section className={`workspace-task-work-panel${workPage ? '' : ' workspace-task-compact-checklist'}`} aria-labelledby="workspace-task-checklist-heading">
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
              <small>{canEditItem ? (isOwner ? 'Project Owner' : 'รายการของคุณ') : `เป็นของ ${employee(item.ownerId || item.createdBy)?.name || 'สมาชิกอื่น'}`}{item.createdAt && ` · สร้าง ${checklistDate(item.createdAt)}`}{item.completedAt && ` · เสร็จ ${checklistDate(item.completedAt)}`}</small>
              {canEditItem && editingChecklistId !== item.id && <span className="workspace-checklist-actions"><Button size="sm" variant="link" onClick={() => { setEditingChecklistId(item.id); setEditingChecklistTitle(item.title); }}>แก้ไข</Button><Button size="sm" variant="link" className="text-danger" onClick={() => { setPendingChecklistDelete(item.id); setConfirmAction('delete_checklist'); }}>ลบ</Button></span>}
            </li>;
          })}
        </ul>
      )}
      {!isTaskLocked && (isOwner || String(actorId) === String(task.assigneeId) || (task.collaborators || []).some((id) => String(id) === String(actorId)) || String(actorId) === String(task.reviewerId) || (project?.teamMemberIds || []).some((id) => String(id) === String(actorId))) && <Form onSubmit={addChecklistItem} className="workspace-inline-form"><Form.Control aria-label="เพิ่มรายการ Checklist" value={checklistTitle} onChange={(event) => setChecklistTitle(event.target.value)} placeholder="เพิ่มรายการย่อย..." /><Button type="submit" aria-label="เพิ่ม Checklist"><Plus size={16} /> เพิ่ม</Button></Form>}
      <p className="workspace-muted-copy">{isTaskLocked ? 'เช็กลิสต์ถูกล็อก' : isOwner ? 'คุณเป็น Project Owner จัดการเช็กลิสต์ได้ทุกรายการ' : 'สมาชิกแก้ไขได้เฉพาะรายการที่ตนสร้างหรือเป็นเจ้าของ'} · Checklist เสร็จครบแล้วก็ยังต้องส่งงานตรวจด้วยตนเอง</p>
    </section>
  );
  const workspaceTaskDetailsPanel = workPage && (
    <section className="workspace-task-work-panel workspace-task-details-panel" aria-labelledby="workspace-task-details-heading">
      <div className="workspace-task-work-panel-heading"><h2 id="workspace-task-details-heading">รายละเอียดงาน</h2><span>{workspaceDetails.attachments.length} ไฟล์แนบ</span></div>
      {!canEditTask && <p className="workspace-task-details-readonly" role="note">{isTaskLocked ? taskLockMessage : 'แก้ไขได้เฉพาะผู้รับผิดชอบหลัก, Project Owner หรือ Team Lead'}</p>}
      <div className="workspace-task-details-grid">
        <Form.Group>
          <Form.Label htmlFor="workspace-task-details-priority">ระดับความสำคัญ</Form.Label>
          <Form.Select id="workspace-task-details-priority" value={workspaceDetails.priority} disabled={!canEditTask || isTaskLocked} onChange={(event) => setWorkspaceDetails((previous) => ({ ...previous, priority: event.target.value }))}>
            <option value="none">ไม่ระบุ</option><option value="low">ต่ำ</option><option value="medium">ปกติ</option><option value="high">สูง</option><option value="urgent">เร่งด่วน</option>
          </Form.Select>
        </Form.Group>
        <Form.Group>
          <Form.Label htmlFor="workspace-task-details-start">วันที่เริ่ม</Form.Label>
          <Form.Control id="workspace-task-details-start" type="date" value={workspaceDetails.startDate} disabled={!canEditTask || isTaskLocked} onChange={(event) => setWorkspaceDetails((previous) => ({ ...previous, startDate: event.target.value }))} />
        </Form.Group>
        <Form.Group>
          <Form.Label htmlFor="workspace-task-details-due">กำหนดส่ง</Form.Label>
          <Form.Control id="workspace-task-details-due" type="date" required value={workspaceDetails.dueDate} disabled={!canEditTask || isTaskLocked} isInvalid={workspaceDetailsDateInvalid} onChange={(event) => setWorkspaceDetails((previous) => ({ ...previous, dueDate: event.target.value }))} />
          {workspaceDetailsDateInvalid && <Form.Control.Feedback type="invalid">{workspaceDetails.dueDate ? 'กำหนดส่งต้องไม่อยู่ก่อนวันเริ่ม' : 'กรุณากำหนดวันส่ง'}</Form.Control.Feedback>}
        </Form.Group>
      </div>
      <section className="workspace-task-details-section" aria-labelledby="workspace-task-details-collaborators-heading">
        <h3 id="workspace-task-details-collaborators-heading">ผู้ร่วมงาน</h3>
        <div className="workspace-task-details-options" role="group" aria-label="เลือกผู้ร่วมงาน">
          {projectMembers.filter((person) => String(person.id) !== String(task.assigneeId)).map((person, index) => {
            const selected = workspaceDetails.collaborators.includes(String(person.id));
            const [background, color] = WORKSPACE_AVATAR_COLORS[index % WORKSPACE_AVATAR_COLORS.length];
            return <button type="button" key={person.id} className={selected ? 'is-selected' : ''} aria-pressed={selected} disabled={!canEditTask || isTaskLocked} onClick={() => toggleWorkspaceCollaborator(person.id)}>
              <span className="workspace-task-details-person-avatar" style={{ backgroundColor: background, color }}>{person.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>{person.name}
            </button>;
          })}
          {projectMembers.filter((person) => String(person.id) !== String(task.assigneeId)).length === 0 && <span className="workspace-task-details-empty">ไม่มีสมาชิกอื่นในโปรเจกต์</span>}
        </div>
      </section>
      <section className="workspace-task-details-section" aria-labelledby="workspace-task-details-labels-heading">
        <h3 id="workspace-task-details-labels-heading">ป้ายกำกับ</h3>
        {labels.length ? <div className="workspace-task-details-labels">
          {labels.map((label) => {
            const selected = workspaceDetails.labelIds.includes(String(label.id));
            const color = getWorkspaceLabelColor(label);
            return <button type="button" key={label.id} className={selected ? 'is-selected' : ''} aria-pressed={selected} disabled={!canEditTask || isTaskLocked} onClick={() => toggleWorkspaceLabel(label.id)} style={{ borderColor: color, color, backgroundColor: selected ? `${color}26` : '#fff' }}>{label.name}</button>;
          })}
        </div> : <p className="workspace-task-details-empty">ยังไม่มีป้ายกำกับ</p>}
        <div className="workspace-task-details-label-editor">
          <Form.Control id="workspace-task-details-label-name" aria-label="ชื่อป้ายใหม่" value={workspaceLabelName} disabled={!canEditTask || isTaskLocked} onChange={(event) => setWorkspaceLabelName(event.target.value)} placeholder="สร้างป้ายใหม่..." onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); createAndAttachWorkspaceLabel(); } }} />
          <Button type="button" disabled={!workspaceLabelName.trim() || !canEditTask || isTaskLocked} onClick={createAndAttachWorkspaceLabel}>สร้างป้ายและเพิ่ม</Button>
        </div>
        <div className="workspace-task-details-palette" role="group" aria-label="เลือกสีป้าย">
          {WORKSPACE_LABEL_PALETTE.map((color) => <button type="button" key={color} aria-label={`สี ${color}`} aria-pressed={workspaceLabelColor === color} disabled={!canEditTask || isTaskLocked} onClick={() => setWorkspaceLabelColor(color)} style={{ backgroundColor: color, outline: workspaceLabelColor === color ? `2px solid ${color}` : undefined }} />)}
        </div>
      </section>
      <section className="workspace-task-details-section" aria-labelledby="workspace-task-details-attachments-heading">
        <div className="workspace-task-details-section-heading"><h3 id="workspace-task-details-attachments-heading">ไฟล์แนบ</h3><div className="workspace-task-attachment-quick"><button type="button" disabled={!canEditTask || isTaskLocked} onClick={() => addWorkspaceQuickAttachment('Production Plan')}>+ Production Plan</button><button type="button" disabled={!canEditTask || isTaskLocked} onClick={() => addWorkspaceQuickAttachment('E-SOP')}>+ E-SOP</button></div></div>
        <Form.Control id="workspace-task-details-attachment-file" type="file" multiple aria-label="เลือกไฟล์แนบ" disabled={!canEditTask || isTaskLocked} onChange={addWorkspaceFiles} />
        {workspaceDetails.attachments.length ? <ul className="workspace-task-details-attachments-list">{workspaceDetails.attachments.map((attachment) => <li key={attachment.id}><span><strong>{attachment.name}</strong><small>{attachment.category || 'ไฟล์'} · {Math.max(1, Math.round(Number(attachment.size || 0) / 1024))} KB</small></span><button type="button" aria-label={`ลบไฟล์ ${attachment.name}`} disabled={!canEditTask || isTaskLocked} onClick={() => setWorkspaceDetails((previous) => ({ ...previous, attachments: previous.attachments.filter((item) => item.id !== attachment.id) }))}><Trash2 size={15} /></button></li>)}</ul> : <p className="workspace-task-details-empty">ยังไม่มีไฟล์แนบ</p>}
      </section>
      {workspaceDetailsError && <Alert variant="danger" role="alert" className="workspace-task-details-error">{workspaceDetailsError}</Alert>}
      <div className="workspace-task-details-footer"><span>{workspaceDetailsDateInvalid ? 'แก้วันที่ให้ถูกต้องก่อนบันทึก' : 'การแก้ไขจะปรากฏในประวัติงานและประวัติโปรเจกต์'}</span><Button type="button" disabled={!canEditTask || isTaskLocked || workspaceDetailsDateInvalid || !workspaceDetailsChanged} onClick={saveWorkspaceTaskDetails}>บันทึกรายละเอียด</Button></div>
    </section>
  );

  if (workspaceMode) {
    if (workPage) {
      return (
        <section className="workspace-task-work-page" aria-label={`หน้าทำงาน ${task.title}`}>
          <div className="workspace-task-work-toolbar">
            <Button type="button" variant="outline-secondary" onClick={onCloseWork}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>กลับไปรายการงาน</Button>
            <span>หน้าทำงาน · {project?.name || task.projectName}</span>
          </div>
          <section className="workspace-task-work-hero">
            <div className="workspace-task-work-summary">
              <div className="workspace-task-work-tags"><TaskStatusBadge task={task} className="task-detail-status" />{task.priority && <span className="workspace-task-work-priority">ความสำคัญ: <TaskPriorityBadge priority={task.priority} workspaceMode /></span>}{(task.labelIds || []).map((id) => labels.find((label) => String(label.id) === String(id))).filter(Boolean).map((label) => { const color = getWorkspaceLabelColor(label); return <span className="workspace-task-label" key={label.id} style={{ borderColor: color, color, backgroundColor: `${color}26` }}>{label.name}</span>; })}</div>
              <h2>{task.title}</h2>
              <p>{task.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
              <div className="workspace-task-work-meta">
                <span className="workspace-task-work-assignee"><small>ผู้รับผิดชอบหลัก</small><span>{assignee && <span className="project-detail-avatar" data-person-id={assignee.id} aria-hidden="true">{assignee.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>}<b>{assignee?.name || 'ไม่ระบุ'}</b></span></span>
                <span><small>ผู้ตรวจ</small><b>{reviewer?.name || 'ยังไม่ได้กำหนด'}</b></span>
                <span><small>กำหนด</small><b>{task.startDate || 'ไม่ระบุวันเริ่ม'}{task.dueDate ? ` – ${task.dueDate}` : ''}</b></span>
              </div>
            </div>
            <aside className="workspace-task-work-summary-card" aria-label="สรุปความคืบหน้างาน">
              <div className="workspace-task-work-summary-metrics"><span className="workspace-task-work-ring" style={{ background: `conic-gradient(#0F766E ${checklistPercent}%, #D8E1F0 0)` }}><b>{checklistPercent}%</b></span><span><strong>เช็กลิสต์ {checklistDone}/{checklistItems.length}</strong><small>เวลาที่บันทึก {totalLoggedHours.toLocaleString('th-TH')} ชม.</small></span></div>
              {!confirmAction && workspaceTaskActions}
              {isTaskLocked && <span className="workspace-task-work-lock">{taskLockMessage}</span>}
            </aside>
          </section>
          {workspaceActionPanel}
          {workspaceTaskDetailsPanel}
          <div className="workspace-task-work-grid">
            <div className="workspace-task-work-main">
              {workspaceChecklist}
              <section className="workspace-task-work-panel" aria-labelledby="workspace-task-comments-heading">
                <div className="workspace-task-work-panel-heading"><h2 id="workspace-task-comments-heading">ความคิดเห็น · {workComments.length}</h2></div>
                {workComments.length ? <div className="workspace-task-comments">{workComments.map((comment) => <article key={comment.id}><span className="project-detail-avatar" data-person-id={comment.actorId} aria-hidden="true">{employee(comment.actorId)?.name?.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || '?'}</span><div><strong>{employee(comment.actorId)?.name || 'ผู้ใช้งาน'} <small>· {checklistDate(comment.timestamp)}</small></strong><p>{comment.text}</p></div></article>)}</div> : <p className="workspace-task-work-empty">ยังไม่มีความคิดเห็น</p>}
                <Form onSubmit={addWorkspaceComment} className="workspace-task-comment-form"><Form.Label htmlFor="workspace-task-comment">เขียนความคิดเห็น</Form.Label><Form.Control id="workspace-task-comment" as="textarea" rows={3} aria-label="เขียนความคิดเห็น" value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="อัปเดตความคืบหน้า ถามคำถาม หรือแจ้งปัญหา..." /><Button type="submit" disabled={!commentText.trim()}>ส่งความคิดเห็น</Button></Form>
              </section>
            </div>
            <aside className="workspace-task-work-side">
              <section className="workspace-task-work-panel" aria-labelledby="workspace-task-time-heading">
                <div className="workspace-task-work-panel-heading"><h2 id="workspace-task-time-heading">บันทึกเวลาทำงาน</h2><span>รวม {totalLoggedHours.toLocaleString('th-TH')} ชม.</span></div>
                {workTimeLogs.length ? <div className="workspace-task-time-list">{workTimeLogs.map((entry) => <article key={entry.id}><span className="project-detail-avatar" data-person-id={entry.actorId} aria-hidden="true">{employee(entry.actorId)?.name?.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || '?'}</span><span><strong>{Number(entry.hours).toLocaleString('th-TH')} ชม.</strong><small>{entry.note}</small></span><time>{checklistDate(entry.timestamp)}</time></article>)}</div> : <p className="workspace-task-work-empty">ยังไม่มีการบันทึกเวลา</p>}
                <Form onSubmit={addWorkspaceTimeLog} className="workspace-task-time-form"><Form.Group><Form.Label htmlFor="workspace-task-hours">ชั่วโมง</Form.Label><Form.Control id="workspace-task-hours" type="number" min="0" step="0.5" placeholder="0.5" value={timeHours} onChange={(event) => setTimeHours(event.target.value)} /></Form.Group><Form.Group><Form.Label htmlFor="workspace-task-time-note">ทำอะไร</Form.Label><Form.Control id="workspace-task-time-note" value={timeNote} onChange={(event) => setTimeNote(event.target.value)} placeholder="เช่น ทำหน้ากรองข้อมูล" /></Form.Group><Button type="submit" disabled={!(Number(timeHours) > 0) || !timeNote.trim()}>+ บันทึกเวลา</Button></Form>
              </section>
              <section className="workspace-task-work-panel" aria-labelledby="workspace-task-history-heading">
                <div className="workspace-task-work-panel-heading"><h2 id="workspace-task-history-heading">ประวัติของงานนี้</h2></div>
                {taskHistory.length ? <ul className="workspace-task-history workspace-history-scroll">{taskHistory.map((entry, index) => <li key={`${entry.type || entry.action || 'event'}-${entry.timestamp || index}-${index}`}><span className="project-detail-avatar" data-person-id={entry.actorId} aria-hidden="true">{employee(entry.actorId)?.name?.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || '?'}</span><span><strong>{entry.description || entry.action || 'อัปเดตงาน'}</strong><small>{employee(entry.actorId)?.name || entry.actorId || 'ผู้ใช้งาน'} · {checklistDate(entry.timestamp)}{entry.reason ? ` · ${entry.reason}` : ''}</small></span></li>)}</ul> : <p className="workspace-task-work-empty">ยังไม่มีประวัติ</p>}
              </section>
            </aside>
          </div>
        </section>
      );
    }

    return (
      <aside className="workspace-task-detail" aria-label="รายละเอียดงาน">
        <div className="workspace-task-detail-heading">
          <div><TaskStatusBadge task={task} className="task-detail-status" /><h2>{task.title}</h2></div>
          <Button type="button" variant="link" className="workspace-task-detail-close" aria-label="ปิดรายละเอียดงาน" onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></Button>
        </div>
        <p className="workspace-task-detail-description">{task.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
        <Button type="button" className="workspace-task-open-work" onClick={onOpenWork}>เปิดหน้าทำงาน <span aria-hidden="true">→</span></Button>
        <dl className="workspace-task-detail-meta">
          <dt>ผู้รับผิดชอบหลัก</dt><dd>{assignee && <span className="project-detail-avatar" data-person-id={assignee.id} aria-hidden="true">{assignee.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>}{assignee?.name || 'ไม่ระบุ'}</dd>
          <dt>ผู้ร่วมงาน</dt><dd>{(task.collaborators || []).map((id) => employee(id)?.name).filter(Boolean).join(', ') || 'ไม่มี'}</dd>
          <dt>ผู้ตรวจ (Reviewer)</dt><dd>{reviewer?.name || 'ยังไม่ได้กำหนด'}</dd>
          <dt>กำหนด</dt><dd>{task.startDate || '—'}{task.dueDate ? ` – ${task.dueDate}` : ''}</dd>
          {task.priority && <><dt>ความสำคัญ</dt><dd><TaskPriorityBadge priority={task.priority} workspaceMode /></dd></>}
        </dl>
        {(task.labelIds || []).length > 0 && <div className="workspace-task-label-list">{task.labelIds.map((id) => labels.find((label) => String(label.id) === String(id))).filter(Boolean).map((label) => { const color = getWorkspaceLabelColor(label); return <span className="workspace-task-label" key={label.id} style={{ borderColor: color, color, backgroundColor: `${color}26` }}>{label.name}</span>; })}</div>}
        {task.attachments?.length > 0 && <div className="workspace-task-detail-files"><strong>ไฟล์แนบ</strong>{task.attachments.map((attachment) => <span key={attachment.id}><span aria-hidden="true">⌁</span><b>{attachment.name}</b><small>{attachment.category || attachment.type || 'ไฟล์'}</small></span>)}</div>}
        {isTaskLocked && <div className="workspace-task-work-lock">{taskLockMessage}</div>}
        {workspaceChecklist}
        {workspaceActionPanel}
        {!confirmAction && workspaceTaskActions}
      </aside>
    );
  }

  return (
    <>
      <Modal show onHide={onClose} centered={!panelMode} backdrop={!panelMode} container={panelMode ? panelContainer : undefined} className={`mecha-detail-modal${panelMode ? ' task-detail-side-panel' : ''}`}>
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
          {(task.plannedAllocations || []).length > 0 && <div className="workspace-task-allocation-list" aria-label="การจัดสรรชั่วโมงที่วางแผน">{task.plannedAllocations.map((allocation) => <span key={allocation.employeeId}>{employee(allocation.employeeId)?.name || allocation.employeeId}: {Number(allocation.hours).toLocaleString('th-TH')} ชม.</span>)}</div>}
          {typeof task.progress === 'number' && <div className="mb-3"><div className="d-flex justify-content-between mb-1"><span className="small text-muted">ความคืบหน้า</span><span className="small fw-semibold">{task.progress}%</span></div><ProgressBar now={task.progress} variant={task.progress === 100 ? 'success' : 'primary'} style={{ height: 8 }} /></div>}
          <div className="mb-3"><span className="small text-muted d-block mb-1">คำอธิบายรายละเอียด</span><div className="p-3 bg-light rounded small text-ink" style={{ lineHeight: 1.6 }}>{task.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</div></div>

          {resolvedProjectId && (
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
                    {projectMembers.filter((person) => String(person.id) !== String(task.assigneeId)
                      && String(person.id) !== String(task.reviewerId)).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                  </Form.Select>
                  <Form.Control className="mt-2" aria-label="เหตุผลการเปลี่ยนผู้รับผิดชอบ" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="ระบุเหตุผลที่ต้องเปลี่ยน" />
                  <Button className="mt-2" size="sm" variant="outline-primary" disabled={!nextAssigneeId || !reason.trim()} onClick={() => setConfirmAction('reassign')}>บันทึกการเปลี่ยน</Button>
                </section>
              )}

              {task.status === 'pending_review' && <section className="workspace-task-section" aria-labelledby="task-review-title"><div className="workspace-task-section-heading"><h3 id="task-review-title">การตรวจงาน</h3></div><p className="workspace-muted-copy">ผู้ตรวจ: {employee(task.reviewerId)?.name || 'ไม่ระบุ'} · ส่งเมื่อ {task.reviewSubmittedAt ? new Date(task.reviewSubmittedAt).toLocaleString('th-TH') : 'ไม่ระบุ'}</p>{task.reviewLastReason && <Alert variant="info" className="mb-2">เหตุผลล่าสุด: {task.reviewLastReason}</Alert>}</section>}

              <section className="workspace-task-section" aria-labelledby="task-labels-title"><div className="workspace-task-section-heading"><h3 id="task-labels-title">Labels</h3></div>{(task.labelIds || []).length ? <div className="workspace-task-label-list">{task.labelIds.map((id) => labels.find((label) => String(label.id) === String(id))).filter(Boolean).map((label) => <span className="workspace-task-label" key={label.id} style={{ borderColor: label.color, color: label.color, backgroundColor: `${label.color}18` }}>{label.name}</span>)}</div> : <p className="workspace-muted-copy">ยังไม่มีป้ายกำกับ</p>}</section>
              <section className="workspace-task-section" aria-labelledby="task-attachments-title"><div className="workspace-task-section-heading"><h3 id="task-attachments-title">ไฟล์แนบ</h3></div>{(task.attachments || []).length ? <ul className="workspace-attachment-list">{task.attachments.map((attachment) => <li key={attachment.id}><strong>{attachment.name}</strong><span>{attachment.category} · {attachment.type || 'ไฟล์'} · {Math.max(1, Math.round(Number(attachment.size || 0) / 1024))} KB</span></li>)}</ul> : <p className="workspace-muted-copy">ยังไม่มีไฟล์แนบ</p>}</section>
              {(task.reviewHistory?.length > 0 || task.assignmentHistory?.length > 0) && <section className="workspace-task-section" aria-labelledby="task-history-title"><div className="workspace-task-section-heading"><h3 id="task-history-title">ประวัติงาน</h3></div><ul className="workspace-task-history">{(task.reviewHistory || []).map((item, index) => <li key={`review-${index}`}><strong>{item.action}</strong><span>{employee(item.actorId)?.name || item.actorId} · {checklistDate(item.timestamp)}{item.reason ? ` · ${item.reason}` : ''}</span></li>)}{(task.assignmentHistory || []).map((item, index) => <li key={`assignment-${index}`}><strong>เปลี่ยนผู้รับผิดชอบ</strong><span>{employee(item.previousAssigneeId)?.name || item.previousAssigneeId} → {employee(item.newAssigneeId)?.name || item.newAssigneeId} · {employee(item.actorId)?.name || item.actorId} · {checklistDate(item.timestamp)} · {item.reason}</span></li>)}</ul></section>}

              {(canReview || canWithdraw) && <Form.Group className="workspace-task-section"><Form.Label htmlFor="task-review-reason">เหตุผล (จำเป็นสำหรับขอแก้ไขหรือถอนงาน)</Form.Label><Form.Control id="task-review-reason" as="textarea" rows={2} value={reason} onChange={(event) => setReason(event.target.value)} /></Form.Group>}
              {error && <Alert variant="danger" role="alert">{error}</Alert>}
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="project-task-detail-footer">
          {canEditTask && onEdit && <Button variant="outline-primary" onClick={() => onEdit(task)}>แก้ไขงาน</Button>}
          {canStart && <Button variant="outline-primary" onClick={() => setConfirmAction('start')}>เริ่มงาน</Button>}
          {canDeleteTask && <Button variant="outline-danger" onClick={() => setConfirmAction('delete')}><Trash2 size={14} /> ลบงาน</Button>}
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
