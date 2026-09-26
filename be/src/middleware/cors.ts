import cors from "cors";
import type { CorsOptions } from "cors";
import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * CORS configuration for the separate frontend origin.
 *
 * The frontend sends a custom `X-User-Id` header, so the browser performs a
 * preflight `OPTIONS` request. This middleware answers that preflight before
 * the auth/route layer runs (a preflight never carries `X-User-Id`).
 *
 * Allowed origins by default: any `localhost` / `127.0.0.1` / `[::1]` origin on
 * any port (Vite dev on :5173, preview on :4173, ...). Extend with the
 * `CORS_ORIGINS` environment variable (comma-separated exact origins) or set
 * `CORS_ORIGINS=*` to allow every origin. In production, set `CORS_ORIGINS` to
 * the real frontend origin(s).
 */

const LOCAL_ORIGIN_PATTERN =
  /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;

const ALLOWED_HEADERS = ["Content-Type", "X-User-Id"];
const ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"];
const MAX_AGE_SECONDS = 600;

export function parseAllowedOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * Builds the origin predicate. Exported so the allowlist can be unit-tested
 * without going through HTTP, and so other transports can reuse it.
 */
export function createOriginChecker(extraOrigins: readonly string[] = []) {
  const configured = new Set([
    ...parseAllowedOrigins(process.env.CORS_ORIGINS),
    ...extraOrigins,
  ]);
  const allowAny = configured.has("*");

  return function isAllowedOrigin(origin: string | undefined): boolean {
    // No Origin header: curl, server-to-server, tests. Nothing to negotiate.
    if (origin === undefined) return true;
    return allowAny || configured.has(origin) || LOCAL_ORIGIN_PATTERN.test(origin);
  };
}

export interface AppCorsOptions {
  /** Exact origins to allow on top of the default localhost pattern. */
  allowedOrigins?: readonly string[];
}

function buildCorsOptions(
  isAllowedOrigin: (origin: string | undefined) => boolean,
): CorsOptions {
  return {
    origin(origin, callback) {
      // Reflect allowed origins; for rejected ones the `cors` package omits the
      // Access-Control-Allow-Origin header, so the browser blocks the response.
      callback(null, isAllowedOrigin(origin));
    },
    methods: ALLOWED_METHODS,
    allowedHeaders: ALLOWED_HEADERS,
    // Answer preflight with 204 and cache it so OPTIONS is not re-sent per write.
    optionsSuccessStatus: 204,
    maxAge: MAX_AGE_SECONDS,
  };
}

export function createCorsOptions(options: AppCorsOptions = {}): CorsOptions {
  return buildCorsOptions(createOriginChecker(options.allowedOrigins));
}

export function createCorsMiddleware(options: AppCorsOptions = {}): RequestHandler {
  const isAllowedOrigin = createOriginChecker(options.allowedOrigins);
  const corsHandler = cors(buildCorsOptions(isAllowedOrigin));

  return function corsMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const origin = req.header("origin");

    // Reject a preflight from a disallowed origin up front. Without this,
    // Express would auto-answer OPTIONS for a matched route with a plain 200.
    if (req.method === "OPTIONS" && origin !== undefined && !isAllowedOrigin(origin)) {
      res.status(403).json({
        error: {
          code: "CORS_ORIGIN_NOT_ALLOWED",
          message: "This origin is not allowed to call the API",
        },
      });
      return;
    }

    corsHandler(req, res, next);
  };
}

export default createCorsMiddleware;
