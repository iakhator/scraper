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
}
export declare function createScraperLogger(options?: LoggerOptions): import("winston").Logger;
export declare const logger: import("winston").Logger;
export {};
