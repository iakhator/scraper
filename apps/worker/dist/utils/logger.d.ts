declare const _default: {
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
export default _default;
//# sourceMappingURL=logger.d.ts.map