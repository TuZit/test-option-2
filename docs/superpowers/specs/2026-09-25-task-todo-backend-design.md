# Task/To-Do Backend Design

## Scope

Implement the backend portion of the Task 2 assessment in `be/`. The backend
will expose task CRUD endpoints, validate task input, enforce ownership on
every operation, return consistent JSON errors, and include automated API
tests. It will not add a database, OAuth/SSO, or unrelated infrastructure.

The repository currently contains only an Express 5 Hello World scaffold. The
implementation will use an in-memory task repository suitable for this demo
and tests, while keeping repository methods isolated so persistence can be
replaced later.

## Authentication

Because no authentication system exists, requests will use a minimal
development/test identity supplied by the `X-User-Id` header. A missing or
blank header returns `401` with a JSON error. The header value is treated only
as the current authenticated identity; clients cannot choose an `ownerId` in
the task body.

This mechanism is intentionally limited to development/demo use and will be
documented as a replacement point for real authentication.

## Architecture

The Express application will be exported without automatically listening so
Supertest can exercise it directly. A small startup entry point will call
`app.listen` for local development.

The repository will expose owner-scoped methods:

- `listByOwner(ownerId, status?)`
- `create(ownerId, input)`
- `updateByOwner(ownerId, id, patch)`
- `deleteByOwner(ownerId, id)`

No route will load a task by id without also supplying the authenticated
owner. Cross-owner access will therefore be denied by the data-access
boundary, returning `403` or an indistinguishable `404`; this implementation
will use `404` for owner-mismatched task ids to avoid revealing resource
existence.

Tasks contain `id`, `ownerId`, `title`, `description`, `status`, `createdAt`,
and `updatedAt`. IDs will be UUIDs. Timestamps will be ISO strings. Create
defaults status to `open`; update accepts title and/or description and may
change status between `open` and `done`.

## HTTP API

- `POST /tasks`: authenticate, trim and validate title, ignore any client
  `ownerId`, default status to `open`, return `201` and the created task.
- `GET /tasks`: authenticate, return only the current user's tasks, and
  optionally filter by `status=open` or `status=done`; invalid status returns
  `400`.
- `PUT /tasks/:id`: authenticate, validate supplied fields, enforce ownership,
  update title/description/status, update `updatedAt`, and return `200`.
- `DELETE /tasks/:id`: authenticate, enforce ownership, permanently remove the
  task, and return `204` with no response body.

Invalid JSON, missing/blank titles, unsupported fields where validation is
needed, invalid statuses, missing tasks, and unauthenticated requests will
produce consistent JSON errors with the appropriate status code (`400`, `401`,
or `404`).

## Testing

Use Vitest and Supertest for integration tests against the exported Express
app. Tests will reset the in-memory repository between cases and cover:

- empty and whitespace-only title rejection
- title trimming and `201` creation
- forced `open` default and ignored client `ownerId`
- authenticated list isolation
- `open`/`done` status filtering
- update response, title/description changes, timestamps, and status toggle
- toggling `open` to `done` and back to `open`
- invalid status rejection
- cross-owner update/delete denial
- missing-task `404`
- successful delete with `204`
- unauthenticated `401`
- consistent JSON error shape

## Documentation and verification

Update `be/README.md` with install, test, build, and dev-server commands,
endpoint examples, the `X-User-Id` development authentication mechanism, the
in-memory persistence limitation, and the replacement points for real auth
and storage.

Add backend scripts for `dev`, `build`, and `test`. Verify backend tests,
frontend tests, backend TypeScript build, application startup, and endpoint
behavior using the API tests/manual curl checks. Do not modify frontend
behavior unless a verified API compatibility issue requires it.
