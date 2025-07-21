import { createLogger, format, transports } from 'winston';
import chalk from 'chalk';
import DailyRotateFile from 'winston-daily-rotate-file';
import os from 'os';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const levelColors = {
  error: chalk.red,
  warn: chalk.yellow,
  info: chalk.green,
  http: chalk.blue,
  debug: chalk.magenta,
};

export interface LoggerOptions {
  service?: string;
  logLevel?: keyof typeof levels;
  enableFileLogging?: boolean;
  logDirectory?: string;
  maxSize?: string;
  maxFiles?: string;
}

export function createScraperLogger(options: LoggerOptions = {}) {
  const {
    service = 'scraper',
    logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    enableFileLogging = true,
    logDirectory = 'logs',
    maxSize = '20m',
    maxFiles = '14d'
  } = options;

  const loggerTransports: any[] = [
    new transports.Console({
      level: logLevel
    })
  ];

  if (enableFileLogging) {
    const shouldHandleExceptions = service === 'scraper-app';
    
    loggerTransports.push(
      new DailyRotateFile({
        filename: `${logDirectory}/application-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize,
        maxFiles,
        level: process.env.LOG_FILE_LEVEL || 'http',
        handleExceptions: shouldHandleExceptions,
        handleRejections: shouldHandleExceptions
      }).on('error', (err) => console.error('File transport error', err))
    );
  }

  const logger = createLogger({
    levels,
    format: format.combine(
      format.errors({ stack: true }),
      format.json(),
      format.printf(({ level, message, timestamp, stack, ...meta }) => {
        const customTimestamp = new Date().toLocaleString('en-US', { timeZone: 'UTC', hour12: false })
          .replace(/,/, '')
          .replace(/\//g, '-')
          .replace(/(\d\d:\d\d:\d\d)/, ' $1 UTC');
        const color = levelColors[level as keyof typeof levelColors] || chalk.white;
        let log = `${chalk.gray(customTimestamp)} ${color(level.toUpperCase())} ${message}`;
        
        if (stack) log += `\n  ${typeof stack === 'string' ? stack.replace(/\n/g, '\n  ') : stack}`;
        if (Object.keys(meta).length) {
          log += `\n${chalk.gray(JSON.stringify(meta, null, 2))}`;
        }
        
        return log;
      })
    ),
    transports: loggerTransports,
    defaultMeta: {
      service,
      hostname: os.hostname(),
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
    error: (message: string, meta?: Record<string, unknown>) => logger.error(message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => logger.warn(message, meta),
    info: (message: string, meta?: Record<string, unknown>) => logger.info(message, meta),
    http: (message: string, meta?: Record<string, unknown>) => logger.http(message, meta),
    debug: (message: string, meta?: Record<string, unknown>) => logger.debug(message, meta),

    request: (req: { method: string; url: string; ip?: string }) => 
      logger.http(`Request: ${req.method} ${req.url}`, { ip: req.ip }),
    
    database: (query: string, durationMs: number) => 
      logger.debug(`DB Query executed`, { query, durationMs }),
    
    startup: (port: number | string) => 
      logger.info(`Server running on port http://localhost:${port}`)
  };
}

// Default logger instance for convenience - configured to handle exceptions/rejections
export const logger = createScraperLogger({ 
  service: 'scraper-app',
  enableFileLogging: true 
});

// Type for the logger instance
export type ScraperLogger = ReturnType<typeof createScraperLogger>;
