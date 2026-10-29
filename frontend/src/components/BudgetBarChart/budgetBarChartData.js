// frontend/src/components/BudgetBarChart/budgetBarChartData.js
// ตัวเลือกโหมด/สถานะ + แหล่งสีรายหมวด + adapter แปลงข้อมูลโปรเจกต์และ cost record ของระบบ
// เป็นโครงข้อมูล categories ที่ BudgetBarChart ใช้ (รูปแบบเดียวกับ reference dashboard)
import { PROJECT_STATUSES } from '../../utils/config.js';
import { MOCK_EMPLOYEES } from '../../data/mockData.js';

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

// โทนสีต่อหมวด: แท่งซ้าย (planned) สีสว่าง / แท่งขวา (actual) โทนเข้มของครอบครัวเดียวกัน
// — โครงสีตาม reference (พัฒนาซอฟต์แวร์=blue, โครงสร้างพื้นฐาน=emerald, ออกแบบ=amber, ข้อมูล&AI=violet, การตลาด=pink)
const CATEGORY_COLOR_PALETTES = [
  [
    { plannedColor: '#3B82F6', actualColor: '#1D4ED8' },
    { plannedColor: '#60A5FA', actualColor: '#2563EB' },
    { plannedColor: '#93C5FD', actualColor: '#3B82F6' },
  ],
  [
    { plannedColor: '#10B981', actualColor: '#047857' },
    { plannedColor: '#34D399', actualColor: '#059669' },
    { plannedColor: '#6EE7B7', actualColor: '#10B981' },
  ],
  [
    { plannedColor: '#F59E0B', actualColor: '#B45309' },
    { plannedColor: '#FBBF24', actualColor: '#D97706' },
    { plannedColor: '#FCD34D', actualColor: '#F59E0B' },
  ],
  [
    { plannedColor: '#8B5CF6', actualColor: '#5B21B6' },
    { plannedColor: '#A78BFA', actualColor: '#6D28D9' },
    { plannedColor: '#C4B5FD', actualColor: '#7C3AED' },
  ],
  [
    { plannedColor: '#EC4899', actualColor: '#9D174D' },
    { plannedColor: '#F472B6', actualColor: '#BE185D' },
    { plannedColor: '#F9A8D4', actualColor: '#DB2777' },
  ],
  [
    { plannedColor: '#14B8A6', actualColor: '#0F766E' },
    { plannedColor: '#2DD4BF', actualColor: '#0D9488' },
    { plannedColor: '#5EEAD4', actualColor: '#14B8A6' },
  ],
];

const pickPalette = (categoryIndex, projectIndex) => {
  const palette = CATEGORY_COLOR_PALETTES[categoryIndex % CATEGORY_COLOR_PALETTES.length];
  return palette[projectIndex % palette.length];
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
      ...pickPalette(categoryIndexByName.get(categoryName), projectIndex),
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
