"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createScraperLogger = createScraperLogger;
const winston_1 = require("winston");
const chalk_1 = __importDefault(require("chalk"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const os_1 = __importDefault(require("os"));
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
const levelColors = {
    error: chalk_1.default.red,
    warn: chalk_1.default.yellow,
    info: chalk_1.default.green,
    http: chalk_1.default.blue,
    debug: chalk_1.default.magenta,
};
function createScraperLogger(options = {}) {
    const { service = 'scraper', logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug', enableFileLogging = true, logDirectory = 'logs', maxSize = '20m', maxFiles = '14d' } = options;
    const loggerTransports = [
        new winston_1.transports.Console({
            level: logLevel
        })
    ];
    if (enableFileLogging) {
        const shouldHandleExceptions = service === 'scraper-app';
        loggerTransports.push(new winston_daily_rotate_file_1.default({
            filename: `${logDirectory}/application-%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize,
            maxFiles,
            level: process.env.LOG_FILE_LEVEL || 'http',
            handleExceptions: shouldHandleExceptions,
            handleRejections: shouldHandleExceptions
        }).on('error', (err) => console.error('File transport error', err)));
    }
    const logger = (0, winston_1.createLogger)({
        levels,
        format: winston_1.format.combine(winston_1.format.errors({ stack: true }), winston_1.format.json(), winston_1.format.printf(({ level, message, timestamp, stack, ...meta }) => {
            const customTimestamp = new Date().toLocaleString('en-US', { timeZone: 'UTC', hour12: false })
                .replace(/,/, '')
                .replace(/\//g, '-')
                .replace(/(\d\d:\d\d:\d\d)/, ' $1 UTC');
            const color = levelColors[level] || chalk_1.default.white;
            let log = `${chalk_1.default.gray(customTimestamp)} ${color(level.toUpperCase())} ${message}`;
            if (stack)
                log += `\n  ${typeof stack === 'string' ? stack.replace(/\n/g, '\n  ') : stack}`;
            if (Object.keys(meta).length) {
                log += `\n${chalk_1.default.gray(JSON.stringify(meta, null, 2))}`;
            }
            return log;
        })),
        transports: loggerTransports,
        defaultMeta: {
            service,
            hostname: os_1.default.hostname(),
            pid: process.pid
        }
    });
    // Global error handlers
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception', { error, stack: error.stack });
        setTimeout(() => process.exit(1), 1000); // Allow logger to flush
    });
    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)));
    });
    return {
        error: (message, meta) => logger.error(message, meta),
        warn: (message, meta) => logger.warn(message, meta),
        info: (message, meta) => logger.info(message, meta),
        http: (message, meta) => logger.http(message, meta),
        debug: (message, meta) => logger.debug(message, meta),
        request: (req) => logger.http(`Request: ${req.method} ${req.url}`, { ip: req.ip }),
        database: (query, durationMs) => logger.debug(`DB Query executed`, { query, durationMs }),
        startup: (port) => logger.info(`Server running on port http://localhost:${port}`)
    };
}
// Default logger instance for convenience - configured to handle exceptions/rejections
exports.logger = createScraperLogger({
    service: 'scraper-app',
    enableFileLogging: true
});
