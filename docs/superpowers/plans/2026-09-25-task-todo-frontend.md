# Task/To-Do Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Vite starter screen with a tested React task-management frontend backed by a replaceable in-memory service.

**Architecture:** Keep task persistence behind an async `taskService` interface, inject that service into the page for testability, and keep CRUD/optimistic state transitions in the page while focused child components handle rendering and form input. The mock service will mirror the future REST contract without implementing backend endpoints.

**Tech Stack:** React 19, Vite, Vitest, React Testing Library, `@testing-library/jest-dom`, ESLint, and local shadcn/ui-style primitives with CSS design tokens.

**Spec:** `docs/superpowers/specs/2026-09-25-task-todo-frontend-design.md`

## Global Constraints

- Implement only the frontend in `fe/`; do not modify `be/`.
- The task service must preserve the contract `POST /tasks`, `GET /tasks?status=open|done`, `PUT /tasks/:id`, `DELETE /tasks/:id`.
- New tasks default to `open`.
- Titles must be trimmed and non-empty after trimming.
- Mutating controls for a task must be disabled while its operation is pending.
- Failed optimistic writes must restore the prior UI state and show error feedback.
- Use local shadcn/ui-style primitives under `fe/src/components/ui/`; do not add a remote component runtime.

## Review Focus

- A title containing only spaces must never reach the service; test this in the form/page integration test.
- A rapid second toggle must not create a duplicate write; test the disabled pending control in the toggle test.
- A failed update/delete/toggle must restore the exact prior task collection; test service rejection rollback.
- A filter with zero matching tasks must show the empty state without implying that all tasks were deleted; test filtered empty state.
- A service failure during initial load must leave useful retry/error feedback; test initial load failure.

### Task 1: Configure the frontend test harness

**Files:**
- Modify: `fe/package.json`
- Create: `fe/vitest.config.js`
- Create: `fe/src/test/setup.js`

**Interfaces:**
- Produces `npm test`/`pnpm test` and `npm test -- --run` scripts for later UI tests.

- [ ] **Step 1: Add the test dependencies and scripts**

Add Vitest, jsdom, React Testing Library, `@testing-library/jest-dom`, and `@testing-library/user-event` as dev dependencies. Add:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 2: Configure jsdom and setup imports**

Configure Vitest to use the React plugin, `jsdom`, and `src/test/setup.js`. In setup, import `@testing-library/jest-dom/vitest`.

- [ ] **Step 3: Run the empty test suite**

Run `cd fe && pnpm install && pnpm test:run`.
Expected: Vitest starts successfully and reports no test files without configuration errors.

### Task 2: Build the task service boundary

**Files:**
- Create: `fe/src/services/taskService.js`
- Create: `fe/src/services/taskService.test.js`

**Interfaces:**
- Produces `createTaskService(options)` with `listTasks(status)`, `createTask(input)`, `updateTask(id, patch)`, and `deleteTask(id)`; each returns a Promise.
- Task shape: `{ id, title, description, status, createdAt, updatedAt }`.

- [ ] **Step 1: Write service contract tests**

Test that the service lists seeded tasks, filters by `open`/`done`, trims and creates an open task, updates title/description and `updatedAt`, deletes by id, and rejects unknown ids. Add an option such as `{ failureMode: 'update' }` or an equivalent per-operation failure hook for deterministic UI rollback tests.

- [ ] **Step 2: Run the service tests and confirm failure**

Run `cd fe && pnpm vitest run src/services/taskService.test.js`.
Expected: FAIL because the service module does not exist.

- [ ] **Step 3: Implement the in-memory async service**

Use a private array initialized from supplied seed tasks or a small realistic default. Clone objects at boundaries, generate ids/timestamps, validate ids, and resolve operations asynchronously. Keep the public methods aligned with the future REST contract and keep failure injection local to the mock.

- [ ] **Step 4: Run the service tests**

Run `cd fe && pnpm vitest run src/services/taskService.test.js`.
Expected: PASS.

### Task 3: Implement focused task UI components

**Files:**
- Create: `fe/src/components/TaskForm.jsx`
- Create: `fe/src/components/TaskFilters.jsx`
- Create: `fe/src/components/TaskList.jsx`
- Create: `fe/src/components/TaskItem.jsx`
- Create: `fe/src/components/ui/button.jsx`
- Create: `fe/src/components/ui/input.jsx`
- Create: `fe/src/components/ui/textarea.jsx`
- Create: `fe/src/components/ui/card.jsx`
- Create: `fe/src/components/ui/badge.jsx`
- Create: `fe/src/components/ui/tabs.jsx`
- Create: `fe/src/components/ui/alert.jsx`
- Create: `fe/src/components/ui/dialog.jsx`
- Create: `fe/src/lib/utils.js`

**Interfaces:**
- `TaskForm({ task, onSubmit, onCancel, busy })` calls `onSubmit({ title, description })` with a trimmed title.
- `TaskFilters({ value, onChange, counts })` calls `onChange('all'|'open'|'done')`.
- `TaskList({ tasks, pendingIds, onToggle, onEdit, onDelete })` renders task items or the supplied empty state.

- [ ] **Step 1: Write component tests for form and rendering**

Cover labels/inputs, whitespace validation, rendering description/status, edit-mode values, filter buttons, and task action labels. Assert that form submission trims title and does not call `onSubmit` for whitespace-only input.

- [ ] **Step 2: Run the component tests and confirm failure**

Run `cd fe && pnpm vitest run src/components`.
Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement local shadcn/ui-style primitives**

Add small, project-owned primitives following shadcn conventions: composable components, `data-state` attributes where useful, keyboard/focus-visible behavior, and CSS-variable tokens. Keep them dependency-light; use a `cn` helper for class composition and avoid introducing a component framework.

- [ ] **Step 4: Implement semantic task components**

Compose the task UI from the local shadcn/ui-style primitives. Give each task a stable accessible name, status badge, created/updated metadata, edit/delete controls, and a toggle control whose label reflects the next action. Apply completed styling through a status class and disable task controls when `pendingIds` contains the task id.

- [ ] **Step 5: Run the component tests**

Run `cd fe && pnpm vitest run src/components`.
Expected: PASS.

### Task 4: Implement page state, CRUD, filtering, and optimistic rollback

**Files:**
- Modify: `fe/src/App.jsx`
- Create: `fe/src/App.test.jsx`

**Interfaces:**
- `App({ service = defaultTaskService })` renders the complete task page and accepts a service-shaped object for tests.
- Consumes the service methods from Task 2 and component callbacks from Task 3.

- [ ] **Step 1: Write failing page integration tests**

Create a fresh seeded service per test and cover:

```js
it('renders tasks and the empty state')
it('creates a task and shows success feedback')
it('rejects a whitespace-only title')
it('edits a task')
it('toggles open to done and back to open')
it('disables the toggle while a write is pending')
it('deletes a task')
it('filters all, open, and done tasks')
it('rolls back a failed optimistic update and shows an error')
it('shows an initial-load error with retry feedback')
```

Use `userEvent`, `findByRole`, and `waitFor` rather than implementation-detail selectors. For rollback, supply a service whose `updateTask` rejects and assert the original title/status remains visible.

- [ ] **Step 2: Run the page tests and confirm failure**

Run `cd fe && pnpm vitest run src/App.test.jsx`.
Expected: FAIL because the starter app has none of the task UI.

- [ ] **Step 3: Implement the page coordinator**

Load tasks on mount. Track `tasks`, `filter`, `loading`, `loadError`, `feedback`, `editingTask`, `formBusy`, and a `Set` of pending task ids. For create, append the service result after validation. For edit, toggle, and delete, snapshot the task collection, update it optimistically, call the service, then retain the result or restore the snapshot on rejection. Clear or replace feedback after each operation. Expose retry for initial load.

- [ ] **Step 4: Replace starter styling with the task workspace**

Modify `fe/src/index.css` and `fe/src/App.css` to provide shadcn-compatible CSS variables and the responsive layout, card/list styling, open/done distinction, form states, empty/loading/error feedback, focus-visible states, and mobile behavior. Remove unused Vite starter imports and markup.

- [ ] **Step 5: Run the page tests**

Run `cd fe && pnpm vitest run src/App.test.jsx`.
Expected: PASS.

### Task 5: Document usage and integration point

**Files:**
- Modify: `fe/README.md`

- [ ] **Step 1: Replace starter README content**

Document:

```text
pnpm install
pnpm dev
pnpm lint
pnpm test:run
pnpm build
```

Explain that the current task service is in-memory mock data and that a real API client can replace `src/services/taskService.js` while keeping the service methods and task shape unchanged.

- [ ] **Step 2: Verify README commands match package scripts**

Run `cd fe && node -e "const p=require('./package.json'); console.log(p.scripts)"` and confirm every documented command exists.

### Task 6: Run the complete verification suite

**Files:**
- Modify: any frontend files required to fix verified failures only.

- [ ] **Step 1: Run all frontend tests**

Run `cd fe && pnpm test:run`.
Expected: PASS with all service, component, and page tests green.

- [ ] **Step 2: Run lint**

Run `cd fe && pnpm lint`.
Expected: exit code 0 with no ESLint errors.

- [ ] **Step 3: Run production build**

Run `cd fe && pnpm build`.
Expected: Vite produces a successful `dist` build.

- [ ] **Step 4: Verify the dev server starts**

Run `cd fe && pnpm dev --host 127.0.0.1`, request the local root page, and confirm it returns the task application HTML. Stop the server after the check.

- [ ] **Step 5: Perform a manual UI smoke check**

Open the app and verify create, edit, toggle twice, delete, All/Open/Done filtering, empty state, validation, and visible success/error feedback.
