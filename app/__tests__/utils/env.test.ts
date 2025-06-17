import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { getClientEnv, getServerEnv } from '~/utils/env';
import type { FirebaseConfig } from '~/interfaces/firebaseInterface';

describe('env.ts', () => {
  // Mock Firebase config for testing
  const mockFirebaseConfig: FirebaseConfig = {
    apiKey: 'test-api-key',
    authDomain: 'test-project.firebaseapp.com',
    projectId: 'test-project',
    storageBucket: 'test-project.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:test-app-id',
  };

  const mockFirebaseConfigString = JSON.stringify(mockFirebaseConfig);
  const mockProjectId = 'test-project-id';

  // Store original process.env to restore after tests
  const originalProcessEnv = process.env;

  beforeEach(() => {
    // Clear environment variables before each test
    process.env = {};
  });

  afterAll(() => {
    // Restore original process.env
    process.env = originalProcessEnv;
  });

  describe('getClientEnv', () => {
    it('should return parsed Firebase config from Cloudflare Pages production environment', () => {
      const context = {
        cloudflare: {
          env: {
            FIREBASE_CONFIG: mockFirebaseConfigString,
          },
        },
      };

      const result = getClientEnv(context);

      expect(result).toEqual({
        FIREBASE_CONFIG: mockFirebaseConfig,
        APP_NAME: 'remix-cloudflare-app',
      });
    });

    it('should return parsed Firebase config from Wrangler development environment', () => {
      const context = {
        env: {
          FIREBASE_CONFIG: mockFirebaseConfigString,
        },
      };

      const result = getClientEnv(context);

      expect(result).toEqual({
        FIREBASE_CONFIG: mockFirebaseConfig,
        APP_NAME: 'remix-cloudflare-app',
      });
    });

    it('should return parsed Firebase config from Vite development environment (process.env)', () => {
      process.env.FIREBASE_CONFIG = mockFirebaseConfigString;
      const context = {};

      const result = getClientEnv(context);

      expect(result).toEqual({
        FIREBASE_CONFIG: mockFirebaseConfig,
        APP_NAME: 'remix-cloudflare-app',
      });
    });

    it('should prioritize Cloudflare Pages environment over Wrangler', () => {
      const context = {
        cloudflare: {
          env: {
            FIREBASE_CONFIG: mockFirebaseConfigString,
          },
        },
        env: {
          FIREBASE_CONFIG: JSON.stringify({ apiKey: 'wrong-key' }),
        },
      };

      const result = getClientEnv(context);

      expect(result).toEqual({
        APP_NAME: 'remix-cloudflare-app',
        FIREBASE_CONFIG: mockFirebaseConfig,
      });
    });

    it('should prioritize Wrangler environment over process.env', () => {
      process.env.FIREBASE_CONFIG = JSON.stringify({ apiKey: 'wrong-key' });
      const context = {
        env: {
          FIREBASE_CONFIG: mockFirebaseConfigString,
        },
      };

      const result = getClientEnv(context);

      expect(result).toEqual({
        APP_NAME: 'remix-cloudflare-app',
        FIREBASE_CONFIG: mockFirebaseConfig,
      });
    });

    it('should throw error when FIREBASE_CONFIG is not set', () => {
      const context = {};

      expect(() => getClientEnv(context)).toThrow(
        'FIREBASE_CONFIG environment variable is not set. Please ensure it is configured in your environment.',
      );
    });

    it('should throw error when FIREBASE_CONFIG contains invalid JSON', () => {
      const context = {
        env: {
          FIREBASE_CONFIG: 'invalid-json',
        },
      };

      expect(() => getClientEnv(context)).toThrow(
        'FIREBASE_CONFIG environment variable contains invalid JSON. Please ensure it is properly formatted.',
      );
    });

    it('should handle empty context object', () => {
      const context = {};

      expect(() => getClientEnv(context)).toThrow(
        'FIREBASE_CONFIG environment variable is not set. Please ensure it is configured in your environment.',
      );
    });

    it('should handle undefined context', () => {
      // @ts-expect-error Testing with undefined context
      expect(() => getClientEnv(undefined)).toThrow(
        'FIREBASE_CONFIG environment variable is not set. Please ensure it is configured in your environment.',
      );
    });
  });

  describe('getServerEnv', () => {
    it('should return all environment variables from Cloudflare Pages production environment', () => {
      const context = {
        cloudflare: {
          env: {
            FIREBASE_CONFIG: mockFirebaseConfigString,
            FIREBASE_PROJECT_ID: mockProjectId,
          },
        },
      };

      const result = getServerEnv(context);

      expect(result).toEqual({
        FIREBASE_CONFIG: mockFirebaseConfigString,
        FIREBASE_PROJECT_ID: mockProjectId,
      });
    });

    it('should return all environment variables from Wrangler development environment', () => {
      const context = {
        env: {
          FIREBASE_CONFIG: mockFirebaseConfigString,
          FIREBASE_PROJECT_ID: mockProjectId,
        },
      };

      const result = getServerEnv(context);

      expect(result).toEqual({
        FIREBASE_CONFIG: mockFirebaseConfigString,
        FIREBASE_PROJECT_ID: mockProjectId,
      });
    });

    it('should return all environment variables from Vite development environment (process.env)', () => {
      process.env.FIREBASE_CONFIG = mockFirebaseConfigString;
      process.env.FIREBASE_PROJECT_ID = mockProjectId;
      const context = {};

      const result = getServerEnv(context);

      expect(result).toEqual({
        FIREBASE_CONFIG: mockFirebaseConfigString,
        FIREBASE_PROJECT_ID: mockProjectId,
      });
    });

    it('should prioritize Cloudflare Pages environment over Wrangler', () => {
      const context = {
        cloudflare: {
          env: {
            FIREBASE_CONFIG: mockFirebaseConfigString,
            FIREBASE_PROJECT_ID: mockProjectId,
          },
        },
        env: {
          FIREBASE_CONFIG: 'wrong-config',
          FIREBASE_PROJECT_ID: 'wrong-project-id',
        },
      };

      const result = getServerEnv(context);

      expect(result).toEqual({
        FIREBASE_CONFIG: mockFirebaseConfigString,
        FIREBASE_PROJECT_ID: mockProjectId,
      });
    });

    it('should prioritize Wrangler environment over process.env', () => {
      process.env.FIREBASE_CONFIG = 'wrong-config';
      process.env.FIREBASE_PROJECT_ID = 'wrong-project-id';
      const context = {
        env: {
          FIREBASE_CONFIG: mockFirebaseConfigString,
          FIREBASE_PROJECT_ID: mockProjectId,
        },
      };

      const result = getServerEnv(context);

      expect(result).toEqual({
        FIREBASE_CONFIG: mockFirebaseConfigString,
        FIREBASE_PROJECT_ID: mockProjectId,
      });
    });

    it('should throw error when FIREBASE_CONFIG is missing', () => {
      const context = {
        env: {
          FIREBASE_PROJECT_ID: mockProjectId,
        },
      };

      expect(() => getServerEnv(context)).toThrow(
        'Missing required environment variables: FIREBASE_CONFIG. Please ensure they are configured in your environment.',
      );
    });

    it('should throw error when FIREBASE_PROJECT_ID is missing', () => {
      const context = {
        env: {
          FIREBASE_CONFIG: mockFirebaseConfigString,
        },
      };

      expect(() => getServerEnv(context)).toThrow(
        'Missing required environment variables: FIREBASE_PROJECT_ID. Please ensure they are configured in your environment.',
      );
    });

    it('should throw error when both required variables are missing', () => {
      const context = {};

      expect(() => getServerEnv(context)).toThrow(
        'Missing required environment variables: FIREBASE_CONFIG, FIREBASE_PROJECT_ID. Please ensure they are configured in your environment.',
      );
    });

    it('should handle empty context object', () => {
      const context = {};

      expect(() => getServerEnv(context)).toThrow(
        'Missing required environment variables: FIREBASE_CONFIG, FIREBASE_PROJECT_ID. Please ensure they are configured in your environment.',
      );
    });

    it('should handle undefined context', () => {
      // @ts-expect-error Testing with undefined context
      expect(() => getServerEnv(undefined)).toThrow(
        'Missing required environment variables: FIREBASE_CONFIG, FIREBASE_PROJECT_ID. Please ensure they are configured in your environment.',
      );
    });

    it('should handle mixed environment sources', () => {
      process.env.FIREBASE_CONFIG = mockFirebaseConfigString;
      const context = {
        env: {
          FIREBASE_PROJECT_ID: mockProjectId,
        },
      };

      const result = getServerEnv(context);

      expect(result).toEqual({
        FIREBASE_CONFIG: mockFirebaseConfigString,
        FIREBASE_PROJECT_ID: mockProjectId,
      });
    });
  });

  describe('Environment variable priority', () => {
    it('should follow correct priority order for client env', () => {
      process.env.FIREBASE_CONFIG = JSON.stringify({ apiKey: 'process-env' });

      const context = {
        cloudflare: {
          env: {
            FIREBASE_CONFIG: JSON.stringify({ apiKey: 'cloudflare-pages' }),
          },
        },
        env: {
          FIREBASE_CONFIG: JSON.stringify({ apiKey: 'wrangler' }),
        },
      };

      const result = getClientEnv(context);

      expect(result.FIREBASE_CONFIG.apiKey).toBe('cloudflare-pages');
    });

    it('should follow correct priority order for server env', () => {
      process.env.FIREBASE_CONFIG = JSON.stringify({ apiKey: 'process-env' });
      process.env.FIREBASE_PROJECT_ID = 'process-env-project';

      const context = {
        cloudflare: {
          env: {
            FIREBASE_CONFIG: JSON.stringify({ apiKey: 'cloudflare-pages' }),
            FIREBASE_PROJECT_ID: 'cloudflare-pages-project',
          },
        },
        env: {
          FIREBASE_CONFIG: JSON.stringify({ apiKey: 'wrangler' }),
          FIREBASE_PROJECT_ID: 'wrangler-project',
        },
      };

      const result = getServerEnv(context);

      expect(JSON.parse(result.FIREBASE_CONFIG).apiKey).toBe(
        'cloudflare-pages',
      );
      expect(result.FIREBASE_PROJECT_ID).toBe('cloudflare-pages-project');
    });
  });
});
