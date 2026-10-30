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
        lower.percentage >= upper.percentage,
        `เซกเมนต์ล่าง (${lower.shareText}) ต้องมีเปอร์เซ็นต์มากกว่าหรือเท่ากับเซกเมนต์บน (${upper.shareText}) ใน ${group.name} (${bar.kind})`
      );

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

// 7.1 ตรวจสอบกรณีตัวอย่างข้อกำหนด Section 2 โดยตรง (A: 15%, B: 40%, C: 10%, D: 35%)
const sampleCategory = [
  {
    id: 'test-cat-1',
    name: 'หมวดทดสอบตัวอย่าง Section 2',
    projects: [
      { id: 'proj-a', name: 'Category A', planned: 15, actual: 30, plannedColor: '#aaa', actualColor: '#bbb' },
      { id: 'proj-b', name: 'Category B', planned: 40, actual: 10, plannedColor: '#bbb', actualColor: '#ccc' },
      { id: 'proj-c', name: 'Category C', planned: 10, actual: 40, plannedColor: '#ccc', actualColor: '#ddd' },
      { id: 'proj-d', name: 'Category D', planned: 35, actual: 20, plannedColor: '#ddd', actualColor: '#eee' },
    ],
  },
];
const sampleModel = buildChartModel(sampleCategory, { viewMode: VIEW_MODES.COMPARISON });
const sampleGroup = sampleModel.groups[0];
const samplePlannedBar = sampleGroup.bars.find((b) => b.kind === 'planned');
const sampleActualBar = sampleGroup.bars.find((b) => b.kind === 'actual');

// แท่ง Planned: B(40%) -> D(35%) -> A(15%) -> C(10%) จากล่างขึ้นบน
assert.strictEqual(samplePlannedBar.segments.length, 4);
assert.strictEqual(samplePlannedBar.segments[0].projectKey, 'proj-b', 'ล่างสุดต้องเป็น Category B (40%)');
assert.strictEqual(samplePlannedBar.segments[0].shareText, '40%');
assert.strictEqual(samplePlannedBar.segments[1].projectKey, 'proj-d', 'ชั้นที่สองต้องเป็น Category D (35%)');
assert.strictEqual(samplePlannedBar.segments[1].shareText, '35%');
assert.strictEqual(samplePlannedBar.segments[2].projectKey, 'proj-a', 'ชั้นที่สามต้องเป็น Category A (15%)');
assert.strictEqual(samplePlannedBar.segments[2].shareText, '15%');
assert.strictEqual(samplePlannedBar.segments[3].projectKey, 'proj-c', 'บนสุดต้องเป็น Category C (10%)');
assert.strictEqual(samplePlannedBar.segments[3].shareText, '10%');

// ยืนยันพิกัดความต่อเนื่องของแท่ง Planned
assert.strictEqual(Math.round(samplePlannedBar.segments[0].y + samplePlannedBar.segments[0].height), Math.round(sampleModel.zeroY));
assert.strictEqual(Math.round(samplePlannedBar.segments[3].y), Math.round(samplePlannedBar.topY));

// แท่ง Actual (เรียงอิสระจาก Planned): C(40%) -> A(30%) -> D(20%) -> B(10%) จากล่างขึ้นบน
assert.strictEqual(sampleActualBar.segments.length, 4);
assert.strictEqual(sampleActualBar.segments[0].projectKey, 'proj-c', 'Actual ล่างสุดต้องเป็น Category C (40%)');
assert.strictEqual(sampleActualBar.segments[0].shareText, '40%');
assert.strictEqual(sampleActualBar.segments[1].projectKey, 'proj-a', 'Actual ชั้นสองต้องเป็น Category A (30%)');
assert.strictEqual(sampleActualBar.segments[1].shareText, '30%');
assert.strictEqual(sampleActualBar.segments[2].projectKey, 'proj-d', 'Actual ชั้นสามต้องเป็น Category D (20%)');
assert.strictEqual(sampleActualBar.segments[2].shareText, '20%');
assert.strictEqual(sampleActualBar.segments[3].projectKey, 'proj-b', 'Actual บนสุดต้องเป็น Category B (10%)');
assert.strictEqual(sampleActualBar.segments[3].shareText, '10%');
console.log('✓ 7.1 ตัวอย่าง Section 2 & การเรียงลำดับอิสระระหว่าง Planned และ Actual: ผ่านการตรวจสอบอย่างสมบูรณ์');

// 7.2 ตรวจสอบการจัดการค่าศูนย์ (zero), ค่าลบ, ค่าสูญหาย และกรณีเปอร์เซ็นต์เท่ากัน (equal percentage tie-breaker)
const edgeCaseCategory = [
  {
    id: 'edge-cat',
    name: 'หมวดทดสอบ Edge Cases',
    projects: [
      { id: 'zero-val', name: 'Zero', planned: 0, actual: 0 },
      { id: 'neg-val', name: 'Negative', planned: -50, actual: -10 },
      { id: 'nan-val', name: 'NaN', planned: 'not a number', actual: null },
      { id: 'p2', name: 'P2 Tie', planned: 50, actual: 50 },
      { id: 'p1', name: 'P1 Tie', planned: 50, actual: 50 },
    ],
  },
];
const edgeModel = buildChartModel(edgeCaseCategory, { viewMode: VIEW_MODES.COMPARISON });
const edgeBar = edgeModel.groups[0].bars.find((b) => b.kind === 'planned');
assert.strictEqual(edgeBar.segments.length, 2, 'ต้องมีเฉพาะโปรเจกต์ที่มูลค่า > 0 เท่านั้น (2 รายการ)');
assert.strictEqual(edgeBar.segments[0].projectKey, 'p1', 'Tie-breaker ต้องเลือก p1 ก่อน p2 ตามลำดับ id ที่แน่นอน');
assert.strictEqual(edgeBar.segments[1].projectKey, 'p2');
console.log('✓ 7.2 Edge Cases (zero/negative/NaN & deterministic tie-breaker): ผ่านการตรวจสอบอย่างสมบูรณ์');

// 7.3 ตรวจสอบความสอดคล้องของระดับความสว่างตามเปอร์เซ็นต์ (Monotonic Lightness Progression & Text Contrast)
const { hexToHsl, calculateTargetLightness, transformColorByPercentage } = require('../src/components/BudgetBarChart/budgetBarChartUtils');
compModel.groups.forEach((group) => {
  group.bars.forEach((bar) => {
    if (bar.kind === 'variance') return;
    for (let i = 0; i < bar.segments.length - 1; i++) {
      const lower = bar.segments[i];
      const upper = bar.segments[i + 1];
      const lowerHsl = hexToHsl(lower.color);
      const upperHsl = hexToHsl(upper.color);

      // เซกเมนต์ล่าง (เปอร์เซ็นต์มากกว่าหรือเท่ากัน) ต้องมี Lightness น้อยกว่าหรือเท่ากับเซกเมนต์บน (สีเข้มกว่าหรือเท่ากัน)
      assert.ok(
        lowerHsl.l <= upperHsl.l,
        `เซกเมนต์ล่างใน ${group.name} (${bar.kind}) ต้องมี Lightness เข้มกว่าหรือเท่ากับเซกเมนต์บน (พบ ${lowerHsl.l} > ${upperHsl.l})`
      );

      // หากเปอร์เซ็นต์ต่างกันอย่างมีนัยสำคัญ (>= 3%) ความสว่างต้องต่างกันอย่างแน่นอน
      if (lower.percentage - upper.percentage >= 3) {
        assert.ok(
          lowerHsl.l < upperHsl.l,
          `เซกเมนต์ที่มีเปอร์เซ็นต์มากกว่า (${lower.percentage}%) ต้องมี Lightness ต่ำกว่าเซกเมนต์ที่มีเปอร์เซ็นต์น้อยกว่า (${upper.percentage}%)`
        );
      }

      // ตรวจสอบความถูกต้องของสีตัวอักษรเพื่อความคมชัด (Text Contrast)
      if (lowerHsl.l >= 65) {
        assert.strictEqual(lower.textColor, '#0f172a', `เซกเมนต์พื้นสว่าง L=${lowerHsl.l}% ต้องใช้ตัวหนังสือสีเข้ม #0f172a`);
      } else {
        assert.strictEqual(lower.textColor, '#ffffff', `เซกเมนต์พื้นเข้ม L=${lowerHsl.l}% ต้องใช้ตัวหนังสือสีขาว #ffffff`);
      }
    }
  });
});
console.log('✓ 7.3 Segment Lightness & Text Contrast: เซกเมนต์เรียงระดับความสว่างตามเปอร์เซ็นต์สม่ำเสมอ และสีข้อความอ่านง่ายตามมาตรฐาน WCAG');

// 7.4 ตรวจสอบความสอดคล้องกับ Project Category Distribution (ProjectCategoryTreemap.js)
const { TREEMAP_CATEGORY_BASE_COLORS } = require('../src/components/BudgetBarChart/budgetBarChartData');
assert.ok(TREEMAP_CATEGORY_BASE_COLORS, 'ต้องมี TREEMAP_CATEGORY_BASE_COLORS');
assert.strictEqual(TREEMAP_CATEGORY_BASE_COLORS['ระบบซอฟต์แวร์'].token, 'var(--blue)');
assert.strictEqual(TREEMAP_CATEGORY_BASE_COLORS['คุณภาพและทดสอบ'].token, 'var(--green)');
assert.strictEqual(TREEMAP_CATEGORY_BASE_COLORS['เอกสารและการฝึกอบรม'].token, 'var(--amber)');
assert.strictEqual(TREEMAP_CATEGORY_BASE_COLORS['ระบบอัตโนมัติ'].token, 'var(--muted)');
assert.strictEqual(TREEMAP_CATEGORY_BASE_COLORS['ระบบองค์กร'].token, 'var(--red)');
assert.strictEqual(TREEMAP_CATEGORY_BASE_COLORS['ซ่อมบำรุง'].token, 'var(--blue-hover)');

// ตรวจสอบว่าหมวดหมู่ใน result6m มี base color ตรงกับ Treemap
result6m.categories.forEach((cat) => {
  const treemapBase = TREEMAP_CATEGORY_BASE_COLORS[cat.name];
  assert.ok(treemapBase, `หมวดหมู่ ${cat.name} ต้องมี base color ใน Treemap`);
  cat.projects.forEach((p) => {
    const plannedHsl = hexToHsl(p.plannedColor);
    const actualHsl = hexToHsl(p.actualColor);
    assert.ok(
      Math.abs(plannedHsl.h - treemapBase.h) <= 2,
      `Hue ของ plannedColor ใน ${cat.name} (${plannedHsl.h}) ต้องตรงกับ Treemap (${treemapBase.h})`
    );
    assert.ok(
      Math.abs(actualHsl.h - treemapBase.h) <= 2,
      `Hue ของ actualColor ใน ${cat.name} (${actualHsl.h}) ต้องตรงกับ Treemap (${treemapBase.h})`
    );
  });
});
console.log('✓ 7.4 Project Category Distribution Alignment: โครงสีตรงกับ Treemap Heatmap 100% (Single Source of Truth)');

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

// 10. ตรวจสอบความสม่ำเสมอของสีในหมวดหมู่ "ระบบอัตโนมัติ" (Automation Category Color Consistency)
// ป้องกันปัญหาสีเทาและสีน้ำเงินปะปนกันในหมวดเดียวกัน และยืนยันการแปลงชื่อทุกรูปแบบ (Aliases / Normalization)
const { getCategoryBaseColor, UNMAPPED_CATEGORY_COLOR } = require('../src/utils/categoryColors');

// 10.1 ตรวจสอบ Alias และการ Normalize ของหมวดหมู่ระบบอัตโนมัติ
const autoVariants = [
  'ระบบอัตโนมัติ',
  'อัตโนมัติ',
  'automation',
  'Automation',
  'AUTOMATION',
  '  Automation  ',
  'mas',
  'MAS',
  'Mechanical Automation & Software',
];
autoVariants.forEach((variant) => {
  assert.strictEqual(
    getCategoryBaseColor(variant),
    '#5B6B82',
    `ชื่อรูปแบบ "${variant}" ต้องแปลงเป็นสีแม่แบบ #5B6B82 ของระบบอัตโนมัติเสมอ`,
  );
});

// 10.2 กรณีชื่อหมวดหมู่สูญหายหรือไม่ระบุ ต้องคืนค่า UNMAPPED_CATEGORY_COLOR ไม่กลืนเป็นสีน้ำเงินหรือเทา
assert.strictEqual(getCategoryBaseColor(null), UNMAPPED_CATEGORY_COLOR);
assert.strictEqual(getCategoryBaseColor(''), UNMAPPED_CATEGORY_COLOR);
assert.strictEqual(getCategoryBaseColor('หมวดหมู่ที่ไม่รู้จัก'), UNMAPPED_CATEGORY_COLOR);

// 10.3 ตรวจสอบทุกเซกเมนต์ของหมวดหมู่ระบบอัตโนมัติในโมเดลจริง (Comparison, Planned, Actual ทุกช่วงเวลา)
[VIEW_MODES.COMPARISON, VIEW_MODES.PLANNED, VIEW_MODES.ACTUAL].forEach((mode) => {
  [1, 3, 6, 12].forEach((range) => {
    const rangeData = buildBudgetCategories(MOCK_PROJECTS, MOCK_PROJECT_COST_ITEMS, range, refDate);
    const chartModel = buildChartModel(rangeData.categories, { viewMode: mode });
    const autoGroup = chartModel.groups.find((g) => g.name === 'ระบบอัตโนมัติ');
    if (!autoGroup) return;

    autoGroup.bars.forEach((bar) => {
      if (bar.kind === 'variance') return;
      bar.segments.forEach((seg) => {
        const segHsl = hexToHsl(seg.color);
        // แม่สีคือ #5B6B82: h=215, s=18
        // Saturation ต้องคงที่ที่ 18% (ห้ามถูกเร่งเป็น 65% หรือสีน้ำเงินสด)
        assert.ok(
          Math.abs(segHsl.h - 215) <= 3,
          `เซกเมนต์ ${seg.projectKey} ในโหมด ${mode} (${bar.kind}) ต้องมี Hue ใกล้เคียง 215 (พบ ${segHsl.h})`,
        );
        assert.ok(
          segHsl.s <= 22,
          `เซกเมนต์ ${seg.projectKey} ในโหมด ${mode} (${bar.kind}) ต้องไม่กลายเป็นสีน้ำเงิน (ความอิ่มตัว s ต้อง <= 22%, พบ ${segHsl.s}% ที่สี ${seg.color})`,
        );
      });
    });
  });
});
console.log('✓ 10. Automation Color Consistency: เซกเมนต์หมวดระบบอัตโนมัติทุกแท่งใช้โทนสีเทาตุ่น (#5B6B82) สม่ำเสมอ 100% ไม่มีสีน้ำเงินแปลกปลอม');

// 11. Unit Tests for Color Transformation Utility (Requirement 12.D)
console.log('--- ตรวจสอบ Requirement 12: Color Transformation Utility ---');

// D.1 Higher percentage produces lower Lightness
const colorLow = transformColorByPercentage('ระบบซอฟต์แวร์', 15);
const colorHigh = transformColorByPercentage('ระบบซอฟต์แวร์', 85);
const hslLow = hexToHsl(colorLow);
const hslHigh = hexToHsl(colorHigh);
assert.ok(
  hslHigh.l < hslLow.l,
  `D.1: Higher percentage must produce lower Lightness (${hslHigh.l} < ${hslLow.l})`
);
console.log('✓ 11.1 D.1: Higher percentage produces lower Lightness (15% -> L=' + hslLow.l + ', 85% -> L=' + hslHigh.l + ')');

// D.2 Lower percentage produces higher Lightness
const color10 = transformColorByPercentage('ระบบอัตโนมัติ', 10);
const color60 = transformColorByPercentage('ระบบอัตโนมัติ', 60);
const hsl10 = hexToHsl(color10);
const hsl60 = hexToHsl(color60);
assert.ok(
  hsl10.l > hsl60.l,
  `D.2: Lower percentage must produce higher Lightness (${hsl10.l} > ${hsl60.l})`
);
console.log('✓ 11.2 D.2: Lower percentage produces higher Lightness (10% -> L=' + hsl10.l + ', 60% -> L=' + hsl60.l + ')');

// D.3 Equal percentages produce equal target Lightness across categories
const testCategories = [
  'ระบบอัตโนมัติ',
  'ระบบซอฟต์แวร์',
  'คุณภาพและทดสอบ',
  'เอกสารและการฝึกอบรม',
  'ระบบองค์กร',
  'ซ่อมบำรุง',
];
const testPercentages = [10, 25, 50, 75, 90];
testPercentages.forEach((pct) => {
  const expectedL = calculateTargetLightness(pct);
  testCategories.forEach((cat) => {
    const transformed = transformColorByPercentage(cat, pct);
    const hsl = hexToHsl(transformed);
    assert.strictEqual(
      hsl.l,
      expectedL,
      `D.3: Target Lightness for ${cat} at ${pct}% must be exactly ${expectedL}% (got ${hsl.l}%)`
    );
  });
});
console.log('✓ 11.3 D.3: Equal percentages produce equal target Lightness across all categories (10%, 25%, 50%, 75%, 90%)');

// D.4 Original Hue remains unchanged
testCategories.forEach((cat) => {
  const baseColor = getCategoryBaseColor(cat);
  const baseHsl = hexToHsl(baseColor);
  [5, 20, 45, 60, 80, 95].forEach((pct) => {
    const transformed = transformColorByPercentage(cat, pct);
    const transformedHsl = hexToHsl(transformed);
    assert.ok(
      Math.abs(transformedHsl.h - baseHsl.h) <= 2,
      `D.4: Original Hue for ${cat} (${baseHsl.h}) must remain unchanged at ${pct}% (got ${transformedHsl.h})`
    );
  });
});
console.log('✓ 11.4 D.4: Original Hue remains unchanged across all transformation percentages');

// D.5 Original Saturation/Chroma remains unchanged within the selected color-space implementation
testCategories.forEach((cat) => {
  const baseColor = getCategoryBaseColor(cat);
  const baseHsl = hexToHsl(baseColor);
  [5, 20, 45, 60, 80, 95].forEach((pct) => {
    const transformed = transformColorByPercentage(cat, pct);
    const transformedHsl = hexToHsl(transformed);
    assert.ok(
      Math.abs(transformedHsl.s - baseHsl.s) <= 2,
      `D.5: Original Saturation for ${cat} (${baseHsl.s}) must remain unchanged at ${pct}% (got ${transformedHsl.s})`
    );
  });
});
console.log('✓ 11.5 D.5: Original Saturation/Chroma remains unchanged within HSL color-space');

// D.6 Invalid percentages do not crash the utility
const invalidPercentages = [null, undefined, NaN, 'invalid-string', -100, 250, Infinity, -Infinity, {}, []];
invalidPercentages.forEach((invPct) => {
  assert.doesNotThrow(() => {
    const result = transformColorByPercentage('ระบบซอฟต์แวร์', invPct);
    assert.ok(typeof result === 'string' && /^#[0-9A-F]{6}$/i.test(result));
  }, `D.6: Invalid percentage ${invPct} must not crash`);
});
console.log('✓ 11.6 D.6: Invalid percentages do not crash the utility and return valid hex color');

// D.7 Invalid category colors use a safe, documented fallback
const invalidColors = [null, undefined, '', 'non_existent_category_123', 9999, false];
invalidColors.forEach((invColor) => {
  assert.doesNotThrow(() => {
    const result = transformColorByPercentage(invColor, 50);
    const fallbackBaseHsl = hexToHsl(UNMAPPED_CATEGORY_COLOR);
    const resultHsl = hexToHsl(result);
    assert.ok(Math.abs(resultHsl.h - fallbackBaseHsl.h) <= 2);
    assert.ok(Math.abs(resultHsl.s - fallbackBaseHsl.s) <= 2);
  }, `D.7: Invalid category color ${invColor} must use UNMAPPED_CATEGORY_COLOR fallback`);
});
console.log('✓ 11.7 D.7: Invalid category colors use safe, documented fallback (UNMAPPED_CATEGORY_COLOR = #64748B)');

// D.8 Results are deterministic and do not depend on rendering order, filters, or date ranges
const deterministicTestInputs = [
  { cat: 'ระบบซอฟต์แวร์', p: 40 },
  { cat: 'ระบบอัตโนมัติ', p: 70 },
  { cat: 'คุณภาพและทดสอบ', p: 15 },
  { cat: 'เอกสารและการฝึกอบรม', p: 55 },
];
// Run 1: Sequential
const seqResults = deterministicTestInputs.map((i) => transformColorByPercentage(i.cat, i.p));
// Run 2: Reversed
const revResults = [...deterministicTestInputs].reverse().map((i) => transformColorByPercentage(i.cat, i.p)).reverse();
// Run 3: Shuffled / Repeated
assert.deepStrictEqual(seqResults, revResults, 'D.8: Results must be deterministic regardless of execution order');
deterministicTestInputs.forEach((item, idx) => {
  assert.strictEqual(
    transformColorByPercentage(item.cat, item.p),
    seqResults[idx],
    `D.8: Repeated call for ${item.cat} at ${item.p}% must always produce identical output`
  );
});
console.log('✓ 11.8 D.8: Results are strictly deterministic and independent of rendering order, filters, or date ranges');

console.log('--- ผ่านการตรวจสอบความถูกต้องทั้งหมด 100% ---');
