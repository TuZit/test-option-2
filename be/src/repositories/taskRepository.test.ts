import { beforeEach, describe, expect, it } from "vitest";
import { createTaskRepository } from "./taskRepository.ts";
import type { TaskRepository } from "./taskRepository.ts";
import type { Task } from "../types/task.ts";

const OWNER_A = "user-a";
const OWNER_B = "user-b";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "seed-1",
    ownerId: OWNER_A,
    title: "Seed task",
    description: "seeded task",
    status: "open",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("taskRepository", () => {
  let repository: TaskRepository;

  beforeEach(() => {
    repository = createTaskRepository();
  });

  it("creates an open task with a UUID, trimmed title and ISO timestamps", () => {
    const task = repository.create(OWNER_A, { title: "  Buy milk  " });

    expect(task.id).toMatch(UUID_PATTERN);
    expect(task.ownerId).toBe(OWNER_A);
    expect(task.title).toBe("Buy milk");
    expect(task.description).toBe("");
    expect(task.status).toBe("open");
    expect(task.createdAt).toBe(task.updatedAt);
    expect(Number.isNaN(Date.parse(task.createdAt))).toBe(false);
  });

  it("generates unique ids for each created task", () => {
    const first = repository.create(OWNER_A, { title: "One" });
    const second = repository.create(OWNER_A, { title: "Two" });

    expect(first.id).not.toBe(second.id);
  });

  it("lists only the tasks owned by the requested owner", () => {
    repository.create(OWNER_A, { title: "A task" });
    repository.create(OWNER_B, { title: "B task" });

    const ownerATasks = repository.listByOwner(OWNER_A);
    const ownerBTasks = repository.listByOwner(OWNER_B);

    expect(ownerATasks).toHaveLength(1);
    expect(ownerBTasks).toHaveLength(1);
    expect(ownerATasks[0]?.title).toBe("A task");
    expect(ownerBTasks[0]?.title).toBe("B task");
    expect(repository.listByOwner("stranger")).toEqual([]);
  });

  it("filters listed tasks by status", () => {
    const openTask = repository.create(OWNER_A, { title: "Open" });
    const doneTask = repository.create(OWNER_A, { title: "Done" });
    repository.updateByOwner(OWNER_A, doneTask.id, { status: "done" });

    expect(repository.listByOwner(OWNER_A, "open").map((task) => task.id)).toEqual([
      openTask.id,
    ]);
    expect(repository.listByOwner(OWNER_A, "done").map((task) => task.id)).toEqual([
      doneTask.id,
    ]);
  });

  it("updates fields, preserves createdAt and bumps updatedAt", () => {
    const created = repository.create(OWNER_A, { title: "Original", description: "old" });

    const updated = repository.updateByOwner(OWNER_A, created.id, {
      title: "Renamed",
      description: "new",
      status: "done",
    });

    expect(updated).toBeDefined();
    expect(updated?.id).toBe(created.id);
    expect(updated?.title).toBe("Renamed");
    expect(updated?.description).toBe("new");
    expect(updated?.status).toBe("done");
    expect(updated?.createdAt).toBe(created.createdAt);
    expect(Date.parse(updated?.updatedAt ?? "")).toBeGreaterThan(
      Date.parse(created.updatedAt),
    );
  });

  it("supports partial updates without clobbering other fields", () => {
    const created = repository.create(OWNER_A, {
      title: "Keep me",
      description: "keep this too",
    });

    const updated = repository.updateByOwner(OWNER_A, created.id, {
      status: "done",
    });

    expect(updated?.title).toBe("Keep me");
    expect(updated?.description).toBe("keep this too");
    expect(updated?.status).toBe("done");
  });

  it("toggles status from open to done and back to open", () => {
    const created = repository.create(OWNER_A, { title: "Toggle me" });

    const done = repository.updateByOwner(OWNER_A, created.id, { status: "done" });
    expect(done?.status).toBe("done");

    const reopened = repository.updateByOwner(OWNER_A, created.id, {
      status: "open",
    });
    expect(reopened?.status).toBe("open");
  });

  it("returns undefined when updating a task owned by someone else", () => {
    const created = repository.create(OWNER_A, { title: "A only" });

    const result = repository.updateByOwner(OWNER_B, created.id, {
      title: "Hijacked",
    });

    expect(result).toBeUndefined();
    expect(repository.listByOwner(OWNER_A)[0]?.title).toBe("A only");
    expect(repository.listByOwner(OWNER_B)).toEqual([]);
  });

  it("returns undefined when updating a missing task", () => {
    expect(
      repository.updateByOwner(OWNER_A, "does-not-exist", { title: "Nope" }),
    ).toBeUndefined();
  });

  it("deletes owned tasks and reports success", () => {
    const created = repository.create(OWNER_A, { title: "Delete me" });

    expect(repository.deleteByOwner(OWNER_A, created.id)).toBe(true);
    expect(repository.listByOwner(OWNER_A)).toEqual([]);
  });

  it("refuses to delete another owner's task and leaves it intact", () => {
    const created = repository.create(OWNER_A, { title: "Protected" });

    expect(repository.deleteByOwner(OWNER_B, created.id)).toBe(false);
    expect(repository.listByOwner(OWNER_A)).toHaveLength(1);
  });

  it("returns false when deleting a missing task", () => {
    expect(repository.deleteByOwner(OWNER_A, "missing")).toBe(false);
  });

  it("returns defensive copies that cannot mutate stored state", () => {
    const created = repository.create(OWNER_A, { title: "Safe" });
    created.title = "Mutated externally";

    const [stored] = repository.listByOwner(OWNER_A);
    expect(stored?.title).toBe("Safe");
  });

  it("resets to seed data and can clear all tasks", () => {
    const seed = makeTask({ id: "seed-42", title: "Seeded" });
    repository.reset([seed]);

    expect(repository.listByOwner(OWNER_A)).toHaveLength(1);
    expect(repository.listByOwner(OWNER_A)[0]?.title).toBe("Seeded");

    // Seed objects are cloned, so mutating the original does not leak in.
    seed.title = "Changed";
    expect(repository.listByOwner(OWNER_A)[0]?.title).toBe("Seeded");

    repository.reset();
    expect(repository.listByOwner(OWNER_A)).toEqual([]);
  });
});
