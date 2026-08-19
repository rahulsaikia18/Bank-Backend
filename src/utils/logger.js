const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");

const NODE_ENV = process.env.NODE_ENV || "development";
const isDev = NODE_ENV === "development";

// ─── Custom log format ──────────────────────────────────────────────────────
const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : "";
    return `${timestamp}  ${level}  ${stack || message}${metaStr}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

// ─── Transports ─────────────────────────────────────────────────────────────

const transports = [];

// Always log to console
transports.push(
  new winston.transports.Console({
    format: isDev ? devFormat : prodFormat,
  })
);

// In production rotate daily log files
if (!isDev) {
  transports.push(
    new DailyRotateFile({
      filename: path.join("logs", "app-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      format: prodFormat,
      level: "info",
    })
  );

  transports.push(
    new DailyRotateFile({
      filename: path.join("logs", "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "30d",
      format: prodFormat,
      level: "error",
    })
  );
}

// ─── Logger instance ─────────────────────────────────────────────────────────

const logger = winston.createLogger({
  level: isDev ? "debug" : "info",
  transports,
  // Do not exit on uncaught errors in the logger itself
  exitOnError: false,
});

module.exports = logger;
