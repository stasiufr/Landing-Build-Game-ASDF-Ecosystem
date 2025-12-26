import app from './app.js';
import config from './config/index.js';
import logger from './utils/logger.js';

const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(`ASDF Skills API started`, {
    port: PORT,
    environment: config.nodeEnv,
    apiPrefix: config.apiPrefix,
  });

  if (config.isDevelopment) {
    logger.info(`API available at http://localhost:${PORT}${config.apiPrefix}`);
    logger.info(`Health check at http://localhost:${PORT}/health`);
  }
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully...`);

  server.close((err) => {
    if (err) {
      logger.error('Error during shutdown', { error: err.message });
      process.exit(1);
    }

    logger.info('Server closed successfully');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    promise: String(promise),
  });
});

export default server;
