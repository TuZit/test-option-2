# Task Manager — Frontend

A single-page Task/To-Do CRUD application built with React 19 and Vite. It
supports listing, creating, editing, completing/reopening, deleting, and
filtering tasks, with optimistic updates and rollback on failure.

This package is the frontend of the Task 2 assessment. The companion Express
backend lives in [`../be`](../be). By default the frontend runs standalone
against an in-memory mock service; set `VITE_API_BASE_URL` to talk to the real
API instead (see [Connecting to the real backend](#connecting-to-the-real-backend)).

## Requirements

- Node.js 24+
- pnpm 11+ (use pnpm, not npm or yarn)

## Commands

```bash
pnpm install     # install dependencies
pnpm dev         # start the Vite dev server (http://127.0.0.1:5173/)
pnpm lint        # run ESLint
pnpm test        # run Vitest in watch mode
pnpm test:run    # run the test suite once (CI mode)
pnpm build       # production build into dist/
pnpm preview     # serve the production build locally
```

Run a single test file with:

```bash
pnpm vitest run src/App.test.jsx
```

## Features

- **List** tasks with title, optional description, open/done status, and
  created/updated timestamps.
- **Create** a task. The title is required, trimmed before validation, and
  whitespace-only titles are rejected inline without ever reaching the service.
  New tasks default to `open`; the description is optional.
- **Edit** a task's title and description (inline, pre-filled form).
- **Toggle** a task between `open` and `done` with a clear visual distinction.
- **Delete** a task, restoring it if the delete fails.
- **Filter** by All / Open / Done, with a distinct empty state for "no tasks
  yet" versus "no matches for this filter".
- **Feedback** for loading, every successful write, and every failed write.
- **Optimistic UI**: edits, toggles, and deletes update the list immediately and
  roll back to the exact previous collection if the service rejects. A task's
  controls are disabled while its write is pending, so rapid clicks cannot
  create duplicate requests.

## Project structure

```text
src/
  App.jsx                     page coordinator (state, CRUD, rollback, filters)
  App.test.jsx                page integration tests
  components/
    TaskForm.jsx              create/edit form with trimmed-title validation
    TaskFilters.jsx           All / Open / Done control
    TaskList.jsx              list + empty state
    TaskItem.jsx              single task row and its actions
    ui/                       local shadcn/ui-style primitives
  lib/
    utils.js                  cn() class-name helper
    format.js                 timestamp formatting
  services/
    index.js                  picks the mock or HTTP service from env
    taskService.js            in-memory mock service (API boundary)
    taskService.test.js       service contract tests
    httpTaskService.js        real REST client for the Express backend
    httpTaskService.test.js   request/response mapping tests
  test/setup.js               Vitest + jest-dom setup
scripts/
  verify-api-integration.mjs  drives the HTTP client against a running backend
```

## Task service

The UI never touches data directly: `src/App.jsx` receives a `service` prop
exposing `listTasks`, `createTask`, `updateTask`, and `deleteTask`.
`src/services/index.js` picks the implementation:

- **no `VITE_API_BASE_URL`** → `src/services/taskService.js`, the in-memory
  mock (default; the app runs standalone with a small sample data set).
- **`VITE_API_BASE_URL` set** → `src/services/httpTaskService.js`, the real
  REST client.

Both expose the same promise-based interface and task shape, so no component
changes are required to switch.

Task shape:

```js
{ id, title, description, status: 'open' | 'done', createdAt, updatedAt }
```

Service interface, mapped to the REST contract:

| Service method            | HTTP equivalent                  |
| ------------------------- | -------------------------------- |
| `listTasks(status)`       | `GET /tasks?status=open\|done`   |
| `createTask(input)`       | `POST /tasks`                    |
| `updateTask(id, patch)`   | `PUT /tasks/:id`                 |
| `deleteTask(id)`          | `DELETE /tasks/:id`              |

`createTaskService(options)` builds an isolated mock instance for tests and
demos. Options:

- `seedTasks` — initial tasks for that instance (defaults to a small realistic
  sample).
- `failureMode` — deterministic failure hook used by the rollback tests:
  `'create' | 'list' | 'update' | 'toggle' | 'delete'` or a predicate
  `(operation, context) => boolean`.
- `generateId` — id factory override.

The module also exports a default `taskService` instance used by the app.

## Connecting to the real backend

1. Start the backend:

   ```bash
   cd ../be && pnpm install && pnpm start   # http://127.0.0.1:3003
   ```

2. Point the frontend at it (copy `.env.example` to `.env.local`):

   ```bash
   VITE_API_BASE_URL=/api
   VITE_USER_ID=user-a
   ```

   `/api` is proxied by the Vite dev server to `http://127.0.0.1:3003`
   (`vite.config.js`), so the browser makes same-origin requests and CORS never
   comes into play. You can also skip the proxy and use an absolute
   `http://127.0.0.1:3003`: the backend's CORS allowlist already accepts any
   `localhost` / `127.0.0.1` origin on any port (see `../be/README.md`).

   `VITE_USER_ID` is sent as the backend's `X-User-Id` development-auth header.
   Change it to simulate a second user and confirm owner isolation.

3. `pnpm dev`, then use the UI — create, edit, toggle, delete, and filter all
   hit the real API. Because the backend is in-memory, restarting it clears
   tasks.

To verify the integration without a browser, run the script against a running
backend:

```bash
pnpm verify:api                                   # defaults to :3003 / user-a
node scripts/verify-api-integration.mjs http://127.0.0.1:3003 user-a
```

It exercises create, list, status filters, edit, toggle, cross-owner denial
(404), unauthenticated access (401), and delete through the same
`httpTaskService` the app uses, then prints a PASS/FAIL summary.

## Testing

Vitest + jsdom + React Testing Library (`@testing-library/react`,
`@testing-library/jest-dom`, `@testing-library/user-event`). Configuration is
in `vitest.config.js`; global setup is `src/test/setup.js`.

The suite covers the service contract, each component, and the page's CRUD,
filtering, validation, pending-disable, and optimistic-rollback behavior.
