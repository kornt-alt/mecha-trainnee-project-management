// frontend/src/components/nav.js — รายการเมนูใน sidebar (เพิ่มหน้าใหม่ให้เพิ่มที่นี่ + <Route> ใน App.js)
// to = path ใต้ APP_BASE (ไม่ต้องใส่ /PROJECT-MANAGEMENT — Router basename ต่อให้)
export const NAV = [
  { to: '/', label: 'หน้าหลัก', icon: 'House', end: true },
  { to: '/projects', label: 'โปรเจกต์', icon: 'Folder' },
  { to: '/tasks', label: 'ตารางงาน', icon: 'ClipboardList' },
  { to: '/reports', label: 'รายงาน', icon: 'ChartNoAxesColumn' },
  { to: '/settings', label: 'ตั้งค่า', icon: 'Settings' },
];
