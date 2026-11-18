// Read-only append-only mock audit log with search and URL-backed filters.
import React, { useMemo } from 'react';
import { Card, Form, InputGroup, Table } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { useNotificationCenter } from '../../context/NotificationCenterContext';
import { filterAndPaginate, formatThaiDateTime, updateSearchParams } from '../../utils/notificationCenterUtils';
import { Search } from '../common/Icons';
import { EmptyResults, MockDataNotice, PageHeading, PaginationControl } from './NotificationCenterComponents';

const PAGE_SIZE = 10;
const EVENT_LABELS = {
  incident_reported: 'รายงานเหตุการณ์',
  incident_acknowledged: 'รับทราบเหตุการณ์',
  incident_investigation_started: 'เริ่มตรวจสอบเหตุการณ์',
  incident_resolved: 'ปิดเหตุการณ์',
  incident_closed_false_positive: 'จัดเป็นผลบวกลวง',
  export_created: 'สร้างแพ็กเกจส่งออก',
  export_quarantined: 'กักกันแพ็กเกจ',
  export_verification_failed: 'ตรวจสอบแพ็กเกจไม่ผ่าน',
  permission_changed: 'เปลี่ยนสิทธิ์',
  integrity_reviewed: 'ตรวจสอบความครบถ้วน',
  notifications_marked_read: 'ทำเครื่องหมายว่าอ่านแล้ว',
  notifications_marked_unread: 'ทำเครื่องหมายว่ายังไม่อ่าน',
  notifications_deleted: 'ลบการแจ้งเตือน',
};
const INTEGRITY_LABELS = {
  mock_recorded: 'บันทึกจำลอง',
  mock_verified: 'ผ่าน (จำลอง)',
  mock_pending: 'รอตรวจสอบ (จำลอง)',
  mock_mismatch: 'ไม่ตรงกัน (จำลอง)',
};

export default function AuditLog() {
  const { auditLog } = useNotificationCenter();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') || '';
  const eventType = searchParams.get('type') || '';
  const integrityStatus = searchParams.get('integrity') || '';
  const eventTypes = [...new Set(auditLog.map((record) => record.eventType))];
  const result = useMemo(() => filterAndPaginate(auditLog, {
    search,
    searchFields: ['id', 'eventType', 'actor', 'incidentId', 'description'],
    filters: { eventType, integrityStatus },
    page: Number(searchParams.get('page')) || 1,
    pageSize: PAGE_SIZE,
  }), [auditLog, search, eventType, integrityStatus, searchParams]);
  const updateFilters = (updates) => setSearchParams(updateSearchParams(
    searchParams,
    Object.prototype.hasOwnProperty.call(updates, 'page') ? updates : { ...updates, page: null },
  ));

  return (
    <div className="notification-page">
      <PageHeading title="บันทึกการตรวจสอบ" description="รายการเหตุการณ์แบบเพิ่มต่อท้าย พร้อมข้อมูลผู้ดำเนินการและเหตุการณ์ที่เกี่ยวข้อง" actions={<span className="append-only-label">บันทึกเพิ่มต่อท้าย</span>} />
      <MockDataNotice />
      <Card className="notification-panel">
        <div className="notification-toolbar audit-toolbar">
          <InputGroup className="notification-search">
            <InputGroup.Text><Search size={16} /></InputGroup.Text>
            <Form.Control type="search" aria-label="ค้นหาบันทึก" placeholder="ค้นหารหัส เหตุการณ์ หรือผู้ดำเนินการ" value={search} onChange={(event) => updateFilters({ q: event.target.value })} />
          </InputGroup>
          <Form.Select aria-label="กรองประเภทเหตุการณ์" value={eventType} onChange={(event) => updateFilters({ type: event.target.value })}>
            <option value="">ทุกประเภทเหตุการณ์</option>
            {eventTypes.map((type) => <option key={type} value={type}>{EVENT_LABELS[type] || type}</option>)}
          </Form.Select>
          <Form.Select aria-label="กรองสถานะความครบถ้วน" value={integrityStatus} onChange={(event) => updateFilters({ integrity: event.target.value })}>
            <option value="">ทุกสถานะความครบถ้วน</option>
            <option value="mock_recorded">บันทึกจำลอง</option>
            <option value="mock_verified">ผ่าน (จำลอง)</option>
            <option value="mock_pending">รอตรวจสอบ (จำลอง)</option>
            <option value="mock_mismatch">ไม่ตรงกัน (จำลอง)</option>
          </Form.Select>
        </div>
        <div className="table-responsive notification-standard-table audit-table">
          <Table hover className="mb-0 align-middle">
            <thead><tr><th>เวลา</th><th>ประเภทเหตุการณ์</th><th>ผู้ดำเนินการ</th><th>Incident ID</th><th>รายละเอียด</th><th>ความครบถ้วน</th></tr></thead>
            <tbody>
              {result.items.map((record) => (
                <tr key={record.id}>
                  <td data-label="เวลา">{formatThaiDateTime(record.timestamp)}</td>
                  <td data-label="ประเภทเหตุการณ์"><span className="record-title">{EVENT_LABELS[record.eventType] || record.eventType}</span><span className="record-subtitle">{record.id}</span></td>
                  <td data-label="ผู้ดำเนินการ">{record.actor}</td>
                  <td data-label="Incident ID">{record.incidentId ? <Link to={`/security/incidents/${record.incidentId}`}>{record.incidentId}</Link> : '—'}</td>
                  <td data-label="รายละเอียด">{record.description}</td>
                  <td data-label="ความครบถ้วน"><span className={`integrity-pill integrity-${record.integrityStatus}`}>{INTEGRITY_LABELS[record.integrityStatus] || 'ผลจำลอง'}</span></td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!result.items.length && <EmptyResults title="ไม่พบรายการบันทึก" />}
        </div>
        <div className="notification-list-footer">
          <span className="small text-muted">แสดง {result.items.length ? (result.currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(result.currentPage * PAGE_SIZE, result.totalItems)} จาก {result.totalItems} รายการ</span>
          {result.pageCount > 1 && <PaginationControl currentPage={result.currentPage} pageCount={result.pageCount} totalItems={result.totalItems} onPageChange={(page) => updateFilters({ page })} />}
        </div>
      </Card>
    </div>
  );
}
