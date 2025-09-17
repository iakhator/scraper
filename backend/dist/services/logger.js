"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createScraperLogger = createScraperLogger;
const winston_1 = require("winston");
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
function createScraperLogger(options = {}) {
    const { service = 'scraper', logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug', } = options;
    return (0, winston_1.createLogger)({
        level: logLevel,
        levels,
        format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.errors({ stack: true }), winston_1.format.json()),
        defaultMeta: { service },
        transports: [
            new winston_1.transports.Console({
                format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.simple())
            })
        ],
    });
}
exports.logger = createScraperLogger({ service: 'scraper-backend' });
//# sourceMappingURL=logger.js.map