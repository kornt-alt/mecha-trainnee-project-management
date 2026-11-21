// frontend/src/components/admin/RequireAdmin.js — ห่อหน้าผู้ดูแลระบบ: ไม่ใช่ ADMIN เห็นข้อความแทนเนื้อหา
// role มาจาก MockDataContext (useMockData().access.isAdmin) — ต่อ login จริงแล้วใช้ user.role จาก /auth/me (backend เช็กซ้ำด้วย requireAdmin)
import React from 'react';
import { Link } from 'react-router-dom';
import { useMockData } from '../../context/MockDataContext';

export default function RequireAdmin({ children }) {
  const { access } = useMockData();
  if (access.isAdmin) return children;
  return (
    <div className="admin-denied" role="alert">
      <h1 className="h5 fw-bold mb-1">หน้านี้สำหรับผู้ดูแลระบบ</h1>
      <p className="text-muted mb-3">บัญชีของคุณไม่มีสิทธิ์ ADMIN — ติดต่อผู้ดูแลระบบถ้าต้องการใช้งาน</p>
      <Link to="/" className="btn btn-primary btn-sm">กลับหน้าหลัก</Link>
    </div>
  );
}
