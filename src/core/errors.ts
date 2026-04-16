export class CalendarError extends Error {
  public readonly hint?: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = new.target.name;
    this.hint = hint;
  }
}

export class ConfigError extends CalendarError {}

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
