import { Router } from "express";
import type { Request, Response } from "express";
import { HttpError } from "../errors.ts";
import type { TaskRepository } from "../repositories/taskRepository.ts";
import {
  parseCreateTaskInput,
  parseStatusFilter,
  parseUpdateTaskInput,
} from "../validation/taskValidation.ts";

/**
 * Development/test authentication: the current user is the trimmed
 * `X-User-Id` header. Missing or blank values are rejected with 401.
 * Replace this function with real session/token verification later.
 */
function requireCurrentUserId(req: Request): string {
  const header = req.header("x-user-id");
  const ownerId = typeof header === "string" ? header.trim() : "";
  if (ownerId.length === 0) {
    throw new HttpError(
      401,
      "UNAUTHENTICATED",
      "A non-blank X-User-Id header is required",
    );
  }
  return ownerId;
}

/** Reads the `:id` route parameter as a string (Express types allow arrays). */
function readTaskId(req: Request): string {
  const id: unknown = req.params.id;
  return typeof id === "string" ? id : "";
}

export function createTaskRouter(repository: TaskRepository): Router {
  const router = Router();

  router.post("/", (req: Request, res: Response) => {
    const ownerId = requireCurrentUserId(req);
    const input = parseCreateTaskInput(req.body);
    const task = repository.create(ownerId, input);
    res.status(201).json(task);
  });

  router.get("/", (req: Request, res: Response) => {
    const ownerId = requireCurrentUserId(req);
    const status = parseStatusFilter(req.query.status);
    res.status(200).json(repository.listByOwner(ownerId, status));
  });

  router.put("/:id", (req: Request, res: Response) => {
    const ownerId = requireCurrentUserId(req);
    const patch = parseUpdateTaskInput(req.body);
    const updated = repository.updateByOwner(ownerId, readTaskId(req), patch);
    if (updated === undefined) {
      throw new HttpError(404, "TASK_NOT_FOUND", "Task not found");
    }
    res.status(200).json(updated);
  });

  router.delete("/:id", (req: Request, res: Response) => {
    const ownerId = requireCurrentUserId(req);
    const deleted = repository.deleteByOwner(ownerId, readTaskId(req));
    if (!deleted) {
      throw new HttpError(404, "TASK_NOT_FOUND", "Task not found");
    }
    res.status(204).send();
  });

  return router;
}
