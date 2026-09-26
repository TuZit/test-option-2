import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, taskRepository } from "../app.ts";
import type { Task } from "../types/task.ts";

const USER_A = "user-a";
const USER_B = "user-b";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function createTask(
  userId: string,
  body: Record<string, unknown>,
): Promise<Task> {
  const response = await request(app)
    .post("/tasks")
    .set("X-User-Id", userId)
    .send(body);
  expect(response.status).toBe(201);
  return response.body as Task;
}

beforeEach(() => {
  taskRepository.reset();
});

describe("POST /tasks", () => {
  it("creates a trimmed open task with 201 and an ISO timestamp", async () => {
    const response = await request(app)
      .post("/tasks")
      .set("X-User-Id", USER_A)
      .send({ title: "  Buy groceries  ", description: "milk and eggs" });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ownerId: USER_A,
      title: "Buy groceries",
      description: "milk and eggs",
      status: "open",
    });
    expect(response.body.id).toMatch(UUID_PATTERN);
    expect(response.body.createdAt).toBe(response.body.updatedAt);
    expect(Number.isNaN(Date.parse(response.body.createdAt))).toBe(false);
  });

  it("ignores a client supplied ownerId", async () => {
    const created = await createTask(USER_A, {
      title: "Owned by the header",
      ownerId: USER_B,
    });

    expect(created.ownerId).toBe(USER_A);

    const userBTasks = await request(app).get("/tasks").set("X-User-Id", USER_B);
    expect(userBTasks.status).toBe(200);
    expect(userBTasks.body).toEqual([]);
  });

  it("rejects empty and whitespace-only titles with a 400 JSON envelope", async () => {
    for (const title of ["", "   ", "\n\t"]) {
      const response = await request(app)
        .post("/tasks")
        .set("X-User-Id", USER_A)
        .send({ title });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: "INVALID_TITLE",
          message: expect.any(String),
        },
      });
    }

    const missing = await request(app)
      .post("/tasks")
      .set("X-User-Id", USER_A)
      .send({});
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("INVALID_TITLE");
  });
});

describe("GET /tasks", () => {
  it("lists only the authenticated user's tasks", async () => {
    const aTask = await createTask(USER_A, { title: "A task" });
    await createTask(USER_B, { title: "B task" });

    const response = await request(app).get("/tasks").set("X-User-Id", USER_A);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(aTask.id);
    expect(response.body[0].title).toBe("A task");
  });

  it("filters tasks by open and done status", async () => {
    const openTask = await createTask(USER_A, { title: "Still open" });
    const doneTask = await createTask(USER_A, { title: "Finished" });
    await request(app)
      .put(`/tasks/${doneTask.id}`)
      .set("X-User-Id", USER_A)
      .send({ status: "done" });

    const open = await request(app)
      .get("/tasks?status=open")
      .set("X-User-Id", USER_A);
    expect(open.status).toBe(200);
    expect(open.body.map((task: Task) => task.id)).toEqual([openTask.id]);

    const done = await request(app)
      .get("/tasks?status=done")
      .set("X-User-Id", USER_A);
    expect(done.status).toBe(200);
    expect(done.body.map((task: Task) => task.id)).toEqual([doneTask.id]);
  });

  it("rejects an invalid status filter with a 400 JSON envelope", async () => {
    const response = await request(app)
      .get("/tasks?status=archived")
      .set("X-User-Id", USER_A);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_STATUS");
    expect(typeof response.body.error.message).toBe("string");
  });
});

describe("PUT /tasks/:id", () => {
  it("updates title, description and status with 200 and bumps updatedAt", async () => {
    const created = await createTask(USER_A, { title: "Original" });

    const response = await request(app)
      .put(`/tasks/${created.id}`)
      .set("X-User-Id", USER_A)
      .send({ title: "  Renamed  ", description: "details", status: "done" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: created.id,
      ownerId: USER_A,
      title: "Renamed",
      description: "details",
      status: "done",
      createdAt: created.createdAt,
    });
    expect(Date.parse(response.body.updatedAt)).toBeGreaterThan(
      Date.parse(created.updatedAt),
    );
  });

  it("applies partial updates without clobbering the title", async () => {
    const created = await createTask(USER_A, {
      title: "Keep me",
      description: "old description",
    });

    const response = await request(app)
      .put(`/tasks/${created.id}`)
      .set("X-User-Id", USER_A)
      .send({ description: "new description" });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe("Keep me");
    expect(response.body.description).toBe("new description");
    expect(response.body.status).toBe("open");
  });

  it("toggles status from done back to open", async () => {
    const created = await createTask(USER_A, { title: "Toggle" });

    const done = await request(app)
      .put(`/tasks/${created.id}`)
      .set("X-User-Id", USER_A)
      .send({ status: "done" });
    expect(done.status).toBe(200);
    expect(done.body.status).toBe("done");

    const reopened = await request(app)
      .put(`/tasks/${created.id}`)
      .set("X-User-Id", USER_A)
      .send({ status: "open" });
    expect(reopened.status).toBe(200);
    expect(reopened.body.status).toBe("open");
  });

  it("rejects an invalid status with a 400 JSON envelope", async () => {
    const created = await createTask(USER_A, { title: "Valid" });

    const response = await request(app)
      .put(`/tasks/${created.id}`)
      .set("X-User-Id", USER_A)
      .send({ status: "archived" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: "INVALID_STATUS", message: expect.any(String) },
    });

    const list = await request(app).get("/tasks").set("X-User-Id", USER_A);
    expect(list.body[0].status).toBe("open");
  });

  it("rejects whitespace-only titles on update with 400", async () => {
    const created = await createTask(USER_A, { title: "Valid" });

    const response = await request(app)
      .put(`/tasks/${created.id}`)
      .set("X-User-Id", USER_A)
      .send({ title: "   " });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_TITLE");
  });

  it("denies a cross-owner update with 404 and leaves data unchanged", async () => {
    const created = await createTask(USER_A, { title: "A private task" });

    const response = await request(app)
      .put(`/tasks/${created.id}`)
      .set("X-User-Id", USER_B)
      .send({ title: "Hijacked", status: "done" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: "TASK_NOT_FOUND", message: expect.any(String) },
    });

    const list = await request(app).get("/tasks").set("X-User-Id", USER_A);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].title).toBe("A private task");
    expect(list.body[0].status).toBe("open");
  });

  it("returns 404 for a missing task id", async () => {
    const response = await request(app)
      .put("/tasks/00000000-0000-4000-8000-000000000000")
      .set("X-User-Id", USER_A)
      .send({ title: "Ghost" });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("TASK_NOT_FOUND");
  });
});

describe("DELETE /tasks/:id", () => {
  it("deletes an owned task with 204 and an empty body", async () => {
    const created = await createTask(USER_A, { title: "Delete me" });

    const response = await request(app)
      .delete(`/tasks/${created.id}`)
      .set("X-User-Id", USER_A);

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(response.body).toEqual({});

    const list = await request(app).get("/tasks").set("X-User-Id", USER_A);
    expect(list.body).toEqual([]);
  });

  it("denies a cross-owner delete with 404 and leaves the task intact", async () => {
    const created = await createTask(USER_A, { title: "Protected" });

    const response = await request(app)
      .delete(`/tasks/${created.id}`)
      .set("X-User-Id", USER_B);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("TASK_NOT_FOUND");

    const list = await request(app).get("/tasks").set("X-User-Id", USER_A);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(created.id);
  });

  it("returns 404 for a missing task id", async () => {
    const response = await request(app)
      .delete("/tasks/00000000-0000-4000-8000-000000000000")
      .set("X-User-Id", USER_A);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: "TASK_NOT_FOUND", message: expect.any(String) },
    });
  });
});

describe("authentication", () => {
  it("returns 401 with a JSON envelope when X-User-Id is missing", async () => {
    const list = await request(app).get("/tasks");
    expect(list.status).toBe(401);
    expect(list.body).toEqual({
      error: { code: "UNAUTHENTICATED", message: expect.any(String) },
    });

    const create = await request(app).post("/tasks").send({ title: "Nope" });
    expect(create.status).toBe(401);
    expect(create.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 401 when X-User-Id is blank", async () => {
    const response = await request(app).get("/tasks").set("X-User-Id", "   ");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("treats a padded user id as the trimmed identity", async () => {
    const created = await createTask("  user-a  ", { title: "Trimmed owner" });
    expect(created.ownerId).toBe("user-a");

    const list = await request(app).get("/tasks").set("X-User-Id", "user-a");
    expect(list.body).toHaveLength(1);
  });
});

describe("error envelope", () => {
  it("returns 400 JSON for malformed JSON bodies", async () => {
    const response = await request(app)
      .post("/tasks")
      .set("X-User-Id", USER_A)
      .set("Content-Type", "application/json")
      .send('{"title": "broken"');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: "INVALID_JSON", message: expect.any(String) },
    });
  });

  it("returns 404 JSON for unknown routes", async () => {
    const response = await request(app)
      .get("/does-not-exist")
      .set("X-User-Id", USER_A);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("ROUTE_NOT_FOUND");
  });
});
