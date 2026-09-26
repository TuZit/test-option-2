import { describe, expect, it } from "vitest";
import { HttpError } from "../errors.ts";
import {
  isTaskStatus,
  parseCreateTaskInput,
  parseStatusFilter,
  parseUpdateTaskInput,
} from "./taskValidation.ts";

function expectHttpError(fn: () => unknown, statusCode: number, code: string): void {
  try {
    fn();
    throw new Error("Expected function to throw an HttpError");
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    const httpError = error as HttpError;
    expect(httpError.statusCode).toBe(statusCode);
    expect(httpError.code).toBe(code);
  }
}

describe("isTaskStatus", () => {
  it("accepts only open and done", () => {
    expect(isTaskStatus("open")).toBe(true);
    expect(isTaskStatus("done")).toBe(true);
    expect(isTaskStatus("archived")).toBe(false);
    expect(isTaskStatus(undefined)).toBe(false);
    expect(isTaskStatus(2)).toBe(false);
  });
});

describe("parseCreateTaskInput", () => {
  it("trims the title and defaults the description", () => {
    expect(parseCreateTaskInput({ title: "  Walk dog  " })).toEqual({
      title: "Walk dog",
      description: "",
    });
  });

  it("ignores a client supplied ownerId", () => {
    const result = parseCreateTaskInput({ title: "Mine", ownerId: "user-b" });
    expect(result).toEqual({ title: "Mine", description: "" });
    expect("ownerId" in result).toBe(false);
  });

  it("rejects empty and whitespace-only titles with 400", () => {
    expectHttpError(() => parseCreateTaskInput({ title: "" }), 400, "INVALID_TITLE");
    expectHttpError(() => parseCreateTaskInput({ title: "   " }), 400, "INVALID_TITLE");
    expectHttpError(() => parseCreateTaskInput({}), 400, "INVALID_TITLE");
    expectHttpError(
      () => parseCreateTaskInput({ title: 42 }),
      400,
      "INVALID_TITLE",
    );
  });

  it("rejects non-object bodies", () => {
    expectHttpError(() => parseCreateTaskInput(null), 400, "INVALID_BODY");
    expectHttpError(() => parseCreateTaskInput([]), 400, "INVALID_BODY");
    expectHttpError(() => parseCreateTaskInput("nope"), 400, "INVALID_BODY");
  });

  it("rejects non-string descriptions", () => {
    expectHttpError(
      () => parseCreateTaskInput({ title: "Valid", description: 5 }),
      400,
      "INVALID_DESCRIPTION",
    );
  });
});

describe("parseUpdateTaskInput", () => {
  it("builds a partial patch from only the supplied fields", () => {
    expect(parseUpdateTaskInput({ description: "only desc" })).toEqual({
      description: "only desc",
    });
    expect(parseUpdateTaskInput({ title: "  New  ", status: "done" })).toEqual({
      title: "New",
      status: "done",
    });
    expect(parseUpdateTaskInput({})).toEqual({});
  });

  it("rejects invalid statuses with 400", () => {
    expectHttpError(
      () => parseUpdateTaskInput({ status: "archived" }),
      400,
      "INVALID_STATUS",
    );
  });

  it("rejects whitespace-only titles with 400", () => {
    expectHttpError(
      () => parseUpdateTaskInput({ title: "   " }),
      400,
      "INVALID_TITLE",
    );
  });
});

describe("parseStatusFilter", () => {
  it("returns undefined when no filter is provided", () => {
    expect(parseStatusFilter(undefined)).toBeUndefined();
  });

  it("accepts valid statuses", () => {
    expect(parseStatusFilter("open")).toBe("open");
    expect(parseStatusFilter("done")).toBe("done");
  });

  it("rejects invalid or repeated statuses with 400", () => {
    expectHttpError(() => parseStatusFilter("archived"), 400, "INVALID_STATUS");
    expectHttpError(() => parseStatusFilter(["open", "done"]), 400, "INVALID_STATUS");
  });
});
