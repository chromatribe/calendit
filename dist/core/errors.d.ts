export declare class CalendarError extends Error {
    readonly hint?: string;
    constructor(message: string, hint?: string);
}
export declare class ConfigError extends CalendarError {
}
export declare class AuthError extends CalendarError {
}
export declare class ValidationError extends CalendarError {
}
export declare class ApiError extends CalendarError {
    readonly statusCode?: number;
    readonly provider?: string;
    readonly details?: unknown;
    constructor(message: string, options?: {
        statusCode?: number;
        provider?: string;
        details?: unknown;
        hint?: string;
    });
}
