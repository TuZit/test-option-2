# Task/To-Do Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement and verify the complete owner-isolated task CRUD API required by the Task 2 backend assessment.

**Architecture:** Keep the existing Express entry point focused on the task API and route all task access through an in-memory repository whose lookup methods require the current owner id. For this demo, the current user is read directly from the request header in the route layer; no standalone authentication module or sample project is added.

**Tech Stack:** Node.js, TypeScript, Express 5, Vitest, Supertest, UUIDs, in-memory storage.

**Spec:** `docs/superpowers/specs/2026-09-25-task-todo-backend-design.md`

## Global Constraints

- Implement only the backend in `be/`; do not redesign the frontend.
- Every read/write operation must enforce ownership.
- Client-supplied `ownerId` must never determine ownership.
- Missing or blank `X-User-Id` returns `401` when an identity is required by the route contract.
- Titles are trimmed and must be non-empty.
- Valid statuses are only `open` and `done`.
- Create defaults status to `open`.
- Cross-owner access returns `404` to avoid revealing resource existence.
- Delete returns `204` with no body.
- Use consistent JSON errors for `400`, `401`, and `404`.

## Review Focus

- A client tries to create a task for another owner; test that the authenticated header owns the resource.
- User B guesses User A’s task id; test update/delete return `404` and do not mutate data.
- A malformed or blank identity header is sent; test `401` before task access runs.
- A task update omits title but sends description only; test partial updates preserve the existing title.
- A request sends invalid JSON or an unsupported status; test the documented JSON `400` error shape.

### Task 1: Configure backend tooling and task application entry point

**Files:**
- Modify: `be/package.json`
- Modify: `be/tsconfig.json`
- Create: `be/vitest.config.ts`
- Modify: `be/src/app.ts`

**Interfaces:**
- Produces an exported `app` from `src/app.ts`.
- Produces scripts `test`, `build`, and `dev` that operate from `be/`.

- [ ] **Step 1: Add test/build dependencies and scripts**

Add `supertest`, `vitest`, and their TypeScript types where needed. Keep the existing TypeScript dev command and set scripts to:

```json
"test": "vitest run",
"build": "tsc",
"dev": "tsx src/app.ts"
```

Add `tsx` as a dev dependency so the TypeScript server can run locally.

- [ ] **Step 2: Configure TypeScript/Vitest**

Keep strict TypeScript settings, include Node and test types, and configure Vitest for Node with a setup-free integration environment.

- [ ] **Step 3: Convert the current app into a testable task API entry point**

Create and export `app = express()`, add `express.json()`, register the task routes, and keep startup simple in the existing entry point. Do not add a health-check endpoint or a separate sample project.

- [ ] **Step 4: Run the configured test command**

Run `cd be && pnpm test`.
Expected: Vitest starts successfully; route tests may still fail until later tasks are implemented.

### Task 2: Implement owner-scoped repository and domain validation

**Files:**
- Create: `be/src/types/task.ts`
- Create: `be/src/repositories/taskRepository.ts`
- Create: `be/src/validation/taskValidation.ts`
- Create: `be/src/repositories/taskRepository.test.ts`

**Interfaces:**
- `createTaskRepository(seed?)` returns `listByOwner(ownerId, status?)`, `create(ownerId, input)`, `updateByOwner(ownerId, id, patch)`, `deleteByOwner(ownerId, id)`, and `reset(seed?)`.
- Task type is `{ id, ownerId, title, description, status, createdAt, updatedAt }`.

- [ ] **Step 1: Write repository and validation tests**

Test owner-scoped listing, creation with trimmed title and default `open`, update timestamp changes, status toggling, deletion, missing ids, invalid status, whitespace title rejection, and resettable seed data.

- [ ] **Step 2: Run repository tests and confirm failure**

Run `cd be && pnpm vitest run src/repositories/taskRepository.test.ts`.
Expected: FAIL because the repository modules do not exist.

- [ ] **Step 3: Implement task types and validation**

Define `TaskStatus = 'open' | 'done'`, create/update input types, `isTaskStatus`, and validation functions that return trimmed values or throw typed client errors with status `400`.

- [ ] **Step 4: Implement the owner-scoped in-memory repository**

Store cloned task records privately. Ensure every lookup compares both `id` and `ownerId`; never expose the mutable internal array. Generate UUIDs and ISO timestamps. Preserve `createdAt`, update `updatedAt`, and return `undefined` for missing or cross-owner records.

- [ ] **Step 5: Run repository tests**

Run `cd be && pnpm vitest run src/repositories/taskRepository.test.ts`.
Expected: PASS.

### Task 3: Implement task routes and consistent error handling

**Files:**
- Modify: `be/src/app.ts`
- Create: `be/src/routes/tasks.ts`
- Create: `be/src/routes/tasks.test.ts`

**Interfaces:**
- Routes consume the trimmed `X-User-Id` value and the repository from Task 2.
- Routes implement `POST /tasks`, `GET /tasks`, `PUT /tasks/:id`, and `DELETE /tasks/:id`.
- Errors use `{ error: { code, message } }`.

- [ ] **Checklist: Required backend behavior**

- [ ] Enforce ownership on every read/write so users cannot access others' tasks.
- [ ] Validate required fields and reject empty or whitespace-only titles.
- [ ] Return `404` for missing IDs and `403` or `404` for cross-owner access; use `404` consistently to avoid revealing resource existence.
- [ ] Support optional `status=open|done` filtering on the list endpoint.

- [ ] **Step 1: Write failing endpoint integration tests**

Use Supertest with `X-User-Id` and cover:

```js
it('creates a trimmed open task with 201')
it('ignores a client ownerId')
it('rejects empty and whitespace titles with 400')
it('lists only the authenticated user tasks')
it('filters open and done tasks')
it('updates title, description, and status with 200')
it('toggles status done then open')
it('rejects invalid status with 400')
it('denies cross-owner update and delete with 404')
it('returns 404 for a missing delete')
it('deletes with 204 and no body')
it('returns 401 without X-User-Id')
it('returns JSON errors for malformed JSON')
```

- [ ] **Step 2: Run endpoint tests and confirm failure**

Run `cd be && pnpm vitest run src/routes/tasks.test.ts`.
Expected: FAIL because the task routes are not implemented.

- [ ] **Step 3: Implement route identity and handlers**

Read and trim `X-User-Id` directly in the task route layer; return `401` when it is absent or blank. Validate query/body input, pass the resulting owner id to every repository method, return the required status codes and task JSON, and ignore `ownerId` from request bodies. Use `404` for both missing and cross-owner ids.

- [ ] **Step 4: Implement JSON error handling**

Handle validation errors and malformed JSON from `express.json()` with the consistent error envelope. Do not leak stack traces or internal repository details in responses.

- [ ] **Step 5: Run endpoint tests**

Run `cd be && pnpm vitest run src/routes/tasks.test.ts`.
Expected: PASS.

### Task 4: Document and verify the backend

**Files:**
- Create: `be/README.md`
- Modify: backend files only if verification exposes a concrete failure.

- [ ] **Step 1: Document local usage and API examples**

Document `pnpm install`, `pnpm dev`, `pnpm test`, and `pnpm build`; explain the in-memory reset-on-restart behavior, `X-User-Id` development authentication, endpoint request examples, owner isolation, and where real authentication/database adapters can replace the demo components.

- [ ] **Step 2: Run all backend tests**

Run `cd be && pnpm test`.
Expected: PASS for repository, app, and endpoint tests.

- [ ] **Step 3: Run the backend build**

Run `cd be && pnpm build`.
Expected: TypeScript exits successfully.

- [ ] **Step 4: Verify startup**

Run `cd be && pnpm dev`, request `GET /tasks` with `X-User-Id: user-a`, and confirm a successful JSON response. Stop the server after verification.

- [ ] **Step 5: Run the existing frontend verification**

Run the frontend test/build commands from its package scripts to ensure backend changes did not modify or break the frontend. Report any pre-existing frontend failures separately from backend failures.
