import winston from 'winston';
import config from '../config/index.js';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Sensitive fields to redact from logs
const SENSITIVE_FIELDS = [
  'password',
  'secret',
  'privateKey',
  'private_key',
  'apiKey',
  'api_key',
  'token',
  'authorization',
  'signature',
  'cookie',
  'session',
];

/**
 * Redact sensitive data from log objects
 */
function redactSensitive(obj, depth = 0) {
  if (depth > 10) return '[MAX_DEPTH]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item, depth + 1));
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some((field) =>
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive && value) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      result[key] = redactSensitive(value, depth + 1);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Winston format to redact sensitive data
 */
const redactFormat = winston.format((info) => {
  // Redact all metadata except standard fields
  const { level, message, timestamp: ts, service, ...meta } = info;
  const redactedMeta = redactSensitive(meta);
  return { level, message, timestamp: ts, service, ...redactedMeta };
});

// Custom format for development
const devFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const redactedMeta = redactSensitive(meta);
  const metaStr = Object.keys(redactedMeta).length
    ? ` ${JSON.stringify(redactedMeta)}`
    : '';
  return `${ts} [${level}]: ${message}${metaStr}`;
});

// Create logger instance with sensitive data redaction
const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    redactFormat(),
    json()
  ),
  defaultMeta: { service: 'asdf-skills' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: config.isDevelopment
        ? combine(colorize(), timestamp({ format: 'HH:mm:ss' }), devFormat)
        : combine(timestamp(), redactFormat(), json()),
    }),
  ],
});

// Add file transports in production
if (config.isProduction) {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
}

// Helper methods
logger.logRequest = (req, duration) => {
  logger.info('Request completed', {
    method: req.method,
    path: req.path,
    status: req.res?.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
  });
};

logger.logError = (error, req = null) => {
  const errorInfo = {
    message: error.message,
    code: error.code,
    stack: config.isDevelopment ? error.stack : undefined,
  };

  if (req) {
    errorInfo.method = req.method;
    errorInfo.path = req.path;
  }

  logger.error('Error occurred', errorInfo);
};

export default logger;
