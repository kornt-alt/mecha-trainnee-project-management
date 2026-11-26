# MECHA Implementation Roadmap

**Project:** MECHA Project Management  
**Architecture direction:** Hybrid Architecture  
**Revision date:** 2026-11-23  
**Implementation status:** Not authorized  
**Evidence baseline:** branch `page/login`, commit `2a6494675289af9ff1777316d28cad225be55e15`

This roadmap describes proposed implementation work, dependencies, and acceptance gates. It does not authorize implementation. Each phase requires a specific reviewed plan and explicit approval before work begins. Current-state statements are based on source and schema inspection, not runtime verification.

## Current implementation baseline

- The frontend mounts `MockDataProvider` and `NotificationCenterProvider`; most business modules use in-memory mock state.
- No explicit Mock/API mode selector was found. Projects switches to mock data when the API returns an empty array.
- The frontend API wrapper does not send JWT bearer tokens. Frontend login/session remains mock-based; backend JWT authentication is separate.
- Backend read endpoints exist for projects/workspace, references, and per-user notifications. Auth endpoints and admin user read/update routes also exist.
- Project/task/deliverable/label/notification writes are pending and return 501 through `notImplemented`.
- Workload, reports, user-management UI, operational notification center, audit UI, incidents, and exports remain mock-backed.
- Policy B is inconsistent across layers: mock UI blocks deletion when tasks/deliverables exist; API mode calls a DELETE endpoint that returns 501; project-child foreign keys cascade.
- Persistence gaps identified by `docs/api-contract.md` include project costs, task size, task status history (unless derived from activities), blocked-state fields, and comments. Task/deliverable activity relationships also need review for required workflows.
- Frontend unit/spec files exist, but `frontend/package.json` has no test script. Playwright package/CLI was unavailable during verification. Backend dependencies and runtime DB setup were unavailable; no tests were run for this roadmap.

## Roadmap gates

These gates apply across all phases. A phase cannot pass by relying on a client-only check or the existence of a route without its required behavior.

### Gate A — Architecture Approval

No implementation begins while a required architecture decision is unresolved. ADR-002’s role/permission recommendation requires separate approval. Each phase also requires a reviewed technical plan and explicit authorization.

### Gate B — Authentication and Authorization

No protected API integration proceeds until frontend identity, token transport, guest behavior, and approved server-side authorization/visibility enforcement are ready. UI route guards do not substitute for backend authorization.

### Gate C — Data Source Isolation

Before a module integrates, its Mock/API mode and source-of-truth owner must be explicit. Empty API results, failures, and unsupported operations must not silently select mock data. Health monitoring must remain distinct from application data ownership.

### Gate D — Data Contract and Persistence

Before domain integration, required endpoints, request/response shapes, database fields/tables, migrations, validation, and data ownership must be ready and reviewed.

### Gate E — Project Deletion Safety

API-mode project deletion remains unavailable until Policy B is enforced by backend and database behavior, including concurrency safety and tests that prove related records survive rejected deletion.

### Gate F — Testing Readiness

Each implementation phase introduces appropriate automated verification. Phase 8 is final regression, not the first testing phase. Database tests use an isolated disposable database; builds must use an output path that does not overwrite tracked `frontend/build/` artifacts.

## Phase 0 — Architecture, Authorization, and Integration Readiness

**Objective:** Establish the decisions and evidence needed to plan implementation safely.

### Work

- Trace current login, session, token, and API-client behavior.
- Build role/permission mapping for guest, admin, user, Management scope, owner, lead, member, assignee, collaborator, and reviewer actions where present.
- Define Management capabilities and organizational scope semantics as requirements, without selecting Option A or B until evidence supports a recommendation.
- Inventory endpoint authentication and authorization requirements, including sensitive reads and writes.
- Define explicit Mock/API mode selection scope and module-level source ownership.
- Inventory each API contract, endpoint status, persistence requirement, error behavior, and UI consumer.
- Inventory schema gaps, migration compatibility questions, and project relationships relevant to Policy B.
- Define test entry points, isolated DB strategy, browser-tool requirements, and non-destructive build verification.
- Prepare the ADR-002 recommendation for separate approval.

### Exit criteria

- Role and permission requirements and scope semantics are documented.
- A recommended authorization model is evidence-based and presented for approval; it is not implemented without approval.
- Module data ownership and Mock/API mode scope are explicit.
- API, schema, and test readiness gaps have named dependencies and owners.
- No unresolved architecture assumption is presented as an implementation fact.

**Dependencies:** None.  
**Gate:** A is required before later implementation; the other gates are defined here.  
**Likely subsystems:** frontend access/session/API/context; backend auth, visibility, routes, schema; API contract.

## Phase 1 — Authentication and API Transport Foundation

**Objective:** Establish one frontend/backend identity and a token-aware shared transport. Authentication and transport are coupled foundation work, not independent sequential phases.

### Work

- Integrate frontend password/card login with backend endpoints as approved.
- Define token storage, session lifecycle, guest behavior, logout semantics, and expiry handling.
- Hydrate identity using `/auth/me` and handle inactive accounts.
- Add token-aware centralized API transport and consistent 401/403 behavior.
- Decide whether backend logout is local token discard, server revocation, or both; current backend logout only logs the event.
- Add tests for authenticated, unauthenticated, expired, inactive, and forbidden requests.

### Exit criteria

- Frontend identity matches the backend identity for authenticated sessions.
- Protected calls carry credentials through the centralized client.
- Guest and authenticated behavior are explicit and tested.
- Expired, invalid, and inactive-account sessions have consistent behavior.
- Logout behavior matches an approved token lifecycle decision.

**Dependencies:** Phase 0; ADR-002 model recommendation approved before protected module integration. Minimal transport and authentication work may be developed together.  
**Gates:** A, B, F.  
**Likely subsystems:** login/session/API/App; backend auth routes, service/middleware, config.

## Phase 2 — Shared Data Access and Mock/API Mode

**Objective:** Provide module adapters and explicit data ownership on top of Phase 1 transport.

### Work

- Define explicit Mock/API mode configuration and whether selection is deployment-wide or module-level.
- Define module source-of-truth ownership and data adapters.
- Standardize request/response mapping, errors, loading, empty, and unsupported-operation states.
- Prevent implicit fallback and accidental mock/API record mixing.
- Keep API health monitoring separate from application data selection.
- Verify each selected module in Mock Mode and API Mode independently.

### Exit criteria

- Mode is selected explicitly at the approved scope.
- Empty API responses remain empty; API failures remain errors.
- Unsupported actions are visibly unavailable and do not mutate a different source.
- Mock workflows remain independently functional.
- Tests cover mode isolation and source ownership.

**Dependencies:** Phase 0 decisions and Phase 1 transport.  
**Gates:** A, B where protected data is involved, C, F.  
**Likely subsystems:** API/config, MockDataContext, module providers and data adapters.

## Phase 3 — Project and Workspace Read Integration

Project CRUD is not currently implemented. Treat read integration and write readiness as separate workstreams.

### A. Project reads

Integrate project list and detail reads with explicit mode ownership, visibility, empty states, and errors. Correct the dashboard health mismatch: backend `/health` returns `ok`, while `Home.js` checks `status === 'ok'`.

**Acceptance:** API Mode displays exactly the API result, including a genuine empty state; inaccessible projects follow the approved server visibility policy; health state matches the actual response contract.

### B. Workspace reads

Integrate project tasks, deliverables, and activities through existing read endpoints. Map response shapes and preserve module ownership. Ensure each child read is authorized through the parent project visibility check.

**Acceptance:** Workspace read data maps to UI shapes without mock/API mixing; loading/empty/error behavior is covered; access tests verify private-project boundaries.

### C. Project write readiness

Assess create/update/delete endpoint contracts, fields, validation, authorization, persistence, and error semantics. Do not describe CRUD as implemented or enable project API writes while backend routes remain pending. Deletion separately requires Phase 4 and Gate E.

**Acceptance:** A reviewed contract and readiness decision exists per operation. Unsupported writes are clearly unavailable. No API-mode operation reports success before persistence succeeds.

**Dependencies:** Phases 0–2; approved and enforced visibility model for protected reads. Project deletion depends on Phase 4.  
**Gates:** A–D, F; Gate E for delete.  
**Likely subsystems:** Projects/Home/project-detail; project routes, visibility, services and DB modules; API contract.

## Phase 4 — Project Data Integrity and Deletion Policy

**Objective:** Make Policy B a hard prerequisite for API-mode project deletion.

### Work

- Design a server-side deletion guard for related tasks and deliverables.
- Evaluate RESTRICT / NO ACTION foreign keys for protected relationships.
- Define transaction and concurrency handling so a relationship cannot be inserted between validation and deletion.
- Assess current deployed data, schema migration behavior, and rollback strategy.
- Define HTTP 409 contract for blocked deletion.
- Prepare integrity tests using an isolated disposable database.

### Exit criteria

- Projects with tasks or deliverables are rejected with HTTP 409.
- Rejected deletion leaves project and related records intact.
- Database constraints prevent unintended cascade deletion.
- Concurrent create/delete behavior is tested and safe.
- Migrations are reviewed against supported MariaDB versions and existing data.
- API-mode delete remains disabled until every criterion passes.

**Dependencies:** Phase 0; approved schema/API design. The implementation gate must pass before project deletion is exposed.  
**Gates:** A, D, E, F.  
**Likely subsystems:** backend schema/migrations, project route/service/DB layer, transaction helper, project UI, deletion API contract.

## Phase 5 — Reference Data and User Administration

### A. Reference data reads

Integrate employees, departments, teams, and labels only after response shape, exposure, and identity requirements are defined. Current backend read routes exist, but no frontend callers were found.

### B. User administration

Integrate user list and update routes after auth and authorization are ready. Assess whether administrator-created users are required; do not assume an admin-create endpoint exists. Current backend has self-registration and admin list/update, but no admin user-create route.

### Exit criteria

- API Mode reference and user data have explicit ownership and consistent shapes.
- Admin UI controls are backed by server-side requireAdmin checks.
- Role/scope mappings match the approved model.
- User create capability is explicitly supported or marked unavailable.
- Tests cover public/authenticated reference responses and admin/non-admin operations.

**Dependencies:** Phases 0–2; Phase 1 and approved authorization model.  
**Gates:** A–D, F.  
**Likely subsystems:** UserManagement/RequireAdmin, employee/reference stores; reference and users routes/services/DB; role model.

## Phase 6 — Business Domain Integrations

Each domain is separately gated. Endpoint presence is insufficient; verify schema, contract, ownership, authorization, and testability first.

### Tasks and task persistence

Task reads exist under project reads; task writes are pending. Resolve task size, status history, blocked-state, comments, and event relationships required by selected workflows. Decide whether status history is stored directly or reliably derived from activities.

### Deliverables

Read endpoint and table exist; writes are pending. Validate related-task ownership and project deletion relationships.

### Notifications

Keep distinct: backend per-user notifications (`GET /notifications`, current-user scoped) versus the mock operational notification center containing security, audit, and export experiences. Decide which system owns each notification and its read/write semantics.

### Workload

Currently mock-calculated. Integrate only if approved source data and required task fields are persisted; no dedicated workload endpoint is currently required by the documented calculation direction.

### Reports and Executive Overview

Currently calculated from mock datasets. Do not integrate until required costs and status-duration data are available and calculations use a coherent source. Missing persistence includes `project_costs` and task status history unless derived.

### Exit criteria per domain

- Required tables/fields and migrations are reviewed and available.
- Read/write endpoints and response contracts are complete.
- Ownership, visibility, and action-level authorization are enforced server-side.
- No required calculation depends on unavailable persistence.
- Mock/API behavior is isolated and independently tested.

**Dependencies:** Phases 0–5 as applicable; domains may proceed independently after their prerequisites pass.  
**Gates:** A–D, F; E for any project deletion-related operation.  
**Likely subsystems:** task/workspace routes and DB modules; MockDataContext; task, deliverable, notification, workload, and report components; schema and API contract.

## Phase 7 — Audit, Security Incidents, and Export

**Objective:** Define backend capabilities for currently mock-driven operational/security modules before implementing them.

### Work

- Define audit event scope, completeness, actor attribution, integrity expectations, and retention.
- Define incident data model, statuses, evidence, permissions, and retention.
- Define export scope, privacy rules, authorization, formats, and auditability.
- Define access monitoring and data-retention requirements.
- Assess existing logs table: it records selected authentication/user actions and is not a complete audit trail.
- Design persistence, API contracts, and authorization before UI integration.

### Exit criteria

- Audit, incident, export, and access-monitoring requirements are approved.
- Persistence, retention, permissions, and export privacy are defined.
- Mock demonstrations are clearly distinguished from production capabilities.
- Tests verify authorization, retention behavior, and export scope.

**Dependencies:** Phase 0 and approved product/security requirements; auth and authorization foundations.  
**Gates:** A–D, F.  
**Likely subsystems:** NotificationCenterContext, audit/incident/export components, logs/schema, new approved backend contracts.

## Phase 8 — Final Stabilization and Regression Gate

**Objective:** Release gate after continuous phase-level verification has been established.

### Coverage

- Unit and domain calculation tests.
- Backend/API integration tests.
- Playwright E2E where browser tooling is available.
- Authentication and authorization tests.
- API contract and Mock/API mode tests.
- Policy B deletion and concurrency tests.
- Database integrity and migration tests.
- Error-state and regression tests.
- Production build using a non-destructive output path so tracked frontend/build artifacts are not overwritten.

### Execution classes

- **No-persistent-write:** pure utility/unit tests, subject to runner behavior and controlled output locations.
- **Isolated database required:** route integration, migration, transaction, and integrity tests; use disposable test DB only.
- **Browser tooling required:** Playwright E2E; run only when dependency and browser are already available or separately approved for setup.
- **Build output isolation required:** use an output directory outside tracked build artifacts.
- **Currently unavailable in verification environment:** no frontend test script was configured, Playwright package/CLI was unavailable, and backend dependencies/runtime DB configuration were absent. No test pass is asserted.

### Exit criteria

- All critical workflows pass in their intended mode.
- Auth, permissions, API contracts, and deletion safety are covered.
- No critical regressions remain.
- Build and tests are reproducible without changing protected artifacts or production data.
- Known limitations and final Git changes are reviewed.

**Dependencies:** All prior phases and gates applicable to shipped modules.  
**Gate:** F plus all applicable gates A–E.

## Module readiness snapshot

This snapshot describes current readiness, not a commitment to migrate every module.

| Module | Current source / backend state | Readiness before integration |
|---|---|---|
| Dashboard | Mock display values; API health/project probes; health response mismatch | Conditional; correct health contract and explicit mode first. |
| Projects list/detail | List/read endpoints exist; list UI has implicit fallback | Conditional; Phase 2 source isolation and approved visibility. |
| Project writes | UI attempts writes; backend returns 501 | Blocked until write contracts and endpoints exist. |
| Project deletion | Mock-only guard; DB cascades | Blocked by Gate E. |
| Workspace tasks/deliverables/activities | Read endpoints exist; workspace UI uses mock state | Conditional; auth/visibility, response mapping, persistence gaps. |
| Employees/reference | Read endpoints exist; UI uses fixtures | Conditional; data contract, exposure, and mode ownership. |
| User management | Backend list/patch protected; UI mock; no admin-create route | Conditional; auth/RBAC and create capability decision. |
| Workload | Mock calculation and fixtures | Mock-only until source data requirements are met; API endpoint not presumed necessary. |
| Reports/executive | Mock calculations; missing cost/history persistence | Blocked for API data until required data is persisted or calculations are revised by approval. |
| Per-user notifications | Backend read endpoint; writes pending | Conditional; auth, ownership, and notification semantics. |
| Operational notification center | Mock notifications, audit, incidents, exports | Mock-only pending product/security requirements and backend design. |

## Approval and change control

For each phase: inspect current implementation; prepare a technical plan with affected files, dependencies, and regression risks; obtain explicit approval; implement only the approved scope; run appropriate tests; inspect exact Git changes; and obtain approval before the next major phase. This roadmap itself authorizes no code, schema, migration, dependency, configuration, or UI changes.
