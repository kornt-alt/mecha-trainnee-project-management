// Read-only project Kanban board sourced from the shared task context.
import { useMemo, useState } from 'react';
import { MOCK_EMPLOYEES } from '../../data/mockData';
import { useMockData } from '../../context/MockDataContext';
import { ymd } from '../../utils/projectTrackingUtils';
import { ClipboardList } from '../common/Icons';
import { TaskPriorityBadge, TaskStatusBadge } from '../TaskBadges';
import TaskDetailModal from '../TaskDetailModal';

const BOARD_COLUMNS = [
  { key: 'not_started', title: 'To Do', label: 'รอเริ่มทำ' },
  { key: 'in_progress', title: 'In Progress', label: 'กำลังดำเนินการ' },
  { key: 'pending_review', title: 'Review', label: 'รอการตรวจสอบ' },
  { key: 'completed', title: 'Done', label: 'เสร็จสิ้น' },
];

const employeeById = (id) => MOCK_EMPLOYEES.find((employee) => String(employee.id) === String(id));

function BoardTaskCard({ task, onOpen }) {
  const assignee = employeeById(task.assigneeId);
  const hasProgress = typeof task.progress === 'number' && Number.isFinite(task.progress);

  return (
    <button
      type="button"
      className="project-board-task"
      aria-label={`เปิดรายละเอียดงาน ${task.title}`}
      onClick={() => onOpen(task)}
    >
      <strong className="project-board-task-title">{task.title}</strong>
      <div className="project-board-task-badges">
        <TaskStatusBadge task={task} className="project-board-status" />
        <TaskPriorityBadge priority={task.priority} className="project-board-priority" />
      </div>
      <div className="project-board-task-meta">
        {assignee && (
          <span className="project-board-assignee">
            <span className="project-board-avatar" aria-hidden="true">
              {assignee.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
            </span>
            <span>{assignee.name}</span>
          </span>
        )}
        {task.dueDate && <span className="project-board-due-date">กำหนดส่ง {ymd(task.dueDate)}</span>}
      </div>
      {hasProgress && (
        <div className="project-board-progress" aria-label={`ความคืบหน้า ${task.progress}%`}>
          <span>{task.progress}%</span>
          <span className="project-board-progress-track" aria-hidden="true">
            <span style={{ width: `${Math.max(0, Math.min(100, task.progress))}%` }} />
          </span>
        </div>
      )}
    </button>
  );
}

export default function ProjectBoard({ projectId }) {
  const { tasks, projects } = useMockData();
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const selectedTask = tasks.find((task) => String(task.id) === String(selectedTaskId));
  const project = projects.find((item) => String(item.id) === String(projectId));
  const projectTasks = useMemo(
    () => tasks.filter((task) => String(task.projectId) === String(projectId)),
    [projectId, tasks]
  );

  return (
    <section className="project-board-panel" aria-labelledby="project-board-heading">
      <div className="project-board-heading-row">
        <div>
          <span className="project-detail-placeholder-label">PROJECT BOARD</span>
          <h2 id="project-board-heading">บอร์ดงาน</h2>
          <p>สถานะของงานในโปรเจกต์นี้</p>
        </div>
        <span className="project-board-total">{projectTasks.length} งาน</span>
      </div>

      {projectTasks.length === 0 ? (
        <div className="project-board-empty" role="status">
          <ClipboardList size={30} aria-hidden="true" />
          <strong>ยังไม่มีงานในโปรเจกต์นี้</strong>
          <span>งานที่เพิ่มให้โปรเจกต์นี้จะแสดงบนบอร์ด</span>
        </div>
      ) : (
        <div className="project-board-columns">
          {BOARD_COLUMNS.map((column) => {
            const columnTasks = projectTasks.filter((task) => task.status === column.key);
            return (
              <section
                className={`project-board-column status-${column.key}`}
                data-status={column.key}
                key={column.key}
                aria-labelledby={`project-board-${column.key}`}
              >
                <header className="project-board-column-header">
                  <span className="project-board-column-heading">
                    <strong id={`project-board-${column.key}`}>{column.title}</strong>
                    <small>{column.label}</small>
                  </span>
                  <span className="project-board-count" aria-label={`${columnTasks.length} งาน`}>
                    {columnTasks.length}
                  </span>
                </header>
                <div className="project-board-task-list">
                  {columnTasks.length > 0 ? columnTasks.map((task) => (
                    <BoardTaskCard key={task.id} task={task} onOpen={(selected) => setSelectedTaskId(selected.id)} />
                  )) : (
                    <p className="project-board-column-empty">ไม่มีงาน</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {selectedTask && <TaskDetailModal task={selectedTask} projectId={project?.id} onClose={() => setSelectedTaskId(null)} />}
    </section>
  );
}
