// Searchable and filterable mock security incident register.
import React, { useMemo } from 'react';
import { Card, Form, InputGroup, Table } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { useNotificationCenter } from '../../context/NotificationCenterContext';
import { filterAndPaginate, formatThaiDateTime, updateSearchParams } from '../../utils/notificationCenterUtils';
import { Search } from '../common/Icons';
import { EmptyResults, MockDataNotice, PageHeading, PaginationControl, PriorityBadge, StatusBadge } from './NotificationCenterComponents';

const PAGE_SIZE = 8;

export default function SecurityIncidents() {
  const { incidents } = useNotificationCenter();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') || '';
  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';
  const result = useMemo(() => filterAndPaginate(incidents, {
    search,
    searchFields: ['id', 'title', 'summary', 'assignee'],
    filters: { status, priority },
    page: Number(searchParams.get('page')) || 1,
    pageSize: PAGE_SIZE,
  }), [incidents, search, status, priority, searchParams]);
  const updateFilters = (updates) => setSearchParams(updateSearchParams(
    searchParams,
    Object.prototype.hasOwnProperty.call(updates, 'page') ? updates : { ...updates, page: null },
  ));

  return (
    <div className="notification-page">
      <PageHeading title="เหตุการณ์ความปลอดภัย" description="ตรวจสอบสถานะ ความสำคัญ ผู้รับผิดชอบ และรายการที่เชื่อมโยง" />
      <MockDataNotice />
      <Card className="notification-panel">
        <div className="notification-toolbar incident-toolbar">
          <InputGroup className="notification-search">
            <InputGroup.Text><Search size={16} /></InputGroup.Text>
            <Form.Control type="search" aria-label="ค้นหาเหตุการณ์" placeholder="ค้นหารหัส หัวข้อ หรือผู้รับผิดชอบ" value={search} onChange={(event) => updateFilters({ q: event.target.value })} />
          </InputGroup>
          <Form.Select aria-label="กรองสถานะเหตุการณ์" value={status} onChange={(event) => updateFilters({ status: event.target.value })}>
            <option value="">ทุกสถานะ</option>
            <option value="reported">รอรับทราบ</option>
            <option value="acknowledged">รับทราบแล้ว</option>
            <option value="investigating">กำลังตรวจสอบ</option>
            <option value="resolved">ปิดเหตุการณ์</option>
            <option value="false_positive">ผลบวกลวง</option>
          </Form.Select>
          <Form.Select aria-label="กรองระดับความสำคัญของเหตุการณ์" value={priority} onChange={(event) => updateFilters({ priority: event.target.value })}>
            <option value="">ทุกระดับความสำคัญ</option>
            <option value="urgent">เร่งด่วน</option>
            <option value="high">สูง</option>
            <option value="normal">ปกติ</option>
          </Form.Select>
        </div>
        <div className="table-responsive notification-standard-table">
          <Table hover className="mb-0 align-middle">
            <thead><tr><th>รหัส / เหตุการณ์</th><th>ความสำคัญ</th><th>สถานะ</th><th>ผู้รับผิดชอบ</th><th>วันที่รายงาน</th></tr></thead>
            <tbody>
              {result.items.map((incident) => (
                <tr key={incident.id}>
                  <td data-label="รหัส / เหตุการณ์"><Link className="record-title-link" to={`/security/incidents/${incident.id}`}>{incident.title}</Link><span className="record-subtitle">{incident.id}</span></td>
                  <td data-label="ความสำคัญ"><PriorityBadge priority={incident.priority} /></td>
                  <td data-label="สถานะ"><StatusBadge status={incident.status} /></td>
                  <td data-label="ผู้รับผิดชอบ">{incident.assignee || 'ยังไม่มอบหมาย'}</td>
                  <td data-label="วันที่รายงาน">{formatThaiDateTime(incident.reportedAt)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!result.items.length && <EmptyResults title={incidents.length ? 'ไม่พบเหตุการณ์ที่ตรงกับเงื่อนไข' : 'ยังไม่มีเหตุการณ์'} />}
        </div>
        <div className="notification-list-footer">
          <span className="small text-muted">แสดง {result.items.length ? (result.currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(result.currentPage * PAGE_SIZE, result.totalItems)} จาก {result.totalItems} รายการ</span>
          {result.pageCount > 1 && <PaginationControl currentPage={result.currentPage} pageCount={result.pageCount} totalItems={result.totalItems} onPageChange={(page) => updateFilters({ page })} />}
        </div>
      </Card>
    </div>
  );
}
