// Shared task status and priority badges with accessible semantic color pairs.
import { currentEmployees } from '../data/employeeStore';
import { PRIORITY_LABELS, taskSizeLabel, taskStatusLabel } from '../utils/labels';


export const WORKSPACE_LABEL_PALETTE = ['#EF4444', '#FB923C', '#FACC15', '#10B981', '#60A5FA', '#1E3A8A', '#8B5CF6', '#EC4899', '#92400E', '#6B7280', '#14B8A6', '#06B6D4', '#6366F1', '#D946EF', '#F43F5E', '#F59E0B', '#84CC16', '#991B1B', '#166534', '#111827'];

const LABEL_COLORS = {
  DOGE: '#EC4899',
  FPCA: '#8B5CF6',
  General: '#FACC15',
  MMS: '#10B981',
  PCBA: '#EF4444',
  PCMC: '#60A5FA',
  Shipment: '#F43F5E',
  SMART: '#FB923C',
  Training: '#84CC16',
};

export const WORKSPACE_AVATAR_COLORS = [
  ['#DBEAFE', '#1E3A8A'],
  ['#D5F5E3', '#14532D'],
  ['#FEE9B8', '#78350F'],
  ['#FBD5E6', '#831843'],
];

export function workspaceLabelColor(label) {
  return LABEL_COLORS[label?.name] || label?.color || '#64748B';
}

export function WorkspaceTaskMetadata({ task, labels = [] }) {
  const taskLabels = [...new Set((task.labelIds || []).map(String))]
    .map((id) => labels.find((label) => String(label.id) === id))
    .filter(Boolean);
  const collaborators = [...new Set((task.collaborators || []).map(String))]
    .map((id) => currentEmployees().find((person) => String(person.id) === id))
    .filter(Boolean);
  const attachments = Array.isArray(task.attachments) ? task.attachments : [];

  return (
    <span className="workspace-task-metadata" aria-label="ข้อมูลเพิ่มเติมของงาน">
      <TaskPriorityBadge priority={task.priority || 'none'} className="workspace-task-metadata-priority" workspaceMode />
      <span className="task-size-badge" title="ขนาดงาน">{taskSizeLabel(task.size)}</span>
      <TaskBlockedBadge task={task} />
      {taskLabels.slice(0, 3).map((label) => {
        const color = workspaceLabelColor(label);
        return <span className="workspace-task-metadata-label" key={label.id} style={{ borderColor: color, color, backgroundColor: `${color}26` }}>{label.name}</span>;
      })}
      {taskLabels.length > 3 && <span className="workspace-task-metadata-overflow">+{taskLabels.length - 3}</span>}
      {collaborators.length > 0 && <span className="workspace-task-metadata-collaborators" aria-label={`ผู้ร่วมงาน: ${collaborators.map((person) => person.name).join(', ')}`}>
        {collaborators.map((person, index) => {
          const [background, color] = WORKSPACE_AVATAR_COLORS[index % WORKSPACE_AVATAR_COLORS.length];
          const initials = person.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
          return <span className="workspace-task-metadata-avatar" data-person-id={person.id} key={person.id} title={person.name} style={{ backgroundColor: background, color }}>{initials}</span>;
        })}
      </span>}
      <span className="workspace-task-metadata-attachments" aria-label={`ไฟล์แนบ ${attachments.length} รายการ`} title={`ไฟล์แนบ ${attachments.length} รายการ`}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5 12.5 20a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" /></svg>
        {attachments.length}
      </span>
    </span>
  );
}

export function TaskStatusBadge({ task, className = '' }) {
  // ไม่อ่าน task.statusLabel แล้ว — เดิมชื่อเปลี่ยนไปตามว่ากดเปลี่ยนสถานะด้วยวิธีไหน (UX-08)
  const label = taskStatusLabel(task.status);
  return (
    <span className={`workspace-status-badge status-${task.status || 'unknown'} ${className}`.trim()}>
      {label}
    </span>
  );
}

// ป้ายแดง "ติดปัญหา" — task.blocked = { reason, by, at } ตั้งจากปุ่ม "แจ้งติดปัญหา" ในหน้างาน
export function TaskBlockedBadge({ task }) {
  if (!task?.blocked || task.status === 'completed') return null;
  return <span className="task-blocked-badge" title={task.blocked.reason || 'ติดปัญหา'}>ติดปัญหา</span>;
}

export function TaskPriorityBadge({ priority, className = '', workspaceMode = false }) {
  const label = PRIORITY_LABELS[priority];
  if (!label) return null;
  return (
    <span className={`workspace-priority-badge priority-${priority === 'medium' ? 'normal' : priority} ${className}`.trim()}>
      {label}
    </span>
  );
}
