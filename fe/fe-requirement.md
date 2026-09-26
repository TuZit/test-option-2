We need to implement the FRONTEND part of the Task 2 — Task/To-Do CRUD Management assessment.

IMPORTANT:

- This is the first of only TWO Codex implementation runs.
- Optimize for completing the entire frontend in this run.
- Do not implement the backend.
- Do not spend time on unnecessary abstractions or infrastructure.
- Use the existing project structure if a project already exists.
- If the project is empty, create a minimal production-quality frontend application.

Read and follow the requirements in:
Task2_Task_ToDo_CRUD.pdf

FRONTEND SCOPE

Implement a complete Task/To-Do management UI with:

1. Task list
   - Show user's tasks
   - Show title
   - Show description when available
   - Show open/done status
   - Show created/updated information if appropriate

2. Create task
   - title is required
   - trim title before validation
   - reject empty/whitespace-only title
   - description is optional
   - default status is open

3. Edit task
   - edit title
   - edit description

4. Toggle task
   - open <-> done
   - visual distinction between open and done
   - prevent accidental duplicate requests from rapid clicking

5. Delete task
   - remove task from the list
   - handle deletion errors gracefully

6. Filtering
   - All
   - Open
   - Done

7. Empty state
   - Show a clear empty-state message when there are no tasks

8. Loading and error states
   - Show useful feedback
   - All write operations must provide success/error feedback

9. Optimistic UI
   - Implement optimistic updates where practical
   - Roll back the UI when an operation fails
   - Do not make the UX unnecessarily complex

10. API abstraction
    IMPORTANT:
    Build a clean task service/repository layer so that the UI does NOT directly depend on mock data.

For this first run:

- use a mock/in-memory implementation
- define the API/service interface based on the required backend contract
- make it easy to replace the mock implementation with the real backend later

Expected API contract:

POST /tasks
GET /tasks?status=open|done
PUT /tasks/:id
DELETE /tasks/:id

Do not implement these backend endpoints now.

11. Tests
    Create frontend tests for at least:

- rendering tasks
- empty state
- creating a task
- whitespace-only title validation
- editing a task
- toggling open -> done -> open
- deleting a task
- filtering open/done
- rollback/error handling where practical

12. Code quality

- Keep the implementation simple
- Avoid unnecessary libraries
- Follow the existing project's conventions
- Use reusable components where appropriate
- Keep business logic out of presentation components where practical

13. Verification
    After implementation:

- install dependencies if necessary
- run lint
- run frontend tests
- run build
- fix any failures
- verify the application can start successfully

14. Documentation
    Add/update a short README section explaining:

- how to run the frontend
- how to run tests
- that the current task service uses mock data
- where the real backend API can later be connected

Before making changes:

- inspect the repository
- briefly state the implementation plan

Then implement the complete frontend in this single run.

At the end provide:

1. files changed
2. features implemented
3. tests executed and results
4. build/lint results
5. known limitations
6. exact steps to manually verify the UI

Do NOT implement backend code.
