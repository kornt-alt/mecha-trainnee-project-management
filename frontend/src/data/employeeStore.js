// frontend/src/data/employeeStore.js — รายชื่อพนักงาน "ล่าสุด" ให้ helper ที่อยู่นอก React ใช้ (ชื่อคน, ค้นตาม id)
//
// ทำไมมี: พนักงานแก้ / เพิ่ม / ปิดบัญชีได้จากหน้าจัดการผู้ใช้แล้ว (state ใน MockDataContext)
// แต่ไฟล์เก่าหลายไฟล์ค้นชื่อด้วย helper ระดับไฟล์ — ให้เรียก currentEmployees() แทน MOCK_EMPLOYEES
// MockDataContext เป็นคนเดียวที่เรียก setCurrentEmployees() (ทุกครั้งที่ state เปลี่ยน) → component ที่ใช้ useMockData() render ใหม่แล้วได้ค่าล่าสุด
// ⚠️ ห้าม import MOCK_EMPLOYEES ตรงใน component — ใช้ useMockData().employees หรือ currentEmployees()
import { MOCK_EMPLOYEES } from './mockData';

let employees = MOCK_EMPLOYEES;

export const currentEmployees = () => employees;
export const setCurrentEmployees = (next) => { employees = next; };
export const findCurrentEmployee = (id) => employees.find((employee) => String(employee.id) === String(id));
