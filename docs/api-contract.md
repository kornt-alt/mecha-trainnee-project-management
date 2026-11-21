# API Contract — MECHA Project Management

สัญญากลางระหว่าง **frontend** (น้องฝึกงาน, ตอนนี้ใช้ mock ผ่าน `frontend/src/context/MockDataContext.js`) กับ **backend** (`backend/`)
ตอนเชื่อม API จริง ("Phase API Integration") ให้แทนที่ข้อมูลใน `MockDataContext` ด้วยเส้นในเอกสารนี้ — **shape ของ JSON = shape ของ mock data ปัจจุบัน** หน้าเว็บจึงแทบไม่ต้องแก้

- Base URL: `{API_ORIGIN}/PROJECT-MANAGEMENT/api` (เรียกผ่าน `frontend/src/utils/api.js` เท่านั้น)
- Error: HTTP status 4xx/5xx + `{ "error": "ข้อความภาษาไทย" }` เสมอ
- วันที่ (date) = `"YYYY-MM-DD"` · เวลา (timestamp) = ISO 8601 UTC เช่น `"2026-11-12T02:40:00.000Z"`
- id ของพนักงานเป็น string (`"emp-001"`) · id อื่นเป็นตัวเลข — ฝั่งหน้าเว็บเทียบด้วย `String(id)` อยู่แล้ว
- สถานะ: ✅ ทำแล้ว (Phase A) · ⏳ ยังไม่ทำ (Phase B — ตอนนี้ตอบ `501`)

---

## 1. Authentication

ส่ง token เป็น header `Authorization: Bearer <token>` · token อายุ `JWT_HOURS` ชั่วโมง (default 12)

| สถานะ | Method | Path | Body | Response |
|---|---|---|---|---|
| ✅ | POST | `/auth/login` | `{ userid, password }` | `{ token, user }` · ผิด = 401 ข้อความเดียวทุกกรณี |
| ✅ | POST | `/auth/login-card` | `{ rfid }` | `{ token, user }` · ค้นจากรหัสบัตรอย่างเดียว ไม่ใช้รหัสพนักงานแทน |
| ✅ | POST | `/auth/register` | `{ userid, password, name, position?, departmentId?, email?, rfid? }` | `201 { ok: true }` · role เป็น `USER` เสมอ · ซ้ำ = 409 |
| ✅ | GET | `/auth/me` | — | `{ user }` · ใช้ตอนเปิดแอปเช็คว่า token ยังใช้ได้ + role ล่าสุด |
| ✅ | POST | `/auth/logout` | — | `{ ok: true }` (บันทึก log — ฝั่งหน้าเว็บลบ token เอง) |

`user` = `{ userid, employeeId, name, role, position, departmentId }` — **`employeeId` คือค่าที่ใช้แทน `actorId` ใน MockDataContext** (ไม่มี password / รหัสบัตร)

rate limit: login 10 ครั้ง / 15 นาที ต่อ IP+รหัสพนักงาน · บัตร 30 ครั้ง / 15 นาที ต่อ IP · สมัคร 10 ครั้ง / ชม. → `429` + header `Retry-After`

### ผู้ใช้ (ADMIN เท่านั้น)

| สถานะ | Method | Path | หมายเหตุ |
|---|---|---|---|
| ✅ | GET | `/users` | รวม `rfid`, `email`, `isActive` · ⏳ เพิ่ม `sectionIds`, `teamIds`, `scope` |
| ✅ | PATCH | `/users/:userid` | `{ name?, role?, position?, departmentId?, email?, isActive?, rfid?, password? }` · `rfid: ""` = ถอดบัตร · ลดสิทธิ์ / ปิดบัญชีตัวเองไม่ได้ (409) · ⏳ รับ `sectionIds` / `teamIds` / `scope` เพิ่ม |
| ⏳ | POST | `/users` | ADMIN สร้างบัญชี `{ userid, password (≥ 6), name, role?, position?, departmentId?, sectionIds?, teamIds?, scope?, email?, rfid? }` · รหัสซ้ำ / บัตรซ้ำ = 409 |
| ⏳ | GET | `/org` | `{ divisions, sections, teams }` สำหรับฟอร์มผู้ใช้ / โปรเจกต์ |

**หน้าเว็บ (mock) ทำแล้ว:** `/admin/users` (`components/admin/UserManagement.js`) เรียก `MockDataContext.createUser` / `updateUser` ซึ่งใช้กฎเดียวกับ `routes/users.js` — ต่อ API แล้วแทนสองฟังก์ชันนี้ด้วยเส้นข้างบน

shape ผู้ใช้ที่หน้าเว็บใช้ (= `GET /users` เมื่อทำ ⏳ ครบ):
```json
{ "id": "emp-007", "name": "Wichai Prasertkul", "position": "Control Engineer", "email": "…",
  "role": "MANAGEMENT", "isActive": true, "rfid": null,
  "departmentId": "dept-2", "sectionIds": ["dept-2"],
  "scope": { "divisionIds": [], "sectionIds": ["dept-2"] } }
```
- `role` = `ADMIN | MANAGEMENT | USER` — ⏳ ENUM `users.role` ใน `schema.sql` ยังไม่มี `MANAGEMENT` (แก้พร้อม `services/auth.js ROLES`)
- `departmentId` = Section หลัก (อยู่ใน `sectionIds` เสมอ) · ทีมเก็บที่ `team.memberEmployeeIds` (คนหนึ่งอยู่ได้หลายทีม)
- `scope` ใช้เฉพาะ MANAGEMENT: ติ๊ก Division = ทุก Section ข้างใต้ · ต้องมีอย่างน้อย 1 อัน

ADMIN คนแรก: `npm run user:add` หรือ `npm run user:role -- <userid> ADMIN` บนเครื่อง server

---

## 2. ใครเห็นอะไร (visibility)

| ผู้ใช้ | เห็นโปรเจกต์ |
|---|---|
| guest (ไม่ส่ง token / token หมดอายุ) | `visibility = "public"` เท่านั้น |
| USER | public + private ที่ตัวเองเป็น Project Owner (`managerId`) / Team Lead (`teamLeadId`) / สมาชิก (`teamMemberIds`) |
| MANAGEMENT ⏳ | แบบ USER + private ใน **ขอบเขต** (`scope`): (ก) `project.sectionIds` ตรงกับขอบเขต **หรือ** (ข) Owner / Lead / สมาชิกคนใดสังกัด Section ในขอบเขต (สังกัด = `sectionIds` + Section ของทีมที่อยู่) — ในขอบเขต = **สิทธิ์เท่า Project Owner** (แก้ไข / จัดการสมาชิก / สร้างงาน / อนุมัติแทน) ยกเว้นขั้นตอนปิดโปรเจกต์ที่ยังเป็นของ Owner / Lead ตัวจริง |
| ADMIN | ทั้งหมด (และสิทธิ์เท่า Owner ทุกโปรเจกต์) |

- **โครงองค์กร** ⏳: Division → Section (= ตาราง `departments` + `division_id`) → Team (`teams.section_id`) · คนหนึ่งอยู่ได้หลาย Section / หลายทีม
  - ตารางที่ต้องเพิ่ม: `divisions`, `departments.division_id`, `user_sections (userid, department_id)`, `team_members (team_id, userid)` (ถ้ายังไม่มี), `management_scopes (userid, division_id NULL, department_id NULL)`, `project_sections (project_id, department_id)`
- กฎฝั่งหน้าเว็บ (ทำแล้ว ใช้ mock): `frontend/src/utils/access.js` (`canSeeProject` / `canManageProject` / `peopleInView`) มีเทส `access.test.js` — **backend `visibleWhere` ต้องแปลกฎเดียวกันเป็น SQL** (ตอนนี้ยังเป็นกฎ guest / USER / ADMIN เดิม)
- Workload / หน้าหลัก / รายงาน เห็นเฉพาะคนตาม `peopleInView`: ADMIN ทุกคน · MANAGEMENT คนในขอบเขต + คนในโปรเจกต์ที่เห็น · USER คนในโปรเจกต์ที่เห็น

- โปรเจกต์ที่ไม่มีสิทธิ์เห็นตอบ **404** เหมือนไม่มีอยู่ (รวมเส้นลูก `/projects/:id/tasks` ฯลฯ)
- token หมดอายุบนเส้นอ่าน = กลายเป็น guest เงียบ ๆ (ไม่ 401) → หน้าเว็บควรเรียก `/auth/me` ตอนเปิดแอป
- กฎอยู่ที่ `backend/services/visibility.js` ที่เดียว

---

## 3. Entities (shape ที่ API ส่งออก)

### Employee — `GET /employees` ✅
```json
{ "id": "emp-001", "name": "Kittipat Samran", "departmentId": "dept-1",
  "department": "Mechanical Automation & Software", "position": "Trainee", "email": "kittipat.s@mecha.local" }
```
guest ไม่ได้ `email` · หน้าเว็บอ่านรายชื่อจาก `MockDataContext.employees` (state) และ helper นอก React ใช้ `data/employeeStore.js currentEmployees()` — ไม่มี component import `MOCK_EMPLOYEES` ตรงแล้ว

### Department — `GET /departments` ✅ · Team — `GET /teams` ✅ · Label — `GET /labels` ✅
```json
{ "id": "dept-1", "name": "Mechanical Automation & Software", "code": "MAS", "divisionId": "div-1" }   // ⏳ divisionId
{ "id": "team-001", "name": "IT", "sectionId": "dept-1", "memberEmployeeIds": ["emp-001", "emp-002"] }  // ⏳ sectionId
{ "id": "div-1", "name": "Engineering", "code": "ENG" }   // ⏳ GET /divisions (หรือรวมใน GET /org)
{ "id": 1, "name": "ด่วนลูกค้า", "color": "#2F5BD0" }
```

### Project — `GET /projects?status=` ✅ · `GET /projects/:id` ✅
```json
{ "id": 1, "name": "แดชบอร์ดสถานะสายการผลิต", "description": "…", "category": "ระบบองค์กร",
  "status": "in_progress", "priority": "high", "visibility": "public", "sectionIds": ["dept-1"],
  "departmentId": "dept-1", "managerId": "emp-008", "teamLeadId": "emp-009", "teamMemberIds": ["emp-008", "emp-009", "emp-002"],
  "owner": "Supachai Meesuk", "startDate": "2026-10-01", "dueDate": "2026-12-15",
  "plannedBudget": null, "requiresDeliverables": true, "deliverableDescription": "", "closure": null,
  "createdBy": "emp-008", "createdAt": "…", "updatedAt": null,
  "totalTasks": 8, "completedTasks": 3, "unfinishedTasks": 5, "progress": 38 }
```
- `status`: `planning | in_progress | on_hold | done | cancelled` (ตรง `PROJECT_STATUSES` ใน `frontend/src/utils/config.js`)
- `visibility`: **field ใหม่** — mock ยังไม่มี (หน้าเว็บต้องเพิ่มตัวเลือก public / private ในฟอร์มโปรเจกต์)
- `owner` = ชื่อของ `managerId` (คำนวณ ไม่ได้เก็บ) · metrics คำนวณจากงานตอนอ่าน สูตรเดียวกับ `calculateProjectMetrics()`
- field ของ mock ที่ไม่ส่ง: `referenceAsOfDate`, `sampleLabel`, `memberPoolIds`, `displayStatusLabel` (ไม่มี component ใช้ / ใช้เป็น fallback ได้)

### Task — `GET /projects/:id/tasks` ✅
```json
{ "id": 4, "projectId": 1, "projectName": "…", "title": "…", "description": "…", "category": null,
  "status": "pending_review", "priority": "none", "assigneeId": "emp-002", "reviewerId": "emp-009",
  "collaborators": [], "startDate": "2026-10-25", "dueDate": "2026-11-12", "progress": 0, "estimatedHours": 0,
  "plannedAllocations": [{ "employeeId": "emp-002", "hours": 6 }],
  "assignmentHistory": [], "reviewHistory": [{ "action": "submitted", "actorId": "emp-002", "reviewerId": "emp-009", "timestamp": "…" }],
  "attachments": [], "labelIds": [],
  "checklist": [{ "id": 10, "title": "หน้ารายงานหลัก", "completed": true, "createdBy": "emp-002", "ownerId": "emp-002" }],
  "reviewSubmittedBy": "emp-002", "reviewSubmittedAt": "…", "reviewLastReason": null,
  "blocked": null, "size": "medium",
  "statusHistory": [{ "status": "not_started", "at": "…", "by": "emp-008" }, { "status": "in_progress", "at": "…", "by": "emp-002" }],
  "createdBy": null, "createdAt": "…", "updatedAt": null }
```
- `status`: `not_started | in_progress | pending_review | completed`
- **ไม่ส่ง `statusLabel`** — หน้าเว็บแปลงจาก `status` เอง (`TaskBadges.js` `STATUS_LABELS`)

### Deliverable — `GET /projects/:id/deliverables` ✅
```json
{ "id": 1, "projectId": 1, "title": "คู่มือการใช้งาน", "description": "", "relatedTaskId": 7, "responsibleId": null,
  "dueDate": null, "status": "pending", "attachments": [], "createdAt": "…", "updatedAt": null }
```
`status`: `pending | in_progress | completed`

### Activity — `GET /projects/:id/activities` ✅ (ใหม่ → เก่า)
```json
{ "id": 1, "type": "task_review_submitted", "projectId": 1, "projectName": "…", "taskId": 4,
  "actorId": "emp-002", "timestamp": "…", "description": "ส่งงาน … เข้าตรวจ" }
```
field เสริมของแต่ละ type (เช่น `reason`) อยู่ระดับบนเหมือน `recordActivity()` ใน mock

### Notification (รายคน) — `GET /notifications` ✅ (ต้อง login)
```json
{ "id": 1, "employeeId": "emp-002", "title": "มีการเปลี่ยนผู้รับผิดชอบงาน", "message": "…",
  "projectId": 1, "taskId": 5, "unread": true, "createdAt": "…", "time": "20/11/2569 11:27:02" }
```
⚠️ คนละระบบกับศูนย์แจ้งเตือน (`NotificationCenterContext` — security / audit / export) ซึ่ง**ยังเป็น mock และไม่อยู่ในสัญญานี้**

---

## 4. Phase B — เส้นเขียน ⏳ (ย้ายกฎจาก MockDataContext)

กติกาทั่วไป:
- ทุกเส้นต้อง login · actor = `req.user.employeeId` (แทน `actorId` ใน mock — **ห้ามรับ actorId จาก body**)
- ตรวจสิทธิ์และข้อมูลที่ server ซ้ำทุกข้อ (mock คืน `null` เมื่อผิด → backend ตอบ `400/403/404/409` + ข้อความไทย)
- งานที่แก้หลายตาราง (งาน + checklist + activity + notification) ทำใน `withTx` (`backend/db/pool.js`) และ insert `activities` ทุกครั้งแบบที่ mock เรียก `recordActivity()`
- ตอบกลับเป็น entity ตัวเต็มหลังแก้ (หน้าเว็บเอาไปแทนใน state ได้ทันที)
- แนะนำเส้นแบบ "action" สำหรับการเปลี่ยนสถานะ แทน `PATCH` ก้อนเดียวที่ส่ง `event.type` แบบ mock — ตรวจสิทธิ์ง่ายกว่า

ตัวย่อสิทธิ์: **O** = Project Owner (`managerId`) · **L** = Team Lead · **M** = สมาชิก (O/L/teamMemberIds) · **A** = ผู้รับผิดชอบงาน (assignee) · **C** = ผู้ร่วมงาน (collaborator) · **R** = ผู้ตรวจ (reviewer) · **AD** = ADMIN

### Projects
| MockDataContext | เส้นที่แนะนำ | สิทธิ์ / กฎหลัก |
|---|---|---|
| `setProjects` (เพิ่ม) | `POST /projects` | AD (หรือกำหนดเพิ่ม) · ผู้สร้างเป็น O · `visibility` default `private` · รับ `plannedBudget` (บาท, ไม่บังคับ, ≥ 0 — คอลัมน์ `planned_budget` มีแล้ว) |
| `updateProject` | `PATCH /projects/:id` | O / L · `status: done` ได้เฉพาะเมื่อ `closure.status = closed` · โปรเจกต์ปิดแล้วเปลี่ยนสถานะไม่ได้ · **แก้ชื่อ / คำอธิบาย / วันที่ไม่ reset การขอปิด** (reset เฉพาะเมื่องาน / สิ่งส่งมอบเปลี่ยน) |
| `updateProject` + `closure` | `POST /projects/:id/closure/submit` · `.../approve` · `.../return` `{ reason }` | **3 เส้น (เดิม 6 — ลดตาม UX-01/07):** `submit` = O เท่านั้น เมื่อทุกงาน `completed` + สิ่งส่งมอบเสร็จครบ → `pending_approval` (ตั้ง `ownerReviewedAt` / `deliverablesReviewedAt` / `submittedAt` พร้อมกัน) · `approve` = L เท่านั้น จาก `pending_approval` → `closed` + โปรเจกต์ `status: done` ทันที (ไม่มีขั้น close แยก) · `return` = L ต้องมีเหตุผล → `returned` (O ส่งใหม่ได้) · งาน/สิ่งส่งมอบเปลี่ยนระหว่างรออนุมัติ → กลับ `draft` (ดู `updateProject` / `resetClosureReview` ใน MockDataContext) |
| `setProjects` (ลบ) | `DELETE /projects/:id` | AD / O · ลบไม่ได้ถ้ายังมีงานหรือสิ่งส่งมอบ (Policy B ใน `Projects.js`) → 409 |
| `addProjectMember` | `POST /projects/:id/members` `{ employeeId, reason? }` | O / L · **`reason` ไม่บังคับ** (UX-06) · ซ้ำ / เป็น O-L อยู่แล้ว = 409 |
| `assignTeamLeader` | `PUT /projects/:id/team-lead` `{ employeeId, reason }` | O / L · ต้องเป็นสมาชิกโปรเจกต์อยู่แล้ว · สร้างโปรเจกต์ส่ง `teamLeadId` มากับ `POST /projects` ได้เลย |
| `setProjectMonthlyCost` | `PUT /projects/:id/costs/:month` `{ amount }` · `GET /projects/:id/costs` | O / L · `month` = `YYYY-MM` · เดือนเดิมส่งซ้ำ = แทนค่า (upsert ไม่บวก) · amount ≥ 0 · ⏳ **ยังไม่มีตาราง** — ต้องเพิ่ม `project_costs (project_id, month CHAR(7), amount DECIMAL(14,2), updated_by, updated_at, PRIMARY KEY(project_id, month))` · shape = `MockDataContext.projectCosts` |
| `removeProjectMember` | `DELETE /projects/:id/members/:employeeId` `{ replacementId, reason }` | O / L · นำ O/L ออกไม่ได้ · มีงานค้างต้องมีคนรับแทน · เป็นผู้ตรวจงานค้างอยู่ = 409 · โอนงาน + notification ให้ทั้งสองคน |

### Tasks
| MockDataContext | เส้นที่แนะนำ | สิทธิ์ / กฎหลัก |
|---|---|---|
| `createTask` | `POST /projects/:id/tasks` | actor เป็น M · assignee / reviewer / collaborators ต้องเป็น M · **assignee = reviewer ได้ (ตรวจเอง)** · สร้างได้แค่ `not_started` · `size` = `small | medium | large` (ไม่ส่ง = medium) ⏳ คอลัมน์ `tasks.size` ยังไม่มี · **หน้าเว็บเลิกส่งชั่วโมง** (`estimatedHours` / `plannedAllocations` เก่าคงไว้อ่านอย่างเดียว) |
| `updateTask` (`task_updated`) | `PATCH /tasks/:id` | O / L / A / C · แก้ไม่ได้ระหว่าง `pending_review` และหลัง `completed` · แก้ได้ที่ฟอร์ม "แก้ไขงาน" ที่เดียว (UX-09 ตัด panel แก้ซ้ำในหน้าทำงาน) |
| checklist (`checklist_*`) | `POST /tasks/:id/checklist` · `PATCH/DELETE /tasks/:id/checklist/:itemId` | M หรือผู้เกี่ยวข้องกับงาน · แก้/ลบได้เฉพาะเจ้าของรายการหรือ O · **ติ๊กข้อแรก → `not_started` เป็น `in_progress` อัตโนมัติ · เอาติ๊กออกหมด → กลับ `not_started`** |
| `task_started` / `_by_project_lead` | `POST /tasks/:id/start` | A / C หรือ O / L |
| `task_reopened` | `POST /tasks/:id/reopen` | A / O / L (`in_progress` → `not_started`) |
| `task_review_submitted` / `_by_project_lead` | `POST /tasks/:id/submit` | A / C หรือ O / L · เพิ่ม `reviewHistory { action: "submitted" }` · ล้าง `blocked` |
| `statusHistory` (ทุกเส้นที่เปลี่ยนสถานะ) | — | ทุกครั้งที่ `status` เปลี่ยน ต่อท้าย `{ status, at, by }` (สร้างงาน = `not_started`) — ใช้คำนวณระยะเวลาแต่ละสถานะ (`statusDurations` ใน `utils/executiveMetrics.js`) · ⏳ **ยังไม่มีคอลัมน์** — เพิ่ม `status_history JSON` ใน `tasks` หรือสร้างจากแถว `activities` ประเภทเปลี่ยนสถานะ (มี timestamp อยู่แล้ว) |
| `task_review_approved` / `_by_project_lead` | `POST /tasks/:id/approve` | R หรือ O / L → `completed` |
| `task_changes_requested` | `POST /tasks/:id/request-changes` `{ reason }` | R · ต้องมีเหตุผล → `in_progress` |
| `task_review_withdrawn` | `POST /tasks/:id/withdraw` `{ reason }` | คนที่ส่งตรวจ / O / L · ต้องมีเหตุผล |
| reassign (assignee เปลี่ยน) | `POST /tasks/:id/reassign` `{ assigneeId, reason }` | O / L · ต้องมีเหตุผล · โอน `plannedAllocations` · notification ให้คนเก่าและคนใหม่ |
| `task_completed_self_review` | `POST /tasks/:id/complete` | งานตรวจเอง (reviewer = assignee) เท่านั้น · A หรือ O / L · `in_progress` → `completed` ทันที (ไม่ผ่าน `pending_review`) · เพิ่ม `reviewHistory` submitted + approved |
| `task_blocked` / `task_unblocked` | `POST /tasks/:id/block` `{ reason? }` · `DELETE /tasks/:id/block` | A / C / O / L · งานรอตรวจ / เสร็จแล้วแจ้งไม่ได้ · เก็บ `blocked: { reason, by, at }` หรือ `null` · ⏳ **ยังไม่มีคอลัมน์** — เพิ่ม `blocked_reason VARCHAR(200)`, `blocked_by`, `blocked_at` ใน `tasks` (ALTER … ADD COLUMN IF NOT EXISTS) |
| `deleteTask` | `DELETE /tasks/:id` | O / L / ผู้สร้างงาน |

### อื่น ๆ
| MockDataContext | เส้นที่แนะนำ | หมายเหตุ |
|---|---|---|
| `createDeliverable` / `updateDeliverable` / `deleteDeliverable` | `POST /projects/:id/deliverables` · `PATCH/DELETE /deliverables/:id` | `relatedTaskId` ต้องเป็นงานในโปรเจกต์เดียวกัน · เปลี่ยนแล้ว reset การตรวจปิดโปรเจกต์ |
| `createLabel` / `updateLabel` / `deleteLabel` | `POST /labels` · `PATCH/DELETE /labels/:id` | ลบป้าย = ถอดออกจากทุกงาน (`task_labels` ON DELETE CASCADE ทำให้แล้ว) |
| `markNotificationsRead` | `POST /notifications/read-all` | ของตัวเองเท่านั้น |
| `addTaskWorkEntry` (`comments`) | `POST /tasks/:id/comments` `{ text }` · อ่านด้วย `GET` เส้นเดียวกัน | ผู้ที่เห็นโปรเจกต์ · ยังไม่มีตาราง — ต้องเพิ่มใน schema (frontend เก็บใน `MockDataContext.taskWork` แล้ว) · **เลิกเก็บบันทึกชั่วโมง (time-logs) แล้ว** ไม่ต้องทำเส้นนี้ |

ตัวเลขผู้บริหาร (สุขภาพโปรเจกต์ / งบใช้ไป / เวลาเฉลี่ยต่องาน / รายการรอตัดสินใจ) และ **Workload (แต้มตาม `size` ที่ยังเหลือ เทียบค่ากลางทีม — `utils/workload.js`)** **ไม่ต้องมีเส้นใหม่** — หน้าเว็บคำนวณจาก projects + tasks (`statusHistory`) + costs ด้วย `utils/executiveMetrics.js` (ถ้าข้อมูลเยอะค่อยย้ายสูตรไป `GET /reports/executive`)

เมื่อทำเส้นเขียนของหมวดไหนเสร็จ: ลบ prefix นั้นออกจาก `PENDING_PREFIXES` ใน `backend/middleware/notImplemented.js` และเปลี่ยน ⏳ เป็น ✅ ในเอกสารนี้

---

## 5. ข้อมูลทดสอบ (dev)

`npm run db:seed` คัดข้อมูลจาก `frontend/src/data/mockData.js` ลง DB (id เดียวกับ mock) · ADMIN = `emp-009` · project 1 = public, 3 และ 5 = private (Owner `emp-008`)

| ทดสอบเป็น | userid | เห็นโปรเจกต์ |
|---|---|---|
| guest | — | 1 |
| USER ที่ไม่ใช่สมาชิก | `emp-003` | 1 |
| Project Owner | `emp-008` | 1, 3, 5 |
| ADMIN | `emp-009` | 1, 3, 5 |
