// frontend/src/components/Home.js — หน้าแรก (placeholder) + เช็คว่า backend / DB พร้อมหรือยัง
import { Alert, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useLoad } from '../utils/api';

export default function Home() {
  const { data, error, loading } = useLoad('/health');

  return (
    <>
      <h1 className="page-title">จัดการและติดตามสถานะโปรเจกต์</h1>

      {loading && <Alert variant="secondary">กำลังเช็คการเชื่อมต่อ…</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}
      {data && data.db !== 'up' && (
        <Alert variant="danger">
          backend ทำงานแต่ต่อฐานข้อมูลไม่ได้ — เช็คค่า DB_* ใน backend/.env แล้วรัน npm run db:apply
        </Alert>
      )}
      {data && data.db === 'up' && <Alert variant="success">ระบบพร้อมใช้งาน</Alert>}

      <Card body>
        เริ่มต้นที่หน้า <Link to="/projects">โปรเจกต์</Link> — เพิ่ม / แก้ไข / เปลี่ยนสถานะโปรเจกต์ได้
      </Card>
    </>
  );
}
