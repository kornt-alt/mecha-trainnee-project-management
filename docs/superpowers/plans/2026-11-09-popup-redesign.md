# Popup Form Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give ProjectForm and NewTaskModal one consistent "Modern Professional" popup system (white/blue, Thai labels, sectioned layout) without changing any field, validation, data mapping, or business behavior.

**Architecture:** Shared CSS classes (`mecha-form-*`) added to the existing `frontend/src/index.css`; targeted JSX edits inside the two modal render blocks only. No new components, no new dependencies, no data-model changes.

**Tech Stack:** React 19, react-bootstrap (Modal/Form), Bootstrap 5 utilities, CSS variables from `styles/tokens.css`.

**Spec:** approved design proposal in session (this plan's Tasks 1–3) + `coding-rules.md` + `AGENTS.md`.

## Global Constraints

- Thai UI language; section headings natural Thai (e.g. ข้อมูลหลัก), no English uppercase labels.
- Keep Task Detail Modal read-only and untouched; only ProjectForm + NewTaskModal render blocks change.
- No field removal/rename, no validation-rule, data-mapping, or business-behavior change (legacy category/owner options, managerId↔owner sync, `backdrop="static"`, maxLengths, Policy B delete, mock save paths).
- No new dependencies; icons only from `./common/Icons`.
- No dark mode, no theme toggles; colors from tokens (`var(--blue)`, `--blue-tint`).
- Isolated build output: `BUILD_PATH=/tmp/opencode/mecha-superpowers/build`. Never touch `frontend/build/`.
- Project root: `/home/kierpi/Desktop/Project/project_management`; branch `feature/pop-up`; never commit/push/checkout/reset.

**Ruling — TDD applicability (recorded, per systematic ledger):** No test framework is configured (no test files, no jest config beyond unused react-scripts runner; `npm test` errors "No tests found" and running it adds nothing). Per the approved task: "Use test-driven-development **where applicable**." Adding a test framework = new dependency → forbidden. Therefore per-step TDD is replaced by: (a) full build gate per task, (b) exact-diff inspection against this plan, (c) browser verification checklist deferred to the user with instructions. `systematic-debugging` governs any regression found.

## Review Focus

- Modal on small screens: body must scroll, footer must stay visible (test: open ≥50-char description form at ~360px width).
- Legacy owner option (`__legacy__`) must still select/submit unchanged values.
- Create-mode id generation (`task-${Date.now()}`) and edit-mode title badge must not regress.
- Date-range error clears when either date changes (both forms).
- Footer buttons disabled while saving (ProjectForm only — NewTaskModal has no saving state today; do not add one).

---

### Task 1: Shared popup CSS

**Files:**
- Modify: `frontend/src/index.css` (append one commented block near other modal styles)

**Interfaces:**
- Produces: `.mecha-form-modal` (dialog class), `.mecha-form-modal .modal-body` (max-height/scroll), `.mecha-form-section` (Thai section label), `.mecha-form-required` (blue asterisk via `::after`), `.mecha-form-footer` (aligned, gap).

- [ ] Step 1: Append CSS block using tokens only (no hex outside existing tokens).
- [ ] Step 2: Verify: `npm run build` (isolated BUILD_PATH) exits 0 and CSS contains `mecha-form-modal`.

### Task 2: ProjectForm modal redesign (`Projects.js`)

**Files:**
- Modify: `frontend/src/components/Projects.js` — ProjectForm's `return (...)` JSX only (approx lines 564–660). No logic changes.

**Changes (preserving every existing control, prop, handler):**
- Modal: `size="lg" centered dialogClassName="mecha-form-modal"`; title `{initial.id ? 'แก้ไขโปรเจกต์' : 'เพิ่มโปรเจกต์'}` unchanged.
- Sectioned body: **ข้อมูลหลัก** (name*, category), **ผู้รับผิดชอบและสถานะ** (owner select*, status), **กำหนดเวลา** (start/due dates + dateRange error), **รายละเอียด** (description).
- `required` label asterisks via `.mecha-form-required` span (name label: `ชื่อโปรเจกต์` + mark; identical semantics to current " *").
- dateRange error converted from free `text-danger` div to `Form.Control.Feedback type="invalid"` rendered once under the date row (same message, same clearing).

- [ ] Step 1: Apply targeted JSX edit.
- [ ] Step 2: Verify: diff shows logic/props untouched (`handleOwnerChange`, `set`, `submit`, legacy option remain byte-identical); build exits 0.

### Task 3: NewTaskModal redesign (`Tasks.js`)

**Files:**
- Modify: `frontend/src/components/Tasks.js` — NewTaskModal's `return (...)` JSX only (approx lines 677–788). No logic changes.

**Changes:**
- Same Modal shell (`size="lg" centered dialogClassName="mecha-form-modal"`); title `{initial?.id ? 'แก้ไขงาน' : 'เพิ่มงานใหม่'}` unchanged.
- Sections: **ข้อมูลงาน** (title*, project select), **การจัดการ** (category, assignee, priority), **กำหนดเวลา** (dates + dateRange error), **รายละเอียดงาน**.
- Same required-mark and invalid-feedback conventions as Task 2 (concrete: title label `ชื่องาน` + mark; project label `โปรเจกต์ต้นสังกัด` + mark — both maps/values untouched).

- [ ] Step 1: Apply targeted JSX edit.
- [ ] Step 2: Verify: `submit`, `set`, id generation, defaults untouched; build exits 0.

### Task 4: Verification

- [ ] Step 1: `git diff --check` (must not flag popup files).
- [ ] Step 2: `git status --short` — popup task diff limited to Projects.js, Tasks.js, index.css (+ plan doc); pre-existing changes unchanged.
- [ ] Step 3: Isolated build `BUILD_PATH=/tmp/opencode/mecha-superpowers/build npm run build` → exit 0; confirm `frontend/build/` untouched.
- [ ] Step 4: Record browser-verification checklist for the user (create/edit modes, required-field validation, invalid dates, dropdowns incl. legacy owner, cancel/close, footer sticky visibility, responsive ≦768px, long-form scroll, data preservation after refresh-read).
