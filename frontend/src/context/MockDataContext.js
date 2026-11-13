// frontend/src/context/MockDataContext.js — Shared in-memory Project Workspace records.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CURRENT_USER, MOCK_EMPLOYEES, MOCK_TASKS, MOCK_PROJECTS_FALLBACK, applyTaskSync } from '../data/mockData';

export const MockDataContext = createContext(null);

const now = () => new Date().toISOString();
const projectKey = (id) => String(id);
const employeeName = (id) => MOCK_EMPLOYEES.find((employee) => String(employee.id) === String(id))?.name || id;

function legacyDeliverablesFor(project) {
  if (!project.requiresDeliverables || !project.deliverableDescription) return [];
  return project.deliverableDescription
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean)
    .map((title, index) => ({
      id: `legacy-${project.id}-${index + 1}`,
      projectId: project.id,
      title,
      description: '',
      status: 'pending',
      source: 'project-description',
    }));
}

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
    if (old.status !== task.status) add(task, 'task_status_changed', `เปลี่ยนสถานะ “${task.title}” จาก ${old.statusLabel || old.status} เป็น ${task.statusLabel || task.status}`);
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
  const [tasksState, setTasksState] = useState(initialTasks);
  const [deliverablesState, setDeliverablesState] = useState(() => MOCK_PROJECTS_FALLBACK.flatMap(legacyDeliverablesFor));
  const [activityState, setActivityState] = useState([]);
  const [actorId, setActorState] = useState(CURRENT_USER.employeeId);
  const stateRef = useRef({ projects: projectsState, tasks: tasksState, deliverables: deliverablesState, activity: activityState, actorId });
  const sequenceRef = useRef(0);
  stateRef.current = { ...stateRef.current, projects: projectsState, tasks: tasksState, deliverables: deliverablesState, activity: activityState, actorId };

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
    if (!current || !closure || closure.status === 'closed' || !(closure.ownerReviewedAt || closure.deliverablesReviewedAt || ['pending_approval', 'approved', 'returned'].includes(closure.status))) return;
    const nextClosure = { ...closure, status: 'draft', ownerReviewedAt: null, deliverablesReviewedAt: null, submittedAt: null, approvedAt: null, returnReason: null };
    const nextProjects = stateRef.current.projects.map((project) => projectKey(project.id) === projectKey(projectId) ? { ...project, closure: nextClosure } : project);
    stateRef.current.projects = nextProjects;
    setProjectsState(nextProjects);
    recordActivity({ projectId, type: 'project_closure_review_reset', description: 'ข้อมูลโปรเจกต์เปลี่ยนแปลง จึงต้องตรวจการปิดโปรเจกต์ใหม่' });
  }, [recordActivity]);

  const setActorId = useCallback((id) => {
    stateRef.current.actorId = String(id);
    setActorState(String(id));
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
        const existing = new Set(stateRef.current.deliverables.map((item) => String(item.id)));
        const additions = legacyDeliverablesFor(project).filter((item) => !existing.has(String(item.id)));
        if (additions.length) {
          stateRef.current.deliverables = [...stateRef.current.deliverables, ...additions];
          setDeliverablesState(stateRef.current.deliverables);
        }
      } else if (old.name !== project.name || old.description !== project.description || old.status !== project.status || old.dueDate !== project.dueDate || old.startDate !== project.startDate || old.category !== project.category || old.priority !== project.priority || String(old.managerId) !== String(project.managerId) || String(old.teamLeadId || '') !== String(project.teamLeadId || '') || JSON.stringify(old.teamMemberIds || []) !== JSON.stringify(project.teamMemberIds || []) || old.requiresDeliverables !== project.requiresDeliverables || old.deliverableDescription !== project.deliverableDescription) {
        const statusChanged = old.status !== project.status;
        recordActivity({ projectId: project.id, type: statusChanged ? 'project_status_changed' : 'project_updated', description: statusChanged ? `เปลี่ยนสถานะโปรเจกต์ “${project.name}” เป็น ${project.status}` : `แก้ไขข้อมูลโปรเจกต์ “${project.name}”` });
        resetClosureReview(project.id);
      }
      if (old && (old.deliverableDescription !== project.deliverableDescription || old.requiresDeliverables !== project.requiresDeliverables)) {
        const retained = stateRef.current.deliverables.filter((item) => !(projectKey(item.projectId) === projectKey(project.id) && item.source === 'project-description'));
        const existingIds = new Set(retained.map((item) => String(item.id)));
        const additions = legacyDeliverablesFor(project).filter((item) => !existingIds.has(String(item.id)));
        stateRef.current.deliverables = [...retained, ...additions];
        setDeliverablesState(stateRef.current.deliverables);
      }
    });
    previous.forEach((project) => {
      if (!nextById.has(projectKey(project.id))) {
        recordActivity({ projectId: project.id, type: 'project_deleted', description: `ลบโปรเจกต์ “${project.name}”` });
        stateRef.current.deliverables = stateRef.current.deliverables.filter((item) => projectKey(item.projectId) !== projectKey(project.id));
        setDeliverablesState(stateRef.current.deliverables);
      }
    });
  }, [recordActivity, resetClosureReview]);

  const updateProject = useCallback((projectId, patch, event) => {
    const current = stateRef.current.projects.find((project) => projectKey(project.id) === projectKey(projectId));
    if (!current) return null;
    if (current.closure?.status === 'closed' && patch.status && patch.status !== 'done') return null;
    if (patch.status === 'done' && current.closure?.status !== 'closed') return null;
    const next = stateRef.current.projects.map((project) => (
      projectKey(project.id) === projectKey(projectId) ? { ...project, ...patch } : project
    ));
    stateRef.current.projects = next;
    setProjectsState(next);
    if (event) recordActivity({ projectId, ...event });
    if (!('closure' in patch) && !String(event?.type || '').startsWith('project_closure') && event?.type !== 'project_closed') {
      resetClosureReview(projectId);
    }
    return next.find((project) => projectKey(project.id) === projectKey(projectId));
  }, [recordActivity, resetClosureReview]);

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
    const task = {
      ...values,
      id: values.id || `task-local-${++sequenceRef.current}`,
      projectName: stateRef.current.projects.find((project) => projectKey(project.id) === projectKey(values.projectId))?.name || '',
      status: values.status || 'not_started',
      statusLabel: values.statusLabel || (values.status === 'in_progress' ? 'กำลังดำเนินการ' : 'รอเริ่มทำ'),
      progress: Number.isFinite(values.progress) ? values.progress : 0,
      collaborators: [...new Set((values.collaborators || []).map(String).filter((id) => String(id) !== String(values.assigneeId)))],
      checklist: values.checklist || [], assignmentHistory: [], reviewHistory: [],
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
    const nextTask = { ...current, ...patch };
    updateTasksAndSyncProjects((tasks) => tasks.map((task) => String(task.id) === String(taskId) ? nextTask : task), [current.projectId], { recordEvents: false });
    if (event) recordActivity({ projectId: current.projectId, taskId: current.id, ...event });
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
  }, [recordActivity, updateTasksAndSyncProjects]);

  const deleteTask = useCallback((taskId, event) => {
    const task = stateRef.current.tasks.find((item) => String(item.id) === String(taskId));
    if (!task) return false;
    updateTasksAndSyncProjects((tasks) => tasks.filter((item) => String(item.id) !== String(taskId)), [task.projectId], { recordEvents: false });
    recordActivity({ projectId: task.projectId, taskId: task.id, type: 'task_deleted', description: `ลบงาน “${task.title}”`, ...event });
    return true;
  }, [recordActivity, updateTasksAndSyncProjects]);

  const createDeliverable = useCallback((values) => {
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

  const value = useMemo(() => ({
    projects: projectsState, setProjects, updateProject,
    tasks: tasksState, setTasks: setTasksState, updateTasksAndSyncProjects, createTask, updateTask, deleteTask,
    deliverables: deliverablesState, createDeliverable, updateDeliverable, deleteDeliverable,
    activity: activityState, recordActivity,
    actorId, setActorId,
  }), [projectsState, setProjects, updateProject, tasksState, updateTasksAndSyncProjects, createTask, updateTask, deleteTask,
    deliverablesState, createDeliverable, updateDeliverable, deleteDeliverable, activityState, recordActivity, actorId, setActorId]);

  return <MockDataContext.Provider value={value}>{children}</MockDataContext.Provider>;
}

export function useMockData() {
  const context = useContext(MockDataContext);
  if (!context) throw new Error('useMockData ต้องถูกใช้ภายใน <MockDataProvider>');
  return context;
}
