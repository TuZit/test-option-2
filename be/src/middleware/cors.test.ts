import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, createApp, taskRepository } from "../app.ts";
import { createTaskRepository } from "../repositories/taskRepository.ts";
import { createOriginChecker, parseAllowedOrigins } from "./cors.ts";

const USER_A = "user-a";
const ALLOWED_ORIGIN = "http://localhost:5173";

beforeEach(() => {
  taskRepository.reset();
});

describe("CORS origin allowlist", () => {
  it("allows localhost and 127.0.0.1 on any port", () => {
    const isAllowed = createOriginChecker();

    expect(isAllowed("http://localhost:5173")).toBe(true);
    expect(isAllowed("http://localhost:4173")).toBe(true);
    expect(isAllowed("http://127.0.0.1:5173")).toBe(true);
    expect(isAllowed("https://localhost:8443")).toBe(true);
    expect(isAllowed("http://[::1]:5173")).toBe(true);
  });

  it("rejects unrelated origins and lookalike hostnames", () => {
    const isAllowed = createOriginChecker();

    expect(isAllowed("https://evil.example.com")).toBe(false);
    expect(isAllowed("http://localhost.evil.example.com")).toBe(false);
    expect(isAllowed("http://notlocalhost:5173")).toBe(false);
  });

  it("allows requests without an Origin header (curl, server-to-server)", () => {
    expect(createOriginChecker()(undefined)).toBe(true);
  });

  it("parses a comma-separated CORS_ORIGINS value", () => {
    expect(parseAllowedOrigins(" https://a.example.com ,https://b.example.com , ")).toEqual([
      "https://a.example.com",
      "https://b.example.com",
    ]);
    expect(parseAllowedOrigins(undefined)).toEqual([]);
  });

  it("honors the CORS_ORIGINS environment variable", () => {
    const previous = process.env.CORS_ORIGINS;
    process.env.CORS_ORIGINS = "https://app.example.com, https://admin.example.com";
    try {
      const isAllowed = createOriginChecker();
      expect(isAllowed("https://app.example.com")).toBe(true);
      expect(isAllowed("https://admin.example.com")).toBe(true);
      expect(isAllowed("https://other.example.com")).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.CORS_ORIGINS;
      else process.env.CORS_ORIGINS = previous;
    }
  });

  it("CORS_ORIGINS=* allows every origin", () => {
    const previous = process.env.CORS_ORIGINS;
    process.env.CORS_ORIGINS = "*";
    try {
      const isAllowed = createOriginChecker();
      expect(isAllowed("https://anything.example.com")).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.CORS_ORIGINS;
      else process.env.CORS_ORIGINS = previous;
    }
  });
});

describe("CORS HTTP behavior", () => {
  it("echoes an allowed origin on a real response", async () => {
    const response = await request(app)
      .get("/tasks")
      .set("Origin", ALLOWED_ORIGIN)
      .set("X-User-Id", USER_A);

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
    expect(response.headers.vary).toContain("Origin");
  });

  it("answers a preflight for POST with the X-User-Id header without requiring auth", async () => {
    const response = await request(app)
      .options("/tasks")
      .set("Origin", ALLOWED_ORIGIN)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type,x-user-id");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
    expect(response.headers["access-control-allow-methods"]).toContain("POST");
    expect(response.headers["access-control-allow-methods"]).toContain("PUT");
    expect(response.headers["access-control-allow-methods"]).toContain("DELETE");
    expect(response.headers["access-control-allow-headers"].toLowerCase()).toContain(
      "x-user-id",
    );
    expect(response.headers["access-control-allow-headers"].toLowerCase()).toContain(
      "content-type",
    );
  });

  it("lets a cross-origin write through with the CORS headers attached", async () => {
    const response = await request(app)
      .post("/tasks")
      .set("Origin", "http://127.0.0.1:4173")
      .set("X-User-Id", USER_A)
      .send({ title: "From the browser" });

    expect(response.status).toBe(201);
    expect(response.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:4173");
  });

  it("omits CORS headers for a disallowed origin", async () => {
    const response = await request(app)
      .get("/tasks")
      .set("Origin", "https://evil.example.com")
      .set("X-User-Id", USER_A);

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("rejects a preflight from a disallowed origin with a 403 envelope", async () => {
    const response = await request(app)
      .options("/tasks")
      .set("Origin", "https://evil.example.com")
      .set("Access-Control-Request-Method", "DELETE");

    expect(response.status).toBe(403);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    expect(response.body).toMatchObject({
      error: { code: "CORS_ORIGIN_NOT_ALLOWED" },
    });
  });

  it("does not add CORS headers when the request has no Origin", async () => {
    const response = await request(app).get("/tasks").set("X-User-Id", USER_A);

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("supports extra origins injected through createApp options", async () => {
    const corsApp = createApp(createTaskRepository(), {
      allowedOrigins: ["https://tasks.example.com"],
    });

    const response = await request(corsApp)
      .get("/tasks")
      .set("Origin", "https://tasks.example.com")
      .set("X-User-Id", USER_A);

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "https://tasks.example.com",
    );
  });
});
