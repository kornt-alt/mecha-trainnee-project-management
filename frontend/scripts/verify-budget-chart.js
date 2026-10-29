// scripts/verify-budget-chart.js — ตรวจสอบการทำงานของฟังก์ชันคำนวณและแปลงข้อมูล BudgetBarChart
const assert = require('assert');
const { MOCK_PROJECTS } = require('../src/data/mockData');
const { MOCK_PROJECT_COST_ITEMS } = require('../src/data/mockProjectCosts');
const {
  RANGE_OPTIONS,
  VIEW_MODE_OPTIONS,
  STATUS_OPTIONS,
  getTargetMonths,
  formatThaiMonth,
  buildBudgetCategories,
} = require('../src/components/BudgetBarChart/budgetBarChartData');
const {
  VIEW_MODES,
  ALL_STATUSES,
  buildChartModel,
  filterCategories,
  formatCurrency,
  formatShortCurrency,
  getTooltipPosition,
} = require('../src/components/BudgetBarChart/budgetBarChartUtils');

console.log('--- เริ่มการตรวจสอบ BudgetBarChart Integration ---');

// 1. ตรวจสอบ mockData: plannedBudget ต้องครบทุกโปรเจกต์และเป็นตัวเลขที่ถูกต้อง
assert.strictEqual(MOCK_PROJECTS.length, 36, 'ต้องมี 36 โปรเจกต์ใน mock data');
MOCK_PROJECTS.forEach((p) => {
  assert.ok(typeof p.plannedBudget === 'number' && p.plannedBudget > 0, `โปรเจกต์ ${p.id} ต้องมี plannedBudget ที่ถูกต้อง`);
});
console.log('✓ 1. mockData: plannedBudget มีครบทั้ง 36 โครงการและเป็นตัวเลขที่ถูกต้อง');

// 2. ตรวจสอบ mockProjectCosts: มี 6 เดือน (2026-05 ถึง 2026-10)
const distinctCostMonths = [...new Set(MOCK_PROJECT_COST_ITEMS.map((c) => c.month))].sort();
assert.deepStrictEqual(distinctCostMonths, ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
console.log('✓ 2. mockProjectCosts: มีข้อมูลค่าใช้จ่ายจริง 6 เดือนตรงตามที่กำหนด (พ.ค. 2026 - ต.ค. 2026)');

// 3. ตรวจสอบ RANGE_OPTIONS: ต้องมี 6 ตัวเลือกครบถ้วน
assert.strictEqual(RANGE_OPTIONS.length, 6, 'ต้องมี 6 ตัวเลือก');
const rangeValues = RANGE_OPTIONS.map((o) => (typeof o === 'object' ? o.value : o));
assert.deepStrictEqual(rangeValues, [1, 2, 3, 6, 9, 12]);
console.log('✓ 3. RANGE_OPTIONS: มีตัวเลือกครบ 1, 2, 3, 6, 9, 12 เดือน');

// 4. ตรวจสอบ getTargetMonths จากวันอ้างอิงปัจจุบัน
const refDate = new Date('2026-10-28T12:00:00Z');
assert.deepStrictEqual(getTargetMonths(1, refDate), ['2026-10']);
assert.deepStrictEqual(getTargetMonths(2, refDate), ['2026-09', '2026-10']);
assert.deepStrictEqual(getTargetMonths(3, refDate), ['2026-08', '2026-09', '2026-10']);
assert.deepStrictEqual(getTargetMonths(6, refDate), ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
assert.strictEqual(getTargetMonths(9, refDate).length, 9);
assert.strictEqual(getTargetMonths(12, refDate).length, 12);
console.log('✓ 4. getTargetMonths: คำนวณเดือนปฏิทินย้อนหลังถูกต้องตามวันอ้างอิง');

// 5. ตรวจสอบ buildBudgetCategories และการแจ้งเตือนข้อจำกัดข้อมูล 6 เดือน
[1, 2, 3, 6].forEach((m) => {
  const result = buildBudgetCategories(MOCK_PROJECTS, MOCK_PROJECT_COST_ITEMS, m, refDate);
  assert.strictEqual(result.rangeNotice, null, `ช่วง ${m} เดือนต้องไม่มีการแจ้งเตือนขาดข้อมูล`);
  assert.strictEqual(result.matchedMonths.length, m, `ช่วง ${m} เดือนต้องจับคู่ได้ ${m} เดือน`);
});

[9, 12].forEach((m) => {
  const result = buildBudgetCategories(MOCK_PROJECTS, MOCK_PROJECT_COST_ITEMS, m, refDate);
  assert.ok(result.rangeNotice !== null, `ช่วง ${m} เดือนต้องมีการแจ้งเตือนว่ามีข้อมูลเพียง 6 เดือน`);
  assert.ok(result.rangeNotice.includes('6 เดือน'), 'ต้องระบุว่ามีเพียง 6 เดือน');
  assert.ok(result.rangeNotice.includes('พฤษภาคม 2569 – ตุลาคม 2569'), 'ต้องระบุช่วงเดือนภาษาไทย');
  assert.strictEqual(result.matchedMonths.length, 6, `ช่วง ${m} เดือนต้องรวมข้อมูลเฉพาะ 6 เดือนที่มีจริง`);
});
console.log('✓ 5. buildBudgetCategories: ตรวจจับและแจ้งเตือนข้อจำกัดข้อมูล 6 เดือนเมื่อเลือก 9 หรือ 12 เดือนถูกต้อง');

// 6. ตรวจสอบความถูกต้องของการรวมยอด actual cost โดยไม่นับซ้ำ
const result6m = buildBudgetCategories(MOCK_PROJECTS, MOCK_PROJECT_COST_ITEMS, 6, refDate);
const totalActualInCategories = result6m.categories.reduce(
  (sum, cat) => sum + cat.projects.reduce((cSum, p) => cSum + p.actual, 0),
  0
);
const totalCostInRaw = MOCK_PROJECT_COST_ITEMS.reduce((sum, item) => sum + item.amount, 0);
assert.strictEqual(totalActualInCategories, totalCostInRaw, 'ยอดรวมค่าใช้จ่ายจริงในกราฟ 6 เดือนต้องตรงกับยอดรวม raw records ทั้งหมด');
console.log(`✓ 6. actual cost: ยอดรวม ${totalActualInCategories.toLocaleString()} บาท ตรงกับ mock records ทั้งหมด ไม่นับซ้ำ`);

// 7. ตรวจสอบ buildChartModel ในทุกโหมดแสดงผล พร้อมตรวจลำดับ Segment และพิกัด Outline
const viewModes = [VIEW_MODES.COMPARISON, VIEW_MODES.PLANNED, VIEW_MODES.ACTUAL, VIEW_MODES.VARIANCE];
viewModes.forEach((mode) => {
  const model = buildChartModel(result6m.categories, { viewMode: mode, keyword: '', statusLabels: {} });
  assert.ok(model.width > 0, 'model.width ต้องมากกว่า 0');
  assert.ok(model.height > 0, 'model.height ต้องมากกว่า 0');
  assert.ok(model.groups.length > 0, 'ต้องมีกลุ่มหมวดหมู่');
  assert.ok(model.ticks.length > 0, 'ต้องมี ticks');
});

// ตรวจสอบอย่างละเอียดสำหรับโหมด Comparison: เซกเมนต์ต้องเรียงจากมากสุด (ล่าง) ไปหาน้อยสุด (บน)
const compModel = buildChartModel(result6m.categories, { viewMode: VIEW_MODES.COMPARISON, keyword: '', statusLabels: {} });
compModel.groups.forEach((group) => {
  group.bars.forEach((bar) => {
    if (bar.kind === 'variance') return;
    assert.ok(bar.segments.length > 0, `แท่ง ${bar.kind} ใน ${group.name} ต้องมีเซกเมนต์`);
    assert.strictEqual(bar.totalHeight, compModel.zeroY - bar.topY, 'ความสูงรวมต้องเท่ากับ zeroY - topY');

    // 1. ตรวจสอบว่าเซกเมนต์แรก (index 0) วางอยู่ล่างสุดบน baseline (zeroY)
    const bottomSeg = bar.segments[0];
    assert.strictEqual(
      Math.round(bottomSeg.y + bottomSeg.height),
      Math.round(compModel.zeroY),
      `เซกเมนต์ล่างสุดต้องติดเส้นฐาน zeroY (${bottomSeg.y + bottomSeg.height} vs ${compModel.zeroY})`
    );

    // 2. ตรวจสอบว่าเซกเมนต์สุดท้าย (บนสุด) มีขอบบนตรงกับ bar.topY
    const topSeg = bar.segments[bar.segments.length - 1];
    assert.strictEqual(
      Math.round(topSeg.y),
      Math.round(bar.topY),
      `เซกเมนต์บนสุดต้องมีพิกัด y ตรงกับ bar.topY`
    );

    // 3. ตรวจสอบการเรียงลำดับ: เปอร์เซ็นต์/มูลค่าต้องเรียงจากมากไปน้อย (ล่างขึ้นบน)
    // และตำแหน่ง y ของแต่ละชั้นต้องต่อสนิทกันพอดี (Contiguous stacking)
    for (let i = 0; i < bar.segments.length - 1; i++) {
      const lower = bar.segments[i];
      const upper = bar.segments[i + 1];

      assert.ok(
        lower.value >= upper.value,
        `เซกเมนต์ล่าง (${lower.shareText}) ต้องมีสัดส่วนมากกว่าหรือเท่ากับเซกเมนต์บน (${upper.shareText}) ใน ${group.name} (${bar.kind})`
      );

      assert.strictEqual(
        Math.round(upper.y + upper.height),
        Math.round(lower.y),
        `เซกเมนต์บนต้องซ้อนสนิทอยู่เหนือเซกเมนต์ล่างพอดีโดยไม่มีช่องว่างหรือเหลื่อมล้ำ`
      );
    }
  });
});
console.log('✓ 7. buildChartModel: สร้างข้อมูล SVG ครบทั้ง 4 โหมด และเซกเมนต์เรียงจากมากสุด (ล่าง) ไปน้อยสุด (บน) อย่างถูกต้อง 100%');

// 8. ตรวจสอบ filterCategories (สถานะและการค้นหา)
const filteredStatus = filterCategories(result6m.categories, { status: 'in_progress', searchText: '' });
filteredStatus.categories.forEach((cat) => {
  cat.projects.forEach((p) => {
    assert.strictEqual(p.status, 'in_progress', 'ทุกโปรเจกต์ที่กรองต้องเป็น in_progress');
  });
});

const filteredSearch = filterCategories(result6m.categories, { status: ALL_STATUSES, searchText: 'ARMS' });
assert.ok(filteredSearch.projectCount > 0, 'ต้องพบโปรเจกต์ที่มีคำว่า ARMS');
console.log('✓ 8. filterCategories: กรองตามสถานะและค้นหาคำสำคัญทำงานถูกต้อง');

// 9. ตรวจสอบ helper การจัดตำแหน่ง Tooltip และสกุลเงิน
const pos1 = getTooltipPosition(100, 100, 1024, 768);
assert.strictEqual(pos1.left, 115);
assert.strictEqual(pos1.top, 80);

assert.strictEqual(formatShortCurrency(1250000), '฿1.25M');
assert.strictEqual(formatShortCurrency(450000), '฿450k');
assert.strictEqual(formatShortCurrency(800), '฿800');
console.log('✓ 9. Helpers: Tooltip position และ Formatters ทำงานถูกต้อง');

console.log('--- ผ่านการตรวจสอบความถูกต้องทั้งหมด 100% ---');
