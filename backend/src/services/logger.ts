import { createLogger, format, transports } from 'winston';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

export interface LoggerOptions {
  service?: string;
  logLevel?: keyof typeof levels;
}

export function createScraperLogger(options: LoggerOptions = {}) {
  const {
    service = 'scraper',
    logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  } = options;

  return createLogger({
    level: logLevel,
    levels,
    format: format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.json()
    ),
    defaultMeta: { service },
    transports: [
      new transports.Console({
        format: format.combine(
          format.colorize(),
          format.simple()
        )
      })
    ],
  });
}

export const logger = createScraperLogger({ service: 'scraper-backend' });
