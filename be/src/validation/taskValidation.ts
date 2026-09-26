import { HttpError } from "../errors.ts";
import type {
  CreateTaskData,
  TaskStatus,
  UpdateTaskPatch,
} from "../types/task.ts";

export const TASK_STATUSES: readonly TaskStatus[] = ["open", "done"];

export function isTaskStatus(value: unknown): value is TaskStatus {
  return value === "open" || value === "done";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseTaskStatus(value: unknown): TaskStatus {
  if (!isTaskStatus(value)) {
    throw new HttpError(
      400,
      "INVALID_STATUS",
      `status must be one of: ${TASK_STATUSES.join(", ")}`,
    );
  }
  return value;
}

export function parseRequiredTitle(value: unknown): string {
  if (typeof value !== "string") {
    throw new HttpError(400, "INVALID_TITLE", "title is required and must be a string");
  }
  const title = value.trim();
  if (title.length === 0) {
    throw new HttpError(400, "INVALID_TITLE", "title must not be empty or whitespace only");
  }
  return title;
}

export function parseOptionalDescription(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value !== "string") {
    throw new HttpError(400, "INVALID_DESCRIPTION", "description must be a string");
  }
  return value;
}

function parseBodyObject(body: unknown): Record<string, unknown> {
  if (!isPlainObject(body)) {
    throw new HttpError(400, "INVALID_BODY", "request body must be a JSON object");
  }
  return body;
}

/**
 * Parses a create payload. `ownerId` (and any other unknown field) is ignored
 * on purpose: ownership always comes from the authenticated identity.
 */
export function parseCreateTaskInput(body: unknown): CreateTaskData {
  const record = parseBodyObject(body);
  return {
    title: parseRequiredTitle(record.title),
    description: parseOptionalDescription(record.description),
  };
}

/** Parses a partial update payload; omitted fields are left untouched. */
export function parseUpdateTaskInput(body: unknown): UpdateTaskPatch {
  const record = parseBodyObject(body);
  const patch: UpdateTaskPatch = {};
  if (record.title !== undefined) {
    patch.title = parseRequiredTitle(record.title);
  }
  if (record.description !== undefined) {
    patch.description = parseOptionalDescription(record.description);
  }
  if (record.status !== undefined) {
    patch.status = parseTaskStatus(record.status);
  }
  return patch;
}

/** Parses the optional `?status=` list filter; absent means "no filter". */
export function parseStatusFilter(value: unknown): TaskStatus | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value) || typeof value !== "string") {
    throw new HttpError(400, "INVALID_STATUS", "status filter must be a single value");
  }
  return parseTaskStatus(value);
}
