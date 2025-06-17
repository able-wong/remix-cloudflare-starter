/**
 * Enterprise Logger for Remix + Cloudflare + New Relic
 *
 * This logger provides structured JSON logging optimized for New Relic ingestion
 * and Cloudflare Workers environment. Uses pino for high performance.
 *
 * USAGE EXAMPLES:
 *
 * 1. Context-aware logger (PRIMARY PATTERN for routes):
 *    import { createContextLogger } from '~/utils/logger';
 *
 *    export async function loader({ context }: LoaderFunctionArgs) {
 *      const logger = createContextLogger(context);
 *      logger.info('Processing request', { userId: '123' });
 *      return json({});
 *    }
 *
 * 2. Service with dependency injection:
 *    import { LoggerFactory, type Logger } from '~/utils/logger';
 *
 *    class MyService {
 *      constructor(private logger?: Logger) {
 *        this.logger = logger || LoggerFactory.createLogger({
 *          service: 'my-service',
 *          level: 'info'
 *        });
 *      }
 *    }
 *
 * 3. Testing:
 *    const mockLogger: Logger = {
 *      error: jest.fn(), warn: jest.fn(),
 *      info: jest.fn(), debug: jest.fn(),
 *    };
 *    const service = new MyService(mockLogger);
 *
 * 4. Environment-specific config:
 *    const logger = LoggerFactory.createLogger({
 *      service: 'api-service',
 *      level: 'debug',
 *      environment: 'development',
 *      enableNewRelicFormat: false
 *    });
 */
import pino from 'pino';
import { getClientEnv } from './env';

// Import CloudflareContext type
type CloudflareContext = {
  cloudflare?: {
    env?: Partial<Record<string, string>>;
  };
  env?: Partial<Record<string, string>>;
};

// Common types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = Record<string, string | number | boolean | undefined>;

// Standard logger interface that all services should expect
export interface Logger {
  error: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  debug: (message: string, context?: LogContext) => void;
}

// Configuration interface for the logger factory
export interface LoggerConfig {
  level?: LogLevel;
  service?: string;
  environment?: string;
  enableNewRelicFormat?: boolean;
}

// Factory class for creating logger instances
export class LoggerFactory {
  private static getLogLevel(config?: LoggerConfig): LogLevel {
    if (config?.level) {
      return config.level;
    }

    // Default environment-aware log levels
    if (
      typeof process !== 'undefined' &&
      process.env.NODE_ENV === 'production'
    ) {
      return 'warn';
    }
    return 'debug';
  }

  private static getEnvironment(config?: LoggerConfig): string {
    if (config?.environment) {
      return config.environment;
    }

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

    const pinoLogger = pino({
      level,
      // Conditional New Relic formatting
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
      // Optimize for Cloudflare Workers environment
      browser: {
        asObject: true,
      },
      // Custom serializers for common objects
      serializers: {
        error: pino.stdSerializers.err,
        request: pino.stdSerializers.req,
        response: pino.stdSerializers.res,
      },
    });

    // Return adapter that matches our Logger interface
    return {
      error: (message: string, context?: LogContext) => {
        pinoLogger.error(context || {}, message);
      },
      warn: (message: string, context?: LogContext) => {
        pinoLogger.warn(context || {}, message);
      },
      info: (message: string, context?: LogContext) => {
        pinoLogger.info(context || {}, message);
      },
      debug: (message: string, context?: LogContext) => {
        pinoLogger.debug(context || {}, message);
      },
    };
  }

  // Create a test logger that's easy to mock
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

    return {
      error: (message: string, context?: LogContext) => {
        if (shouldLog('error')) {
          console.error(`[ERROR] ${message}`, context || {});
        }
      },
      warn: (message: string, context?: LogContext) => {
        if (shouldLog('warn')) {
          console.warn(`[WARN] ${message}`, context || {});
        }
      },
      info: (message: string, context?: LogContext) => {
        if (shouldLog('info')) {
          console.info(`[INFO] ${message}`, context || {});
        }
      },
      debug: (message: string, context?: LogContext) => {
        if (shouldLog('debug')) {
          console.debug(`[DEBUG] ${message}`, context || {});
        }
      },
    };
  }
}

/**
 * Create a context-aware logger that uses environment variables
 * Use this in Remix loaders/actions where you have access to context
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
    // Fallback if context is not available or env fails
    return LoggerFactory.createLogger({
      service: 'remix-cloudflare-app',
      ...config,
    });
  }
}

/**
 * EXPORTS:
 *
 * - LoggerFactory: Create custom logger instances
 * - createContextLogger: Create logger using environment context (PRIMARY METHOD for routes)
 * - Logger interface: For TypeScript typing and dependency injection
 * - LoggerConfig interface: For configuring logger instances
 *
 * BEST PRACTICES:
 *
 * ✅ DO: Use createContextLogger(context) in loaders/actions (primary pattern)
 * ✅ DO: Use dependency injection in services with LoggerFactory
 * ✅ DO: Use structured logging with context objects
 * ✅ DO: Mock Logger interface in tests
 *
 * ❌ DON'T: Create global/default loggers (breaks request isolation)
 * ❌ DON'T: Log sensitive data (passwords, tokens, etc.)
 * ❌ DON'T: Use console.log directly in production code
 */
