import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';

// Mock pino module
const mockPinoLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

jest.mock('pino', () => {
  const mockPino = jest.fn(() => mockPinoLogger);
  (
    mockPino as typeof mockPino & { stdSerializers: Record<string, jest.Mock> }
  ).stdSerializers = {
    err: jest.fn(),
    req: jest.fn(),
    res: jest.fn(),
  };
  return mockPino;
});

// Mock env module
jest.mock('../../../utils/env', () => ({
  getClientEnv: jest.fn(() => ({ APP_NAME: 'test-app' })),
}));

import {
  LoggerFactory,
  createContextLogger,
  type LogContext,
} from '../../../utils/logger';
import { getClientEnv } from '../../../utils/env';

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LoggerFactory.createLogger', () => {
    it('should serialize primitive values correctly', () => {
      const logger = LoggerFactory.createLogger();
      const context: LogContext = {
        string: 'test',
        number: 42,
        boolean: true,
        undefined: undefined,
      };

      logger.info('Test message', context);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        {
          string: 'test',
          number: 42,
          boolean: true,
        },
        'Test message',
      );
    });

    it('should serialize Error objects to message strings', () => {
      const logger = LoggerFactory.createLogger();
      const error = new Error('Something went wrong');
      const context: LogContext = {
        error,
        message: 'Additional context',
      };

      logger.error('Error occurred', context);

      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        {
          error: 'Something went wrong',
          message: 'Additional context',
        },
        'Error occurred',
      );
    });

    it('should serialize Date objects to ISO strings', () => {
      const logger = LoggerFactory.createLogger();
      const date = new Date('2023-01-01T12:00:00Z');
      const context: LogContext = {
        timestamp: date,
        event: 'user_login',
      };

      logger.info('User action', context);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        {
          timestamp: '2023-01-01T12:00:00.000Z',
          event: 'user_login',
        },
        'User action',
      );
    });

    it('should serialize objects using JSON.stringify', () => {
      const logger = LoggerFactory.createLogger();
      const metadata = { userId: 123, preferences: { theme: 'dark' } };
      const context: LogContext = {
        metadata,
        action: 'update_preferences',
      };

      logger.info('User updated preferences', context);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        {
          metadata: JSON.stringify(metadata),
          action: 'update_preferences',
        },
        'User updated preferences',
      );
    });

    it('should serialize arrays using JSON.stringify', () => {
      const logger = LoggerFactory.createLogger();
      const tags = ['important', 'urgent', 'user-facing'];
      const context: LogContext = {
        tags,
        count: tags.length,
      };

      logger.warn('Multiple issues found', context);

      expect(mockPinoLogger.warn).toHaveBeenCalledWith(
        {
          tags: JSON.stringify(tags),
          count: 3,
        },
        'Multiple issues found',
      );
    });

    it('should handle mixed complex types in context', () => {
      const logger = LoggerFactory.createLogger();
      const error = new Error('Database connection failed');
      const timestamp = new Date('2023-06-17T10:30:00Z');
      const metadata = { retryCount: 3, lastAttempt: '2023-06-17T10:29:55Z' };
      const tags = ['database', 'connection', 'retry'];

      const context: LogContext = {
        error,
        timestamp,
        metadata,
        tags,
        userId: 'user123',
        success: false,
        undefined: undefined,
      };

      logger.error('Database operation failed', context);

      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        {
          error: 'Database connection failed',
          timestamp: '2023-06-17T10:30:00.000Z',
          metadata: JSON.stringify(metadata),
          tags: JSON.stringify(tags),
          userId: 'user123',
          success: false,
        },
        'Database operation failed',
      );
    });

    it('should handle empty context', () => {
      const logger = LoggerFactory.createLogger();

      logger.debug('Simple message');

      expect(mockPinoLogger.debug).toHaveBeenCalledWith({}, 'Simple message');
    });

    it('should skip undefined values in serialization', () => {
      const logger = LoggerFactory.createLogger();
      const context: LogContext = {
        defined: 'value',
        undefined: undefined,
        empty: '',
      };

      logger.info('Mixed values', context);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        {
          defined: 'value',
          empty: '',
        },
        'Mixed values',
      );
    });
  });

  describe('LoggerFactory.createConsoleLogger', () => {
    let consoleSpy: {
      error: ReturnType<typeof jest.spyOn>;
      warn: ReturnType<typeof jest.spyOn>;
      info: ReturnType<typeof jest.spyOn>;
      debug: ReturnType<typeof jest.spyOn>;
    };

    beforeEach(() => {
      consoleSpy = {
        error: jest.spyOn(console, 'error').mockImplementation(() => {}),
        warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
        info: jest.spyOn(console, 'info').mockImplementation(() => {}),
        debug: jest.spyOn(console, 'debug').mockImplementation(() => {}),
      };
    });

    afterEach(() => {
      Object.values(consoleSpy).forEach((spy) => spy.mockRestore());
    });

    it('should serialize complex objects in console logger', () => {
      const logger = LoggerFactory.createConsoleLogger({ level: 'debug' });
      const error = new Error('Test error');
      const date = new Date('2023-01-01T00:00:00Z');
      const obj = { nested: { value: 42 } };

      const context: LogContext = {
        error,
        date,
        obj,
        simple: 'string',
      };

      logger.info('Console test', context);

      expect(consoleSpy.info).toHaveBeenCalledWith('[INFO] Console test', {
        error: 'Test error',
        date: '2023-01-01T00:00:00.000Z',
        obj: JSON.stringify(obj),
        simple: 'string',
      });
    });

    it('should respect log level filtering', () => {
      const logger = LoggerFactory.createConsoleLogger({ level: 'warn' });

      logger.debug('Debug message', { level: 'debug' });
      logger.info('Info message', { level: 'info' });
      logger.warn('Warn message', { level: 'warn' });
      logger.error('Error message', { level: 'error' });

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledWith('[WARN] Warn message', {
        level: 'warn',
      });
      expect(consoleSpy.error).toHaveBeenCalledWith('[ERROR] Error message', {
        level: 'error',
      });
    });
  });

  describe('createContextLogger', () => {
    it('should create logger with context-derived service name', () => {
      const context = {
        cloudflare: { env: { APP_NAME: 'my-app' } },
      };

      const logger = createContextLogger(context);

      // Verify logger was created (we can't easily test the internal service name without exposing it)
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should handle context errors gracefully', () => {
      // Mock getClientEnv to throw an error
      const mockGetClientEnv = jest.mocked(getClientEnv);
      mockGetClientEnv.mockImplementation(() => {
        throw new Error('Environment error');
      });

      const context = {};
      const logger = createContextLogger(context);

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });
  });

  describe('LoggerFactory.createTestLogger', () => {
    it('should create a test logger with no-op functions', () => {
      const logger = LoggerFactory.createTestLogger();

      // Should not throw when called
      expect(() => {
        logger.error('test');
        logger.warn('test');
        logger.info('test');
        logger.debug('test');
      }).not.toThrow();
    });
  });

  describe('Type safety', () => {
    it('should accept all valid LogValue types in context', () => {
      const logger = LoggerFactory.createLogger();

      // This test is primarily for TypeScript compilation
      const context: LogContext = {
        string: 'text',
        number: 42,
        boolean: true,
        undefined: undefined,
        date: new Date(),
        error: new Error('test'),
        object: { key: 'value' },
        array: [1, 2, 3],
        unknownArray: ['mixed', 42, true] as unknown[],
      };

      // Should compile and run without errors
      expect(() => {
        logger.info('Type test', context);
      }).not.toThrow();
    });
  });
});
