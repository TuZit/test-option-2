export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Error carrying an HTTP status code and a machine-readable code so the
 * central error handler can emit the consistent `{ error: { code, message } }`
 * envelope without leaking internals.
 */
export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
  }
}
