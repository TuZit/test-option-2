# Task/To-Do CRUD Frontend Design

## Scope

Implement the frontend portion of the Task 2 assessment in `fe/`. The
frontend will provide task listing, creation, editing, status toggling,
deletion, filtering, loading/error/empty states, optimistic updates, and
automated tests. No backend code or API endpoints will be implemented.

The current repository contains a minimal React + Vite starter application.
The task service will initially use in-memory mock data while preserving the
future backend contract:

- `POST /tasks`
- `GET /tasks?status=open|done`
- `PUT /tasks/:id`
- `DELETE /tasks/:id`

## Architecture

The frontend will use a small repository/service boundary so presentation
components do not import or manipulate mock data directly.

`src/services/taskService.js` will expose asynchronous methods for listing,
creating, updating, and deleting tasks. The mock implementation will keep its
own in-memory collection, return task-shaped objects, and simulate the same
promise-based interface that a later HTTP implementation can provide. The
service will include a controllable failure path for rollback tests without
adding backend behavior.

The page-level component will own the task collection, selected filter,
initial loading state, and operation feedback. Presentational components will
receive task data and callbacks through props:

- `TaskPage`: coordinates service calls, optimistic transitions, rollback,
  feedback, and filtering.
- `TaskForm`: validates a trimmed required title and accepts an optional
  description; supports create and edit modes.
- `TaskFilters`: exposes All, Open, and Done choices.
- `TaskList` / `TaskItem`: render task details, status, timestamps, and
  task-level actions.

## Data flow and behavior

Tasks have an `id`, `title`, `description`, `status` (`open` or `done`),
`createdAt`, and `updatedAt`. New tasks default to `open`. The UI will show
title, optional description, status, and useful created/updated information.

On initial render, the page loads tasks from the service and displays loading
feedback. A service failure leaves the page usable and displays an actionable
error message. When the filtered result has no tasks, the UI displays a clear
empty state.

Create validates `title.trim()` before calling the service. Whitespace-only
titles are rejected inline. Successful writes show success feedback.

Edit optimistically replaces the task with the edited title/description and
rolls back if the service rejects. Toggle optimistically switches `open` and
`done`, and delete optimistically removes the item. Each task’s mutating
controls are disabled while its operation is pending, preventing rapid
duplicate requests. Failed toggle, edit, and delete operations restore the
previous task state and show an error message.

## Visual and accessibility direction

Replace the starter Vite screen with a responsive, single-page task
workspace using shadcn/ui-style primitives and design tokens. Add a small
local `components/ui` layer for Button, Input, Textarea, Card, Badge, Tabs,
Alert, and Dialog primitives, using shadcn conventions so the components are
owned by the project and remain easy to customize. Use clear visual
differences for open and done tasks, including a status badge and
subdued/completed styling. Use semantic headings, labels, buttons, form
validation messaging, focus-visible styles, and accessible status/live regions
for feedback. Do not add a remote component runtime or a full design-system
dependency.

## Testing

Configure a lightweight Vitest + React Testing Library setup. Tests will cover:

- rendering task title, description, status, and empty state
- creating a task
- rejecting whitespace-only titles
- editing a task
- toggling open → done → open
- deleting a task
- All/Open/Done filtering
- optimistic rollback/error feedback for a failed write

Tests will use an injected or resettable mock service so each test is isolated
and the UI remains independent from the service implementation details.

## Documentation and verification

Update `fe/README.md` with commands for development, linting, tests, and
production build. Document that the current service is in-memory mock data and
identify `src/services/taskService.js` as the replacement point for a real API
client.

Before completion, run dependency installation if needed, lint, the frontend
test suite, production build, and a startup check using the Vite dev server.
