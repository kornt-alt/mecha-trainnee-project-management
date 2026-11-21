// frontend/src/components/common/HealthBadge.js — ป้ายสุขภาพโปรเจกต์ (ปกติ / เสี่ยง / ล่าช้า / ปิดแล้ว)
// รับผลจาก projectHealth() ใน utils/executiveMetrics.js · เหตุผลแสดงเป็น tooltip (title)
import { PROJECT_HEALTH_LABELS } from '../../utils/labels';

export default function HealthBadge({ health, className = '' }) {
  if (!health) return null;
  const reasons = (health.reasons || []).join(' · ');
  return (
    <span className={`health-badge health-${health.level} ${className}`.trim()} title={reasons || undefined} data-health={health.level}>
      {PROJECT_HEALTH_LABELS[health.level]}
    </span>
  );
}
