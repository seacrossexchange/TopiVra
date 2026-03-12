import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, context, stack }) => {
    const ctx = context ? ` [${context}]` : '';
    const stackTrace = stack ? `\n${stack}` : '';
    return `${timestamp} [${level}]${ctx} ${message}${stackTrace}`;
  }),
);

export const loggerConfig = {
  transports: [
    // 控制台输出（开发环境彩色输出）
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // 应用日志文件轮转
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    }),
    // 错误日志单独文件
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
    }),
  ],
};

export const winstonLoggerOptions = {
  transports: loggerConfig.transports,
};
