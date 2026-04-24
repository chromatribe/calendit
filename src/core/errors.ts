export class CalendarError extends Error {
  public readonly hint?: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = new.target.name;
    this.hint = hint;
  }
}

export type ConfigErrorCause = "missing_file" | "invalid_schema" | "read_failed";

export class ConfigError extends CalendarError {
  public readonly causeCode?: ConfigErrorCause;

  constructor(message: string, hint?: string, causeCode?: ConfigErrorCause) {
    super(message, hint);
    this.causeCode = causeCode;
  }
}

export class AuthError extends CalendarError {}

export class ValidationError extends CalendarError {}

export class ApiError extends CalendarError {
  public readonly statusCode?: number;
  public readonly provider?: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    options: { statusCode?: number; provider?: string; details?: unknown; hint?: string } = {},
  ) {
    super(message, options.hint);
    this.statusCode = options.statusCode;
    this.provider = options.provider;
    this.details = options.details;
  }
}
