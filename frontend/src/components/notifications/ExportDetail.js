// Export package detail and explicitly simulated integrity manifest results.
import React from 'react';
import { Button, Card, Table } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { useNotificationCenter } from '../../context/NotificationCenterContext';
import { formatThaiDateTime } from '../../utils/notificationCenterUtils';
import { ChevronLeft } from '../common/Icons';
import { MockDataNotice, PageHeading, StatusBadge } from './NotificationCenterComponents';

export default function ExportDetail() {
  const { exportId } = useParams();
  const { exports, incidents } = useNotificationCenter();
  const record = exports.find((item) => String(item.id) === String(exportId));

  if (!record) {
    return (
      <div className="notification-page">
        <PageHeading title="ไม่พบแพ็กเกจส่งออก" description="รหัสแพ็กเกจนี้ไม่มีอยู่ในข้อมูลตัวอย่าง" />
        <Button as={Link} to="/exports" variant="outline-primary">กลับประวัติการส่งออก</Button>
      </div>
    );
  }

  const linkedIncidents = record.incidentIds
    .map((id) => incidents.find((incident) => String(incident.id) === String(id)))
    .filter(Boolean);

  return (
    <div className="notification-page">
      <PageHeading title="รายละเอียดแพ็กเกจส่งออก" description={`${record.id} · สร้างเมื่อ ${formatThaiDateTime(record.createdAt)}`} />
      <Button as={Link} to="/exports" variant="link" className="notification-back-link"><ChevronLeft size={15} /> กลับประวัติการส่งออก</Button>
      <MockDataNotice />
      <Card className="notification-detail-card export-detail-card">
        <div className="notification-detail-topline"><StatusBadge status={record.status} type="export" /><span className={`integrity-pill integrity-${record.integrityStatus}`}>{record.integrityStatus === 'mock_verified' ? 'SHA-256 ผ่าน (จำลอง)' : record.integrityStatus === 'mock_pending' ? 'รอตรวจสอบ (จำลอง)' : 'SHA-256 ไม่ตรงกัน (จำลอง)'}</span></div>
        <h2>{record.packageName}</h2>
        <dl className="notification-detail-grid export-metadata-grid">
          <div><dt>Export ID</dt><dd>{record.id}</dd></div>
          <div><dt>วันที่สร้าง</dt><dd>{formatThaiDateTime(record.createdAt)}</dd></div>
          <div><dt>ผู้สร้าง</dt><dd>{record.createdBy}</dd></div>
          <div><dt>จำนวนรายการ</dt><dd>{record.recordCount} รายการตัวอย่าง</dd></div>
          <div><dt>สถานะการกักกัน</dt><dd>{record.quarantineStatus === 'quarantined' ? <span className="quarantine-label">กักกัน</span> : 'ไม่กักกัน'}</dd></div>
          <div><dt>ผลตรวจสอบแพ็กเกจ</dt><dd>{record.integrityStatus === 'mock_verified' ? 'SHA-256 ตรงกับ manifest ตัวอย่าง' : record.integrityStatus === 'mock_pending' ? 'รอผลตรวจสอบตัวอย่าง' : 'ค่าไม่ตรงกับ manifest ตัวอย่าง'}</dd></div>
        </dl>

        <div className="integrity-manifest-section">
          <div className="manifest-heading"><div><h3 className="h6 mb-1">Integrity Manifest</h3><p className="small text-muted mb-0">รายการไฟล์และค่า SHA-256 ที่จัดเตรียมไว้สำหรับสาธิต</p></div><span className="integrity-pill">ผลจำลอง</span></div>
          <div className="table-responsive notification-standard-table">
            <Table className="mb-0 align-middle manifest-table">
              <thead><tr><th>ไฟล์</th><th>SHA-256 ตัวอย่าง</th><th>ผลตรวจสอบ</th></tr></thead>
              <tbody>
                {record.manifest.map((entry) => (
                  <tr key={entry.fileName}>
                    <td data-label="ไฟล์">{entry.fileName}</td>
                    <td data-label="SHA-256 ตัวอย่าง"><code className="manifest-digest">{entry.sha256}</code></td>
                    <td data-label="ผลตรวจสอบ"><span className={`integrity-pill integrity-${entry.verificationStatus}`}>{entry.verificationStatus === 'mock_match' ? 'ตรงกัน (จำลอง)' : entry.verificationStatus === 'mock_pending' ? 'รอตรวจสอบ (จำลอง)' : 'ไม่ตรงกัน (จำลอง)'}</span></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>

        {linkedIncidents.length > 0 && (
          <div className="incident-related-list">
            <h3 className="h6">เหตุการณ์ที่เชื่อมโยง</h3>
            {linkedIncidents.map((incident) => <Link key={incident.id} to={`/security/incidents/${incident.id}`}>{incident.id} · {incident.title}</Link>)}
          </div>
        )}
      </Card>
    </div>
  );
}
