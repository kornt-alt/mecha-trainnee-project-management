// frontend/src/App.js — รวม route ของทุกหน้า
//
// เพิ่มหน้าใหม่: สร้าง components/<Page>.js → เพิ่ม <Route> ข้างล่าง → เพิ่มเมนูใน components/nav.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './components/Home';
import About from './components/About';
import Projects from './components/Projects';
import Tasks from './components/Tasks';
import Reports from './components/Reports';
import PlaceholderPage from './components/PlaceholderPage';
import NotFound from './components/NotFound';
import { APP_BASE } from './utils/config';

// ⚠️ ไม่ import CSS ที่นี่ — ทั้งแอป import ที่ src/index.js ที่เดียวเพื่อคุมลำดับ

export default function App() {
  return (
    <Router basename={APP_BASE}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="projects" element={<Projects />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="reports" element={<Reports />} />
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
      </Routes>
    </Router>
  );
}
