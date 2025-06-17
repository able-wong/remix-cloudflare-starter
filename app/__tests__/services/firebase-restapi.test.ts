import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  FirebaseRestApi,
  createFirebaseRestApi,
} from '../../services/firebase-restapi';
import type { Logger } from '../../utils/logger';

describe('FirebaseRestApi', () => {
  const mockConfig = {
    apiKey: 'test-api-key',
    projectId: 'test-project-id',
  };

  const mockLogger: Logger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };

  const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

  let api: FirebaseRestApi;

  beforeEach(() => {
    jest.clearAllMocks();
    api = new FirebaseRestApi(mockConfig, mockFetch, mockLogger);
  });

  describe('verifyIdToken', () => {
    it('should verify ID token successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          users: [{ localId: 'test-user-id' }],
        }),
      } as Response;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await api.verifyIdToken('test-token');

      expect(result).toEqual({ uid: 'test-user-id' });
      expect(mockFetch).toHaveBeenCalledWith(
        `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${mockConfig.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ idToken: 'test-token' }),
        },
      );
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should throw error when token verification fails', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: { message: 'Invalid token' },
        }),
      } as Response;
      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(api.verifyIdToken('invalid-token')).rejects.toThrow(
        'Failed to verify ID token',
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Firebase token verification failed',
        {
          status: 401,
          statusText: 'Unauthorized',
          responseData: JSON.stringify({ error: { message: 'Invalid token' } }),
          action: 'verify_token',
        },
      );
    });

    it('should throw error when no user is found', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          users: [],
        }),
      } as Response;
      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(api.verifyIdToken('test-token')).rejects.toThrow(
        'No user found for the provided token',
      );
    });
  });

  describe('constructor validation', () => {
    it('should throw error when config is null', () => {
      // @ts-expect-error Testing with null config
      expect(() => new FirebaseRestApi(null)).toThrow(
        'Firebase configuration is required. Please ensure FIREBASE_CONFIG and FIREBASE_PROJECT_ID environment variables are set.',
      );
    });

    it('should throw error when config is undefined', () => {
      // @ts-expect-error Testing with undefined config
      expect(() => new FirebaseRestApi(undefined)).toThrow(
        'Firebase configuration is required. Please ensure FIREBASE_CONFIG and FIREBASE_PROJECT_ID environment variables are set.',
      );
    });

    it('should throw error when apiKey is missing', () => {
      const incompleteConfig = {
        projectId: 'test-project-id',
      };

      // @ts-expect-error Testing with incomplete config
      expect(() => new FirebaseRestApi(incompleteConfig)).toThrow(
        'Firebase configuration is incomplete. Both apiKey and projectId are required.',
      );
    });

    it('should throw error when projectId is missing', () => {
      const incompleteConfig = {
        apiKey: 'test-api-key',
      };

      // @ts-expect-error Testing with incomplete config
      expect(() => new FirebaseRestApi(incompleteConfig)).toThrow(
        'Firebase configuration is incomplete. Both apiKey and projectId are required.',
      );
    });

    it('should throw error when both apiKey and projectId are missing', () => {
      const incompleteConfig = {};

      // @ts-expect-error Testing with incomplete config
      expect(() => new FirebaseRestApi(incompleteConfig)).toThrow(
        'Firebase configuration is incomplete. Both apiKey and projectId are required.',
      );
    });
  });

  describe('createFirebaseRestApi', () => {
    it('should create FirebaseRestApi instance successfully with valid environment', () => {
      const serverEnv = {
        FIREBASE_CONFIG: JSON.stringify({ apiKey: 'test-api-key' }),
        FIREBASE_PROJECT_ID: 'test-project-id',
      };

      const api = createFirebaseRestApi(serverEnv, mockFetch, mockLogger);

      expect(api).toBeInstanceOf(FirebaseRestApi);
    });

    it('should throw error when FIREBASE_CONFIG is missing', () => {
      const serverEnv = {
        FIREBASE_PROJECT_ID: 'test-project-id',
      };

      expect(() => createFirebaseRestApi(serverEnv)).toThrow(
        'FIREBASE_CONFIG environment variable is not set. Please ensure it is configured for Firebase functionality.',
      );
    });

    it('should throw error when FIREBASE_PROJECT_ID is missing', () => {
      const serverEnv = {
        FIREBASE_CONFIG: JSON.stringify({ apiKey: 'test-api-key' }),
      };

      expect(() => createFirebaseRestApi(serverEnv)).toThrow(
        'FIREBASE_PROJECT_ID environment variable is not set. Please ensure it is configured for Firebase functionality.',
      );
    });

    it('should throw error when FIREBASE_CONFIG contains invalid JSON', () => {
      const serverEnv = {
        FIREBASE_CONFIG: 'invalid-json',
        FIREBASE_PROJECT_ID: 'test-project-id',
      };

      expect(() => createFirebaseRestApi(serverEnv)).toThrow(
        'FIREBASE_CONFIG environment variable contains invalid JSON. Please ensure it is properly formatted.',
      );
    });

    it('should throw error when FIREBASE_CONFIG is missing apiKey', () => {
      const serverEnv = {
        FIREBASE_CONFIG: JSON.stringify({ someOtherKey: 'value' }),
        FIREBASE_PROJECT_ID: 'test-project-id',
      };

      expect(() => createFirebaseRestApi(serverEnv)).toThrow(
        'FIREBASE_CONFIG is missing required apiKey property.',
      );
    });

    it('should handle undefined environment variables', () => {
      const serverEnv = {
        FIREBASE_CONFIG: undefined,
        FIREBASE_PROJECT_ID: undefined,
      };

      expect(() => createFirebaseRestApi(serverEnv)).toThrow(
        'FIREBASE_CONFIG environment variable is not set. Please ensure it is configured for Firebase functionality.',
      );
    });
  });
});
