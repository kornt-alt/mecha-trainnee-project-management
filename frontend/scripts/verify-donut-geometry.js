// scripts/verify-donut-geometry.js — ตรวจสอบเรขาคณิตป้าย+เส้นเชื่อมของ ProjectStatusChart แบบ deterministic
// mirror ของค่าคงที่และสูตรใน src/components/dashboard/ProjectStatusChart.js (แก้ที่ไหนต้องแก้ที่นี่ด้วย)
const RADIUS = 76;
const STROKE_WIDTH = 19;
const VIEW_W = 380;
const VIEW_H = 260;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;
const EDGE_R = RADIUS + STROKE_WIDTH / 2;
const STUB = 14;
const LABEL_TOP = 28;
const LABEL_BOTTOM = VIEW_H - 28;
const MAX_ROW_GAP = 76;
const TEXT_X = { left: 96, right: VIEW_W - 96 };
const DOT_R = 2.4;

const STATUSES = ['in_progress', 'on_hold', 'planning', 'done', 'cancelled'];

function layout(counts) {
  const total = counts.reduce((a, b) => a + b, 0);
  const COL_X = { left: TEXT_X.left + 6, right: TEXT_X.right - 6 };
  const arcs = [];
  let cum = 0;
  counts.forEach((count, i) => {
    if (count <= 0) return;
    const fraction = count / total;
    const midAngleDeg = -90 + 360 * (cum + fraction / 2);
    cum += fraction;
    const rad = (midAngleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    // clamp stub radius so the stub end never extends past the label column (plus 2-unit margin)
    const colX = cos >= 0 ? COL_X.right : COL_X.left;
    const rCap = cos >= 0
      ? (colX - 2 - CX) / Math.max(cos, 1e-9)
      : (CX - colX - 2) / Math.max(-cos, 1e-9);
    const rStub = Math.max(EDGE_R, Math.min(EDGE_R + STUB, rCap));
    arcs.push({
      idx: i,
      px: CX + EDGE_R * cos,
      py: CY + EDGE_R * sin,
      ex: CX + rStub * cos,
      ey: CY + rStub * sin,
      side: cos >= 0 ? 'right' : 'left',
      midAngleDeg,
    });
  });

  ['left', 'right'].forEach((side) => {
    const group = arcs.filter((l) => l.side === side).sort((a, b) => a.py - b.py);
    if (group.length === 0) return;
    const span = Math.min(LABEL_BOTTOM - LABEL_TOP, (group.length - 1) * MAX_ROW_GAP);
    const startY = CY - span / 2;
    group.forEach((l, i) => {
      l.labelY = group.length > 1 ? startY + (span / (group.length - 1)) * i : CY;
    });
  });
  return arcs;
}

// elbow connector: radial stub (px,py)->(ex,ey), horizontal (ex,ey)->(colX,ey), vertical (colX,ey)->(colX,labelY)
function elbowPoints(l) {
  const colX = l.side === 'left' ? TEXT_X.left + 6 : TEXT_X.right - 6;
  return [[l.px, l.py], [l.ex, l.ey], [colX, l.ey], [colX, l.labelY]];
}

// segment intersection (proper crossing, excluding shared endpoints)
function segsIntersect(p1, p2, p3, p4) {
  const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

let failures = 0;
function check(name, cond, detail = '') {
  if (!cond) { failures += 1; console.log(`  FAIL ${name} ${detail}`); }
}

const CASES = {
  'current mock (36)': [11, 5, 7, 9, 4],
  'single status': [0, 0, 0, 10, 0],
  'two statuses': [0, 6, 0, 4, 0],
  'all five equal': [3, 3, 3, 3, 3],
  'extreme skew': [1, 0, 0, 0, 39],
  'many tiny slices': [1, 1, 1, 1, 1],
  'heavy left side': [10, 1, 10, 1, 1],
  'heavy right side': [1, 10, 1, 10, 10],
  'forty projects': [15, 8, 6, 8, 3],
};

for (const [name, counts] of Object.entries(CASES)) {
  const arcs = layout(counts);
  console.log(`Case: ${name}`);
  arcs.forEach((l) => {
    // 1) start point sits exactly on the ring outer edge
    const distStart = Math.hypot(l.px - CX, l.py - CY);
    check('start on outer edge', Math.abs(distStart - EDGE_R) < 1e-9, `dist=${distStart}`);
    // 2) stub endpoint is at or outside the ring, and never past the label column
    const distEnd = Math.hypot(l.ex - CX, l.ey - CY);
    check('stub exits ring', distEnd > EDGE_R - 1e-9, `dist=${distEnd}`);
    const colXs = l.side === 'left' ? TEXT_X.left + 6 : TEXT_X.right - 6;
    check('stub stays before column', l.side === 'left' ? l.ex >= colXs + 2 - 1e-9 : l.ex <= colXs - 2 + 1e-9, `ex=${l.ex}`);
    // 3) label rows stay inside the vertical frame (name top / value bottom included)
    check('labelY >= LABEL_TOP', l.labelY >= LABEL_TOP, `labelY=${l.labelY}`);
    check('labelY <= LABEL_BOTTOM', l.labelY <= LABEL_BOTTOM, `labelY=${l.labelY}`);
    check('name text inside view', l.labelY - 14 >= 0, `top=${l.labelY - 14}`);
    check('value text inside view', l.labelY + 15 <= VIEW_H, `bottom=${l.labelY + 15}`);
    // 4) colored dot does not sit inside the ring bore; report worst-case ring overlap
    const dotX = l.side === 'left' ? TEXT_X[l.side] + 6 : TEXT_X[l.side] - 6;
    const dotDist = Math.hypot(dotX - CX, l.labelY - CY);
    const gap = dotDist - DOT_R - EDGE_R;
    check('dot clear of ring bore (center r=RADIUS)', dotDist - DOT_R > RADIUS, `gap-to-bore=${(dotDist - DOT_R - RADIUS).toFixed(2)}`);
    if (gap < 0) console.log(`  note: dot overlaps ring outer edge by ${(-gap).toFixed(2)} units (render ~${((-gap) / VIEW_W * 100).toFixed(2)}% of width)`);
  });
  // 5) no crossing between any two elbow connector polylines (all segment pairs)
  const polys = arcs.map(elbowPoints);
  for (let i = 0; i < polys.length; i += 1) {
    for (let j = i + 1; j < polys.length; j += 1) {
      let crossed = false;
      for (let si = 0; si < polys[i].length - 1 && !crossed; si += 1) {
        for (let sj = 0; sj < polys[j].length - 1 && !crossed; sj += 1) {
          if (segsIntersect(polys[i][si], polys[i][si + 1], polys[j][sj], polys[j][sj + 1])) crossed = true;
        }
      }
      check('no connector crossing', !crossed, `pair ${arcs[i].idx}-${arcs[j].idx}`);
    }
  }
  // 6) same-side labels never share a row unless only one label
  ['left', 'right'].forEach((side) => {
    const ys = arcs.filter((l) => l.side === side).map((l) => l.labelY).sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i += 1) check('no row collision', ys[i] - ys[i - 1] >= 15, `gap=${ys[i] - ys[i - 1]}`);
  });
  console.log('  ok' + (failures ? ` (failures so far: ${failures})` : ''));
}

// fuzz: 500 random count vectors (1..40 per status) must all pass the same invariants
let fuzzFails = 0;
for (let seed = 0; seed < 500; seed += 1) {
  const counts = STATUSES.map((_, i) => 1 + ((seed * 7 + i * 13) % 40));
  const arcs = layout(counts);
  const polys = arcs.map(elbowPoints);
  for (let i = 0; i < polys.length; i += 1) {
    for (let j = i + 1; j < polys.length; j += 1) {
      for (let si = 0; si < polys[i].length - 1; si += 1) {
        for (let sj = 0; sj < polys[j].length - 1; sj += 1) {
          if (segsIntersect(polys[i][si], polys[i][si + 1], polys[j][sj], polys[j][sj + 1])) fuzzFails += 1;
        }
      }
    }
  }
  arcs.forEach((l) => {
    const colX = l.side === 'left' ? TEXT_X.left + 6 : TEXT_X.right - 6;
    if (l.labelY < LABEL_TOP || l.labelY > LABEL_BOTTOM) fuzzFails += 1;
    if (Math.hypot(l.px - CX, l.py - CY) - EDGE_R > 1e-9) fuzzFails += 1;
    if (Math.hypot(colX - CX, l.labelY - CY) - DOT_R <= RADIUS) fuzzFails += 1;
  });
}
console.log(`Fuzz (500 random datasets): ${fuzzFails === 0 ? 'no violations' : `${fuzzFails} violations`}`);
failures += fuzzFails;

console.log(failures === 0 ? '\nALL GEOMETRY CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
