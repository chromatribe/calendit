export class CalendarError extends Error {
    hint;
    constructor(message, hint) {
        super(message);
        this.name = new.target.name;
        this.hint = hint;
    }
}
export class ConfigError extends CalendarError {
}
export class AuthError extends CalendarError {
}
export class ValidationError extends CalendarError {
}
export class ApiError extends CalendarError {
    statusCode;
    provider;
    details;
    constructor(message, options = {}) {
        super(message, options.hint);
        this.statusCode = options.statusCode;
        this.provider = options.provider;
        this.details = options.details;
    }
}
