// Shared task status and priority badges with accessible semantic color pairs.
const STATUS_LABELS = {
  not_started: 'รอเริ่มทำ',
  in_progress: 'กำลังดำเนินการ',
  pending_review: 'รอการตรวจสอบ',
  completed: 'เสร็จสิ้น',
};

const PRIORITY_LABELS = {
  urgent: 'ด่วนมาก',
  high: 'สูง',
  normal: 'ปกติ',
  medium: 'ปกติ',
  low: 'ต่ำ',
};

export function TaskStatusBadge({ task, className = '' }) {
  const label = task.statusLabel || STATUS_LABELS[task.status] || task.status || 'ไม่ระบุสถานะ';
  return (
    <span className={`workspace-status-badge status-${task.status || 'unknown'} ${className}`.trim()}>
      {label}
    </span>
  );
}

export function TaskPriorityBadge({ priority, className = '' }) {
  const label = PRIORITY_LABELS[priority];
  if (!label) return null;
  return (
    <span className={`workspace-priority-badge priority-${priority === 'medium' ? 'normal' : priority} ${className}`.trim()}>
      {label}
    </span>
  );
}
