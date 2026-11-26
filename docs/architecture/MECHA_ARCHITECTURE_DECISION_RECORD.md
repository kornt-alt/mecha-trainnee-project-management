# MECHA Architecture Decision Record

**Project:** MECHA Project Management  
**Architecture direction:** Hybrid Architecture  
**Revision date:** 2026-11-23  
**Implementation status:** Not authorized  
**Evidence baseline:** branch `page/login`, commit `2a6494675289af9ff1777316d28cad225be55e15`

This document records approved architectural direction and distinguishes it from the current implementation. Approval of a decision does not authorize implementation. The current state below was verified by source and schema inspection; no runtime tests were performed for this record.

## Current verified architecture

The frontend is a hybrid transition rather than a completed API application. `frontend/src/App.js` mounts `MockDataProvider` and `NotificationCenterProvider`. `frontend/src/context/MockDataContext.js` initializes projects, employees, tasks, deliverables, labels, activities, notifications, task work, and project costs from frontend fixtures and keeps mutations in React memory. `NotificationCenterContext.js` separately keeps notification-center, incident, audit, and export fixtures in memory.

The frontend API client is `frontend/src/utils/api.js`. Current callers are `Home.js`, `About.js`, and `Projects.js`: health checks, project-list reads, and attempted project create/update/delete. Projects switches to API records only when a non-empty array is returned; an empty array silently uses mock projects. Project API writes are not implemented by the backend and receive 501. Other major modules remain mock-backed. The API wrapper does not send a bearer token.

The Express backend mounts auth, users, projects, notifications, and reference routes. It implements authentication endpoints, admin user listing/update, reference reads, project/workspace reads, and per-user notification reads. Project/task/deliverable/label/notification writes are pending. The database schema contains users, projects, project memberships, tasks and task child data, deliverables, activities, notifications, and reference tables. Some fields required by current mock workflows or the API contract are not persisted.

See `docs/api-contract.md` for entity shapes and pending operations. An endpoint listed there is not proof that a frontend module calls it.

## ADR-001: Explicit Mock/API Data Source Mode

**Status:** APPROVED  
**Implementation status:** CONFLICT — current implementation does not satisfy this decision.

### Context and evidence

- `frontend/src/App.js` mounts `MockDataProvider` globally.
- `frontend/src/context/MockDataContext.js` initializes multiple mock datasets and exposes mock mutations.
- No explicit Mock/API mode selector was found in `frontend/src/utils/config.js` or the module providers.
- `frontend/src/components/Projects.js` falls back to mock project records when the API response is empty.
- `frontend/src/components/Home.js` renders dashboard values from mock state while probing API health and projects.
- Project create/update/delete calls in `Projects.js` reach backend write paths that currently return 501.

### Decision

Mock Mode and API Mode must be explicit sources of truth. Mode selection may be global or module-level, but the scope must be deliberately selected and documented. Modules may have different owners during transition; a health probe is operational status and does not make application data API-owned. Data records from mock and API sources must not be blended within a module unless a documented feature explicitly requires it.

**Mock Mode** uses mock fixtures and mock state management, preserves existing mock workflows, and does not silently switch to API data.

**API Mode** uses backend data as its source of truth. An empty response is a real empty result; an API failure is an error state; an unsupported operation is reported as unavailable or pending. API Mode never silently falls back to mock data.

### Requirements

1. Define mode-selection scope and module-level ownership before integration.
2. Keep application data source separate from API health monitoring.
3. Give each module explicit loading, empty, error, and unsupported-operation behavior.
4. Verify Mock Mode and API Mode independently.
5. Preserve existing mock workflows during transition.

## ADR-002: Authentication and Authorization Architecture

**Status:** INVESTIGATION REQUIRED / DECISION PENDING  
**Implementation status:** Frontend and backend identity are not integrated.

### Verified current behavior

- `frontend/src/components/auth/LoginModal.js` validates against mock employee data and demo credentials.
- `frontend/src/utils/session.js` stores `{ employeeId }` or `{ guest: true }` in `sessionStorage`. It does not store a backend token.
- `frontend/src/utils/api.js` does not attach a JWT bearer token. The frontend does not call `/auth/me` or backend `/auth/logout`.
- Backend `POST /auth/login` and `POST /auth/login-card` issue JWTs. `backend/services/auth.js` verifies JWT signatures and expiry. `backend/config/env.js` defaults token expiry to 12 hours.
- `backend/middleware/auth.js` reloads the account from the database for authenticated requests and rejects inactive accounts.
- Backend logout records a log entry but does not revoke an existing JWT. A token remains usable until expiry unless another validation condition, such as account deactivation, rejects it.
- `frontend/src/utils/access.js` defines `ADMIN`, `MANAGEMENT`, and `USER`. Backend `backend/services/auth.js` and `backend/db/schema.sql` define `ADMIN` and `USER`. Management organizational scope is not implemented in backend authorization or database role definitions.
- `frontend/src/components/admin/RequireAdmin.js` is a mock-backed UI guard, not a security boundary. `backend/routes/users.js` separately enforces `requireAdmin`.
- Backend project visibility in `backend/services/visibility.js` supports guest/public, user project relationships, and admin access. It does not implement the frontend Management organizational scope.

### Decision

Do not select a new role or permission model until the required capabilities and organizational scope semantics have been investigated. The following options are under consideration; neither is approved.

### Role and permission mapping

| Capability | Current frontend model | Current backend model | Gap to resolve |
|---|---|---|---|
| Guest | Guest session; public projects | No authenticated user; public projects | Define whether guest mode remains available in API Mode. |
| Administrator | `ADMIN`; mock UI guard | `ADMIN`; protected user routes | Integrate identity; retain server-side enforcement. |
| Standard user | `USER`; mock access filtering | `USER`; visibility through project owner/lead/member relationships | Verify action-level permissions, beyond project visibility. |
| Management | `MANAGEMENT` plus organizational scope; can receive management-equivalent project access | No Management role or scope | Define capabilities, scope semantics, storage, and server enforcement. |
| Owner / Team Lead / Member | Project attributes and frontend access helpers | `manager_id`, `team_lead_id`, `project_members` | Define exact permissions per action and align server checks. |

### Options for investigation

| Evaluation area | Option A: `ADMIN` / `USER` / `MANAGEMENT` backend roles | Option B: `ADMIN` / `USER` plus permissions and organizational scopes |
|---|---|---|
| Security | Role checks are straightforward, but Management scope still needs server enforcement. | Can express fine-grained policy, provided every sensitive query/action applies it. |
| Maintainability | Simpler when duties map cleanly to three roles. | More flexible, with added policy and scope complexity. |
| Frontend compatibility | Direct mapping to current mock labels. | Requires mapping current role/scope state to permissions. |
| Database impact | Role enum and user role assignment need migration. | Requires persisted scope/permission representation and organization relationships. |
| API impact | Backend role checks and role-aware response behavior. | Scope-aware authorization across relevant endpoints and queries. |
| Migration and compatibility | Existing `ADMIN`/`USER` remain; Management users need explicit mapping. | Existing roles can remain, but mock scopes need migration into persisted policy data. |

### Required investigation and approval

Define Management capabilities; organizational scope semantics; action-level permissions; visibility rules; project ownership and membership; backend enforcement requirements; database representation; and migration/backward-compatibility strategy. Present the evidence-based recommendation for separate approval. Do not alter role definitions or authorization logic before that approval.

## ADR-003: Project Deletion Policy B

**Status:** APPROVED  
**Implementation status:** CONFLICT — Policy B is not consistently implemented.

### Context and evidence

- In mock mode, `frontend/src/components/Projects.js` blocks deletion if tasks or deliverables exist.
- In API mode, the same component calls `DELETE /projects/:id` without the equivalent client-side relationship check.
- `backend/routes/projects.js` has no project DELETE route. `backend/middleware/notImplemented.js` returns HTTP 501 for project writes.
- `backend/db/schema.sql` uses `ON DELETE CASCADE` for project memberships, tasks, deliverables, and activities.
- `docs/api-contract.md` specifies a conflict response when protected relationships exist.
- `backend/db/pool.js` provides `withTx`, but no project deletion operation uses it.

### Decision

A project must not be deleted when it has related tasks or deliverables. This decision is approved, but it is not currently enforced consistently. Project deletion must remain unavailable in API Mode until the backend and database design satisfy this policy.

### Required architecture

1. Enforce Policy B in the backend; frontend checks are supplementary.
2. Prevent database constraints from silently cascading deletion of protected project data. Evaluate `RESTRICT` / `NO ACTION` for protected relationships.
3. Use transactional enforcement and a concurrency strategy that prevents a related record being added between the guard and deletion. A pre-check alone is insufficient.
4. Return HTTP 409 when related tasks or deliverables block deletion.
5. Preserve all related records after rejected deletion.
6. Assess deployed data and migration compatibility before schema changes.

### Required tests

- Delete a project with no tasks or deliverables.
- Reject deletion with related tasks.
- Reject deletion with related deliverables.
- Exercise concurrent attempts to create related records and delete the project.
- Verify database constraints and transaction rollback preserve related records.

Do not implement project deletion, alter `schema.sql`, or create migrations until the database/API design is approved.

## ADR-004: Dependency-driven API Integration

**Status:** APPROVED  
**Implementation status:** Partially prepared; most frontend modules remain mock-backed.

### Decision

Integrate modules incrementally according to verified dependencies. The existence of an endpoint does not by itself make a module ready for integration. Do not migrate every module automatically.

Before integration, each module must pass readiness checks for:

- Authentication and identity requirements.
- Authorization and visibility enforcement.
- API contract completeness and request/response compatibility.
- Required database persistence and migration readiness.
- Explicit data ownership and Mock/API mode behavior.
- Loading, empty, error, and unsupported-operation handling.
- Testability in an isolated environment.

Authentication and shared API transport are coupled foundation work: authentication needs a token-aware transport, while protected transport depends on an approved identity and authorization model. Authorization and visibility must be approved and enforced before protected module integration.

## Decision and implementation boundary

The four decisions above record architecture direction, not permission to change the repository. Implementation remains unauthorized until a specific phase plan is reviewed and explicitly approved. No source, database, configuration, dependency, or UI changes are authorized by this ADR.
