# MECHA Project Management — Shared AI Coding Instructions

## A. Project Identity
- Project: MECHA Project Management
- Frontend: React, JavaScript, React-Bootstrap
- Backend: inspect real structure before use
- Current phase: Frontend Mock Data
- Backend Integration requires user approval

## B. Mandatory Rule Reading
Before any code work:
1. Read root `coding-rules.md` fully.
2. Read AGENTS.md and module-specific rules.
3. Identify rules relevant to the current task.
4. If rules cannot be read, notify user before editing.

## C. Read Before Edit
Before editing or adding code:
- Read actual source at target location.
- Read related functions/components fully.
- Check imports, props, state, hooks, dependencies.
- Check callers and data flow.
- Check CSS/UI patterns.

## D. Reuse First
Before creating new code, search existing:
- Components, Hooks, Contexts, Utilities, Services, Functions, CSS, Data Flow, Modal/Dropdown/Form patterns.

Decision order:
1. Reuse
2. Extend
3. Refactor
4. Create New (with justification)

## E. Architecture Preservation
- Use existing architecture.
- No duplicate Context/State.
- Use MockDataContext as Source of Truth where connected.
- No duplicate mock data.
- Use shared components and CSS tokens.

## F. Scope and Git Safety
Before changes run:
- `git branch --show-current`
- `git status --short`
- `git diff`
- `git diff --cached`

Preserve existing changes. No reset/clean/restore/stash/switch/commit/push without approval.

## G. Implementation Workflow
1. Read Instructions
2. Inspect Git State
3. Inspect Existing Source
4. Search Reusable Code
5. Identify Root Cause/Plan
6. Implement Minimal Changes
7. Verify
8. Review Diff
9. Report

Audit-only tasks stop before editing.

## H. Verification
Run as appropriate:
- ESLint
- Build
- Relevant tests
- Regression
- `git diff --check`

Never claim passed without actual execution.

## I. Final Reporting
Report:
- Files inspected
- Existing code reused
- New code created and reasons
- Files changed
- Tests/build results
- Regression results
- Remaining limitations
- Git status
