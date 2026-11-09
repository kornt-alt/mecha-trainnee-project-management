// frontend/src/context/MockDataContext.js — Shared in-memory Mock state ของแอป (Projects + Tasks)
// มีชีวิตเท่ากับการ mount ของแอปเท่านั้น (refresh/reset จะกลับชุดเริ่มต้นเสมอ) · ห้าม persist ลง storage
// เดิมแต่ละหน้าเคยทำ useState(copy) เอง — พอเสียบเป็น consumer แล้วข้อมูลข้ามหน้าจะเห็นชุดเดียวกัน
import { createContext, useContext, useMemo, useRef, useState } from 'react';
import { MOCK_TASKS, MOCK_PROJECTS_FALLBACK, applyTaskSync } from '../data/mockData';

// Context รับรองเฉพาะ dataset ที่ควรเป็น shared mutable จริง ๆ = Projects + Tasks (ตามที่ผ่านการ audit และอนุมัติ P-1)
export const MockDataContext = createContext(null);

export function MockDataProvider({ children }) {
  // lazy init: clone สำหรับทุก mount — ห้ามอ้าง array ต้นทางเพื่อเปลี่ยนลง mock จริงใน module
  const [projects, setProjects] = useState(() => [...MOCK_PROJECTS_FALLBACK]);
  const [tasks, setTasks] = useState(() => [...MOCK_TASKS]);

  // ref เก็บ state ล่าสุด — ให้ handler อ่านค่าปัจจุบันจริงตอนรวมอัปเดต กัน stale closure เมื่อยิงซ้ำติดกัน
  const stateRef = useRef({ tasks, projects });
  stateRef.current = { tasks, projects };

  // จุดรวมอัปเดตเมื่อ tasks เปลี่ยน: คำนวณ task ใหม่และ metrics ของเฉพาะโปรเจกต์ที่เกี่ยวข้อง
  // จากชุด task ล่าสุดพร้อมกัน (ทำงานคู่กับทั้ง Add Task และเปลี่ยนสถานะ Kanban)
  const updateTasksAndSyncProjects = (mutateTasks, projectIds) => {
    const next = applyTaskSync(stateRef.current, mutateTasks, projectIds);
    stateRef.current = next; // chain อัปเดตใน tick เดียวกันให้ใช้ state ใหม่เสมอ
    setTasks(next.tasks);
    setProjects(next.projects);
  };

  // ค่ารวม context — สร้างใหม่เมื่อ state เปลี่ยนเท่านั้น (updater ใช้ ref/setter ตัว stable ทั้งหมด)
  const value = useMemo(
    () => ({ projects, setProjects, tasks, setTasks, updateTasksAndSyncProjects }),
    [projects, setProjects, tasks, setTasks, updateTasksAndSyncProjects]
  );

  return <MockDataContext.Provider value={value}>{children}</MockDataContext.Provider>;
}

export function useMockData() {
  const ctx = useContext(MockDataContext);
  if (!ctx) {
    throw new Error('useMockData ต้องถูกใช้ภายใน <MockDataProvider>');
  }
  return ctx;
}
