# Workload Dashboard – Frontend Mock Implementation

## Added
- New route: `/workload`
- New Sidebar item: `Workload`
- Dedicated Workload Dashboard using the existing React Bootstrap + project design tokens.
- Weekly view (driven by the current local day); the person and team views show workload relative to the team median.
- KPI cards: members count, overloaded members, heavy-load members and free members.
- Employee workload chart with clickable employee detail modal.
- Team / project filters, name search, and per-person vs per-team view modes.

## How Workload Is Measured (current)
Workload is based on **Task Points**, not hours. No employee ever enters hours, so an hours-based calculation would show 0% for everyone.

- Task size mapping: **Small = 1, Medium = 3, Large = 8** points (`TASK_SIZE_POINTS` in `utils/workload.js`).
- A task's remaining points = size points × the unchecked fraction of its checklist. A task with no checklist counts as fully open.
- Each person's load is the sum of their remaining points across open tasks, compared against the **team median** (computed from the people currently in view).

## Assignment Roles (per task, per person)
A single open task can contribute to several people in different roles:

| Role | Weight | When |
|---|---|---|
| `owner` | full remaining points | The person is the task's `assigneeId`. |
| `helper` | 50% of remaining points | The person is a `collaborator` but not the assignee. |
| `review` | 25% of size points | The task is `pending_review` and the person is the `reviewerId` (not the assignee). |

A task that is already `pending_review` contributes nothing to its assignee — the assignee has nothing left to do until the review comes back. Self-review (reviewer = assignee) is not counted twice.

## Workload Levels
Levels are derived from the person's points against the team median:

| Level | Rule |
|---|---|
| `over` | ≥ 2× the team median **and** ≥ 8 points, **or** ≥ 8 points of overdue work. |
| `heavy` | ≥ 1.5× the team median **and** ≥ 5 points, **or** any overdue work, **or** ≥ 8 points due within 7 days. |
| `normal` | Has open work but does not meet the above. |
| `free` | No open work. |

All thresholds live in `WORKLOAD_RULES` in `utils/workload.js` and are the single source of truth for the Workload page, the Home dashboard card and the Executive report.

## Per-Person Row Data
Each row exposes: total `points`, `overdue` count and `overduePoints`, `dueThisWeek` count and `dueSoonPoints`, `open` (owned tasks) + `helping` (collaborations), `toReview` (tasks awaiting this person's review), `blocked` count, and the sorted task list (overdue → due soon → priority → due date).

## Team View
The page offers two perspectives:
- **Per person** — filtered by team, project or name search; the team median is computed within the filtered set.
- **Per team** — aggregates members into team cards showing each level's headcount, total points and overdue count.

## Schedule / Capacity Notes
- No planned allocations, capacity targets or utilization percentages exist in the current implementation. There is no "full-time equivalent" to compare against, so load is always relative to the team median.
- Leave and shift data are not part of the workload model. The only date awareness is task `dueDate` (overdue vs. due within 7 days); the weekday/weekend calendar or shift pattern is not used in workload calculation.
- The Home dashboard Workload card uses the same `memberWorkload` rule as this page and recomputes at midnight and when the tab refocuses (`utils/useLocalDay.js`).

## Important
- This is frontend-only mock data. No API, backend or database was added or changed.
- The existing `MOCK_WORK_ENTRIES` data remains unchanged for other parts of the app, including Reports.
- Work Log entries (hour logging) are unrelated to workload and are intentionally left out of the workload calculation.

## Run locally
```bash
cd frontend
npm install
npm start
```

Open `/PROJECT-MANAGEMENT/workload` (or the app's configured base path plus `/workload`).

## Build verification
`react-scripts build` completed successfully in the provided environment.
