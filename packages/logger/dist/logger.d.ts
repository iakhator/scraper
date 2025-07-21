declare const levels: {
    error: number;
    warn: number;
    info: number;
    http: number;
    debug: number;
};
export interface LoggerOptions {
    service?: string;
    logLevel?: keyof typeof levels;
    enableFileLogging?: boolean;
    logDirectory?: string;
    maxSize?: string;
    maxFiles?: string;
}
export declare function createScraperLogger(options?: LoggerOptions): {
    error: (message: string, meta?: Record<string, unknown>) => import("winston").Logger;
    warn: (message: string, meta?: Record<string, unknown>) => import("winston").Logger;
    info: (message: string, meta?: Record<string, unknown>) => import("winston").Logger;
    http: (message: string, meta?: Record<string, unknown>) => import("winston").Logger;
    debug: (message: string, meta?: Record<string, unknown>) => import("winston").Logger;
    request: (req: {
        method: string;
        url: string;
        ip?: string;
    }) => import("winston").Logger;
    database: (query: string, durationMs: number) => import("winston").Logger;
    startup: (port: number | string) => import("winston").Logger;
};
export declare const logger: {
    error: (message: string, meta?: Record<string, unknown>) => import("winston").Logger;
    warn: (message: string, meta?: Record<string, unknown>) => import("winston").Logger;
    info: (message: string, meta?: Record<string, unknown>) => import("winston").Logger;
    http: (message: string, meta?: Record<string, unknown>) => import("winston").Logger;
    debug: (message: string, meta?: Record<string, unknown>) => import("winston").Logger;
    request: (req: {
        method: string;
        url: string;
        ip?: string;
    }) => import("winston").Logger;
    database: (query: string, durationMs: number) => import("winston").Logger;
    startup: (port: number | string) => import("winston").Logger;
};
export type ScraperLogger = ReturnType<typeof createScraperLogger>;
export {};
