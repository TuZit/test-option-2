import { randomUUID } from "node:crypto";
import type {
  CreateTaskData,
  Task,
  TaskStatus,
  UpdateTaskPatch,
} from "../types/task.ts";

export interface TaskRepository {
  listByOwner(ownerId: string, status?: TaskStatus): Task[];
  create(ownerId: string, input: CreateTaskData): Task;
  updateByOwner(ownerId: string, id: string, patch: UpdateTaskPatch): Task | undefined;
  deleteByOwner(ownerId: string, id: string): boolean;
  /** Test/demo helper: replace all stored tasks with (clones of) `seed`. */
  reset(seed?: Task[]): void;
}

function cloneTask(task: Task): Task {
  return { ...task };
}

/** Guarantees a strictly increasing timestamp even within the same millisecond. */
function nextTimestamp(previous: string): string {
  const now = Date.now();
  const previousMs = Date.parse(previous);
  const base = Number.isNaN(previousMs) ? now : previousMs;
  return new Date(Math.max(now, base + 1)).toISOString();
}

/**
 * In-memory, owner-scoped task repository.
 *
 * Every lookup matches on both `id` and `ownerId`, so there is no way to load
 * (and therefore no way to read, update, or delete) another owner's task.
 * Callers only ever receive copies; the internal store is never exposed.
 */
export function createTaskRepository(seed: Task[] = []): TaskRepository {
  let tasks: Task[] = [];

  const reset = (nextSeed: Task[] = []): void => {
    tasks = nextSeed.map(cloneTask);
  };

  reset(seed);

  return {
    reset,

    listByOwner(ownerId: string, status?: TaskStatus): Task[] {
      return tasks
        .filter((task) => task.ownerId === ownerId)
        .filter((task) => (status === undefined ? true : task.status === status))
        .map(cloneTask);
    },

    create(ownerId: string, input: CreateTaskData): Task {
      const now = new Date().toISOString();
      const task: Task = {
        id: randomUUID(),
        ownerId,
        title: input.title.trim(),
        description: input.description ?? "",
        status: "open",
        createdAt: now,
        updatedAt: now,
      };
      tasks.push(task);
      return cloneTask(task);
    },

    updateByOwner(ownerId: string, id: string, patch: UpdateTaskPatch): Task | undefined {
      const index = tasks.findIndex(
        (task) => task.id === id && task.ownerId === ownerId,
      );
      if (index === -1) {
        return undefined;
      }
      const existing = tasks[index];
      const updated: Task = {
        ...existing,
        title: patch.title !== undefined ? patch.title : existing.title,
        description:
          patch.description !== undefined ? patch.description : existing.description,
        status: patch.status !== undefined ? patch.status : existing.status,
        updatedAt: nextTimestamp(existing.updatedAt),
      };
      tasks[index] = updated;
      return cloneTask(updated);
    },

    deleteByOwner(ownerId: string, id: string): boolean {
      const index = tasks.findIndex(
        (task) => task.id === id && task.ownerId === ownerId,
      );
      if (index === -1) {
        return false;
      }
      tasks.splice(index, 1);
      return true;
    },
  };
}
