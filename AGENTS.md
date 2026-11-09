# AGENTS.md — AI Agent Rules for this Repository

Instructions for AI coding agents working on this project (OpenCode, and other agents that read `AGENTS.md`).

## Project Overview

- **Project:** MECHA — Project Management web app.
- **Structure:** `frontend/` (React, react-scripts) and `backend/` (Node.js + Express, MariaDB on the server).
- **Current phase: FRONTEND-ONLY.** The application uses **Mock Data** (`frontend/src/data/`, provided through `frontend/src/context/MockDataContext.js`). Backend integration is deferred to a future "Phase API Integration". Do not assume the backend is connected; do not introduce real API dependencies into mock-only features.
- **Read relevant Markdown documentation before implementing:** `README.md` (architecture, file map, team coding rules, Git workflow), `coding-rules.md` (coding rules), and feature notes such as `frontend/WORKLOAD_IMPLEMENTATION_NOTES.md`.

## Mandatory Superpowers Workflows

Skills are loaded via OpenCode's native `skill` tool (bare IDs, no `superpowers:` prefix). Only report a skill as invoked if it was actually loaded in that session. Skills loaded in one agent's session do not exist in another agent's session — each agent must load its own.

### A. New Feature Workflow (mandatory order)

1. `brainstorming` — understand requirements before implementation, explore alternative approaches, present a design and obtain approval before implementation when the brainstorming skill requires it.
2. `writing-plans` — create a detailed implementation plan.
3. `test-driven-development` — write a failing test before production code; implement the minimum necessary changes.
4. `verification-before-completion` — verify actual results with fresh command output.
5. `requesting-code-review` — request code review before considering the work complete.

### B. Bug Fix Workflow (mandatory order)

1. `systematic-debugging` — reproduce the problem, investigate the root cause, gather evidence before proposing a fix. **Never guess and immediately modify production code.**
2. `test-driven-development` — write a regression test that fails before the fix; apply the smallest appropriate correction.
3. `verification-before-completion` — verify the fix and check for regressions (run the project's full test suite, not just the new test).
4. `requesting-code-review` — request review of the fix.

### C. Refactoring Workflow

1. Inspect existing behavior and tests; establish a baseline (tests green before starting).
2. Use `using-git-worktrees` when appropriate.
3. Follow TDD refactoring principles: keep tests green, change no behavior, extract/improve only what the task requires.
4. Verify behavior remains unchanged and tests remain green after refactoring.
5. Request code review when appropriate.

Do not introduce unrelated features or behavior changes during refactoring.

### D. Code Review Workflow

- Dispatch review with `requesting-code-review` when appropriate.
- Evaluate feedback with `receiving-code-review`: verify each finding against the codebase independently; do not blindly accept reviewer suggestions; do not implement unrelated recommendations without authorization.

### E. Verification Workflow

Before claiming completion of any task:

1. Run the actual relevant tests.
2. Run the production build when applicable (`cd frontend && npm run build`) — except for documentation-only tasks that change no application code.
3. Inspect the final `git diff`.
4. Verify that no files outside the task's authorized scope were modified.
5. Report the actual commands executed and their actual results.
6. Clearly disclose failures, skipped checks, and limitations.

Never claim success based on assumptions.

## Subagent Rules

Whenever dispatching a subagent, its prompt must:

1. Explicitly instruct it to read this project-level `AGENTS.md`.
2. Require it to load the relevant Superpowers skills itself (superpowers instructions loaded in the parent session must not be assumed to exist in the subagent's session).
3. Pass all relevant project constraints (Frontend-only phase, Mock Data, protected areas, Git safety — see below).
4. Define its exact scope and permitted files.
5. Require it to preserve existing user changes.
6. Require a report of the exact files changed.
7. Require actual verification evidence (commands run and their results), not assertions.

## Project Constraints

Mandatory unless the user explicitly authorizes an exception.

### Protected Areas

- Do not modify `backend/` or anything backend-related.
- Do not modify the database, database schemas, or migrations (including `backend/db/`).
- Do not modify `frontend/build/`.
- Do not update dependencies or package versions without explicit authorization.
- Do not change environment configuration (`.env`, config files) without authorization.
- API calls may use the centralized `frontend/src/utils/api.js` only if API integration is explicitly authorized.

### Git Safety

- Never discard existing user changes from other people or prior sessions.
- Never use destructive Git commands without explicit authorization. Never run `git reset --hard`, `git clean -fd`, `git push --force`, or equivalent destructive operations.
- Inspect `git diff` before modifying files that carry uncommitted changes.
- Do not automatically commit, merge, rebase, or push.
- Do not automatically switch branches; preserving the current branch unless explicitly instructed otherwise.
- Never overwrite unrelated changes.

### Frontend Coding Conventions

- Follow the existing project architecture (see `README.md` file map).
- Use React-Bootstrap components where appropriate.
- Use CSS variables from `frontend/src/styles/tokens.css` (e.g. `var(--blue)`); avoid unnecessary `!important`.
- Screen text is in Thai; variable/function names are in English.
- Avoid unnecessary dependencies; prefer maintainable, readable code.
- Do not perform unrelated refactoring.
- File conventions: first line of each file is a comment stating what the file does; comments explain "why", not "what".

### Dashboard Design Direction

When working on dashboard UI:

- Style: Modern Professional.
- Blue primary color; white-and-blue visual direction.
- Thai interface labels.
- Comfortable information density.
- Use icons rather than emoji.
- Do not introduce dark mode or theme toggles unless requested.

### Documentation Maintenance

- Update documentation only when the task requires it; do not create duplicate instruction files.
- AGENTS.md stays concise; reference existing documentation (`README.md`, `coding-rules.md`) rather than duplicating details from it.
