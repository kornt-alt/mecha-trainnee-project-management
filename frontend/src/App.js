// frontend/src/App.js — รวม route ของทุกหน้า
//
// เพิ่มหน้าใหม่: สร้าง components/<Page>.js → เพิ่ม <Route> ข้างล่าง → เพิ่มเมนูใน components/nav.js
import { useLayoutEffect, useState } from 'react';
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
import { MockDataProvider } from './context/MockDataContext';
import { NotificationCenterProvider } from './context/NotificationCenterContext';
import LoginModal from './components/auth/LoginModal';

// ⚠️ ไม่ import CSS ที่นี่ — ทั้งแอป import ที่ src/index.js ที่เดียวเพื่อคุมลำดับ

function RoutedApplication() {
  const location = useLocation();
  const isDashboardRoute = location.pathname === '/';
  const [backgroundState, setBackgroundState] = useState('obscured');
  const isObscured = isDashboardRoute && backgroundState === 'obscured';
  const isRevealed = isDashboardRoute && backgroundState === 'revealed';
  const backgroundClassName = [
    'login-app-background',
    isObscured && 'is-obscured',
    isRevealed && 'is-revealed',
  ].filter(Boolean).join(' ');

  useLayoutEffect(() => {
    setBackgroundState(isDashboardRoute ? 'obscured' : 'clear');
  }, [isDashboardRoute]);

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
                  title="ตั้งค่าระบบ (Settings)"
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
      {isDashboardRoute && <LoginModal onBackgroundChange={setBackgroundState} />}
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
