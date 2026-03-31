import winston from "winston";
import path from "path"


const levels = {
  error: 0, warn: 1, info: 2, http: 3, debug: 4
};

const colors = {
  error: 'red', warn: 'yellow', info: 'green', http: 'magenta', debug: 'white'
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
);

const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  format
);

const transports = [
  new winston.transports.Console({ format: consoleFormat }),
  new winston.transports.File({
    filename: path.join('logs', 'error.log'),
    level: 'error',
    format
  }),
  new winston.transports.File({
    filename: path.join('logs', 'combined.log'),
    format
  })
];

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  levels,
  transports
});

export default logger;
