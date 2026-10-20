// frontend/src/components/Layout.js — โครงหน้า: sidebar เมนู + เนื้อหาของแต่ละหน้า (<Outlet>)
import { NavLink, Outlet } from 'react-router-dom';
import { NAV } from './nav';

export default function Layout() {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand">Project Management</div>
        <nav className="app-nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
