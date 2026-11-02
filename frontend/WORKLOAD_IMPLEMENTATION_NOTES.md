# Workload Dashboard – Frontend Mock Implementation

## Added
- New route: `/workload`
- New Sidebar item: `Workload`
- Dedicated Workload Dashboard using the existing React Bootstrap + project design tokens.
- Weekly is the default period. Daily, Monthly and Yearly views are available.
- KPI cards: Team Capacity, Planned Workload, Team Utilization and Overcapacity Alerts.
- Employee workload chart with clickable employee detail modal.
- Workload Matrix, department/position/project filters, search and resource advisory.

## Mock schedule assumptions
- Standard shift: 08:00–17:00, with 80 minutes total break = 460 net minutes (7h 40m).
- Short shift: 08:00–15:00, with 80 minutes total break = 340 net minutes (5h 40m).
- The small number of short-shift days is generated deterministically per employee and date.
- Weekend pattern is a deterministic demo fixture by ISO week: odd weeks rest Saturday and Sunday; even weeks rest Sunday only. This can be replaced with actual calendar data later.
- Planned allocations are generated as deterministic frontend fixtures for 2026 and linked to existing employees, tasks and projects.

## Important
- This is frontend-only mock data. No API, backend or database was added or changed.
- The existing Home Dashboard Workload card now defaults to Weekly and uses the same Planned Hours mock allocations and schedule-aware capacity.
- The existing `MOCK_WORK_ENTRIES` data remains unchanged for other parts of the app, including Reports.

## Run locally
```bash
cd frontend
npm install
npm start
```

Open `/PROJECT-MANAGEMENT/workload` (or the app's configured base path plus `/workload`).

## Build verification
`react-scripts build` completed successfully in the provided environment.
