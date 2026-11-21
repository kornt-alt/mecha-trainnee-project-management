// frontend/src/App.js — รวม route ของทุกหน้า
//
// เพิ่มหน้าใหม่: สร้าง components/<Page>.js → เพิ่ม <Route> ข้างล่าง → เพิ่มเมนูใน components/nav.js
import { useEffect, useLayoutEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './components/Home';
import About from './components/About';
import Projects from './components/Projects';
import ProjectDetail from './components/project-detail/ProjectDetail';
import Tasks from './components/Tasks';
import Reports from './components/Reports';
import Workload from './components/Workload';
import PlaceholderPage from './components/PlaceholderPage';
import NotFound from './components/NotFound';
import NotificationCenter from './components/notifications/NotificationCenter';
import NotificationDetail from './components/notifications/NotificationDetail';
import SecurityIncidents from './components/notifications/SecurityIncidents';
import SecurityIncidentDetail from './components/notifications/SecurityIncidentDetail';
import AuditLog from './components/notifications/AuditLog';
import ExportHistory from './components/notifications/ExportHistory';
import ExportDetail from './components/notifications/ExportDetail';
import UserManagement from './components/admin/UserManagement';
import RequireAdmin from './components/admin/RequireAdmin';
import { APP_BASE } from './utils/config';
import { MockDataProvider, useMockData } from './context/MockDataContext';
import { NotificationCenterProvider } from './context/NotificationCenterContext';
import LoginModal from './components/auth/LoginModal';
import { continueAsGuest, setLoginSession, useLoginSession } from './utils/session';

// ⚠️ ไม่ import CSS ที่นี่ — ทั้งแอป import ที่ src/index.js ที่เดียวเพื่อคุมลำดับ

function RoutedApplication() {
  const session = useLoginSession();
  const { setActorId } = useMockData();
  // เด้งครั้งเดียวต่อ session — login แล้ว หรือกดปิด (ผู้เยี่ยมชม) จะไม่เด้งอีกจนกว่าจะออกจากระบบ (utils/session.js)
  // แสดงได้ทุกหน้า รวมหน้าโปรเจกต์ (ลิงก์ตรงยังดูได้ — กดปิดเป็นผู้เยี่ยมชม) · ออกจากระบบแล้วเด้งทับหน้าเดิม = ใช้เปลี่ยนผู้ใช้
  const showLogin = !session;
  const [backgroundState, setBackgroundState] = useState('obscured');
  const isObscured = showLogin && backgroundState === 'obscured';
  const isRevealed = showLogin && backgroundState === 'revealed';
  const backgroundClassName = [
    'login-app-background',
    isObscured && 'is-obscured',
    isRevealed && 'is-revealed',
  ].filter(Boolean).join(' ');

  useLayoutEffect(() => {
    setBackgroundState(showLogin ? 'obscured' : 'clear');
  }, [showLogin]);

  // refresh หน้าแล้วยังเป็นคนเดิม — ตั้งผู้ใช้ปัจจุบันของ mock data ตาม session
  useEffect(() => {
    if (session?.employeeId) setActorId(session.employeeId);
  }, [session, setActorId]);

  const handleLoggedIn = (employee) => {
    setActorId(employee.id);
    setLoginSession(employee.id);
  };

  return (
    <>
      <div
        className={backgroundClassName}
        aria-hidden={isObscured ? 'true' : undefined}
        inert={isObscured}
      >
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="projects" element={<Projects />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="workload" element={<Workload />} />
            <Route path="reports" element={<Reports />} />
            <Route path="notifications" element={<NotificationCenter />} />
            <Route path="notifications/:notificationId" element={<NotificationDetail />} />
            {/* หน้าผู้ดูแลระบบ — ไม่ใช่ ADMIN เห็นข้อความแทน (เมนูก็ซ่อนใน Layout) */}
            <Route path="admin/users" element={<RequireAdmin><UserManagement /></RequireAdmin>} />
            <Route path="security/incidents" element={<RequireAdmin><SecurityIncidents /></RequireAdmin>} />
            <Route path="security/incidents/:incidentId" element={<RequireAdmin><SecurityIncidentDetail /></RequireAdmin>} />
            <Route path="audit-log" element={<RequireAdmin><AuditLog /></RequireAdmin>} />
            <Route path="exports" element={<RequireAdmin><ExportHistory /></RequireAdmin>} />
            <Route path="exports/:exportId" element={<RequireAdmin><ExportDetail /></RequireAdmin>} />
            <Route
              path="settings"
              element={
                <PlaceholderPage
                  title="ตั้งค่าระบบ"
                  description="การตั้งค่าโปรไฟล์ผู้ใช้งาน การแจ้งเตือน และการเชื่อมต่อฐานข้อมูล"
                />
              }
            />
            <Route path="about" element={<About />} />
            {/* Project Workspace อยู่ใน Layout ด้วย — เดิมอยู่นอก ทำให้ sidebar / Header / กระดิ่งหายเวลาเข้าโปรเจกต์ */}
            <Route path="projects/:projectId" element={<ProjectDetail />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </div>
      {showLogin && <LoginModal onBackgroundChange={setBackgroundState} onLoggedIn={handleLoggedIn} onDismiss={continueAsGuest} />}
    </>
  );
}

export default function App() {
  return (
    <Router basename={APP_BASE}>
      <NotificationCenterProvider>
        <MockDataProvider>
          <RoutedApplication />
        </MockDataProvider>
      </NotificationCenterProvider>
    </Router>
  );
}
