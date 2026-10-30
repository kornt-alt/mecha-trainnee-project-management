// frontend/src/components/BudgetBarChart/budgetBarChartData.js
// ตัวเลือกโหมด/สถานะ + แหล่งสีรายหมวด + adapter แปลงข้อมูลโปรเจกต์และ cost record ของระบบ
// เป็นโครงข้อมูล categories ที่ BudgetBarChart ใช้ (รูปแบบเดียวกับ reference dashboard)
import { PROJECT_STATUSES } from '../../utils/config.js';
import { MOCK_EMPLOYEES } from '../../data/mockData.js';
import {
  CATEGORY_COLORS,
  categoryColorByIndex,
  categoryColorEntry,
  PROJECT_CATEGORY_COLORS,
  getCategoryBaseColor,
  DEFAULT_CATEGORY_COLORS,
  CATEGORY_ALIAS_MAP,
  normalizeCategoryName,
  UNMAPPED_CATEGORY_COLOR,
} from '../../utils/categoryColors.js';
import { hexToHsl, generateCategoryTones } from './budgetBarChartUtils.js';

// ส่งออกต่อเพื่อให้คอมโพเนนต์หรือชุดทดสอบใช้งานต่อได้โดยตรง
export {
  CATEGORY_COLORS,
  categoryColorByIndex,
  categoryColorEntry,
  PROJECT_CATEGORY_COLORS,
  getCategoryBaseColor,
  DEFAULT_CATEGORY_COLORS,
  CATEGORY_ALIAS_MAP,
  normalizeCategoryName,
  UNMAPPED_CATEGORY_COLOR,
};

// โหมดแสดงผลของกราฟ (ลำดับ = ลำดับปุ่มบน toolbar)
export const VIEW_MODE_OPTIONS = [
  { value: 'comparison', label: 'เปรียบเทียบทั้งคู่ (Side-by-Side)' },
  { value: 'planned', label: 'งบวางแผน (Planned)', swatch: 'planned' },
  { value: 'actual', label: 'ค่าใช้จ่ายจริง (Actual)', swatch: 'actual' },
  { value: 'variance', label: 'ผลต่างงบประมาณ', swatch: 'variance' },
];

// ตัวกรองสถานะใช้ key จริงของระบบจาก utils/config.js (ไม่สร้างชื่อสถานะใหม่)
export const STATUS_OPTIONS = PROJECT_STATUSES.map((status) => ({ value: status.key, label: status.label }));

// ตัวเลือกช่วงเวลาย้อนหลังของ cost record (เดือน)
export const RANGE_OPTIONS = [
  { value: 1, label: '1 เดือนย้อนหลัง' },
  { value: 2, label: '2 เดือนย้อนหลัง' },
  { value: 3, label: '3 เดือนย้อนหลัง' },
  { value: 6, label: '6 เดือนย้อนหลัง' },
  { value: 9, label: '9 เดือนย้อนหลัง' },
  { value: 12, label: '12 เดือน (1 ปี) ย้อนหลัง' },
];

const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export const formatThaiMonth = (yearMonth) => {
  if (!yearMonth || typeof yearMonth !== 'string') return '';
  const [yyyy, mm] = yearMonth.split('-').map(Number);
  if (!yyyy || !mm || mm < 1 || mm > 12) return yearMonth;
  return `${THAI_MONTH_NAMES[mm - 1]} ${yyyy + 543}`;
};

// โครงสีแม่แบบอ้างอิงจาก Project Category Distribution (ProjectCategoryTreemap.js)
export const TREEMAP_CATEGORY_BASE_COLORS = {
  'ระบบซอฟต์แวร์': { token: 'var(--blue)', hex: PROJECT_CATEGORY_COLORS['ระบบซอฟต์แวร์'], ...hexToHsl(PROJECT_CATEGORY_COLORS['ระบบซอฟต์แวร์']) },
  'คุณภาพและทดสอบ': { token: 'var(--green)', hex: PROJECT_CATEGORY_COLORS['คุณภาพและทดสอบ'], ...hexToHsl(PROJECT_CATEGORY_COLORS['คุณภาพและทดสอบ']) },
  'เอกสารและการฝึกอบรม': { token: 'var(--amber)', hex: PROJECT_CATEGORY_COLORS['เอกสารและการฝึกอบรม'], ...hexToHsl(PROJECT_CATEGORY_COLORS['เอกสารและการฝึกอบรม']) },
  'ระบบอัตโนมัติ': { token: 'var(--muted)', hex: PROJECT_CATEGORY_COLORS['ระบบอัตโนมัติ'], ...hexToHsl(PROJECT_CATEGORY_COLORS['ระบบอัตโนมัติ']) },
  'ระบบองค์กร': { token: 'var(--red)', hex: PROJECT_CATEGORY_COLORS['ระบบองค์กร'], ...hexToHsl(PROJECT_CATEGORY_COLORS['ระบบองค์กร']) },
  'ซ่อมบำรุง': { token: 'var(--blue-hover)', hex: PROJECT_CATEGORY_COLORS['ซ่อมบำรุง'], ...hexToHsl(PROJECT_CATEGORY_COLORS['ซ่อมบำรุง']) },
};

// คำนวณพาเลตต์สีสลับโทน (Tonal Variations) แบบ Programmatic จากแม่สีหลักใน PROJECT_CATEGORY_COLORS
export const CATEGORY_COLOR_PALETTES = Object.values(PROJECT_CATEGORY_COLORS).slice(0, 6).map((baseColor) =>
  Array.from({ length: 8 }, (_, i) => ({
    plannedColor: generateCategoryTones(baseColor, i, true),
    actualColor: generateCategoryTones(baseColor, i, false),
  }))
);

export const pickPalette = (categoryName, projectIndex, categoryIndex = 0) => {
  const baseColor = getCategoryBaseColor(categoryName, categoryIndex);
  return {
    plannedColor: generateCategoryTones(baseColor, projectIndex, true),
    actualColor: generateCategoryTones(baseColor, projectIndex, false),
    baseColor,
  };
};

const employeeNameById = new Map(MOCK_EMPLOYEES.map((employee) => [employee.id, employee.name]));

/**
 * คำนวณรายชื่อเดือน YYYY-MM ย้อนหลังตามจำนวนเดือนที่ระบุ โดยอิงวันปัจจุบันเป็นจุดอ้างอิง
 */
export const getTargetMonths = (monthsBack = 6, referenceDate = new Date()) => {
  const ref = new Date(referenceDate);
  const targetMonths = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const target = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    targetMonths.push(`${yyyy}-${mm}`);
  }
  return targetMonths;
};

/**
 * แปลงโปรเจกต์ + cost record รายเดือน เป็น categories ของกราฟ:
 * - planned  = plannedBudget ของโปรเจกต์ (ฟิลด์ตัวอย่างใน mock data เพื่อการพัฒนา UI)
 * - actual   = ผลรวม cost record ภายในช่วง monthsBack เดือนล่าสุดที่มีข้อมูล
 *              (record เป็นยอดรายเดือนต่อโปรเจกต์ — รวมเฉพาะเดือนในหน้าต่างที่เลือก จึงไม่นับซ้ำ)
 * คืน availableMonthCount, matchedMonths และ rangeNotice เมื่อช่วงที่เลือกเกินบันทึกข้อมูลจริงที่มี
 */
export const buildBudgetCategories = (projects = [], costItems = [], monthsBack = 6, referenceDate = new Date()) => {
  const projectList = Array.isArray(projects) ? projects : [];
  const records = (Array.isArray(costItems) ? costItems : []).filter(
    (item) => item && Number.isFinite(Number(item.amount)) && Number(item.amount) >= 0,
  );

  // คำนวณช่วงเดือนปฏิทินย้อนหลังโดยอ้างอิงจากวันปัจจุบัน
  const targetMonths = getTargetMonths(monthsBack, referenceDate);
  const targetMonthSet = new Set(targetMonths);

  // เดือนทั้งหมดที่มีบันทึกจริงในชุดข้อมูล (ไม่สร้างข้อมูลเท็จเพิ่ม)
  const allRecordedMonths = [...new Set(records.map((item) => item.month))].filter(Boolean).sort();
  const availableMonthCount = allRecordedMonths.length;

  // เดือนที่มีข้อมูลบันทึกจริงตรงกับช่วงเวลาที่เลือก
  const matchedMonths = allRecordedMonths.filter((m) => targetMonthSet.has(m));

  // รวมค่าใช้จ่ายจริงเฉพาะ record ที่อยู่ในช่วงเดือนที่เลือกและมีอยู่จริง
  const actualByProject = {};
  records.forEach((item) => {
    if (!targetMonthSet.has(item.month)) return;
    const amount = Number(item.amount);
    if (!Number.isFinite(amount) || amount < 0) return;
    actualByProject[item.projectId] = (actualByProject[item.projectId] || 0) + amount;
  });

  const categories = [];
  const categoryIndexByName = new Map();
  const projectIndexByCategory = new Map();

  projectList.forEach((project) => {
    if (!project) return;
    const categoryName = project.category || 'ไม่ระบุหมวดหมู่';
    if (!categoryIndexByName.has(categoryName)) {
      categoryIndexByName.set(categoryName, categories.length);
      projectIndexByCategory.set(categoryName, 0);
      categories.push({ id: `cat-${categoryIndexByName.get(categoryName) + 1}`, name: categoryName, projects: [] });
    }
    const category = categories[categoryIndexByName.get(categoryName)];
    const projectIndex = projectIndexByCategory.get(categoryName);
    projectIndexByCategory.set(categoryName, projectIndex + 1);

    // ป้องกันการใส่ค่างบประมาณสมมุติเมื่อไม่มีข้อมูล และคำนวณแยกจากค่าใช้จ่ายจริงอย่างชัดเจน
    const hasValidPlanned = Number.isFinite(Number(project.plannedBudget)) && Number(project.plannedBudget) >= 0;
    const plannedValue = hasValidPlanned ? Number(project.plannedBudget) : 0;

    category.projects.push({
      id: String(project.id),
      name: project.name,
      planned: plannedValue,
      actual: actualByProject[project.id] || 0,
      status: project.status,
      manager: employeeNameById.get(project.managerId) || project.owner || '',
      ...pickPalette(categoryName, projectIndex, categoryIndexByName.get(categoryName)),
    });
  });

  // แจ้งเตือนภาษาไทยเมื่อเลือกช่วงเวลาที่บันทึกข้อมูลย้อนหลังมีไม่ครบ (เช่น 9 หรือ 12 เดือน)
  let rangeNotice = null;
  if (monthsBack > matchedMonths.length && matchedMonths.length > 0) {
    const startThai = formatThaiMonth(matchedMonths[0]);
    const endThai = formatThaiMonth(matchedMonths[matchedMonths.length - 1]);
    rangeNotice = `ข้อมูลค่าใช้จ่ายจริงย้อนหลังมีบันทึกเพียง ${matchedMonths.length} เดือน (${startThai} – ${endThai}) เนื่องจากระบบจัดเก็บข้อมูลประวัติย้อนหลังได้สูงสุด 6 เดือน ยอดค่าใช้จ่ายจริงที่แสดงจึงคำนวณจากข้อมูลที่มีบันทึกจริงเท่านั้น (ไม่ได้หมายถึงค่าใช้จ่ายจริงครบ ${monthsBack} เดือน หรือเดือนที่ขาดหายไปเป็นศูนย์)`;
  }

  return { categories, availableMonthCount, matchedMonths, rangeNotice };
};
