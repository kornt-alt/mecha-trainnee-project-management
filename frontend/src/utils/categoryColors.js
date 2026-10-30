// frontend/src/utils/categoryColors.js — สีของ project category ที่ใช้ร่วมกันทั้งระบบ (ไฟล์เดียวเท่านั้น)
//
// Treemap (ProjectCategoryTreemap.js) และ Stacked Bar Graph (BudgetBarChart) ต้องเรียกผ่านไฟล์นี้
// เพื่อให้ category เดียวกันได้สีเดียวกันในทุกกราฟ — ห้าม define palette ซ้ำใน component
//
// ⚠️ ค่าทั้งหมดอ้างอิง CSS variables จาก styles/tokens.css (ห้ามใส่สีตรงตามกติกาของ repo)
// ลำดับใน CATEGORY_COLORS = ลำดับการ assign สี (วนตาม index ของ category หลัง sort)

export const CATEGORY_COLORS = [
  { variable: 'var(--blue)', hex: '#1B4FA0' },
  { variable: 'var(--green)', hex: '#1F7A4D' },
  { variable: 'var(--amber)', hex: '#D97706' },
  { variable: 'var(--muted)', hex: '#5B6B82' },
  { variable: 'var(--red)', hex: '#C42032' },
  { variable: 'var(--blue-hover)', hex: '#153E7E' },
];

/** สี (CSS variable) ของ category ที่อยู่ลำดับ index หลัง sort — วนกลับเมื่อเกินจำนวนสี */
export const categoryColorByIndex = (index) => CATEGORY_COLORS[index % CATEGORY_COLORS.length].variable;

/** สีพร้อม HEX จริง (สำหรับ component ที่ต้องคำนวณ tonal variation เช่น Stacked Bar) */
export const categoryColorEntry = (index) => CATEGORY_COLORS[index % CATEGORY_COLORS.length];
