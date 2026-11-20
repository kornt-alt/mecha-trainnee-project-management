// frontend/src/context/MockDataContext.js — Shared in-memory Project Workspace records.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CURRENT_USER, MOCK_ACTIVITIES, MOCK_DEPARTMENTS, MOCK_DELIVERABLES, MOCK_EMPLOYEES, MOCK_TASKS, MOCK_PROJECTS_FALLBACK, MOCK_TEAMS, NOTIFICATIONS, applyTaskSync } from '../data/mockData';
import { checklistProgressPercent } from '../utils/projectTrackingUtils';
import { taskStatusLabel } from '../utils/labels';

export const MockDataContext = createContext(null);

const now = () => new Date().toISOString();
const projectKey = (id) => String(id);
const employeeName = (id) => MOCK_EMPLOYEES.find((employee) => String(employee.id) === String(id))?.name || id;
const employeeExists = (id) => MOCK_EMPLOYEES.some((employee) => String(employee.id) === String(id));
const taskStatuses = new Set(['not_started', 'in_progress', 'pending_review', 'completed']);
const deliverableStatuses = new Set(['pending', 'in_progress', 'completed']);
const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const validAttachment = (item) => Boolean(item && String(item.name || '').trim() && String(item.category || '').trim()
  && Number.isFinite(Number(item.size || 0)) && Number(item.size || 0) >= 0);
const transferPlannedAllocation = (allocations, fromEmployeeId, toEmployeeId) => {
  const sourceId = String(fromEmployeeId);
  const targetId = String(toEmployeeId);
  const source = allocations.find((item) => String(item.employeeId) === sourceId);
  if (!source || sourceId === targetId) return [...allocations];
  const retained = allocations.filter((item) => String(item.employeeId) !== sourceId);
  const target = retained.find((item) => String(item.employeeId) === targetId);
  return target
    ? retained.map((item) => String(item.employeeId) === targetId ? { ...item, hours: Number(item.hours) + Number(source.hours) } : item)
    : [...retained, { employeeId: targetId, hours: Number(source.hours) }];
};

function initialTasks() {
  return MOCK_TASKS.map((task) => ({
    ...task,
    collaborators: Array.isArray(task.collaborators) ? [...task.collaborators] : [],
    checklist: Array.isArray(task.checklist) ? task.checklist.map((item) => ({ ...item })) : [],
    assignmentHistory: Array.isArray(task.assignmentHistory) ? [...task.assignmentHistory] : [],
    reviewHistory: Array.isArray(task.reviewHistory) ? [...task.reviewHistory] : [],
  }));
}

function taskEvents(previous, next, projectById, actorId, makeId) {
  const oldById = new Map(previous.map((task) => [String(task.id), task]));
  const newById = new Map(next.map((task) => [String(task.id), task]));
  const events = [];
  const add = (task, type, description, extra = {}) => events.push({
    id: makeId(), type, projectId: task.projectId, taskId: task.id,
    actorId, timestamp: now(), projectName: projectById.get(projectKey(task.projectId))?.name,
    description, ...extra,
  });

  next.forEach((task) => {
    const old = oldById.get(String(task.id));
    if (!old) {
      add(task, 'task_created', `สร้างงาน “${task.title}”`);
      return;
    }
    if (old.status !== task.status) add(task, 'task_status_changed', `เปลี่ยนสถานะ “${task.title}” จาก ${taskStatusLabel(old.status)} เป็น ${taskStatusLabel(task.status)}`);
    if (String(old.assigneeId) !== String(task.assigneeId)) add(task, 'task_assignee_changed', `เปลี่ยนผู้รับผิดชอบหลักของ “${task.title}”`);
    if (old.title !== task.title || old.description !== task.description || old.dueDate !== task.dueDate || old.priority !== task.priority) {
      add(task, 'task_updated', `แก้ไขรายละเอียดงาน “${task.title}”`);
    }
  });
  previous.forEach((task) => {
    if (!newById.has(String(task.id))) add(task, 'task_deleted', `ลบงาน “${task.title}”`);
  });
  return events;
}

export function MockDataProvider({ children }) {
  const [projectsState, setProjectsState] = useState(() => [...MOCK_PROJECTS_FALLBACK]);
  const [teamsState] = useState(() => MOCK_TEAMS.map((team) => ({ ...team, memberEmployeeIds: [...(team.memberEmployeeIds || [])] })));
  const [tasksState, setTasksState] = useState(initialTasks);
  const [deliverablesState, setDeliverablesState] = useState(() => MOCK_DELIVERABLES.map((item) => ({ ...item })));
  const [labelsState, setLabelsState] = useState([]);
  const [activityState, setActivityState] = useState(() => MOCK_ACTIVITIES.map((event) => ({ ...event })));
  const [notificationsState, setNotificationsState] = useState(() => [...NOTIFICATIONS]);
  // ความคิดเห็น / บันทึกเวลาของงาน — { [taskId]: { comments: [], timeLogs: [] } } (UX-09: เดิมอยู่ใน state ของหน้า หายเมื่อออกจากหน้า)
  const [taskWorkState, setTaskWorkState] = useState({});
  const [actorId, setActorState] = useState(CURRENT_USER.employeeId);
  const stateRef = useRef({ projects: projectsState, tasks: tasksState, deliverables: deliverablesState, labels: labelsState, activity: activityState, notifications: notificationsState, actorId });
  const sequenceRef = useRef(0);
  stateRef.current = { ...stateRef.current, projects: projectsState, tasks: tasksState, deliverables: deliverablesState, labels: labelsState, activity: activityState, notifications: notificationsState, actorId };

  const makeId = useCallback((prefix = 'evt') => `${prefix}-${++sequenceRef.current}`, []);
  const recordActivity = useCallback((event) => {
    const projects = stateRef.current.projects;
    const project = projects.find((item) => projectKey(item.id) === projectKey(event.projectId));
    const activity = {
      id: makeId('activity'),
      type: event.type || 'workspace_updated',
      projectId: event.projectId,
      projectName: event.projectName || project?.name || '',
      actorId: event.actorId || stateRef.current.actorId,
      timestamp: event.timestamp || now(),
      description: event.description || '',
      ...event,
    };
    stateRef.current.activity = [activity, ...stateRef.current.activity];
    setActivityState(stateRef.current.activity);
    return activity;
  }, [makeId]);

  const resetClosureReview = useCallback((projectId) => {
    const current = stateRef.current.projects.find((project) => projectKey(project.id) === projectKey(projectId));
    const closure = current?.closure;
    // ยกเลิกคำขอปิดที่รออนุมัติอยู่ — งาน / สิ่งส่งมอบเปลี่ยนหลังส่งแล้ว ข้อมูลที่ Team Lead จะอนุมัติไม่ตรงแล้ว
    if (!current || !closure || closure.status !== 'pending_approval') return;
    const nextClosure = { ...closure, status: 'draft', ownerReviewedAt: null, deliverablesReviewedAt: null, submittedAt: null, returnReason: null };
    const nextProjects = stateRef.current.projects.map((project) => projectKey(project.id) === projectKey(projectId) ? { ...project, closure: nextClosure } : project);
    stateRef.current.projects = nextProjects;
    setProjectsState(nextProjects);
    recordActivity({ projectId, type: 'project_closure_review_reset', description: 'ข้อมูลโปรเจกต์เปลี่ยนแปลง จึงต้องตรวจการปิดโปรเจกต์ใหม่' });
  }, [recordActivity]);

  const setActorId = useCallback((id) => {
    if (!employeeExists(id)) return false;
    stateRef.current.actorId = String(id);
    setActorState(String(id));
    return true;
  }, []);

  const addNotification = useCallback((notification) => {
    const item = { id: makeId('notification'), unread: true, ...notification };
    stateRef.current.notifications = [item, ...stateRef.current.notifications];
    setNotificationsState(stateRef.current.notifications);
    return item;
  }, [makeId]);
  // kind = 'comments' | 'timeLogs' · entry มี actorId / timestamp มาจากหน้าเว็บ
  const addTaskWorkEntry = useCallback((taskId, kind, entry) => {
    if (!['comments', 'timeLogs'].includes(kind) || !entry) return null;
    const key = String(taskId);
    setTaskWorkState((current) => {
      const existing = current[key] || { comments: [], timeLogs: [] };
      return { ...current, [key]: { ...existing, [kind]: [...existing[kind], entry] } };
    });
    return entry;
  }, []);
  const markNotificationsRead = useCallback((employeeId) => {
    const next = stateRef.current.notifications.map((item) => (
      String(item.employeeId) === String(employeeId) ? { ...item, unread: false } : item
    ));
    stateRef.current.notifications = next;
    setNotificationsState(next);
  }, []);

  const setProjects = useCallback((updater) => {
    const previous = stateRef.current.projects;
    const proposed = typeof updater === 'function' ? updater(previous) : updater;
    if (!Array.isArray(proposed)) return;
    const previousById = new Map(previous.map((project) => [projectKey(project.id), project]));
    const next = proposed.map((project) => {
      const old = previousById.get(projectKey(project.id));
      if (old?.closure?.status === 'closed' && project.status !== 'done') return { ...project, status: 'done' };
      if (old && project.status === 'done' && old.status !== 'done' && old.closure?.status !== 'closed') {
        return { ...project, status: old.status };
      }
      return project;
    });
    stateRef.current.projects = next;
    setProjectsState(next);

    const nextById = new Map(next.map((project) => [projectKey(project.id), project]));
    next.forEach((project) => {
      const old = previousById.get(projectKey(project.id));
      if (!old) {
        recordActivity({ projectId: project.id, type: 'project_created', description: `สร้างโปรเจกต์ “${project.name}”` });
      } else if (old.name !== project.name || old.description !== project.description || old.status !== project.status || old.dueDate !== project.dueDate || old.startDate !== project.startDate || old.category !== project.category || old.priority !== project.priority || String(old.managerId) !== String(project.managerId) || String(old.teamLeadId || '') !== String(project.teamLeadId || '') || JSON.stringify(old.teamMemberIds || []) !== JSON.stringify(project.teamMemberIds || []) || old.requiresDeliverables !== project.requiresDeliverables || old.deliverableDescription !== project.deliverableDescription) {
        const statusChanged = old.status !== project.status;
        recordActivity({ projectId: project.id, type: statusChanged ? 'project_status_changed' : 'project_updated', description: statusChanged ? `เปลี่ยนสถานะโปรเจกต์ “${project.name}” เป็น ${project.status}` : `แก้ไขข้อมูลโปรเจกต์ “${project.name}”` });
      }
    });
    previous.forEach((project) => {
      if (!nextById.has(projectKey(project.id))) {
        recordActivity({ projectId: project.id, type: 'project_deleted', description: `ลบโปรเจกต์ “${project.name}”` });
        stateRef.current.deliverables = stateRef.current.deliverables.filter((item) => projectKey(item.projectId) !== projectKey(project.id));
        setDeliverablesState(stateRef.current.deliverables);
      }
    });
  }, [recordActivity]);

  const updateProject = useCallback((projectId, patch, event) => {
    const current = stateRef.current.projects.find((project) => projectKey(project.id) === projectKey(projectId));
    if (!current) return null;
    if (patch.managerId && !employeeExists(patch.managerId)) return null;
    if (patch.teamLeadId && !employeeExists(patch.teamLeadId)) return null;
    if (patch.teamMemberIds && patch.teamMemberIds.some((id) => !employeeExists(id))) return null;
    if (current.closure?.status === 'closed' && patch.status && patch.status !== 'done') return null;
    // ปิดโปรเจกต์ (status done) ได้ทางเดียวคือ Team Lead อนุมัติการปิด — ส่ง closure.status = closed มาพร้อมกัน
    if (patch.status === 'done' && current.closure?.status !== 'closed' && patch.closure?.status !== 'closed') return null;
    if (patch.closure) {
      // ขั้นตอนปิดโปรเจกต์: Owner ส่งขออนุมัติ (ตรวจสรุป + สิ่งส่งมอบในคราวเดียว) → Team Lead อนุมัติ = ปิดทันที / ส่งกลับพร้อมเหตุผล
      const action = event?.type;
      const actorIdNow = String(stateRef.current.actorId);
      const isOwner = actorIdNow === String(current.managerId);
      const isTeamLead = Boolean(current.teamLeadId) && actorIdNow === String(current.teamLeadId);
      const closure = patch.closure;
      const projectTasks = stateRef.current.tasks.filter((task) => projectKey(task.projectId) === projectKey(projectId));
      const projectDeliverables = stateRef.current.deliverables.filter((item) => projectKey(item.projectId) === projectKey(projectId));
      const tasksDone = projectTasks.length > 0 && projectTasks.every((task) => task.status === 'completed');
      const deliverablesRequired = Boolean(current.requiresDeliverables || projectDeliverables.length);
      const deliverablesDone = !deliverablesRequired || (projectDeliverables.length > 0 && projectDeliverables.every((item) => item.status === 'completed'));
      if (closure.status === 'pending_approval' && (
        action !== 'project_closure_submitted' || !isOwner || !tasksDone || !deliverablesDone
        || !employeeExists(current.teamLeadId)
      )) return null;
      if (closure.status === 'returned' && (action !== 'project_closure_returned' || !isTeamLead || current.closure?.status !== 'pending_approval' || !String(event?.reason || '').trim())) return null;
      if (closure.status === 'closed' && (action !== 'project_closure_approved' || !isTeamLead || current.closure?.status !== 'pending_approval' || !tasksDone || !deliverablesDone || patch.status !== 'done')) return null;
      if (!['pending_approval', 'returned', 'closed'].includes(closure.status)) return null;
    }
    const next = stateRef.current.projects.map((project) => (
      projectKey(project.id) === projectKey(projectId) ? { ...project, ...patch } : project
    ));
    stateRef.current.projects = next;
    setProjectsState(next);
    if (event) recordActivity({ projectId, ...event });
    // ไม่ reset การขอปิดเมื่อแก้ข้อมูลโปรเจกต์ (ชื่อ / ทีม / วันที่) — reset เฉพาะเมื่องานหรือสิ่งส่งมอบเปลี่ยน
    // (updateTasksAndSyncProjects / create-update-deleteDeliverable เรียก resetClosureReview เอง)
    return next.find((project) => projectKey(project.id) === projectKey(projectId));
  }, [recordActivity]);

  const updateTasksAndSyncProjects = useCallback((mutateTasks, projectIds, options = {}) => {
    const previousTasks = stateRef.current.tasks;
    const next = applyTaskSync({ tasks: previousTasks, projects: stateRef.current.projects }, mutateTasks, projectIds);
    stateRef.current.tasks = next.tasks;
    stateRef.current.projects = next.projects;
    setTasksState(next.tasks);
    setProjectsState(next.projects);
    (projectIds || []).forEach(resetClosureReview);
    if (options.recordEvents !== false) {
      const projectById = new Map(next.projects.map((project) => [projectKey(project.id), project]));
      taskEvents(previousTasks, next.tasks, projectById, stateRef.current.actorId, () => makeId('activity'))
        .forEach(recordActivity);
    }
    return next.tasks;
  }, [makeId, recordActivity, resetClosureReview]);

  const createTask = useCallback((values) => {
    const project = stateRef.current.projects.find((item) => projectKey(item.id) === projectKey(values.projectId));
    if (!project) return null;
    if (!String(values.title || '').trim() || !employeeExists(values.assigneeId) || !employeeExists(values.reviewerId) || !isValidDate(values.dueDate)) return null;
    if (String(values.assigneeId) === String(values.reviewerId)) return null;
    if ((values.status || 'not_started') !== 'not_started') return null;
    const projectMembers = new Set([...(project.teamMemberIds || []).map(String), String(project.managerId || ''), String(project.teamLeadId || '')]);
    if (!projectMembers.has(String(stateRef.current.actorId))) return null;
    if (!projectMembers.has(String(values.assigneeId))) return null;
    if (!projectMembers.has(String(values.reviewerId))) return null;
    if ((values.collaborators || []).some((id) => !employeeExists(id) || !projectMembers.has(String(id)) || String(id) === String(values.assigneeId))) return null;
    if (new Set((values.collaborators || []).map(String)).size !== (values.collaborators || []).length) return null;
    if ((values.startDate && !isValidDate(values.startDate)) || (values.startDate && values.dueDate < values.startDate)) return null;
    const allocations = Array.isArray(values.plannedAllocations) ? values.plannedAllocations : [];
    if (allocations.some((allocation) => !employeeExists(allocation.employeeId) || !Number.isFinite(Number(allocation.hours)) || Number(allocation.hours) < 0
      || ![values.assigneeId, ...(values.collaborators || [])].some((id) => String(id) === String(allocation.employeeId)))) return null;
    if (new Set(allocations.map((allocation) => String(allocation.employeeId))).size !== allocations.length) return null;
    const estimatedHours = values.estimatedHours === '' || values.estimatedHours == null ? 0 : Number(values.estimatedHours);
    if (!Number.isFinite(estimatedHours) || estimatedHours < 0) return null;
    if (allocations.reduce((total, allocation) => total + Number(allocation.hours), 0) > estimatedHours + 0.001) return null;
    const checklist = Array.isArray(values.checklist) ? values.checklist : [];
    if (checklist.some((item) => !String(item.title || '').trim() || !employeeExists(item.createdBy) || !employeeExists(item.ownerId || item.createdBy))) return null;
    if ((values.labelIds || []).some((id) => !stateRef.current.labels.some((label) => String(label.id) === String(id)))) return null;
    const task = {
      ...values,
      id: values.id || `task-local-${++sequenceRef.current}`,
      projectName: project.name,
      status: values.status || 'not_started',
      progress: Number.isFinite(values.progress) ? values.progress : 0,
      collaborators: [...new Set((values.collaborators || []).map(String).filter((id) => String(id) !== String(values.assigneeId)))],
      plannedAllocations: allocations.filter((allocation) => Number(allocation.hours) > 0).map((allocation) => ({ employeeId: String(allocation.employeeId), hours: Number(allocation.hours) })),
      checklist, assignmentHistory: [], reviewHistory: [],
      createdBy: stateRef.current.actorId, createdAt: now(),
    };
    updateTasksAndSyncProjects((tasks) => [task, ...tasks], [task.projectId], { recordEvents: false });
    recordActivity({ projectId: task.projectId, taskId: task.id, type: 'task_created', description: `สร้างงาน “${task.title}”` });
    return task;
  }, [recordActivity, updateTasksAndSyncProjects]);

  const updateTask = useCallback((taskId, updater, event) => {
    const current = stateRef.current.tasks.find((task) => String(task.id) === String(taskId));
    if (!current) return null;
    const patch = typeof updater === 'function' ? updater(current) : updater;
    if (!patch || typeof patch !== 'object') return null;
    const eventType = String(event?.type || '');
    // งานรอตรวจถูกล็อก — แก้ได้เฉพาะการอนุมัติ / ส่งกลับ / ถอน (รวมแบบที่ Owner / Team Lead ทำแทนผู้ตรวจ — เดิมลืมใส่ ลากอนุมัติบนบอร์ดจึงพัง)
    if (current.status === 'pending_review' && !['task_review_approved', 'task_review_approved_by_project_lead', 'task_changes_requested', 'task_review_withdrawn'].includes(eventType)) return null;
    const nextTask = { ...current, ...patch };
    let checklistStatusEvent = null;
    if (!Object.prototype.hasOwnProperty.call(patch, 'status')) {
      const currentProgress = checklistProgressPercent(current.checklist);
      const nextProgress = checklistProgressPercent(nextTask.checklist);
      if (current.status === 'not_started' && currentProgress === 0 && nextProgress > 0) {
        nextTask.status = 'in_progress';
        checklistStatusEvent = {
          type: 'task_started_from_checklist',
          description: `เปลี่ยนสถานะงาน “${nextTask.title}” เป็นกำลังทำโดยอัตโนมัติตามเช็กลิสต์`,
        };
      } else if (current.status === 'in_progress' && currentProgress > 0 && nextProgress === 0) {
        nextTask.status = 'not_started';
        checklistStatusEvent = {
          type: 'task_reopened_from_checklist',
          description: `เปลี่ยนสถานะงาน “${nextTask.title}” เป็นยังไม่เริ่มโดยอัตโนมัติตามเช็กลิสต์`,
        };
      }
    }
    const assignmentChanged = String(current.assigneeId) !== String(nextTask.assigneeId);
    if (assignmentChanged) {
      nextTask.collaborators = (nextTask.collaborators || []).filter((id) => String(id) !== String(nextTask.assigneeId));
    }
    const project = stateRef.current.projects.find((item) => projectKey(item.id) === projectKey(current.projectId));
    if (!project || !String(nextTask.title || '').trim() || !employeeExists(nextTask.assigneeId) || !employeeExists(nextTask.reviewerId) || !isValidDate(nextTask.dueDate)) return null;
    if (String(nextTask.assigneeId) === String(nextTask.reviewerId)) return null;
    if (!taskStatuses.has(nextTask.status) || (nextTask.startDate && !isValidDate(nextTask.startDate)) || (nextTask.startDate && nextTask.dueDate < nextTask.startDate)) return null;
    const projectMembers = new Set([...(project.teamMemberIds || []).map(String), String(project.managerId || ''), String(project.teamLeadId || '')]);
    if (!projectMembers.has(String(nextTask.assigneeId))) return null;
    if (String(current.reviewerId) !== String(nextTask.reviewerId)
      && !projectMembers.has(String(nextTask.reviewerId))) return null;
    if ((nextTask.collaborators || []).some((id) => !employeeExists(id) || !projectMembers.has(String(id)) || String(id) === String(nextTask.assigneeId))) return null;
    if (new Set((nextTask.collaborators || []).map(String)).size !== (nextTask.collaborators || []).length) return null;
    const allocations = Array.isArray(nextTask.plannedAllocations) ? nextTask.plannedAllocations : [];
    const estimatedHours = nextTask.estimatedHours === '' || nextTask.estimatedHours == null ? 0 : Number(nextTask.estimatedHours);
    const contributorIds = new Set([nextTask.assigneeId, ...(nextTask.collaborators || [])].map(String));
    const allocationOwnerIds = new Set([...contributorIds, ...(assignmentChanged ? [String(current.assigneeId)] : [])]);
    if (!Number.isFinite(estimatedHours) || estimatedHours < 0
      || allocations.some((allocation) => !employeeExists(allocation.employeeId) || !allocationOwnerIds.has(String(allocation.employeeId))
        || !Number.isFinite(Number(allocation.hours)) || Number(allocation.hours) < 0)
      || new Set(allocations.map((allocation) => String(allocation.employeeId))).size !== allocations.length
      || allocations.reduce((sum, allocation) => sum + Number(allocation.hours), 0) > estimatedHours + 0.001) return null;
    if (current.status === 'completed' && nextTask.status !== 'completed') return null;
    const previousChecklist = new Map((current.checklist || []).map((item) => [String(item.id), item]));
    const nextChecklist = Array.isArray(nextTask.checklist) ? nextTask.checklist : [];
    const isOwner = String(stateRef.current.actorId) === String(project.managerId);
    if (nextChecklist.some((item) => !String(item.title || '').trim() || !employeeExists(item.createdBy) || !employeeExists(item.ownerId || item.createdBy))) return null;
    for (const previousItem of current.checklist || []) {
      const nextItem = nextChecklist.find((item) => String(item.id) === String(previousItem.id));
      if ((!nextItem || JSON.stringify(nextItem) !== JSON.stringify(previousItem))
        && !isOwner && String(previousItem.ownerId || previousItem.createdBy) !== String(stateRef.current.actorId)) return null;
    }
    for (const item of nextChecklist) {
      if (!previousChecklist.has(String(item.id)) && String(item.createdBy) !== String(stateRef.current.actorId)) return null;
    }
    if ((nextTask.labelIds || []).some((id) => !stateRef.current.labels.some((label) => String(label.id) === String(id)))) return null;
    if ((nextTask.attachments || []).some((item) => !validAttachment(item))) return null;
    const actor = String(stateRef.current.actorId);
    const isProjectOwner = actor === String(project.managerId);
    const isTeamLeader = actor === String(project.teamLeadId);
    const isProjectParticipant = projectMembers.has(actor) || actor === String(current.assigneeId)
      || actor === String(current.reviewerId) || (current.collaborators || []).some((id) => String(id) === actor);
    const checklistEvent = eventType.startsWith('checklist_');
    if (checklistEvent && (!isProjectParticipant || Object.keys(patch).some((key) => key !== 'checklist'))) return null;
    if (eventType === 'workspace_task_details_updated'
      && (['pending_review', 'completed'].includes(current.status)
        || (!isProjectOwner && !isTeamLeader && actor !== String(current.assigneeId)))) return null;
    if (eventType === 'task_updated' && !isProjectOwner && !isTeamLeader
      && actor !== String(current.assigneeId)
      && !(current.collaborators || []).some((id) => String(id) === actor)) return null;
    if (assignmentChanged && ((!isProjectOwner && !isTeamLeader) || !String(event?.reason || '').trim())) return null;
    if (current.status !== nextTask.status) {
      const historyEntry = (nextTask.reviewHistory || []).slice(-1)[0];
      if (current.status === 'not_started' && nextTask.status === 'in_progress'
        && ((eventType === 'task_started'
          && (actor === String(current.assigneeId) || (current.collaborators || []).some((id) => String(id) === actor)))
          || (eventType === 'task_started_by_project_lead' && (isProjectOwner || isTeamLeader)))) {
        // Contributors and project leads can start work from the board.
      } else if (current.status === 'in_progress' && nextTask.status === 'not_started' && eventType === 'task_reopened'
        && (actor === String(current.assigneeId) || isProjectOwner || isTeamLeader)) {
        // The assignee or project lead can return active work to the backlog.
      } else if (current.status === 'in_progress' && nextTask.status === 'pending_review'
        && employeeExists(nextTask.reviewerId) && historyEntry?.action === 'submitted'
        && String(historyEntry.actorId) === actor && String(historyEntry.reviewerId) === String(nextTask.reviewerId)
        && Boolean(historyEntry.timestamp)
        && ((eventType === 'task_review_submitted'
          && (actor === String(current.assigneeId) || (current.collaborators || []).some((id) => String(id) === actor)))
          || (eventType === 'task_review_submitted_by_project_lead' && (isProjectOwner || isTeamLeader)))) {
        // Submission requires a valid reviewer and an authorized actor.
      } else if (current.status === 'pending_review' && nextTask.status === 'completed'
        && ((eventType === 'task_review_approved' && actor === String(current.reviewerId))
          || (eventType === 'task_review_approved_by_project_lead' && (isProjectOwner || isTeamLeader)))
        && historyEntry?.action === 'approved'
        && String(historyEntry.actorId) === actor && String(historyEntry.reviewerId) === String(current.reviewerId)
        && Boolean(historyEntry.timestamp)) {
        // The designated reviewer or project lead approves.
      } else if (current.status === 'pending_review' && nextTask.status === 'in_progress'
        && ['task_changes_requested', 'task_review_withdrawn'].includes(eventType)
        && (eventType === 'task_changes_requested' ? actor === String(current.reviewerId)
          : actor === String(current.reviewSubmittedBy) || actor === String(project.managerId) || actor === String(project.teamLeadId))
        && String(event?.reason || '').trim()
        && historyEntry?.action === (eventType === 'task_changes_requested' ? 'changes_requested' : 'withdrawn')
        && String(historyEntry.actorId) === actor && String(historyEntry.reviewerId) === String(current.reviewerId)
        && String(historyEntry.reason || '').trim() && Boolean(historyEntry.timestamp)) {
        // Return or withdrawal requires an authorized actor and a reason.
      } else if (checklistStatusEvent) {
        // An authorized checklist change may move only between the two work states.
      } else return null;
    }
    if (assignmentChanged) {
      const reason = String(event?.reason || '').trim();
      if (!reason) return null;
      const history = [...(current.assignmentHistory || [])];
      const alreadyRecorded = history.some((item) => String(item.previousAssigneeId) === String(current.assigneeId)
        && String(item.newAssigneeId) === String(nextTask.assigneeId) && String(item.actorId) === String(stateRef.current.actorId)
        && (!event?.timestamp || item.timestamp === event.timestamp));
      if (!alreadyRecorded) history.push({ previousAssigneeId: current.assigneeId, newAssigneeId: nextTask.assigneeId, actorId: stateRef.current.actorId, reason, timestamp: now() });
      nextTask.assignmentHistory = history;
      nextTask.plannedAllocations = transferPlannedAllocation(current.plannedAllocations || [], current.assigneeId, nextTask.assigneeId);
      const taskLabel = nextTask.title;
      [current.assigneeId, nextTask.assigneeId].forEach((employeeId) => addNotification({
        employeeId: String(employeeId),
        title: 'มีการเปลี่ยนผู้รับผิดชอบงาน',
        message: `งาน “${taskLabel}” มีการเปลี่ยนผู้รับผิดชอบโดย ${employeeName(stateRef.current.actorId)}`,
        time: new Date().toLocaleString('th-TH'),
        projectId: current.projectId,
        taskId: current.id,
      }));
    }
    updateTasksAndSyncProjects((tasks) => tasks.map((task) => String(task.id) === String(taskId) ? nextTask : task), [current.projectId], { recordEvents: false });
    if (event) recordActivity({ projectId: current.projectId, taskId: current.id, ...event });
    if (checklistStatusEvent) recordActivity({ projectId: current.projectId, taskId: current.id, ...checklistStatusEvent });
    const oldCollaborators = new Set((current.collaborators || []).map(String));
    const nextCollaborators = new Set((nextTask.collaborators || []).map(String));
    nextCollaborators.forEach((id) => {
      if (!oldCollaborators.has(id)) recordActivity({ projectId: current.projectId, taskId: current.id, type: 'task_collaborator_added', description: `เพิ่ม ${employeeName(id)} เป็นผู้ร่วมงานใน “${nextTask.title}”` });
    });
    oldCollaborators.forEach((id) => {
      if (!nextCollaborators.has(id)) recordActivity({ projectId: current.projectId, taskId: current.id, type: 'task_collaborator_removed', description: `นำ ${employeeName(id)} ออกจากผู้ร่วมงานใน “${nextTask.title}”` });
    });
    if (String(current.reviewerId || '') !== String(nextTask.reviewerId || '')) {
      recordActivity({ projectId: current.projectId, taskId: current.id, type: 'task_reviewer_changed', description: `เปลี่ยนผู้ตรวจงานของ “${nextTask.title}” เป็น ${employeeName(nextTask.reviewerId)}` });
    }
    return nextTask;
  }, [addNotification, recordActivity, updateTasksAndSyncProjects]);

  const deleteTask = useCallback((taskId, event) => {
    const task = stateRef.current.tasks.find((item) => String(item.id) === String(taskId));
    if (!task) return false;
    if (task.status === 'pending_review') return false;
    const project = stateRef.current.projects.find((item) => projectKey(item.id) === projectKey(task.projectId));
    if (!project) return false;
    const actor = String(stateRef.current.actorId);
    if (actor !== String(project.managerId) && actor !== String(project.teamLeadId) && actor !== String(task.createdBy)) return false;
    updateTasksAndSyncProjects((tasks) => tasks.filter((item) => String(item.id) !== String(taskId)), [task.projectId], { recordEvents: false });
    recordActivity({ projectId: task.projectId, taskId: task.id, type: 'task_deleted', description: `ลบงาน “${task.title}”`, ...event });
    return true;
  }, [recordActivity, updateTasksAndSyncProjects]);

  const createDeliverable = useCallback((values) => {
    const project = stateRef.current.projects.find((item) => projectKey(item.id) === projectKey(values.projectId));
    const linkedTask = values.relatedTaskId && stateRef.current.tasks.find((task) => String(task.id) === String(values.relatedTaskId));
    if (!project || !String(values.title || '').trim() || (values.responsibleId && !employeeExists(values.responsibleId))
      || (values.relatedTaskId && (!linkedTask || projectKey(linkedTask.projectId) !== projectKey(values.projectId)))
      || (values.dueDate && !isValidDate(values.dueDate))
      || !deliverableStatuses.has(values.status || 'pending')
      || (values.attachments || []).some((item) => !validAttachment(item))) return null;
    const deliverable = { ...values, id: `deliverable-${++sequenceRef.current}`, status: values.status || 'pending', createdAt: now() };
    stateRef.current.deliverables = [deliverable, ...stateRef.current.deliverables];
    setDeliverablesState(stateRef.current.deliverables);
    recordActivity({ projectId: deliverable.projectId, deliverableId: deliverable.id, type: 'deliverable_created', description: `เพิ่มสิ่งที่ส่งมอบ “${deliverable.title}”` });
    resetClosureReview(deliverable.projectId);
    return deliverable;
  }, [recordActivity, resetClosureReview]);

  const updateDeliverable = useCallback((deliverableId, patch, event) => {
    const current = stateRef.current.deliverables.find((item) => String(item.id) === String(deliverableId));
    if (!current) return null;
    const nextStatus = patch.status || current.status;
    const responsibleId = Object.prototype.hasOwnProperty.call(patch, 'responsibleId') ? patch.responsibleId : current.responsibleId;
    const relatedTaskId = Object.prototype.hasOwnProperty.call(patch, 'relatedTaskId') ? patch.relatedTaskId : current.relatedTaskId;
    const dueDate = Object.prototype.hasOwnProperty.call(patch, 'dueDate') ? patch.dueDate : current.dueDate;
    const linkedTask = relatedTaskId && stateRef.current.tasks.find((task) => String(task.id) === String(relatedTaskId));
    if (!deliverableStatuses.has(nextStatus) || (responsibleId && !employeeExists(responsibleId))
      || (relatedTaskId && (!linkedTask || projectKey(linkedTask.projectId) !== projectKey(current.projectId)))
      || (dueDate && !isValidDate(dueDate))
      || (patch.attachments && patch.attachments.some((item) => !validAttachment(item)))) return null;
    const next = stateRef.current.deliverables.map((item) => String(item.id) === String(deliverableId) ? { ...item, ...patch, source: 'workspace' } : item);
    stateRef.current.deliverables = next;
    setDeliverablesState(next);
    recordActivity({ projectId: current.projectId, deliverableId: current.id, ...(event || {
      type: 'deliverable_updated', description: `แก้ไขสิ่งที่ส่งมอบ “${next.find((item) => String(item.id) === String(deliverableId)).title}”`,
    }) });
    resetClosureReview(current.projectId);
    return next.find((item) => String(item.id) === String(deliverableId));
  }, [recordActivity, resetClosureReview]);

  const deleteDeliverable = useCallback((deliverableId) => {
    const current = stateRef.current.deliverables.find((item) => String(item.id) === String(deliverableId));
    if (!current) return false;
    const next = stateRef.current.deliverables.filter((item) => String(item.id) !== String(deliverableId));
    stateRef.current.deliverables = next;
    setDeliverablesState(next);
    recordActivity({ projectId: current.projectId, deliverableId: current.id, type: 'deliverable_deleted', description: `ลบสิ่งที่ส่งมอบ “${current.title}”` });
    resetClosureReview(current.projectId);
    return true;
  }, [recordActivity, resetClosureReview]);

  // เหตุผลไม่บังคับแล้ว (UX-06) — ส่งมาก็บันทึกไว้ใน activity
  const addProjectMember = useCallback((projectId, employeeId, reason = '') => {
    const project = stateRef.current.projects.find((item) => projectKey(item.id) === projectKey(projectId));
    if (!project || !employeeExists(employeeId)) return null;
    if (![project.managerId, project.teamLeadId].some((id) => String(id) === String(stateRef.current.actorId))) return null;
    const members = [...new Set((project.teamMemberIds || []).map(String))];
    if (members.includes(String(employeeId)) || String(project.managerId) === String(employeeId) || String(project.teamLeadId) === String(employeeId)) return null;
    return updateProject(projectId, { teamMemberIds: [...members, String(employeeId)] }, {
      type: 'member_added', description: `เพิ่ม ${employeeName(employeeId)} เป็นสมาชิกโปรเจกต์`, ...(String(reason || '').trim() ? { reason: String(reason).trim() } : {}),
    });
  }, [updateProject]);

  const assignTeamLeader = useCallback((projectId, employeeId, reason) => {
    const project = stateRef.current.projects.find((item) => projectKey(item.id) === projectKey(projectId));
    if (!project || (employeeId && !employeeExists(employeeId)) || !String(reason || '').trim()) return null;
    if (![project.managerId, project.teamLeadId].some((id) => String(id) === String(stateRef.current.actorId))) return null;
    const members = new Set((project.teamMemberIds || []).map(String));
    if (employeeId) members.add(String(employeeId));
    return updateProject(projectId, { teamLeadId: employeeId || null, teamMemberIds: [...members] }, {
      type: 'team_lead_changed', description: employeeId ? `กำหนด Team Leader เป็น ${employeeName(employeeId)}` : 'นำการกำหนด Team Leader ออก', reason: String(reason).trim(),
    });
  }, [updateProject]);

  const removeProjectMember = useCallback((projectId, employeeId, replacementId, reason) => {
    const project = stateRef.current.projects.find((item) => projectKey(item.id) === projectKey(projectId));
    if (!project || !String(reason || '').trim() || !employeeExists(employeeId)) return { error: 'ตรวจสอบข้อมูลสมาชิกและระบุเหตุผลก่อนดำเนินการ' };
    if (![project.managerId, project.teamLeadId].some((id) => String(id) === String(stateRef.current.actorId))) return { error: 'คุณไม่มีสิทธิ์จัดการสมาชิกโปรเจกต์นี้' };
    if ([project.managerId, project.teamLeadId].some((id) => String(id) === String(employeeId))) return { error: 'ต้องเปลี่ยน Project Owner หรือ Team Leader ก่อนนำบุคคลนี้ออก' };
    const memberIds = new Set((project.teamMemberIds || []).map(String));
    if (!memberIds.has(String(employeeId))) return { error: 'ไม่พบสมาชิกในโปรเจกต์นี้' };
    const projectTasks = stateRef.current.tasks.filter((task) => projectKey(task.projectId) === projectKey(projectId));
    const pendingReferences = projectTasks.filter((task) => task.status === 'pending_review'
      && (String(task.assigneeId) === String(employeeId) || String(task.reviewerId) === String(employeeId) || (task.collaborators || []).some((id) => String(id) === String(employeeId))));
    if (pendingReferences.length) return { error: 'สมาชิกมีงานที่กำลังรอตรวจ ต้องจัดการงานตรวจให้เสร็จก่อนนำออก' };
    const outstanding = projectTasks.filter((task) => String(task.assigneeId) === String(employeeId) && task.status !== 'completed');
    const remainingMembers = [...memberIds].filter((id) => id !== String(employeeId));
    const eligibleReplacement = remainingMembers.includes(String(replacementId)) || [project.managerId, project.teamLeadId].some((id) => String(id) === String(replacementId));
    if (outstanding.length && (!eligibleReplacement || String(replacementId) === String(employeeId))) return { error: 'เลือกสมาชิกโปรเจกต์คนอื่นเพื่อรับงานค้างก่อนนำสมาชิกออก' };
    if (outstanding.length && (!employeeExists(replacementId) || outstanding.some((task) => String(task.reviewerId) === String(replacementId)))) {
      return { error: 'ผู้รับผิดชอบแทนต้องเป็นพนักงานที่มีอยู่และไม่ใช่ผู้ตรวจของงานที่โอน' };
    }
    if (projectTasks.some((task) => task.status !== 'completed' && String(task.reviewerId) === String(employeeId))) return { error: 'สมาชิกเป็นผู้ตรวจของงานหนึ่งรายการขึ้นไป กรุณาเปลี่ยนผู้ตรวจแต่ละงานก่อนนำออก' };
    const oldTasks = stateRef.current.tasks;
    const nextTasks = oldTasks.map((task) => {
      if (projectKey(task.projectId) !== projectKey(projectId) || task.status === 'completed') return task;
      const patch = {};
      if (String(task.assigneeId) === String(employeeId) && task.status !== 'completed') {
        patch.assigneeId = String(replacementId);
        patch.collaborators = (task.collaborators || []).filter((id) => (
          String(id) !== String(employeeId) && String(id) !== String(replacementId)
        ));
        patch.assignmentHistory = [...(task.assignmentHistory || []), { previousAssigneeId: task.assigneeId, newAssigneeId: String(replacementId), actorId: stateRef.current.actorId, reason: String(reason).trim(), timestamp: now() }];
        patch.plannedAllocations = transferPlannedAllocation(task.plannedAllocations || [], employeeId, replacementId);
      }
      if ((task.collaborators || []).some((id) => String(id) === String(employeeId))) {
        patch.collaborators = task.collaborators.filter((id) => String(id) !== String(employeeId));
        const allocationTarget = patch.assigneeId || task.assigneeId;
        patch.plannedAllocations = transferPlannedAllocation(patch.plannedAllocations || task.plannedAllocations || [], employeeId, allocationTarget);
      }
      return Object.keys(patch).length ? { ...task, ...patch } : task;
    });
    stateRef.current.tasks = nextTasks;
    setTasksState(nextTasks);
    const touchedProjectIds = new Set(projectTasks.map((task) => task.projectId));
    const nextProjects = applyTaskSync({ tasks: oldTasks, projects: stateRef.current.projects }, () => nextTasks, [...touchedProjectIds]).projects;
    stateRef.current.projects = nextProjects;
    setProjectsState(nextProjects);
    const nextMemberIds = [...memberIds].filter((id) => id !== String(employeeId));
    updateProject(projectId, { teamMemberIds: nextMemberIds }, {
      type: 'member_removed', description: `นำ ${employeeName(employeeId)} ออกจากสมาชิกโปรเจกต์`, reason: String(reason).trim(),
    });
    projectTasks.filter((task) => String(task.assigneeId) === String(employeeId) && task.status !== 'completed').forEach((task) => recordActivity({
      projectId, taskId: task.id, type: 'task_assignee_changed', description: `เปลี่ยนผู้รับผิดชอบของ “${task.title}” จาก ${employeeName(employeeId)} เป็น ${employeeName(replacementId)}`, reason: String(reason).trim(),
    }));
    projectTasks.filter((task) => String(task.assigneeId) === String(employeeId) && task.status !== 'completed').forEach((task) => [employeeId, replacementId].forEach((recipientId) => addNotification({
      employeeId: String(recipientId), title: 'มีการเปลี่ยนผู้รับผิดชอบงาน',
      message: `งาน “${task.title}” มีการเปลี่ยนผู้รับผิดชอบโดย ${employeeName(stateRef.current.actorId)}`,
      time: new Date().toLocaleString('th-TH'), projectId, taskId: task.id,
    })));
    projectTasks.filter((task) => task.status !== 'completed' && (task.collaborators || []).some((id) => String(id) === String(employeeId))).forEach((task) => recordActivity({
      projectId, taskId: task.id, type: 'task_collaborator_removed', description: `นำ ${employeeName(employeeId)} ออกจากผู้ร่วมงานใน “${task.title}”`, reason: String(reason).trim(),
    }));
    return { project: stateRef.current.projects.find((item) => projectKey(item.id) === projectKey(projectId)) };
  }, [addNotification, recordActivity, updateProject]);

  const createLabel = useCallback((values) => {
    const name = String(values.name || '').trim();
    if (!name) return null;
    const label = { id: `label-${++sequenceRef.current}`, name, color: values.color || '#2F5BD0' };
    stateRef.current.labels = [...stateRef.current.labels, label];
    setLabelsState(stateRef.current.labels);
    return label;
  }, []);
  const updateLabel = useCallback((labelId, patch) => {
    const name = String(patch.name || '').trim();
    if (!name) return null;
    const next = stateRef.current.labels.map((label) => String(label.id) === String(labelId) ? { ...label, ...patch, name } : label);
    if (next.every((label, index) => label === stateRef.current.labels[index])) return null;
    stateRef.current.labels = next;
    setLabelsState(next);
    return next.find((label) => String(label.id) === String(labelId));
  }, []);
  const deleteLabel = useCallback((labelId) => {
    const next = stateRef.current.labels.filter((label) => String(label.id) !== String(labelId));
    if (next.length === stateRef.current.labels.length) return false;
    stateRef.current.labels = next;
    setLabelsState(next);
    const nextTasks = stateRef.current.tasks.map((task) => ({ ...task, labelIds: (task.labelIds || []).filter((id) => String(id) !== String(labelId)) }));
    stateRef.current.tasks = nextTasks;
    setTasksState(nextTasks);
    return true;
  }, []);

  const value = useMemo(() => ({
    employees: MOCK_EMPLOYEES, departments: MOCK_DEPARTMENTS,
    projects: projectsState, teams: teamsState, setProjects, updateProject, addProjectMember, assignTeamLeader, removeProjectMember,
    tasks: tasksState, setTasks: setTasksState, updateTasksAndSyncProjects, createTask, updateTask, deleteTask,
    deliverables: deliverablesState, createDeliverable, updateDeliverable, deleteDeliverable,
    labels: labelsState, createLabel, updateLabel, deleteLabel,
    activity: activityState, recordActivity,
    notifications: notificationsState, addNotification, markNotificationsRead,
    taskWork: taskWorkState, addTaskWorkEntry,
    actorId, setActorId,
  }), [projectsState, teamsState, setProjects, updateProject, addProjectMember, assignTeamLeader, removeProjectMember, tasksState, updateTasksAndSyncProjects, createTask, updateTask, deleteTask,
    deliverablesState, createDeliverable, updateDeliverable, deleteDeliverable, labelsState, createLabel, updateLabel, deleteLabel, activityState, recordActivity, notificationsState, addNotification, markNotificationsRead, taskWorkState, addTaskWorkEntry, actorId, setActorId]);

  return <MockDataContext.Provider value={value}>{children}</MockDataContext.Provider>;
}

export function useMockData() {
  const context = useContext(MockDataContext);
  if (!context) throw new Error('useMockData ต้องถูกใช้ภายใน <MockDataProvider>');
  return context;
}
