// Shared page headings, mock-data notice, status labels, and pagination for notification screens.
import React from 'react';
import { Alert, Button } from 'react-bootstrap';
import { ChevronLeft, ChevronRight, Info } from '../common/Icons';

export function PageHeading({ title, description, actions }) {
  return (
    <div className="notification-page-heading">
      <div>
        <h1 className="page-title mb-1">{title}</h1>
        <p className="text-muted mb-0">{description}</p>
      </div>
      {actions && <div className="notification-page-actions">{actions}</div>}
    </div>
  );
}

export function MockDataNotice() {
  return (
    <Alert variant="info" className="mock-data-notice d-flex align-items-start gap-2">
      <Info size={17} className="mt-1" />
      <span>ข้อมูลและผลตรวจสอบทั้งหมดเป็นข้อมูลจำลองเพื่อสาธิต ไม่ใช่ผลการตรวจสอบความปลอดภัยจริง</span>
    </Alert>
  );
}

export function PriorityBadge({ priority }) {
  const labels = { normal: 'ปกติ', high: 'สูง', urgent: 'ด่วนมาก' };
  return <span className={`notification-priority priority-${priority || 'normal'}`}>{labels[priority] || labels.normal}</span>;
}

export function StatusBadge({ status, type = 'incident' }) {
  const labels = type === 'export'
    ? { ready: 'พร้อมใช้งาน', quarantined: 'กักกัน', failed: 'ไม่ผ่าน', processing: 'กำลังประมวลผล' }
    : { reported: 'รอรับทราบ', acknowledged: 'รับทราบแล้ว', investigating: 'กำลังตรวจสอบ', resolved: 'ปิดเหตุการณ์', false_positive: 'ผลบวกลวง' };
  return <span className={`notification-status status-${status || 'unknown'}`}>{labels[status] || status || 'ไม่ระบุ'}</span>;
}

export function PaginationControl({ currentPage, pageCount, totalItems, onPageChange }) {
  if (!pageCount) return null;
  return (
    <div className="notification-pagination">
      <span className="text-muted small">หน้า {currentPage} จาก {pageCount} · {totalItems} รายการ</span>
      <div className="d-flex gap-2">
        <Button variant="outline-secondary" size="sm" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} aria-label="หน้าก่อนหน้า">
          <ChevronLeft size={16} />
        </Button>
        <Button variant="outline-secondary" size="sm" disabled={currentPage >= pageCount} onClick={() => onPageChange(currentPage + 1)} aria-label="หน้าถัดไป">
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}

export function EmptyResults({ title = 'ไม่พบรายการ', description = 'ลองปรับคำค้นหาหรือตัวกรอง แล้วค้นหาอีกครั้ง' }) {
  return (
    <div className="notification-empty-state">
      <h2 className="h6 mb-1">{title}</h2>
      <p className="text-muted small mb-0">{description}</p>
    </div>
  );
}
