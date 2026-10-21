// frontend/src/components/About.js — เกี่ยวกับระบบ
import { Alert, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useLoad } from '../utils/api';

export default function About() {
  const { data, error, loading } = useLoad('/health');

  return (
    <>
      <h1 className="page-title">เกี่ยวกับระบบ</h1>

      {loading && <Alert variant="secondary">กำลังเช็คการเชื่อมต่อ…</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}
      {data && data.db !== 'up' && (
        <Alert variant="danger">
          backend ทำงานแต่ต่อฐานข้อมูลไม่ได้ — เช็คค่า DB_* ใน backend/.env แล้วรัน npm run db:apply
        </Alert>
      )}
      {data && data.db === 'up' && <Alert variant="success">ระบบพร้อมใช้งาน</Alert>}

      <Card body>
        ระบบจัดการโปรเจกต์นี้ถูกพัฒนาขึ้นเพื่อช่วยให้ทีมงานสามารถจัดการและติดตามสถานะของโปรเจกต์ได้อย่างมีประสิทธิภาพ
        — สามารถเข้าใช้งานได้ที่ <Link to="/">หน้าแรกแดชบอร์ด</Link> หรือ <Link to="/projects">จัดการโปรเจกต์</Link>
      </Card>
    </>
  );
}
