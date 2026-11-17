// Read-only project Kanban board sourced from the shared task context.
import { useMemo, useRef, useState } from 'react';
import { MOCK_EMPLOYEES } from '../../data/mockData';
import { useMockData } from '../../context/MockDataContext';
import { daysBetween, shortThaiDate, today } from '../../utils/projectTrackingUtils';

const BOARD_COLUMNS = [
  { key: 'not_started', title: 'ยังไม่เริ่ม' },
  { key: 'in_progress', title: 'กำลังทำ' },
  { key: 'pending_review', title: 'รอตรวจ' },
  { key: 'completed', title: 'เสร็จแล้ว' },
];

const employeeById = (id) => MOCK_EMPLOYEES.find((employee) => String(employee.id) === String(id));

function BoardTaskCard({ task, onOpen, onDragStart, onDragEnd, isDragging, currentDay }) {
  const assignee = employeeById(task.assigneeId);
  const checklist = Array.isArray(task.checklist) ? task.checklist : [];
  const completed = checklist.filter((item) => item.completed).length;
  const progress = checklist.length ? Math.round((completed / checklist.length) * 100) : 0;
  const overdue = task.dueDate && task.dueDate < currentDay && task.status !== 'completed';

  return (
    <button
      type="button"
      className={`project-board-task${isDragging ? ' is-dragging' : ''}`}
      aria-label={`เปิดรายละเอียดงาน ${task.title}`}
      draggable={task.status !== 'completed'}
      onClick={() => onOpen(task)}
      onDragStart={(event) => {
        onDragStart(event, task);
      }}
      onDragEnd={onDragEnd}
    >
      <strong className="project-board-task-title">{task.title}</strong>
      <div className="project-board-task-meta">
        {assignee && (
          <span className="project-board-assignee">
            <span className="project-board-avatar" data-person-id={task.assigneeId} aria-hidden="true">
              {assignee.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
            </span>
            <span>{assignee.name}</span>
          </span>
        )}
        <span className={`project-board-due-date${overdue ? ' overdue' : ''}`}>
          {task.status === 'completed' ? 'เสร็จแล้ว' : overdue ? `เลย ${Math.abs(daysBetween(currentDay, task.dueDate))} วัน` : shortThaiDate(task.dueDate)}
        </span>
      </div>
      <span className={`project-board-progress status-${task.status}`} aria-label={`เช็กลิสต์ ${completed} จาก ${checklist.length}`}>
        <span className="project-board-progress-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></span>
        <span>{completed}/{checklist.length}</span>
      </span>
    </button>
  );
}

export default function ProjectBoard({ projectId, onOpenTask }) {
  const { tasks, projects, actorId, updateTask } = useMockData();
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState('');
  const [boardMessage, setBoardMessage] = useState(null);
  const dragTaskIdRef = useRef(null);
  const suppressClickUntilRef = useRef(0);
  const project = projects.find((item) => String(item.id) === String(projectId));
  const currentDay = today();
  const projectTasks = useMemo(
    () => tasks.filter((task) => String(task.projectId) === String(projectId)),
    [projectId, tasks]
  );

  const showBoardMessage = (message, tone = 'warning') => setBoardMessage({ message, tone });
  const finishDrag = () => {
    dragTaskIdRef.current = null;
    setDraggedTaskId(null);
    setDragOverStatus('');
  };

  const moveTask = (taskId, nextStatus) => {
    const task = projectTasks.find((item) => String(item.id) === String(taskId));
    if (!task || task.status === nextStatus) return;

    const primaryAssignee = String(actorId) === String(task.assigneeId);
    const reviewer = String(actorId) === String(task.reviewerId);
    const owner = String(actorId) === String(project?.managerId);
    const teamLead = String(actorId) === String(project?.teamLeadId);
    const privileged = owner || teamLead;
    const stamp = new Date().toISOString();
    const reviewHistory = [...(task.reviewHistory || [])];
    let patch;
    let event;

    if (task.status === 'completed') {
      showBoardMessage('งานที่เสร็จแล้วถูกล็อก ย้ายไม่ได้');
      return;
    }
    if (!privileged && !primaryAssignee && !(task.status === 'pending_review' && reviewer)) {
      showBoardMessage('ย้ายได้เฉพาะงานที่คุณเป็นผู้รับผิดชอบหลัก (หรือ Owner / Team Lead)');
      return;
    }

    if (task.status === 'not_started' && nextStatus === 'in_progress') {
      patch = { status: 'in_progress', statusLabel: 'กำลังทำ' };
      event = {
        type: primaryAssignee ? 'task_started' : 'task_started_by_project_lead',
        description: `เริ่มทำงาน “${task.title}” (ลากบนบอร์ด)`,
      };
    } else if (task.status === 'in_progress' && nextStatus === 'pending_review') {
      if (!task.reviewerId) {
        showBoardMessage('กรุณากำหนดผู้ตรวจงานก่อนส่งตรวจ');
        return;
      }
      reviewHistory.push({ action: 'submitted', actorId, reviewerId: task.reviewerId, timestamp: stamp });
      patch = {
        status: 'pending_review', statusLabel: 'รอการตรวจสอบ', reviewSubmittedBy: actorId,
        reviewSubmittedAt: stamp, reviewHistory,
      };
      event = {
        type: primaryAssignee ? 'task_review_submitted' : 'task_review_submitted_by_project_lead',
        description: `ส่งงาน “${task.title}” เข้าตรวจ (ลากบนบอร์ด · ล็อกงานระหว่างตรวจ)`,
      };
    } else if (task.status === 'pending_review' && nextStatus === 'completed') {
      if (!reviewer && !privileged) {
        showBoardMessage(`เฉพาะผู้ตรวจ (${employeeById(task.reviewerId)?.name || 'ผู้ตรวจ'}) หรือ Owner / Team Lead อนุมัติได้`);
        return;
      }
      reviewHistory.push({ action: 'approved', actorId, reviewerId: task.reviewerId, timestamp: stamp });
      patch = {
        status: 'completed', statusLabel: 'เสร็จสิ้น', progress: 100, completedAt: stamp,
        reviewApprovedBy: actorId, reviewApprovedAt: stamp, reviewHistory,
      };
      event = {
        type: reviewer ? 'task_review_approved' : 'task_review_approved_by_project_lead',
        description: `อนุมัติงาน “${task.title}” เป็นเสร็จแล้ว (ลากบนบอร์ด)`,
      };
    } else if (task.status === 'pending_review' && nextStatus === 'in_progress') {
      onOpenTask?.(task, { action: primaryAssignee && !reviewer ? 'withdraw' : 'request_changes' });
      return;
    } else if (task.status === 'in_progress' && nextStatus === 'not_started') {
      if (!owner && !teamLead && String(actorId) !== String(task.assigneeId)) {
        showBoardMessage('ย้ายได้เฉพาะผู้รับผิดชอบหลัก หรือผู้ดูแลโปรเจกต์');
        return;
      }
      patch = { status: 'not_started', statusLabel: 'รอเริ่มทำ' };
      event = { type: 'task_reopened', description: `ย้ายงาน “${task.title}” กลับเป็นรอดำเนินการจากบอร์ด` };
    } else if (task.status === 'not_started' && nextStatus === 'pending_review') {
      showBoardMessage('ต้องเริ่มทำงานก่อนจึงจะส่งตรวจได้');
      return;
    } else if (nextStatus === 'completed' && task.status !== 'pending_review') {
      showBoardMessage('งานต้องผ่านการตรวจก่อนจึงจะเป็นเสร็จแล้ว');
      return;
    } else if (task.status === 'pending_review' && nextStatus === 'not_started') {
      showBoardMessage('งานที่อยู่ระหว่างตรวจต้องส่งกลับเป็นกำลังทำก่อน');
      return;
    } else {
      return;
    }

    const result = updateTask(task.id, patch, event);
    if (!result) {
      showBoardMessage('ดำเนินการไม่สำเร็จ กรุณาตรวจสอบสิทธิ์และข้อมูลของงาน');
      return;
    }
    showBoardMessage(
      nextStatus === 'in_progress' ? 'เริ่มทำงานแล้ว'
        : nextStatus === 'pending_review' ? 'ส่งตรวจแล้ว งานถูกล็อกระหว่างตรวจ'
          : nextStatus === 'not_started' ? 'ย้ายกลับเป็นรอดำเนินการแล้ว'
            : 'อนุมัติแล้ว งานเสร็จสมบูรณ์',
      'success'
    );
  };

  const handleDrop = (event, nextStatus) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain') || dragTaskIdRef.current;
    finishDrag();
    if (taskId) moveTask(taskId, nextStatus);
  };

  return (
    <section className="project-board-panel" aria-label="บอร์ดงานในโปรเจกต์">
      <p className="project-board-reference-note">ลากการ์ดไปวางในคอลัมน์ใหม่เพื่อเปลี่ยนสถานะ หรือคลิกการ์ดเพื่อเปิดรายละเอียด · ย้ายออกจาก “รอตรวจ” กลับเป็น “กำลังทำ” ต้องระบุเหตุผล</p>
      {boardMessage && (
        <div className={`project-board-feedback is-${boardMessage.tone}`} role="status" aria-live="polite">
          <span>{boardMessage.message}</span>
          <button type="button" onClick={() => setBoardMessage(null)}>ปิด</button>
        </div>
      )}
      <div className="project-board-columns">
        {BOARD_COLUMNS.map((column) => {
          const columnTasks = projectTasks.filter((task) => task.status === column.key);
          return (
            <section
              className={`project-board-column status-${column.key}${dragOverStatus === column.key ? ' is-drag-over' : ''}`}
              data-status={column.key}
              key={column.key}
              aria-labelledby={`project-board-${column.key}`}
              onDragOver={(event) => {
                if (dragTaskIdRef.current) {
                  event.preventDefault();
                  setDragOverStatus(column.key);
                }
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setDragOverStatus('');
              }}
              onDrop={(event) => handleDrop(event, column.key)}
            >
              <header className="project-board-column-header">
                <span className="project-board-column-heading">
                  <strong id={`project-board-${column.key}`}>{column.title}</strong>
                </span>
                <span className="project-board-count" aria-label={`${columnTasks.length} งาน`}>
                  {columnTasks.length}
                </span>
              </header>
              <div className="project-board-task-list">
                {columnTasks.length > 0 ? columnTasks.map((task) => (
                  <BoardTaskCard
                    key={task.id}
                    task={task}
                    currentDay={currentDay}
                    isDragging={String(draggedTaskId) === String(task.id)}
                    onOpen={(selected) => {
                      if (Date.now() >= suppressClickUntilRef.current) onOpenTask?.(selected);
                    }}
                    onDragStart={(event, selected) => {
                      if (selected.status === 'completed') {
                        event.preventDefault();
                        return;
                      }
                      suppressClickUntilRef.current = Date.now() + 600;
                      dragTaskIdRef.current = selected.id;
                      setDraggedTaskId(selected.id);
                      try {
                        event.dataTransfer.setData('text/plain', String(selected.id));
                        event.dataTransfer.effectAllowed = 'move';
                      } catch (_) {
                        // Keep the in-memory id available when transfer data is restricted.
                      }
                    }}
                    onDragEnd={finishDrag}
                  />
                )) : (
                  <p className="project-board-column-empty">ไม่มีงาน</p>
                )}
              </div>
            </section>
          );
        })}
      </div>

    </section>
  );
}
