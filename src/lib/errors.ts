export class AppError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "APP_ERROR", status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "You don't have access to this resource.") {
    super(message, "FORBIDDEN", 403);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found.") {
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "This action conflicts with the current state.") {
    super(message, "CONFLICT", 409);
    this.name = "ConflictError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "Some fields are invalid.") {
    super(message, "VALIDATION_ERROR", 422);
    this.name = "ValidationError";
  }
}

/** Normalizes any thrown value into a plain, client-safe message + code. */
export function toActionError(error: unknown): { message: string; code: string } {
  if (error instanceof AppError) {
    return { message: error.message, code: error.code };
  }
  if (error instanceof Error) {
    // Don't leak internal/database error details to the client.
    console.error(error);
    return { message: "Something went wrong. Please try again.", code: "UNKNOWN" };
  }
  return { message: "Something went wrong. Please try again.", code: "UNKNOWN" };
}
