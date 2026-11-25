// Security incident detail, acknowledgement, investigation, and resolution workflow.
import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Form } from 'react-bootstrap';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useNotificationCenter } from '../../context/NotificationCenterContext';
import { formatThaiDateTime } from '../../utils/notificationCenterUtils';
import { ArrowUpRight, Check, ChevronLeft } from '../common/Icons';
import { MockDataNotice, PageHeading, PriorityBadge, StatusBadge } from './NotificationCenterComponents';

export default function SecurityIncidentDetail() {
  const { incidentId } = useParams();
  const { incidents, notifications, acknowledgeIncident, startIncidentInvestigation, resolveIncident } = useNotificationCenter();
  const incident = incidents.find((item) => String(item.id) === String(incidentId));
  const [outcome, setOutcome] = useState('');
  const [evidenceRef, setEvidenceRef] = useState('');
  const [resolution, setResolution] = useState('resolved');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setOutcome(incident?.investigationOutcome || '');
    setEvidenceRef(incident?.evidenceRef || '');
    setSaved(false);
    setError('');
    // Preserve the editor result while the selected incident updates in shared state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);

  // List query string captured via router navigation state when coming from the incidents list.
  // Empty when the detail was opened directly — the Back link then falls back to the default list.
  const currentLocation = useLocation();
  const backTo = currentLocation.state?.backTo || '';
  const resolveBackHref = () => (backTo ? `/security/incidents?${backTo}` : '/security/incidents');

  if (!incident) {
    return (
      <div className="notification-page">
        <PageHeading title="ไม่พบเหตุการณ์" description="รหัสเหตุการณ์นี้ไม่มีอยู่ในข้อมูลตัวอย่าง" />
        <Button as={Link} to={resolveBackHref()} variant="outline-primary">กลับรายการเหตุการณ์</Button>
      </div>
    );
  }

  const relatedNotification = notifications.find((item) => String(item.id) === String(incident.sourceNotificationId));
  const relatedIncidents = incident.relatedIncidentIds
    .map((id) => incidents.find((item) => String(item.id) === String(id)))
    .filter(Boolean);

  const submitResolution = (event) => {
    event.preventDefault();
    setSaved(false);
    setError('');
    const updated = resolveIncident(incident.id, outcome, evidenceRef, resolution);
    if (!updated) {
      setError('บันทึกผลการตรวจสอบไม่สำเร็จ กรุณาตรวจสอบสถานะเหตุการณ์');
      return;
    }
    setSaved(true);
  };

  return (
    <div className="notification-page">
      <PageHeading title="รายละเอียดเหตุการณ์" description={`${incident.id} · รายงานเมื่อ ${formatThaiDateTime(incident.reportedAt)}`} />
      <Button as={Link} to={resolveBackHref()} variant="link" className="notification-back-link"><ChevronLeft size={15} /> กลับรายการเหตุการณ์</Button>
      <MockDataNotice />
      <Card className="notification-detail-card incident-detail-card">
        <div className="notification-detail-topline"><PriorityBadge priority={incident.priority} /><StatusBadge status={incident.status} /></div>
        <h2>{incident.title}</h2>
        <p className="notification-detail-message">{incident.summary}</p>
        <dl className="notification-detail-grid">
          <div><dt>รหัสเหตุการณ์</dt><dd>{incident.id}</dd></div>
          <div><dt>สถานะ</dt><dd><StatusBadge status={incident.status} /></dd></div>
          <div><dt>ผู้รับผิดชอบ</dt><dd>{incident.assignee || 'ยังไม่มอบหมาย'}</dd></div>
          <div><dt>รับทราบโดย</dt><dd>{incident.acknowledgedBy || 'ยังไม่ได้รับทราบ'}</dd></div>
          <div><dt>วันที่รับทราบ</dt><dd>{incident.acknowledgedAt ? formatThaiDateTime(incident.acknowledgedAt) : '—'}</dd></div>
          <div><dt>วันที่ปรับปรุงล่าสุด</dt><dd>{formatThaiDateTime(incident.updatedAt)}</dd></div>
          <div><dt>หลักฐานอ้างอิง</dt><dd>{incident.evidenceRef || 'ยังไม่มีหลักฐานอ้างอิง'}</dd></div>
          <div><dt>ผลการตรวจสอบ</dt><dd>{incident.investigationOutcome || 'ยังไม่ได้สรุปผล'}</dd></div>
        </dl>

        {relatedNotification && (
          <Alert variant="light" className="notification-related-record">
            <div><strong>การแจ้งเตือนต้นทาง</strong><span className="d-block small text-muted">{relatedNotification.id} · {relatedNotification.title}</span></div>
            <Button as={Link} to={`/notifications/${relatedNotification.id}`} size="sm" variant="outline-primary">เปิดแจ้งเตือน <ArrowUpRight size={14} /></Button>
          </Alert>
        )}
        {relatedIncidents.length > 0 && (
          <div className="incident-related-list">
            <h3 className="h6">เหตุการณ์ที่เชื่อมโยง</h3>
            {relatedIncidents.map((item) => <Link key={item.id} to={`/security/incidents/${item.id}`} state={{ backTo }}>{item.id} · {item.title} <ArrowUpRight size={14} /></Link>)}
          </div>
        )}

        <div className="incident-workflow">
          <h3 className="h6">ขั้นตอนดำเนินการ</h3>
          <div className="incident-workflow-actions">
            {incident.status === 'reported' && <Button onClick={() => acknowledgeIncident(incident.id)}><Check size={15} /> รับทราบเหตุการณ์</Button>}
            {incident.status === 'acknowledged' && <Button variant="outline-primary" onClick={() => startIncidentInvestigation(incident.id)}>เริ่มตรวจสอบ</Button>}
            {['resolved', 'false_positive'].includes(incident.status) && <span className="incident-complete-message">ปิดขั้นตอนแล้ว · ข้อมูลสถานะนี้เป็นตัวอย่างจำลอง</span>}
            {incident.status === 'investigating' && (
              <Form className="incident-resolution-form" onSubmit={submitResolution}>
                <Form.Group className="mb-3">
                  <Form.Label>ผลการตรวจสอบ</Form.Label>
                  <Form.Control as="textarea" rows={3} value={outcome} onChange={(event) => setOutcome(event.target.value)} required placeholder="สรุปผลการตรวจสอบจากข้อมูลตัวอย่าง" />
                </Form.Group>
                <div className="incident-resolution-fields">
                  <Form.Group>
                    <Form.Label>หลักฐานอ้างอิง</Form.Label>
                    <Form.Control value={evidenceRef} onChange={(event) => setEvidenceRef(event.target.value)} required placeholder="เช่น EVD-2026-021-R1" />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>ผลสรุป</Form.Label>
                    <Form.Select value={resolution} onChange={(event) => setResolution(event.target.value)}>
                      <option value="resolved">ยืนยันและปิดเหตุการณ์</option>
                      <option value="false_positive">จัดเป็นผลบวกลวง</option>
                    </Form.Select>
                  </Form.Group>
                </div>
                {error && <Alert variant="danger" className="mt-3 mb-0">{error}</Alert>}
                {saved && <Alert variant="success" className="mt-3 mb-0">บันทึกผลในข้อมูลจำลองแล้ว</Alert>}
                <Button type="submit" className="mt-3">บันทึกผลการตรวจสอบ</Button>
              </Form>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
