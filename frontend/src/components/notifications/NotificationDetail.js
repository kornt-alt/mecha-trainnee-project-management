// Notification detail with explicit read-state actions and adjacent-item navigation.
import React, { useMemo } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useNotificationCenter } from '../../context/NotificationCenterContext';
import { filterAndPaginate, formatThaiDateTime } from '../../utils/notificationCenterUtils';
import { ArrowUpRight, Check, ChevronLeft, ChevronRight } from '../common/Icons';
import { PageHeading, PriorityBadge } from './NotificationCenterComponents';

export default function NotificationDetail() {
  const { notificationId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { notifications, markNotifications } = useNotificationCenter();
  const notification = notifications.find((item) => String(item.id) === String(notificationId));
  const search = searchParams.get('q') || '';
  const priority = searchParams.get('priority') || '';
  // ชื่อ param ต้องตรงกับที่ NotificationCenter updateFilters({ readStatus }) เขียนลง URL
  const readStatus = searchParams.get('readStatus') || '';
  const filtered = useMemo(() => filterAndPaginate(notifications, {
    search,
    searchFields: ['id', 'title', 'message', 'category', 'source', 'actor'],
    filters: { priority, readStatus },
    pageSize: Math.max(1, notifications.length),
  }).filteredItems, [notifications, search, priority, readStatus]);
  const currentIndex = filtered.findIndex((item) => String(item.id) === String(notificationId));
  const previous = currentIndex > 0 ? filtered[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < filtered.length - 1 ? filtered[currentIndex + 1] : null;
  const listSearch = searchParams.toString();
  const listTarget = { pathname: '/notifications', search: listSearch ? `?${listSearch}` : '' };

  if (!notification) {
    return (
      <div className="notification-page">
        <PageHeading title="ไม่พบการแจ้งเตือน" description="รายการนี้อาจถูกลบหรือไม่มีอยู่ในข้อมูลตัวอย่าง" />
        <Button as={Link} to={listTarget} variant="outline-primary">กลับศูนย์การแจ้งเตือน</Button>
      </div>
    );
  }

  const openAdjacent = (item) => item && navigate({ pathname: `/notifications/${item.id}`, search: listSearch ? `?${listSearch}` : '' });

  return (
    <div className="notification-page">
      <PageHeading
        title="รายละเอียดการแจ้งเตือน"
        description={`รหัส ${notification.id} · ${formatThaiDateTime(notification.createdAt)}`}
        actions={(
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" size="sm" disabled={!previous} onClick={() => openAdjacent(previous)} aria-label="รายการก่อนหน้า"><ChevronLeft size={16} /></Button>
            <Button variant="outline-secondary" size="sm" disabled={!next} onClick={() => openAdjacent(next)} aria-label="รายการถัดไป"><ChevronRight size={16} /></Button>
          </div>
        )}
      />
      <Button as={Link} to={listTarget} variant="link" className="notification-back-link"><ChevronLeft size={15} /> กลับรายการแจ้งเตือน</Button>
      <Card className="notification-detail-card">
        <div className="notification-detail-topline">
          <PriorityBadge priority={notification.priority} />
          <span className={`read-state ${notification.unread ? 'is-unread' : ''}`}>{notification.unread ? 'ยังไม่อ่าน' : 'อ่านแล้ว'}</span>
        </div>
        <h2>{notification.title}</h2>
        <p className="notification-detail-message">{notification.message}</p>
        <dl className="notification-detail-grid">
          <div><dt>หมวดหมู่</dt><dd>{notification.category}</dd></div>
          <div><dt>แหล่งที่มา</dt><dd>{notification.source}</dd></div>
          <div><dt>ผู้เกี่ยวข้อง</dt><dd>{notification.actor}</dd></div>
          <div><dt>วันที่แจ้ง</dt><dd>{formatThaiDateTime(notification.createdAt)}</dd></div>
          <div><dt>รหัสการแจ้งเตือน</dt><dd>{notification.id}</dd></div>
        </dl>
        {notification.incidentId && (
          <Alert variant="light" className="notification-related-record">
            <div><strong>เหตุการณ์ที่เกี่ยวข้อง</strong><span className="d-block small text-muted">{notification.incidentId}</span></div>
            <Button as={Link} to={`/security/incidents/${notification.incidentId}`} size="sm" variant="outline-primary">เปิดเหตุการณ์ <ArrowUpRight size={14} /></Button>
          </Alert>
        )}
        {notification.exportId && (
          <Alert variant="light" className="notification-related-record">
            <div><strong>แพ็กเกจส่งออกที่เกี่ยวข้อง</strong><span className="d-block small text-muted">{notification.exportId}</span></div>
            <Button as={Link} to={`/exports/${notification.exportId}`} size="sm" variant="outline-primary">ดูแพ็กเกจ <ArrowUpRight size={14} /></Button>
          </Alert>
        )}
        <div className="notification-detail-actions">
          <Button variant={notification.unread ? 'primary' : 'outline-primary'} onClick={() => markNotifications([notification.id], !notification.unread)}>
            <Check size={15} /> {notification.unread ? 'ทำเครื่องหมายว่าอ่านแล้ว' : 'ทำเครื่องหมายว่ายังไม่อ่าน'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
