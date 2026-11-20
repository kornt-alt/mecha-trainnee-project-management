// frontend/src/components/Layout.js — โครงหน้าหลัก: จัดวาง sidebar ด้านซ้าย (รวมเมนูนำทางและโปรไฟล์ผู้ใช้ด้านล่าง), Header ด้านบน, และพื้นที่แสดงผลหน้าย่อย (<Outlet>)
import React from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { Dropdown, Badge } from 'react-bootstrap';
import { ADMIN_NAV, NAV } from './nav';
import Header from './Header';
import {
  House,
  Folder,
  ClipboardList,
  ChartNoAxesColumn,
  Settings,
  Layers,
  UserRound,
  LogOut,
  Bell,
  CircleAlert,
  Activity,
  FileText,
  Users,
} from './common/Icons';
import { useMockData } from '../context/MockDataContext';
import { clearLoginSession, useLoginSession } from '../utils/session';

const ICONS = {
  House,
  Folder,
  ClipboardList,
  ChartNoAxesColumn,
  Settings,
  Bell,
  CircleAlert,
  Activity,
  FileText,
  Users,
};

// ลิงก์เมนูหนึ่งรายการ — ใช้ร่วมกันทั้งเมนูหลักและเมนูผู้ดูแลระบบ
function NavItem({ item }) {
  const IconComp = ICONS[item.icon] || House;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => `app-nav-link d-flex align-items-center ${isActive ? 'active' : ''}`}
    >
      <IconComp size={18} className="nav-icon me-2" />
      <span className="nav-label">{item.label}</span>
    </NavLink>
  );
}

// TODO(login): เมื่อต่อ /auth/login แล้ว ให้คืน user.role === 'ADMIN' — ตอนนี้แสดงทุกคนเพราะยังไม่มี role จริง
const canSeeAdminMenu = () => true;

export default function Layout() {
  const navigate = useNavigate();
  const session = useLoginSession();
  const { employees, actorId } = useMockData();
  // ผู้ใช้ที่แสดงมุมล่าง = คนที่ login (actorId) ไม่ใช่ CURRENT_USER ตายตัวแบบเดิม
  const me = employees.find((person) => String(person.id) === String(actorId));
  const isGuest = Boolean(session?.guest);

  // ออกจากระบบ = ล้าง session → App.js เปิดหน้าต่าง login ใหม่ที่หน้าหลัก
  const logout = () => {
    clearLoginSession();
    navigate('/');
  };

  return (
    <div className="app-shell">
      {/* ── แถบด้านข้าง (Sidebar) ─────────────────────────── */}
      <aside className="app-sidebar d-flex flex-column justify-content-between">
        <div>
          {/* โลโก้และชื่อระบบ */}
          <Link to="/" className="app-brand d-flex align-items-center gap-2 text-decoration-none">
            <div className="app-brand-icon">
              <Layers size={22} color="var(--blue)" />
            </div>
            <div className="brand-text">
              <span className="brand-title">MECHA Project Management</span>
            </div>
          </Link>

          {/* รายการเมนูหลัก */}
          <nav className="app-nav">
            {NAV.map((item) => <NavItem key={item.to} item={item} />)}
          </nav>

          {/* เมนูผู้ดูแลระบบ (แยกกลุ่มจากงานประจำวัน) */}
          {canSeeAdminMenu() && (
            <nav className="app-nav app-nav-admin" aria-label="เมนูผู้ดูแลระบบ">
              <div className="app-nav-section-title">ผู้ดูแลระบบ (ADMIN)</div>
              {ADMIN_NAV.map((item) => <NavItem key={item.to} item={item} />)}
            </nav>
          )}
        </div>

        {/* ข้อมูลระบบและเมนูโปรไฟล์ผู้ใช้ด้านล่าง */}
        <div className="app-sidebar-footer border-top pt-3 mt-4">
          {/* ข้อมูลองค์กรและเวอร์ชันของระบบ */}
          <div className="sidebar-system-info mb-3 px-1">
            <div className="d-flex align-items-center justify-content-between">
              <span className="system-org fw-semibold text-ink">MECHA</span>
              <span className="version-tag">v0.1.0</span>
            </div>
            <div className="system-sub small text-muted">Project Management System</div>
          </div>

          {/* ใช้ drop="up" เพื่อให้เมนูเปิดขยายขึ้นด้านบน ป้องกันไม่ให้เมนูล้นขอบล่างของหน้าจอ */}
          <Dropdown drop="up" className="sidebar-profile-dropdown">
            <Dropdown.Toggle variant="light" className="sidebar-profile-btn" id="dropdown-user-profile">
              <div className="d-flex align-items-center gap-2 overflow-hidden text-start">
                <div className="user-avatar flex-shrink-0">
                  <UserRound size={18} />
                </div>
                <div className="user-info text-truncate">
                  <div className="user-name text-truncate">{isGuest ? 'ผู้เยี่ยมชม' : me?.name || '-'}</div>
                  <div className="user-role text-truncate">{isGuest ? 'ยังไม่ได้เข้าสู่ระบบ' : me?.position || ''}</div>
                </div>
              </div>
            </Dropdown.Toggle>

            <Dropdown.Menu className="sidebar-profile-menu shadow-sm">
              {!isGuest && me && (
                <div className="px-3 py-2 border-bottom user-menu-header">
                  <div className="fw-semibold text-ink">{me.name}</div>
                  <div className="small text-muted text-truncate">{me.email}</div>
                  <Badge bg="primary" className="mt-1">{me.position}</Badge>
                </div>
              )}
              {/* ข้อมูลโปรไฟล์ / ตั้งค่า ยังไม่มีหน้าจริง จึงไม่แสดงลิงก์ไปหน้าว่าง */}
              <Dropdown.Item onClick={logout} className="d-flex align-items-center py-2 text-danger">
                <LogOut size={16} className="me-2 text-danger" />
                {isGuest ? 'เข้าสู่ระบบ' : 'ออกจากระบบ'}
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </aside>

      {/* ── พื้นที่หลัก (Header + เนื้อหา) ────────────────── */}
      <div className="app-main-wrapper flex-grow-1 d-flex flex-column">
        <Header />
        <main className="app-main flex-grow-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
