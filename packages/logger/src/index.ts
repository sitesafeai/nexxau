import pino from 'pino';

export interface LoggerConfig {
  service: string;
  environment?: string;
  version?: string;
  level?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  pretty?: boolean;
}

export interface LogContext {
  [key: string]: unknown;
  tenantId?: string;
  userId?: string;
  requestId?: string;
  correlationId?: string;
}

/**
 * Creates a structured JSON logger for microservices
 * 
 * All logs are output in JSON format for production compatibility
 * with log aggregation systems (ELK, Datadog, etc.)
 */
export function createLogger(config: LoggerConfig) {
  const {
    service,
    environment = process.env.NODE_ENV || 'development',
    version = process.env.SERVICE_VERSION || '1.0.0',
    level = (process.env.LOG_LEVEL as any) || 'info',
    pretty = environment === 'development',
  } = config;

  const logger = pino({
    level,
    base: {
      service,
      environment,
      version,
    },
    ...(pretty && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    }),
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err,
    },
    formatters: {
      level: (label: string) => {
        return { level: label.toUpperCase() };
      },
    },
  });

  return {
    /**
     * Log an error with context
     */
    error: (message: string, context?: LogContext, error?: Error) => {
      const logData: any = { msg: message, ...context };
      if (error) {
        logData.err = {
          message: error.message,
          stack: error.stack,
          name: error.name,
        };
      }
      logger.error(logData);
    },

    /**
     * Log a warning with context
     */
    warn: (message: string, context?: LogContext) => {
      logger.warn({ msg: message, ...context });
    },

    /**
     * Log informational message with context
     */
    info: (message: string, context?: LogContext) => {
      logger.info({ msg: message, ...context });
    },

    /**
     * Log debug message with context
     */
    debug: (message: string, context?: LogContext) => {
      logger.debug({ msg: message, ...context });
    },

    /**
     * Log trace message with context
     */
    trace: (message: string, context?: LogContext) => {
      logger.trace({ msg: message, ...context });
    },

    /**
     * Log fatal error (service should exit after)
     */
    fatal: (message: string, context?: LogContext, error?: Error) => {
      const logData: any = { msg: message, ...context };
      if (error) {
        logData.err = {
          message: error.message,
          stack: error.stack,
          name: error.name,
        };
      }
      logger.fatal(logData);
    },

    /**
     * Create a child logger with persistent context
     */
    child: (bindings: LogContext) => {
      return logger.child(bindings);
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
