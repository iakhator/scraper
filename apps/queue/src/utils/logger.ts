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

const logger = createLogger({
  levels,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }), 
    format.json() 
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.printf(({ level, message, timestamp, stack, ...meta }) => {
          const color = levelColors[level as keyof typeof levelColors] || chalk.white;
          let log = `${chalk.gray(timestamp)} ${color(level.toUpperCase())} ${message}`;
          
          if (stack) log += `\n${stack}`;
          if (Object.keys(meta).length) {
            log += `\n${chalk.gray(JSON.stringify(meta, null, 2))}`;
          }
          
          return log;
        })
      )
    }),

    // Rotating file transport (production)
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'http'
    })
  ],
  defaultMeta: {
    service: 'scraper-queue',
    hostname: os.hostname(),
    pid: process.pid
  }
});

// process.on('uncaughtException', (error) => {
//   logger.error('Uncaught Exception', error);
//   process.exit(1);
// });

// process.on('unhandledRejection', (reason) => {
//   logger.error('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)));
// });

export default {
  error: (message: string, meta?: Record<string, unknown>) => logger.error(message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => logger.warn(message, meta),
  info: (message: string, meta?: Record<string, unknown>) => logger.info(message, meta),
  http: (message: string, meta?: Record<string, unknown>) => logger.http(message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => logger.debug(message, meta),

  // Specialized loggers
  request: (req: { method: string; url: string; ip?: string }) => 
    logger.http(`Request: ${req.method} ${req.url}`, { ip: req.ip }),
  
  database: (query: string, durationMs: number) => 
    logger.debug(`DB Query executed`, { query, durationMs }),
  
  startup: (port: number | string) => 
    logger.info(`Server running on port http://localhost:${port}`)
};
