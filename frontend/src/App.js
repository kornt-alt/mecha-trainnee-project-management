// frontend/src/App.js — รวม route ของทุกหน้า
//
// เพิ่มหน้าใหม่: สร้าง components/<Page>.js → เพิ่ม <Route> ข้างล่าง → เพิ่มเมนูใน components/nav.js
import { useEffect, useLayoutEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
import { APP_BASE } from './utils/config';
import { MockDataProvider, useMockData } from './context/MockDataContext';
import { NotificationCenterProvider } from './context/NotificationCenterContext';
import LoginModal from './components/auth/LoginModal';
import { continueAsGuest, setLoginSession, useLoginSession } from './utils/session';

// ⚠️ ไม่ import CSS ที่นี่ — ทั้งแอป import ที่ src/index.js ที่เดียวเพื่อคุมลำดับ

function RoutedApplication() {
  const location = useLocation();
  const session = useLoginSession();
  const { setActorId } = useMockData();
  // ลิงก์ตรงไปหน้าโปรเจกต์ (เช่น ส่งต่อโปรเจกต์ public) เปิดดูได้เลยโดยไม่เจอหน้าต่าง login ก่อน
  const isProjectDetail = /^\/projects\/[^/]+/.test(location.pathname);
  // เด้งครั้งเดียวต่อ session — login แล้ว หรือกดปิด (ผู้เยี่ยมชม) จะไม่เด้งอีกจนกว่าจะออกจากระบบ (utils/session.js)
  const showLogin = !session && !isProjectDetail;
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
            <Route path="security/incidents" element={<SecurityIncidents />} />
            <Route path="security/incidents/:incidentId" element={<SecurityIncidentDetail />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="exports" element={<ExportHistory />} />
            <Route path="exports/:exportId" element={<ExportDetail />} />
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
            <Route path="*" element={<NotFound />} />
          </Route>
          {/* Project Workspace เป็นหน้าเต็มจอ — อยู่นอก Layout จึงไม่มี sidebar / Header */}
          <Route path="projects/:projectId" element={<ProjectDetail />} />
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
