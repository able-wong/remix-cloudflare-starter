/**
 * Enterprise Logger for Remix + Cloudflare + New Relic
 *
 * Provides structured JSON logging with automatic serialization of complex objects.
 *
 * USAGE EXAMPLES:
 *
 * Context-aware logging (primary pattern for routes):
 *   import { createContextLogger } from '~/utils/logger';
 *
 *   export async function loader({ context }: LoaderFunctionArgs) {
 *     const logger = createContextLogger(context);
 *     logger.info('Processing request', {
 *       userId: '123',
 *       timestamp: new Date(),
 *       error: new Error('Something went wrong'),
 *       metadata: { nested: 'object' }
 *     });
 *   }
 *
 * Service with dependency injection:
 *   class MyService {
 *     constructor(private logger = LoggerFactory.createLogger({ service: 'my-service' })) {}
 *   }
 *
 * Testing:
 *   const mockLogger: Logger = {
 *     error: jest.fn(), warn: jest.fn(),
 *     info: jest.fn(), debug: jest.fn(),
 *   };
 */
import pino from 'pino';
import { getClientEnv } from './env';

type CloudflareContext = {
  cloudflare?: {
    env?: Partial<Record<string, string>>;
  };
  env?: Partial<Record<string, string>>;
};

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogValue =
  | string
  | number
  | boolean
  | undefined
  | Date
  | Error
  | object
  | unknown[];
export type LogContext = Record<string, LogValue>;

export interface Logger {
  error: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  debug: (message: string, context?: LogContext) => void;
}

export interface LoggerConfig {
  level?: LogLevel;
  service?: string;
  environment?: string;
  enableNewRelicFormat?: boolean;
}

export class LoggerFactory {
  private static getLogLevel(config?: LoggerConfig): LogLevel {
    if (config?.level) return config.level;
    return typeof process !== 'undefined' &&
      process.env.NODE_ENV === 'production'
      ? 'warn'
      : 'debug';
  }

  private static getEnvironment(config?: LoggerConfig): string {
    if (config?.environment) return config.environment;
    return typeof process !== 'undefined' &&
      process.env.NODE_ENV === 'production'
      ? 'production'
      : 'development';
  }

  static createLogger(config?: LoggerConfig): Logger {
    const level = this.getLogLevel(config);
    const environment = this.getEnvironment(config);
    const service = config?.service || 'remix-app';
    const enableNewRelicFormat = config?.enableNewRelicFormat ?? true;

    const serialize = (
      context: LogContext,
    ): Record<string, string | number | boolean> => {
      const serialized: Record<string, string | number | boolean> = {};
      for (const [key, value] of Object.entries(context)) {
        if (value === undefined) {
          continue;
        } else if (value instanceof Error) {
          serialized[key] = value.message;
        } else if (value instanceof Date) {
          serialized[key] = value.toISOString();
        } else if (typeof value === 'object' || Array.isArray(value)) {
          serialized[key] = JSON.stringify(value);
        } else {
          serialized[key] = value;
        }
      }
      return serialized;
    };

    const pinoLogger = pino({
      level,
      ...(enableNewRelicFormat && {
        formatters: {
          level: (label) => ({ level: label }),
          log: (object) => ({
            ...object,
            timestamp: new Date().toISOString(),
            service,
            environment,
          }),
        },
      }),
      browser: { asObject: true },
      serializers: {
        error: pino.stdSerializers.err,
        request: pino.stdSerializers.req,
        response: pino.stdSerializers.res,
      },
    });

    // Return adapter that matches our Logger interface
    return {
      error: (message: string, context?: LogContext) => {
        pinoLogger.error(context ? serialize(context) : {}, message);
      },
      warn: (message: string, context?: LogContext) => {
        pinoLogger.warn(context ? serialize(context) : {}, message);
      },
      info: (message: string, context?: LogContext) => {
        pinoLogger.info(context ? serialize(context) : {}, message);
      },
      debug: (message: string, context?: LogContext) => {
        pinoLogger.debug(context ? serialize(context) : {}, message);
      },
    };
  }

  static createTestLogger(): Logger {
    return {
      error: () => {},
      warn: () => {},
      info: () => {},
      debug: () => {},
    };
  }

  // Create a console logger for development debugging
  static createConsoleLogger(config?: LoggerConfig): Logger {
    const level = this.getLogLevel(config);
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevelNum = levels[level];

    const shouldLog = (logLevel: LogLevel) =>
      levels[logLevel] >= currentLevelNum;

    const serialize = (
      context: LogContext,
    ): Record<string, string | number | boolean> => {
      const serialized: Record<string, string | number | boolean> = {};
      for (const [key, value] of Object.entries(context)) {
        if (value === undefined) {
          continue;
        } else if (value instanceof Error) {
          serialized[key] = value.message;
        } else if (value instanceof Date) {
          serialized[key] = value.toISOString();
        } else if (typeof value === 'object' || Array.isArray(value)) {
          serialized[key] = JSON.stringify(value);
        } else {
          serialized[key] = value;
        }
      }
      return serialized;
    };

    return {
      error: (message: string, context?: LogContext) => {
        if (shouldLog('error')) {
          console.error(
            `[ERROR] ${message}`,
            context ? serialize(context) : {},
          );
        }
      },
      warn: (message: string, context?: LogContext) => {
        if (shouldLog('warn')) {
          console.warn(`[WARN] ${message}`, context ? serialize(context) : {});
        }
      },
      info: (message: string, context?: LogContext) => {
        if (shouldLog('info')) {
          console.info(`[INFO] ${message}`, context ? serialize(context) : {});
        }
      },
      debug: (message: string, context?: LogContext) => {
        if (shouldLog('debug')) {
          console.debug(
            `[DEBUG] ${message}`,
            context ? serialize(context) : {},
          );
        }
      },
    };
  }
}

/**
 * Create a context-aware logger that uses environment variables.
 * Use this in Remix loaders/actions where you have access to context.
 */
export function createContextLogger(
  context: CloudflareContext,
  config?: Omit<LoggerConfig, 'service'>,
): Logger {
  try {
    const env = getClientEnv(context);
    return LoggerFactory.createLogger({
      service: env.APP_NAME,
      ...config,
    });
  } catch {
    return LoggerFactory.createLogger({
      service: 'remix-cloudflare-app',
      ...config,
    });
  }
}
