// frontend/src/components/NotFound.js — path ที่ไม่มีหน้า
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <>
      <h1 className="page-title">ไม่พบหน้านี้</h1>
      <Link to="/">กลับหน้าแรก</Link>
    </>
  );
}
