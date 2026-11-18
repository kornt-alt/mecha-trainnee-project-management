// Notification inbox with URL-backed search, filters, pagination, selection, and bulk actions.
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, InputGroup, Modal } from 'react-bootstrap';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useNotificationCenter } from '../../context/NotificationCenterContext';
import { filterAndPaginate, formatThaiDateTime, updateSearchParams } from '../../utils/notificationCenterUtils';
import { Check, CircleAlert, Search, Trash2 } from '../common/Icons';
import { EmptyResults, PageHeading, PaginationControl, PriorityBadge } from './NotificationCenterComponents';

const PAGE_SIZE = 8;

export default function NotificationCenter() {
  const { notifications, markNotifications, deleteNotifications } = useNotificationCenter();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIds, setSelectedIds] = useState([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const search = searchParams.get('q') || '';
  const priority = searchParams.get('priority') || '';
  const readStatus = searchParams.get('read') || '';
  const requestedPage = Number(searchParams.get('page')) || 1;
  const unreadCount = notifications.filter((item) => item.unread).length;

  const result = useMemo(() => filterAndPaginate(notifications, {
    search,
    searchFields: ['id', 'title', 'message', 'category', 'source', 'actor'],
    filters: { priority, readStatus },
    page: requestedPage,
    pageSize: PAGE_SIZE,
  }), [notifications, search, priority, readStatus, requestedPage]);

  useEffect(() => setSelectedIds([]), [search, priority, readStatus, result.currentPage]);

  const updateFilters = (updates) => setSearchParams(updateSearchParams(
    searchParams,
    Object.prototype.hasOwnProperty.call(updates, 'page') ? updates : { ...updates, page: null },
  ));
  const pageIds = result.items.map((item) => String(item.id));
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const toggleSelected = (id) => setSelectedIds((previous) => (
    previous.includes(String(id)) ? previous.filter((value) => value !== String(id)) : [...previous, String(id)]
  ));

  const togglePageSelection = () => setSelectedIds((previous) => (
    allPageSelected
      ? previous.filter((id) => !pageIds.includes(id))
      : [...new Set([...previous, ...pageIds])]
  ));

  const clearFilters = () => setSearchParams(new URLSearchParams());
  const markSelected = (unread) => {
    markNotifications(selectedIds, unread);
    setSelectedIds([]);
  };

  const confirmDelete = () => {
    deleteNotifications(selectedIds);
    setSelectedIds([]);
    setShowDeleteConfirmation(false);
  };

  return (
    <div className="notification-page">
      <PageHeading
        title="ศูนย์การแจ้งเตือน"
        description="ติดตามรายการแจ้งเตือน จัดลำดับความสำคัญ และตรวจสอบรายละเอียดที่เกี่ยวข้อง"
        actions={<div className="notification-unread-summary"><span className="unread-count">{unreadCount}</span><span>ยังไม่อ่าน</span></div>}
      />

      <Card className="notification-panel">
        <div className="notification-toolbar">
          <InputGroup className="notification-search">
            <InputGroup.Text><Search size={16} /></InputGroup.Text>
            <Form.Control
              type="search"
              aria-label="ค้นหาการแจ้งเตือน"
              placeholder="ค้นหาหัวข้อ รายละเอียด หรือผู้เกี่ยวข้อง"
              value={search}
              onChange={(event) => updateFilters({ q: event.target.value })}
            />
          </InputGroup>
          <Form.Select aria-label="กรองตามความสำคัญ" value={priority} onChange={(event) => updateFilters({ priority: event.target.value })}>
            <option value="">ทุกระดับความสำคัญ</option>
            <option value="urgent">ด่วนมาก</option>
            <option value="high">สูง</option>
            <option value="normal">ปกติ</option>
          </Form.Select>
          <Form.Select aria-label="กรองตามสถานะการอ่าน" value={readStatus} onChange={(event) => updateFilters({ readStatus: event.target.value })}>
            <option value="">ทุกสถานะ</option>
            <option value="unread">ยังไม่อ่าน</option>
            <option value="read">อ่านแล้ว</option>
          </Form.Select>
        </div>

        {selectedIds.length > 0 && (
          <div className="notification-bulk-toolbar" aria-live="polite">
            <span>เลือก {selectedIds.length} รายการ</span>
            <div className="d-flex flex-wrap gap-2">
              <Button size="sm" variant="outline-primary" onClick={() => markSelected(false)}><Check size={15} /> ทำเครื่องหมายว่าอ่านแล้ว</Button>
              <Button size="sm" variant="outline-secondary" onClick={() => markSelected(true)}>ทำเครื่องหมายว่ายังไม่อ่าน</Button>
              <Button size="sm" variant="outline-danger" onClick={() => setShowDeleteConfirmation(true)}><Trash2 size={15} /> ลบรายการ</Button>
            </div>
          </div>
        )}

        <div className="notification-table-wrap">
          <div className="notification-table" role="table" aria-label="รายการแจ้งเตือน">
            <div className="notification-row notification-table-head" role="row">
              <div className="notification-select-cell" role="columnheader">
                <Form.Check type="checkbox" aria-label="เลือกการแจ้งเตือนในหน้านี้" checked={allPageSelected} onChange={togglePageSelection} disabled={!result.items.length} />
              </div>
              <div role="columnheader">รายการ</div>
              <div role="columnheader">ความสำคัญ</div>
              <div role="columnheader">วันที่แจ้ง</div>
              <div role="columnheader">สถานะ</div>
            </div>
            {result.items.map((item) => (
              <div className={`notification-row ${item.unread ? 'is-unread' : ''}`} role="row" key={item.id}>
                <div className="notification-select-cell" role="cell">
                  <Form.Check type="checkbox" aria-label={`เลือกรายการ ${item.title}`} checked={selectedIds.includes(String(item.id))} onChange={() => toggleSelected(item.id)} />
                </div>
                <div className="notification-main-cell" role="cell">
                  {item.unread && <span className="notification-unread-mark" aria-label="ยังไม่อ่าน" />}
                  <div className="notification-title-wrap">
                    <Link className="notification-item-link" to={{ pathname: `/notifications/${item.id}`, search: location.search }}>{item.title}</Link>
                    <p>{item.message}</p>
                    <span className="notification-source">{item.category} · {item.source} · {item.actor}</span>
                  </div>
                </div>
                <div className="notification-priority-cell" role="cell"><PriorityBadge priority={item.priority} /></div>
                <div className="notification-date-cell" role="cell">{formatThaiDateTime(item.createdAt)}</div>
                <div className="notification-read-cell" role="cell"><span className={`read-state ${item.unread ? 'is-unread' : ''}`}>{item.unread ? 'ยังไม่อ่าน' : 'อ่านแล้ว'}</span></div>
              </div>
            ))}
          </div>
          {!result.items.length && (
            <EmptyResults
              title={notifications.length ? 'ไม่พบการแจ้งเตือนที่ตรงกับเงื่อนไข' : 'ยังไม่มีการแจ้งเตือน'}
              description={notifications.length ? 'ลองปรับคำค้นหาหรือตัวกรอง แล้วค้นหาอีกครั้ง' : 'รายการแจ้งเตือนตัวอย่างจะแสดงที่นี่เมื่อมีข้อมูล'}
            />
          )}
        </div>

        <div className="notification-list-footer">
          <span className="small text-muted">แสดง {result.items.length ? (result.currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(result.currentPage * PAGE_SIZE, result.totalItems)} จาก {result.totalItems} รายการ</span>
          {result.pageCount > 1 && <PaginationControl currentPage={result.currentPage} pageCount={result.pageCount} totalItems={result.totalItems} onPageChange={(page) => updateFilters({ page })} />}
          {(search || priority || readStatus) && <Button variant="link" size="sm" onClick={clearFilters}>ล้างตัวกรอง</Button>}
        </div>
      </Card>

      <div className="notification-helper-line"><CircleAlert size={15} /> รายการที่มีจุดสีน้ำเงินยังไม่ได้อ่าน</div>

      <Modal show={showDeleteConfirmation} onHide={() => setShowDeleteConfirmation(false)} centered>
        <Modal.Header closeButton><Modal.Title>ยืนยันการลบการแจ้งเตือน</Modal.Title></Modal.Header>
        <Modal.Body>ต้องการลบการแจ้งเตือนที่เลือก {selectedIds.length} รายการหรือไม่? การลบนี้มีผลกับข้อมูลจำลองในหน้านี้เท่านั้น</Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowDeleteConfirmation(false)}>ยกเลิก</Button>
          <Button variant="danger" onClick={confirmDelete}>ยืนยันการลบ</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
