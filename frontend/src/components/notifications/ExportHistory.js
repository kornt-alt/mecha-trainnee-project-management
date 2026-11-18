// Searchable mock export package history with status and integrity filters.
import React, { useMemo } from 'react';
import { Card, Form, InputGroup, Table } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { useNotificationCenter } from '../../context/NotificationCenterContext';
import { filterAndPaginate, formatThaiDateTime, updateSearchParams } from '../../utils/notificationCenterUtils';
import { Search } from '../common/Icons';
import { EmptyResults, MockDataNotice, PageHeading, PaginationControl, StatusBadge } from './NotificationCenterComponents';

const PAGE_SIZE = 8;

export default function ExportHistory() {
  const { exports } = useNotificationCenter();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') || '';
  const status = searchParams.get('status') || '';
  const integrityStatus = searchParams.get('integrity') || '';
  const result = useMemo(() => filterAndPaginate(exports, {
    search,
    searchFields: ['id', 'packageName', 'createdBy', 'incidentIds'],
    filters: { status, integrityStatus },
    page: Number(searchParams.get('page')) || 1,
    pageSize: PAGE_SIZE,
  }), [exports, search, status, integrityStatus, searchParams]);
  const updateFilters = (updates) => setSearchParams(updateSearchParams(
    searchParams,
    Object.prototype.hasOwnProperty.call(updates, 'page') ? updates : { ...updates, page: null },
  ));

  return (
    <div className="notification-page">
      <PageHeading title="ประวัติการส่งออก" description="ตรวจสอบแพ็กเกจ สถานะการกักกัน และผลตรวจสอบ manifest ตัวอย่าง" />
      <MockDataNotice />
      <Card className="notification-panel">
        <div className="notification-toolbar export-toolbar">
          <InputGroup className="notification-search">
            <InputGroup.Text><Search size={16} /></InputGroup.Text>
            <Form.Control type="search" aria-label="ค้นหาแพ็กเกจส่งออก" placeholder="ค้นหา Export ID ชื่อแพ็กเกจ หรือผู้สร้าง" value={search} onChange={(event) => updateFilters({ q: event.target.value })} />
          </InputGroup>
          <Form.Select aria-label="กรองสถานะแพ็กเกจ" value={status} onChange={(event) => updateFilters({ status: event.target.value })}>
            <option value="">ทุกสถานะแพ็กเกจ</option>
            <option value="ready">พร้อมใช้งาน</option>
            <option value="quarantined">กักกัน</option>
            <option value="failed">ไม่ผ่าน</option>
            <option value="processing">กำลังประมวลผล</option>
          </Form.Select>
          <Form.Select aria-label="กรองผลตรวจสอบ" value={integrityStatus} onChange={(event) => updateFilters({ integrity: event.target.value })}>
            <option value="">ทุกผลตรวจสอบ</option>
            <option value="mock_verified">ผ่าน (จำลอง)</option>
            <option value="mock_pending">รอตรวจสอบ (จำลอง)</option>
            <option value="mock_mismatch">ไม่ตรงกัน (จำลอง)</option>
          </Form.Select>
        </div>
        <div className="table-responsive notification-standard-table">
          <Table hover className="mb-0 align-middle">
            <thead><tr><th>Export ID / Package</th><th>วันที่สร้าง</th><th>ผู้สร้าง</th><th>สถานะ</th><th>Integrity</th><th>Quarantine</th></tr></thead>
            <tbody>
              {result.items.map((record) => (
                <tr key={record.id}>
                  <td data-label="Export ID / Package"><Link className="record-title-link" to={`/exports/${record.id}`}>{record.id}</Link><span className="record-subtitle">{record.packageName}</span></td>
                  <td data-label="วันที่สร้าง">{formatThaiDateTime(record.createdAt)}</td>
                  <td data-label="ผู้สร้าง">{record.createdBy}</td>
                  <td data-label="สถานะ"><StatusBadge status={record.status} type="export" /></td>
                  <td data-label="Integrity"><span className={`integrity-pill integrity-${record.integrityStatus}`}>{record.integrityStatus === 'mock_verified' ? 'ผ่าน (จำลอง)' : record.integrityStatus === 'mock_pending' ? 'รอตรวจสอบ (จำลอง)' : 'ไม่ตรงกัน (จำลอง)'}</span></td>
                  <td data-label="Quarantine">{record.quarantineStatus === 'quarantined' ? <span className="quarantine-label">กักกัน</span> : <span className="text-muted">ไม่กักกัน</span>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!result.items.length && <EmptyResults title="ไม่พบแพ็กเกจส่งออก" />}
        </div>
        <div className="notification-list-footer">
          <span className="small text-muted">แสดง {result.items.length ? (result.currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(result.currentPage * PAGE_SIZE, result.totalItems)} จาก {result.totalItems} รายการ</span>
          {result.pageCount > 1 && <PaginationControl currentPage={result.currentPage} pageCount={result.pageCount} totalItems={result.totalItems} onPageChange={(page) => updateFilters({ page })} />}
        </div>
      </Card>
    </div>
  );
}
