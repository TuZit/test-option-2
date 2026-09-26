# Task/To-Do Backend (`be`)

Express 5 + TypeScript API for the Task 2 assessment: owner-isolated task
CRUD with validation, consistent JSON errors, and an in-memory store.

## Requirements

- Node.js 24+
- pnpm (this package is pinned to `pnpm@11.25.0` via `packageManager`)

## Commands

```bash
pnpm install   # install dependencies
pnpm dev       # tsx watch src/server.ts (auto-reload)
pnpm start     # tsx src/server.ts (run once)
pnpm test      # vitest run
pnpm build     # tsc typecheck (noEmit)
```

The server listens on `PORT` or `3003` by default, so it is reachable at
`http://127.0.0.1:3003`.

## Authentication (development only)

There is no account system in this assessment. Every request must send the
current user's identity in the `X-User-Id` header:

```bash
curl -H 'X-User-Id: user-a' http://127.0.0.1:3003/tasks
```

- The value is trimmed; leading/trailing whitespace is ignored.
- Missing or blank header -> `401` with `{ "error": { "code": "UNAUTHENTICATED", "message": "..." } }`.
- The header is the **only** source of ownership. An `ownerId` in a request body
  is always ignored.

This is intentionally a demo mechanism: replace `requireCurrentUserId` in
`src/routes/tasks.ts` with real session/token verification (e.g. JWT or session
middleware) before using this outside development.

## Endpoints

All success responses are JSON. All errors use the same envelope:

```json
{ "error": { "code": "INVALID_TITLE", "message": "title must not be empty or whitespace only" } }
```

### `POST /tasks` -> `201`

```bash
curl -s -X POST http://127.0.0.1:3003/tasks \
  -H 'X-User-Id: user-a' -H 'Content-Type: application/json' \
  -d '{"title":"  Buy milk  ","description":"2 litres","ownerId":"user-b"}'
```

`title` is required, trimmed, and must be non-empty (`400` otherwise).
`description` is optional and defaults to `""`. `status` always starts as
`open`. The client-supplied `ownerId` above is ignored; the created task is
owned by `user-a`.

### `GET /tasks?status=open|done` -> `200`

```bash
curl -s -H 'X-User-Id: user-a' http://127.0.0.1:3003/tasks
curl -s -H 'X-User-Id: user-a' 'http://127.0.0.1:3003/tasks?status=done'
```

Returns only the current user's tasks. `status` is optional; any value other
than `open` or `done` returns `400`.

### `PUT /tasks/:id` -> `200`

```bash
curl -s -X PUT http://127.0.0.1:3003/tasks/<id> \
  -H 'X-User-Id: user-a' -H 'Content-Type: application/json' \
  -d '{"title":"Buy oat milk","status":"done"}'
```

Partial update: send any of `title`, `description`, `status`. Omitted fields are
preserved. `createdAt` never changes; `updatedAt` is bumped on every successful
update. Status toggles between `open` and `done`.

### `DELETE /tasks/:id` -> `204`

```bash
curl -s -X DELETE -H 'X-User-Id: user-a' -o /dev/null -w '%{http_code}\n' \
  http://127.0.0.1:3003/tasks/<id>
```

Returns `204` with no response body. Deletion is permanent.

## Ownership isolation

Ownership is enforced inside the data-access layer, not by a separate
"find by id then check" step. Every repository method takes the authenticated
`ownerId` and matches on `id + ownerId`:

- `listByOwner(ownerId, status?)`
- `create(ownerId, input)`
- `updateByOwner(ownerId, id, patch)`
- `deleteByOwner(ownerId, id)`

There is no `findById(id)` that could be misused. A task id belonging to
another user is indistinguishable from a non-existent id: both return `404`,
so the API never reveals whether someone else's task exists. Cross-owner
update/delete never mutate stored data.

## CORS

The frontend runs on a different origin (Vite dev server on `:5173`), and the
API is called with the custom `X-User-Id` header, so the browser sends a
preflight `OPTIONS` request. That preflight is answered before the auth layer,
because it never carries `X-User-Id`.

Allowed origins by default — any `localhost`, `127.0.0.1`, or `[::1]` origin on
**any port**:

```text
http://localhost:5173   http://127.0.0.1:5173   http://localhost:4173   ...
```

Override or extend the allowlist with `CORS_ORIGINS` (comma-separated exact
origins); use `CORS_ORIGINS=*` to allow every origin:

```bash
CORS_ORIGINS='https://tasks.example.com,https://admin.example.com' pnpm start
```

Allowed methods are `GET, POST, PUT, DELETE, OPTIONS`; allowed headers are
`Content-Type, X-User-Id`. Preflight responses are `204` and cached for 600s.
A preflight from a disallowed origin is rejected with
`403 CORS_ORIGIN_NOT_ALLOWED`, and non-preflight responses from a disallowed
origin simply carry no `Access-Control-Allow-Origin` header, so the browser
blocks them. Requests without an `Origin` header (curl, server-to-server) are
unaffected. Configuration lives in `src/middleware/cors.ts`.

## Error codes

| Status | Code | When |
| --- | --- | --- |
| 400 | `INVALID_BODY` | body is not a JSON object |
| 400 | `INVALID_TITLE` | missing, non-string, empty, or whitespace-only title |
| 400 | `INVALID_DESCRIPTION` | description is present but not a string |
| 400 | `INVALID_STATUS` | status is not `open`/`done` |
| 400 | `INVALID_JSON` | request body is malformed JSON |
| 401 | `UNAUTHENTICATED` | missing or blank `X-User-Id` |
| 403 | `CORS_ORIGIN_NOT_ALLOWED` | preflight from an origin outside the CORS allowlist |
| 404 | `TASK_NOT_FOUND` | missing task id or another owner's task id |
| 404 | `ROUTE_NOT_FOUND` | unknown route |
| 500 | `INTERNAL_ERROR` | unexpected server error (details not leaked) |

## Persistence limitation

Storage is **in-memory**. All tasks are lost when the process restarts, and data
is not shared between processes. This is deliberate for the assessment.

## Project layout

```
src/
  app.ts                              # createApp() factory + exported `app` (no listen)
  server.ts                           # calls app.listen(PORT ?? 3003)
  errors.ts                           # HttpError + JSON error envelope type
  middleware/cors.ts                  # CORS allowlist + preflight handling
  types/task.ts                       # Task, TaskStatus, create/update inputs
  validation/taskValidation.ts        # parsing/validation -> trimmed values or 400
  repositories/taskRepository.ts      # owner-scoped in-memory repository
  routes/tasks.ts                     # POST/GET/PUT/DELETE + header auth
```

## Where real auth and storage plug in

- **Auth:** replace `requireCurrentUserId` in `src/routes/tasks.ts` (one place)
  with verified session/token identity. Route handlers and the repository
  already depend only on a plain owner id string.
- **Storage:** implement the `TaskRepository` interface from
  `src/repositories/taskRepository.ts` against a real database and inject it via
  `createApp(repository)`. The interface already scopes every method by owner,
  so the authorization guarantee travels with the adapter.
- **Validation:** `src/validation/taskValidation.ts` is framework-free and can be
  reused by any transport.

## Tests

```bash
pnpm test
```

Vitest + Supertest integration tests run against the exported Express app (no
network listener). The suite covers repository ownership scoping and partial
updates, validation edge cases, and endpoint behavior: `201` creation with a
trimmed title, ignored client `ownerId`, `400` for bad titles/statuses/malformed
JSON, list isolation, `open`/`done` filtering, `200` updates with timestamp
bumps and status toggling, cross-owner and missing-id `404`s with unchanged
data, empty-body `204` deletes, and `401` without a header.
