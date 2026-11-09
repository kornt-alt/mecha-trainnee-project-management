# Global Popup Audit — MECHA Frontend (2026-11-09)

> **นี่คือเอกสารตรวจสอบและแผนงานเท่านั้น — ยังไม่มีการแก้โค้ดใด ๆ รอการอนุมัติก่อนเริ่ม Phase A–G**

## 1. Executive Summary
ตรวจพบ popup ทั้งหมด **7 รายการ** ใน 5 ไฟล์ (ประเภท: ฟอร์ม 2, detail 4, confirmation 1) + ระบบ dropdown ของแถวข้อมูล (ไม่นับเป็น modal) งาน Workstream A เดิม (`mecha-form-*` system บน ProjectForm/NewTaskModal) เสร็จและผ่าน QA แล้ว — แผนนี้ไม่แทนที่แต่ "ขยาย" ระบบ `mecha-form-*` ให้ครอบคลุม popup ที่เหลือทั้งหมด ใช้ 3 ขั้น style-copied จาก workload-detail-modal และ modal default ของ react-bootstrap ซึ่งไม่สอดคล้องกัน กลุ่มสครีนที่มีปัญหาหนักสุด: **Workload/WorkloadMatrix (2 modal สไตล์ต่างกัน รายละเอียดดันสูง) และ dashboard/UnfinishedTasks (มีหน้าตาต่างจาก Tasks.js ทั้งที่เป็นฟีเจอร์เดียวกัน)**

## 2. เอกสารที่อ่านจริง
`AGENTS.md` (root) · `coding-rules.md` · `README.md` (ส่วน frontend/file map) · `frontend/WORKLOAD_IMPLEMENTATION_NOTES.md` · `docs/superpowers/plans/2026-11-09-popup-redesign.md` · `.superpowers/sdd/2026-11-09-popup-redesign/progress.md` · QA artifacts `art/` `art2/` `art3/` results และ `.npm/_npx playwright-core` harness availability

## 3. Superpowers skills
โหลดจริงใน session นี้ (จากต้นconvers และ previous turns): `using-superpowers`, `brainstorming`, `systematic-debugging`, `test-driven-development`, `verification-before-completion`, `requesting-code-review`, `receiving-code-review`, `opencode`, `writing-plans`, `executing-plans` — brainstorming ผลผลิต สายดีไซน์ §10; writing-plans ผลผลิต roadmap §11; requesting-code-review จะถูกใช้จริงเมื่อแผนผ่านการอนุมัติและเริ่ม implement ครั้งแรก

## 4. Git State
- สายบรานช์ `feature/pop-up`
- เริ่ม/จบงานนี้: **19 รายการเท่าเดิม 100%** (14 modified user-code + build artifacts ที่ผู้ใช้แก้เอง + AGENTS.md + docs/superpowers + build/* untracked) — ในงานนี้มีเพียง 2 ไฟล์ที่สร้างแก้ตามอนุมัติ: เอกสารนี้ + ledger

## 5. Popup Inventory (ครบ 7 รายการ)

| # | Popup ชื่อ | Screen | ไฟล์(บรรทัด) | Component | ประเภท | ขนาด | ปัญหาหลัก | ความเสี่ยงถ้า redesign |
|---|---|---|---|---|---|---|---|---|
| 1 | **ProjectForm** | โปรเจกต์ | `Projects.js:565-660` | `ProjectForm` | Form (create/edit) | lg+mecha shell | ✅ ผ่านรีดีไซน์แล้ว; สือรับแก้ D1 เอา required แบบ native ออกไปแล้ว QA ผ่าน 36/36 | ต่ำ — ไม่จำเป็นต้องรีดีไซน์ ยกสู่ design ref เท่านั้น |
| 2 | **ลบโปรเจกต์ (ยืนยันการลบ)** | โปรเจกต์ | `Projects.js:413-431` | inline confirm modal | Confirmation | default, centered, static | ไม่มีหัว blue accent, ปุ่มลบเป็น `variant="danger"` แบบมาตรฐานแต่ไม่มีภาพ icon/เน้นคำอธิบายโผล่ Policy B อยู่ในข้อความ actionError ฝั่งแถวรายการ ทำให้ user สับสนว่าเกิดจากอะไร | ต่ำ |
| 3 | **Task Detail Modal (read-only)** | ตารางงาน | `Tasks.js:506-585` | inline modal | Detail | default ขนาด, layout OK, footer "ปิดหน้าต่าง" | ใช้ shell default (ไม่ใช้ mecha/workload style); ไม่มี progress ครบทั้งที่มี; ปุ่ม footer ขนาด small ต่างจาก form | ต่ำ |
| 4 | **NewTaskModal** | ตารางงาน | `Tasks.js:690-800` | `NewTaskModal` | Form (create; edit connected ยังไม่มี trigger UI) | lg+mecha shell | ✅ ผ่านรีดีไซน์+ขั้น require-selection; edit mode ยังโดด (ผ่านการรายงานแยกต่างหาก) | ต่ำ |
| 5 | **EmployeeWorkloadDetailModal** | Workload | `Workload.js:177-` (จนปิด) | `EmployeeWorkloadDetailModal` | Detail (ข้อมูลหนัก: KPI cards+ตาราง) | lg, custom `workload-detail-modal` | **หน้าต่างยาวมาก ไม่มี max-height/scroll ที่ body**; header ล้อม `workload-detail-modal-header` (ใช้hex #f8faff นอกระบบ token); ตารางว่อมอาจไหลผู้ดูชอบหน้าจอเกิน; ความ seamless เป็น custom — หนักไม่ใช้ mecha system | สูง — หน้า workloadมี formula ซับซ้อน ต้องห้ามแตะ logic |
| 6 | **WorkloadMatrix drill-down modal** | WorkloadMatrix | `WorkloadMatrix.js:176-` | inline | Detail (รายวัน/employee) | lg, `workload-detail-modal` | ใช้ CSS ชุดเดียวกับ #5 แต่ header สร้างแบบไม่เหมือนกัน; ไม่มี section าป้าย; ระยะห่างต่างจาก #5 | ปานกลาง |
| 7 | **UnfinishedTasks detail modal** | หน้าหลัก (dashboard) | `dashboard/UnfinishedTasks.js:772-868` | inline | Detail (ดูงาน same data as #3) | default+`modal-dialog-scrollable` | **ทำซ้ำ concept กับ #3 ทั้งที่เป็น data เดียวกัน: layout/ฟิลด์/ป้ายต่างกัน**; ไม่มี shell ร่วม; เสี่ยง missing sync เมื่อ mock update (ปุ่ม status ไม่มี วใน detail) | กลาง-สูง |

**ไม่ใช่ popup (บันทึกไว้เพื่อไม่นับผิด):** row dropdown เมนู (`Projects.js:341-375`) ใช้ react-bootstrap Dropdown; TypeScript `ProjectCategoryTreemap.js` กำกับไว้ชัด "ไม่มี Drawer/Modal"; Alert in-form = ไม่นับ popup

## 6. Shared Design System Assessment
- **มีระบบครึ่งหนึ่งแล้ว:** `mecha-form-modal/-section/-required` (index.css แนบท้าย) — ใช้ js form 2 ตัวแชร์กันสำเร็จและผ่าน QA
- **มี custom system แยก:** `workload.css:84-135` (usage 2 modal workload) — ใช้ hex นอก token (`#f8faff`, `#e7edf5`, `#1e3557`, `#64748b`), ไม่ซ้ำ `mecha-*`
- **popup ที่เหลือใช้ default bootstrap ไม่มี identity** = variant สุดท้าย
- **สรุป:** ไม่ควรสร้าง component layer ใหม่ — รวมเป็น **CSS-only extension** ของ `mecha-*` เพิ่ม 4 อย่าง: `mecha-detail-modal` (แทน workload-detail-modal (refactor CSS class map) เกร็ด: ใช้ token แทน hex), `mecha-confirm-modal` (ลบ/ยืนยัน), responsive rules + shared required-mark อยู่แล้ว
- ไฟล์เป้าหมาย: `frontend/src/index.css` (รวม token & new shared), `frontend/src/components/workload.css` (เลิกใช้hex→token และขยายเป็น mecha-detail-* เพื่อคง compat กับทั้ง 2 modal workload)

## 7. Responsive & Accessibility findings (static + ใช้ข้อพิสูจน์ก่อนหน้า)
- ที่ verify แล้ว runtime: ProjectForm/NewTaskModal desktop+tablet+mobile 390/360 ไม่มี horizontal overflow, footer แสดง focus-trap สำเร็จ (Playwright runs 3 ชุด) — พวก popup ที่เหลือ (5–7) ยัง**ไม่เคย**ทดสอบ runtime ใน measure อื่น
- จุด static-flagged: #5 ไม่มี body max-height (เสี่ยง footer จะล้ำจากจอ mobile บนเนื้อหายาว), #7 ใช้ `modal-dialog-scrollable` ซึ่งกด header/footer ติด แต่ body scroll ทำงาน; ทุก popup ยังไม่มี **announce-error แบบ aria-live**; ทุก modal ยังไม่กำหนด `Esc behavior` แบบเปิด consistent (default keyboard=true — พฤติกรรมเดิม, INFO-1)

## 8. Prioritized Issues
**P0 — Critical (blocker awareness):** ไม่มี — ไม่มี popup ที่บล็อค workflow (create/edit ได้ครบ)
**P1 — High:**
- P1-1 บรรทุด popup #5 EmployeeWorkloadDetailModal ไม่ถูก scroll/fixed header ในเนื้อหายาว — Workload.js (static inspect)
- P1-2 ปุ่ม footer/ลำดับใหญ่ detail ของ #3/#7 ฯ ทำซ้ำ concept + ต่างหน้าดัน UX confusion ระหว่างหน้า dashboard และ Tasks (UnfinishedTasks.js)
**P2 — Medium:**
- P2-1 #2 confirm ลบ (หัวไม่มีแบบระบบ, ข้อความ Policy B ผิดตัว=ปะใน actionError นอก popup)
- P2-2 #6 drill-down modal header ต่างจาก #5 ทั้งที่ใช้ class เดียว
- P2-3 WORKLOAD css ใช้ hex นอก token (workload.css:84-135) — maintenance risk
**P3 — Low:**
- P3-1 ไม่มี aria-live สำหรับ error ในทุก popup
- P3-2 ปุ่ม footer ขนาดไม่เท่ากันระหว่าง detail (size sm) กับ form (default)

## 9. หลักดีไซน์สร้างสี — Modern Professional (White & Blue)
ขยายจากระบบที่ approve แล้วของ Workstream A: หัวน้ำรายงานเป็นสีขาว + hairline น้ำเงิน (`--blue`), section-labels ภาษาไทยบนพื้น `--blue-tint`, required > blue `*`, footer คู่ (ยกเลิก outline-secondary / บันทึก primary-`--blue`), danger เฉพาะ destructive, green เฉพาะ success; ไม่มี dark mode; **popup แบบ detail ก็ใช้โครงหัวเดียวกัน** แต่ body ตามเนื้อหา; every CSS ผ่าน token ต้องเท่านั้น

## 10. Phased Implementation Roadmap
**Phase A — Global Popup Foundation (CSS-only)**
- เป้าหมาย: รวม `mecha-detail-modal`, `mecha-confirm-modal`, responsive body-scroll rules; token-clean hex sweep
- Files: `index.css` (เติมคลาส+variable), `workload.css:84-97` (refactor 4 hex → tokens ตามค่าคงเดิม visual)
- Acceptance: build ผ่าน; popup #2–#7 หน้าตาไม่เปลี่ยนแปลง visual ก่อน apply คลาส
- ขึ้นอยู่กับ: —

**Phase B — Project popups polish** (`Projects.js`)
- ป้าย section และ icon ยังขาดใน confirm; ลบ `ห้ามลบโปรเจกต์ (Policy B)` ให้กลายเป็น Alert ฝั่ง modal ก่อนแก้ข้อมูล
- Acceptance: delete-with-tasks ยัง block และ message ถูก + QA create/edit เดิมยังผ่าน

**Phase C — Task popups unification** (`Tasks.js`, `dashboard/UnfinishedTasks.js`)
- ให้ detail modal ของหน้าหลักสืบทอดวิวเดียวกับ #3 (dedupe layout) — ไม่ฟอเปอร์คัยและเลือก avatar read-only ทั้งคู่; ปล่อย title/icon เทียบมาตรฐาน; footer ขนาดเท่ากัน
- Acceptance: view-only ทั้งก้อน; ไม่แตะ move/status logic ใน kanban

**Phase D — Workload modals** (`Workload.js`, `WorkloadMatrix.js`)
- ใช้ mecha-detail-* กับ #5/#6; body จับ max-height+scroll; header รวม layout วิวเดียว; **ห้ามแตะ formula** (ทุก updateTasks/runs คง state เดิม); test workload numbers: static diff + render قبل/หลังเทียบ
- Acceptance: ทุกตัวเลข KPI/ตาราง ต้องเหมือนเดิม visual diff

**Phase E — Remaining screens sweep** (ตรวจซ้ำทุก screen: หน้าหลัก, รายงาน) หา Governor AM popup แนะนำที่ยังหลุดหลักและปรับเข้า role — acceptance: inventory ยืนยัน 0 popup นอกระบบ

**Phase F — Responsive & A11y pass** ทุก popup ที่ viewport 360/390/768/1280/1440; เพิ่ม aria-live="assertive" .invalid-feedback พร้อม base spinner ถามอนุมัติก่อน (เกี่ยว a11y) — acceptance: ไม่มี horizontal overflow, footer เห็นทุกจอ

**Phase G — Regression & QA** — replay harness `qa-drive.js/2/3` ขยายเคส popup 5–7 ผ่าน tmp build path; git status จบตรง-start
- ทุก phase: TDD ใน viteless form หนัก JS logic (data manipulation) ต่ำกว่า CSS phase; ทุก commit ผ่าน reviewer

## 11. ทดสอบ
- มีตอนเหมาะ: playwright-core cached + chromium-1248 พร้อม (ใช้แล้ว 4 run QA) — ไม่ติดตั้งใหม่; tmp harness เก็บนอก repo (`/tmp/opencode/mecha-popup-qa/*`)
- matrix ปปรตูขั้น: ทุก popup: เปิด/ปิด (X/Cancel/Esc/backdrop-click), required fields, edit preload (ถ้ามี), date/dropdown, long-content scroll, footer ภาพ, responsive, mock ข้อมูลไม่เปลี่ยน beauty diff ทุก KPI, ไม่มี mutation API

## 12. ความเสี่ยง/Dependency + คำถามที่ต้องขออนุมัติ
1. #5/#6 กด redesign เสี่ยง sheet หลุดเนื่อง workload ใช้ formula หลายชั้น — ต้อง viewport-based snapshot ผู้เบิก
2. dedupe หน้า dashboard และ Tasks detail มาเป็นเดียว — ต้องอนุมัติเพราะ dashboard มี element เฉพาะจาก WORKLOAD_IMPLEMENTATION_NOTES
3. อนุมัติ aria-live (a11y) — เพิ่ม เพราะไปถึงตามกฎ ต้องถาม
4. งาน Task Edit (จากรายงานก่อน) — มิใช่ขอบเขต roadmap นี้ ยังต้องอนุมัติแยก
5. Workstream B (Phase 2D.6 WorkloadMatrix) **ไม่ได้อยู่ใน roadmap นี้** และ **จะไม่เริ่มโดยอัตโนมัติ** — พร้อมเริ่มเมื่อได้อนุมัติตามขอบเขตเดิม
