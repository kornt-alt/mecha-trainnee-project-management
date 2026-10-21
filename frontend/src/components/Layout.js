// frontend/src/components/Layout.js — โครงหน้าหลัก: จัดวาง sidebar ด้านซ้าย (รวมเมนูนำทางและโปรไฟล์ผู้ใช้ด้านล่าง), Header ด้านบน, และพื้นที่แสดงผลหน้าย่อย (<Outlet>)
import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { Dropdown, Badge } from 'react-bootstrap';
import { NAV } from './nav';
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
} from './common/Icons';
import { CURRENT_USER } from '../data/mockData';

const ICONS = {
  House,
  Folder,
  ClipboardList,
  ChartNoAxesColumn,
  Settings,
};

export default function Layout() {
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
              <span className="brand-title">Project Management</span>
            </div>
          </Link>

          {/* รายการเมนูหลัก */}
          <nav className="app-nav">
            {NAV.map((item) => {
              const IconComp = ICONS[item.icon] || House;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `app-nav-link d-flex align-items-center ${isActive ? 'active' : ''}`}
                >
                  <IconComp size={18} className="nav-icon me-2" />
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* ข้อมูลระบบและเมนูโปรไฟล์ผู้ใช้ด้านล่าง */}
        <div className="app-sidebar-footer border-top pt-3 mt-4">
          {/* ข้อมูลองค์กรและเวอร์ชันของระบบ */}
          <div className="sidebar-system-info mb-3 px-1">
            <div className="d-flex align-items-center justify-content-between">
              <span className="system-org fw-semibold text-ink">Mecha Trainee</span>
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
                  <div className="user-name text-truncate">{CURRENT_USER.name}</div>
                  <div className="user-role text-truncate">{CURRENT_USER.title}</div>
                </div>
              </div>
            </Dropdown.Toggle>

            <Dropdown.Menu className="sidebar-profile-menu shadow-sm">
              <div className="px-3 py-2 border-bottom user-menu-header">
                <div className="fw-semibold text-ink">{CURRENT_USER.fullName}</div>
                <div className="small text-muted text-truncate">{CURRENT_USER.email}</div>
                <Badge bg="primary" className="mt-1">{CURRENT_USER.title}</Badge>
              </div>
              <Dropdown.Item as={Link} to="/settings" className="d-flex align-items-center py-2">
                <UserRound size={16} className="me-2 text-muted" />
                ข้อมูลโปรไฟล์
              </Dropdown.Item>
              <Dropdown.Item as={Link} to="/settings" className="d-flex align-items-center py-2">
                <Settings size={16} className="me-2 text-muted" />
                การตั้งค่าระบบ
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item
                onClick={() => alert('ตัวอย่างปุ่มออกจากระบบ (ออกจากระบบสำเร็จ)')}
                className="d-flex align-items-center py-2 text-danger"
              >
                <LogOut size={16} className="me-2 text-danger" />
                ออกจากระบบ
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
