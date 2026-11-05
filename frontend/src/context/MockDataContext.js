// frontend/src/context/MockDataContext.js — Shared in-memory Mock state ของแอป (Projects + Tasks)
// มีชีวิตเท่ากับการ mount ของแอปเท่านั้น (refresh/reset จะกลับชุดเริ่มต้นเสมอ) · ห้าม persist ลง storage
// เดิมแต่ละหน้าเคยทำ useState(copy) เอง — พอเสียบเป็น consumer แล้วข้อมูลข้ามหน้าจะเห็นชุดเดียวกัน
import { createContext, useContext, useMemo, useState } from 'react';
import { MOCK_TASKS, MOCK_PROJECTS_FALLBACK } from '../data/mockData';

// Context รับรองเฉพาะ dataset ที่ควรเป็น shared mutable จริง ๆ = Projects + Tasks (ตามที่ผ่านการ audit และอนุมัติ P-1)
export const MockDataContext = createContext(null);

export function MockDataProvider({ children }) {
  // lazy init: clone สำหรับทุก mount — ห้ามอ้าง array ต้นทางเพื่อเปลี่ยนลง mock จริงใน module
  const [projects, setProjects] = useState(() => [...MOCK_PROJECTS_FALLBACK]);
  const [tasks, setTasks] = useState(() => [...MOCK_TASKS]);

  // ค่ารวม context — สร้างใหม่เมื่อ state เปลี่ยนเท่านั้น
  const value = useMemo(() => ({ projects, setProjects, tasks, setTasks }), [projects, setProjects, tasks, setTasks]);

  return <MockDataContext.Provider value={value}>{children}</MockDataContext.Provider>;
}

export function useMockData() {
  const ctx = useContext(MockDataContext);
  if (!ctx) {
    throw new Error('useMockData ต้องถูกใช้ภายใน <MockDataProvider>');
  }
  return ctx;
}
