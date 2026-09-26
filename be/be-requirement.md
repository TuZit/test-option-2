We now need to implement the BACKEND part of the Task 2 —
Task/To-Do CRUD Management assessment.

IMPORTANT:

- This is the SECOND and FINAL Codex implementation run.
- Complete the entire backend in this run.
- Do not redesign the frontend.
- Reuse the existing frontend API contract.
- Optimize for correctness and complete test coverage.
- Do not add unnecessary infrastructure.

Read the original Task 2 specification:
Task2_Task_ToDo_CRUD.pdf

Inspect the existing repository first.

BACKEND REQUIREMENTS

Implement:

POST /tasks
GET /tasks
PUT /tasks/:id
DELETE /tasks/:id

DATA MODEL:

Task:

- id: UUID or integer primary key
- ownerId: reference to the owning user
- title: required, trimmed, non-empty
- description: optional
- status: open | done
- createdAt
- updatedAt

API BEHAVIOR

POST /tasks

- authenticated user creates a task
- ownerId must come from the authenticated user
- never trust ownerId supplied by the client
- title is required
- trim title
- reject whitespace-only title with 400
- default status = open
- return 201 with created resource

GET /tasks

- return ONLY tasks belonging to the authenticated user
- support optional ?status=open
- support optional ?status=done
- return 200

PUT /tasks/:id

- update title and/or description
- allow status toggle
- validate title
- only owner can modify
- cross-owner access must return 403 or 404
- missing task must return 404
- return 200 with updated resource

DELETE /tasks/:id

- only owner can delete
- missing task returns 404
- cross-owner access returns 403 or 404
- permanently delete task
- return 204

SECURITY / OWNERSHIP

This is a critical requirement.

Every read/write operation must enforce ownership.

Do NOT implement:
Task.findById(id)

and then allow access.

Instead ensure ownership is part of the authorization/data-access logic.

For example conceptually:

find task by:
id + ownerId

or equivalent secure authorization logic.

A user must never be able to:

- read another user's task
- update another user's task
- delete another user's task

AUTHENTICATION

Use the simplest appropriate authentication mechanism for this assessment.

If the existing project already has authentication, reuse it.

If authentication is not present, create a minimal development/test authentication mechanism that clearly identifies the current user and allows tests for at least two users.

Do not introduce unnecessary OAuth/SSO infrastructure.

TESTING

Implement unit/integration tests covering at minimum:

1. Empty/whitespace title
   Given an empty/whitespace title
   When create is called
   Then response is 400

2. Cross-owner update/delete
   Given a task owned by User A
   When User B updates/deletes it
   Then access is denied with 403/404

3. Toggle status
   Given an open task
   When toggle/update is called
   Then status becomes done
   And can become open again

4. Missing task
   Given a non-existent task ID
   When delete is called
   Then response is 404

5. Status filter
   Given multiple tasks with mixed statuses
   When GET /tasks?status=open
   Then only open tasks are returned

Also test:

- create returns 201
- get only returns own tasks
- update returns 200
- delete returns 204
- timestamps are maintained
- invalid status is rejected
- title is trimmed
- unauthenticated access returns 401 if authentication is enforced

FRONTEND COMPATIBILITY

Ensure the backend API matches the frontend service contract already implemented:

POST /tasks
GET /tasks?status=open|done
PUT /tasks/:id
DELETE /tasks/:id

Do not change the frontend unless absolutely necessary.

ERROR HANDLING

Return consistent JSON error responses for:

- 400
- 401
- 403
- 404

VERIFICATION

After implementation:

1. Run all backend tests.
2. Run the frontend tests.
3. Run the backend build.
4. Start the application if possible.
5. Verify the API endpoints manually or with an API test tool.
6. Verify frontend -> backend integration if the frontend can be configured to use the real API.
7. Fix failures found during verification.

IMPORTANT:
Do not claim a test passes unless it was actually executed.

At the end report:

1. backend architecture
2. files changed
3. API endpoints
4. authentication approach
5. ownership enforcement approach
6. tests executed
7. test results
8. build results
9. frontend integration result
10. known limitations
11. manual verification steps
