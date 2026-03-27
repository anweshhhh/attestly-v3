export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, options: { code: string; status: number }) {
    super(message);
    this.name = "AppError";
    this.code = options.code;
    this.status = options.status;
  }
}

export function getErrorDetails(error: unknown, fallbackMessage = "Something went wrong.") {
  if (error instanceof AppError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      code: "INTERNAL_ERROR",
      message: error.message || fallbackMessage
    };
  }

  return {
    status: 500,
    code: "INTERNAL_ERROR",
    message: fallbackMessage
  };
}
