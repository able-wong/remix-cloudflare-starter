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

  const mockIdToken = 'test-id-token';

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
    api = new FirebaseRestApi(mockConfig, mockIdToken, mockFetch, mockLogger);
  });

  describe('verifyAndSetIdToken', () => {
    it('should verify ID token successfully and set uid', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          users: [{ localId: 'test-user-id' }],
        }),
      } as Response;
      mockFetch.mockResolvedValueOnce(mockResponse);

      await api.verifyAndSetIdToken('test-token');

      expect(api.getUid()).toBe('test-user-id');
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

      await expect(api.verifyAndSetIdToken('invalid-token')).rejects.toThrow(
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

      await expect(api.verifyAndSetIdToken('test-token')).rejects.toThrow(
        'No user found for the provided token',
      );
    });
  });

  describe('validateIdToken', () => {
    it('should validate ID token successfully and store uid', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          users: [{ localId: 'test-user-id' }],
        }),
      } as Response;
      mockFetch.mockResolvedValueOnce(mockResponse);

      await api.validateIdToken();

      expect(api.getUid()).toBe('test-user-id');
      expect(mockFetch).toHaveBeenCalledWith(
        `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${mockConfig.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ idToken: mockIdToken }),
        },
      );
    });

    it('should throw error when token validation fails', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: { message: 'Invalid token' },
        }),
      } as Response;
      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(api.validateIdToken()).rejects.toThrow(
        'Failed to verify ID token',
      );
    });
  });

  describe('getUid', () => {
    it('should return uid after token validation', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          users: [{ localId: 'test-user-id' }],
        }),
      } as Response;
      mockFetch.mockResolvedValueOnce(mockResponse);

      await api.validateIdToken();
      const uid = api.getUid();

      expect(uid).toBe('test-user-id');
    });

    it('should throw error when called before token validation', () => {
      expect(() => api.getUid()).toThrow(
        'ID token has not been validated yet. Call validateIdToken() first.',
      );
    });
  });

  describe('constructor validation', () => {
    it('should throw error when config is null', () => {
      // @ts-expect-error Testing with null config
      expect(() => new FirebaseRestApi(null, mockIdToken)).toThrow(
        'Firebase configuration is required. Please ensure FIREBASE_CONFIG and FIREBASE_PROJECT_ID environment variables are set.',
      );
    });

    it('should throw error when config is undefined', () => {
      // @ts-expect-error Testing with undefined config
      expect(() => new FirebaseRestApi(undefined, mockIdToken)).toThrow(
        'Firebase configuration is required. Please ensure FIREBASE_CONFIG and FIREBASE_PROJECT_ID environment variables are set.',
      );
    });

    it('should throw error when apiKey is missing', () => {
      const incompleteConfig = {
        projectId: 'test-project-id',
      };

      // @ts-expect-error Testing with incomplete config
      expect(() => new FirebaseRestApi(incompleteConfig, mockIdToken)).toThrow(
        'Firebase configuration is incomplete. Both apiKey and projectId are required.',
      );
    });

    it('should throw error when projectId is missing', () => {
      const incompleteConfig = {
        apiKey: 'test-api-key',
      };

      // @ts-expect-error Testing with incomplete config
      expect(() => new FirebaseRestApi(incompleteConfig, mockIdToken)).toThrow(
        'Firebase configuration is incomplete. Both apiKey and projectId are required.',
      );
    });

    it('should throw error when both apiKey and projectId are missing', () => {
      const incompleteConfig = {};

      // @ts-expect-error Testing with incomplete config
      expect(() => new FirebaseRestApi(incompleteConfig, mockIdToken)).toThrow(
        'Firebase configuration is incomplete. Both apiKey and projectId are required.',
      );
    });

    it('should allow empty idToken for public access', () => {
      expect(() => new FirebaseRestApi(mockConfig, '')).not.toThrow();
      expect(() => new FirebaseRestApi(mockConfig, undefined)).not.toThrow();
    });
  });

  describe('createFirebaseRestApi', () => {
    beforeEach(() => {
      // Setup mock for successful token validation
      const mockResponse = {
        ok: true,
        json: async () => ({
          users: [{ localId: 'test-user-id' }],
        }),
      } as Response;
      mockFetch.mockResolvedValue(mockResponse);
    });

    it('should create FirebaseRestApi instance successfully with valid environment', async () => {
      const serverEnv = {
        FIREBASE_CONFIG: JSON.stringify({ apiKey: 'test-api-key' }),
        FIREBASE_PROJECT_ID: 'test-project-id',
      };

      const api = await createFirebaseRestApi(
        serverEnv,
        mockIdToken,
        mockFetch,
        mockLogger,
      );

      expect(api).toBeInstanceOf(FirebaseRestApi);
      expect(api.getUid()).toBe('test-user-id');
    });

    it('should throw error when FIREBASE_CONFIG is missing', async () => {
      const serverEnv = {
        FIREBASE_PROJECT_ID: 'test-project-id',
      };

      await expect(
        createFirebaseRestApi(serverEnv, mockIdToken),
      ).rejects.toThrow(
        'FIREBASE_CONFIG environment variable is not set. Please ensure it is configured for Firebase functionality.',
      );
    });

    it('should throw error when FIREBASE_PROJECT_ID is missing', async () => {
      const serverEnv = {
        FIREBASE_CONFIG: JSON.stringify({ apiKey: 'test-api-key' }),
      };

      await expect(
        createFirebaseRestApi(serverEnv, mockIdToken),
      ).rejects.toThrow(
        'FIREBASE_PROJECT_ID environment variable is not set. Please ensure it is configured for Firebase functionality.',
      );
    });

    it('should throw error when FIREBASE_CONFIG contains invalid JSON', async () => {
      const serverEnv = {
        FIREBASE_CONFIG: 'invalid-json',
        FIREBASE_PROJECT_ID: 'test-project-id',
      };

      await expect(
        createFirebaseRestApi(serverEnv, mockIdToken),
      ).rejects.toThrow(
        'FIREBASE_CONFIG environment variable contains invalid JSON. Please ensure it is properly formatted.',
      );
    });

    it('should throw error when FIREBASE_CONFIG is missing apiKey', async () => {
      const serverEnv = {
        FIREBASE_CONFIG: JSON.stringify({ someOtherKey: 'value' }),
        FIREBASE_PROJECT_ID: 'test-project-id',
      };

      await expect(
        createFirebaseRestApi(serverEnv, mockIdToken),
      ).rejects.toThrow('FIREBASE_CONFIG is missing required apiKey property.');
    });

    it('should handle undefined environment variables', async () => {
      const serverEnv = {
        FIREBASE_CONFIG: undefined,
        FIREBASE_PROJECT_ID: undefined,
      };

      await expect(
        createFirebaseRestApi(serverEnv, mockIdToken),
      ).rejects.toThrow(
        'FIREBASE_CONFIG environment variable is not set. Please ensure it is configured for Firebase functionality.',
      );
    });
  });

  describe('public access (no idToken)', () => {
    it('should allow construction without idToken', () => {
      expect(
        () => new FirebaseRestApi(mockConfig, undefined, mockFetch, mockLogger),
      ).not.toThrow();
    });

    it('should skip validation when idToken is not provided', async () => {
      const api = new FirebaseRestApi(
        mockConfig,
        undefined,
        mockFetch,
        mockLogger,
      );

      // Should not throw error
      await api.validateIdToken();

      // Should not make any fetch calls
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw when getting uid without token', () => {
      const api = new FirebaseRestApi(
        mockConfig,
        undefined,
        mockFetch,
        mockLogger,
      );

      expect(() => api.getUid()).toThrow(
        'ID token has not been validated yet. Call validateIdToken() first.',
      );
    });

    it('should not include Authorization header when idToken is not provided', async () => {
      const api = new FirebaseRestApi(
        mockConfig,
        undefined,
        mockFetch,
        mockLogger,
      );

      const mockResponse = {
        ok: true,
        json: async () => ({ documents: [] }),
      } as Response;
      mockFetch.mockResolvedValueOnce(mockResponse);

      await api.getCollection('test-collection');

      expect(mockFetch).toHaveBeenCalledWith(
        `https://firestore.googleapis.com/v1/projects/${mockConfig.projectId}/databases/(default)/documents/test-collection`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should not include Authorization header for getDocument when idToken is not provided', async () => {
      const api = new FirebaseRestApi(
        mockConfig,
        undefined,
        mockFetch,
        mockLogger,
      );

      const mockResponse = {
        ok: true,
        json: async () => ({ name: 'test-doc', fields: {} }),
      } as Response;
      mockFetch.mockResolvedValueOnce(mockResponse);

      await api.getDocument('test-collection/test-doc');

      expect(mockFetch).toHaveBeenCalledWith(
        `https://firestore.googleapis.com/v1/projects/${mockConfig.projectId}/databases/(default)/documents/test-collection/test-doc`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    });
  });

  describe('authenticated access (with idToken)', () => {
    it('should include Authorization header when idToken is provided', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ documents: [] }),
      } as Response;
      mockFetch.mockResolvedValueOnce(mockResponse);

      await api.getCollection('test-collection');

      expect(mockFetch).toHaveBeenCalledWith(
        `https://firestore.googleapis.com/v1/projects/${mockConfig.projectId}/databases/(default)/documents/test-collection`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockIdToken}`,
          },
        },
      );
    });

    it('should include Authorization header for getDocument when idToken is provided', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ name: 'test-doc', fields: {} }),
      } as Response;
      mockFetch.mockResolvedValueOnce(mockResponse);

      await api.getDocument('test-collection/test-doc');

      expect(mockFetch).toHaveBeenCalledWith(
        `https://firestore.googleapis.com/v1/projects/${mockConfig.projectId}/databases/(default)/documents/test-collection/test-doc`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockIdToken}`,
          },
        },
      );
    });

    it('should always include Authorization header for createDocument', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ name: 'test-doc', fields: {} }),
      } as Response;
      mockFetch.mockResolvedValueOnce(mockResponse);

      await api.createDocument('test-collection', { fields: {} });

      expect(mockFetch).toHaveBeenCalledWith(
        `https://firestore.googleapis.com/v1/projects/${mockConfig.projectId}/databases/(default)/documents/test-collection`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockIdToken}`,
          },
          body: JSON.stringify({ fields: {} }),
        },
      );
    });

    it('should include Authorization header for updateDocument when token is provided', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ name: 'test-doc', fields: {} }),
      } as Response;
      mockFetch.mockResolvedValueOnce(mockResponse);

      await api.updateDocument('test-collection/test-doc', { fields: {} });

      expect(mockFetch).toHaveBeenCalledWith(
        `https://firestore.googleapis.com/v1/projects/${mockConfig.projectId}/databases/(default)/documents/test-collection/test-doc`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockIdToken}`,
          },
          body: JSON.stringify({ fields: {} }),
        },
      );
    });

    it('should include Authorization header for deleteDocument when token is provided', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({}),
      } as Response;
      mockFetch.mockResolvedValueOnce(mockResponse);

      await api.deleteDocument('test-collection/test-doc');

      expect(mockFetch).toHaveBeenCalledWith(
        `https://firestore.googleapis.com/v1/projects/${mockConfig.projectId}/databases/(default)/documents/test-collection/test-doc`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockIdToken}`,
          },
        },
      );
    });
  });

  describe('authentication requirements', () => {
    let publicApi: FirebaseRestApi;

    beforeEach(() => {
      publicApi = new FirebaseRestApi(
        mockConfig,
        undefined,
        mockFetch,
        mockLogger,
      );
    });

    it('should allow createDocument without authentication when Firestore rules permit', async () => {
      const mockResponse = {
        name: 'projects/test/databases/(default)/documents/test-collection/test-doc',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await expect(
        publicApi.createDocument('test-collection', { fields: {} }),
      ).resolves.toEqual(mockResponse);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://firestore.googleapis.com/v1/projects/test-project-id/databases/(default)/documents/test-collection',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: {} }),
        },
      );
    });

    it('should allow updateDocument without authentication when Firestore rules permit', async () => {
      const mockResponse = {
        name: 'projects/test/databases/(default)/documents/test-collection/test-doc',
        fields: {},
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await expect(
        publicApi.updateDocument('test-collection/test-doc', { fields: {} }),
      ).resolves.toEqual(mockResponse);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://firestore.googleapis.com/v1/projects/test-project-id/databases/(default)/documents/test-collection/test-doc',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: {} }),
        },
      );
    });

    it('should allow deleteDocument without authentication when Firestore rules permit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await expect(
        publicApi.deleteDocument('test-collection/test-doc'),
      ).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://firestore.googleapis.com/v1/projects/test-project-id/databases/(default)/documents/test-collection/test-doc',
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });
  });

  describe('security validation', () => {
    let secureApi: FirebaseRestApi;

    beforeEach(() => {
      secureApi = new FirebaseRestApi(
        mockConfig,
        undefined,
        mockFetch,
        mockLogger,
      );
    });

    describe('collection name validation', () => {
      it('should reject collection names with path traversal attempts', async () => {
        await expect(secureApi.getCollection('../admin')).rejects.toThrow(
          'Collection name cannot contain path separators or traversal sequences',
        );

        await expect(secureApi.getCollection('books/../admin')).rejects.toThrow(
          'Collection name cannot contain path separators or traversal sequences',
        );

        await expect(secureApi.getCollection('..')).rejects.toThrow(
          'Collection name cannot contain path separators or traversal sequences',
        );
      });

      it('should reject collection names with URL injection attempts', async () => {
        await expect(
          secureApi.getCollection('books?admin=true'),
        ).rejects.toThrow(
          'Collection name cannot contain URL query or fragment characters',
        );

        await expect(secureApi.getCollection('books#admin')).rejects.toThrow(
          'Collection name cannot contain URL query or fragment characters',
        );

        await expect(
          secureApi.getCollection('books&admin=true'),
        ).rejects.toThrow(
          'Collection name cannot contain URL query or fragment characters',
        );
      });

      it('should reject empty or invalid collection names', async () => {
        await expect(secureApi.getCollection('')).rejects.toThrow(
          'Collection name must be a non-empty string',
        );

        await expect(secureApi.getCollection('   ')).rejects.toThrow(
          'Collection name cannot be empty',
        );

        await expect(
          secureApi.getCollection(null as unknown as string),
        ).rejects.toThrow('Collection name must be a non-empty string');

        await expect(
          secureApi.getCollection(undefined as unknown as string),
        ).rejects.toThrow('Collection name must be a non-empty string');
      });

      it('should accept valid collection names', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ documents: [] }),
        } as Response);

        await expect(secureApi.getCollection('books')).resolves.toEqual({
          documents: [],
        });

        expect(mockFetch).toHaveBeenCalledWith(
          'https://firestore.googleapis.com/v1/projects/test-project-id/databases/(default)/documents/books',
          expect.objectContaining({ method: 'GET' }),
        );
      });
    });

    describe('document path validation', () => {
      it('should reject document paths with path traversal attempts', async () => {
        await expect(secureApi.getDocument('../admin/config')).rejects.toThrow(
          'Document path cannot contain path traversal sequences',
        );

        await expect(
          secureApi.getDocument('books/../admin/config'),
        ).rejects.toThrow(
          'Document path cannot contain path traversal sequences',
        );

        await expect(
          secureApi.getDocument('books/book123/../admin'),
        ).rejects.toThrow(
          'Document path cannot contain path traversal sequences',
        );
      });

      it('should reject document paths with URL injection attempts', async () => {
        await expect(
          secureApi.getDocument('books/book123?admin=true'),
        ).rejects.toThrow(
          'Document path cannot contain URL query or fragment characters',
        );

        await expect(
          secureApi.getDocument('books/book123#admin'),
        ).rejects.toThrow(
          'Document path cannot contain URL query or fragment characters',
        );

        await expect(
          secureApi.getDocument('books/book123&admin=true'),
        ).rejects.toThrow(
          'Document path cannot contain URL query or fragment characters',
        );
      });

      it('should reject invalid document path formats', async () => {
        await expect(secureApi.getDocument('books')).rejects.toThrow(
          'Document path must follow the pattern: collection/document',
        );

        await expect(secureApi.getDocument('books/')).rejects.toThrow(
          'Document path cannot contain empty segments',
        );

        await expect(secureApi.getDocument('books//book123')).rejects.toThrow(
          'Document path must follow the pattern: collection/document',
        );

        await expect(
          secureApi.getDocument('books/book123/subcol'),
        ).rejects.toThrow(
          'Document path must follow the pattern: collection/document',
        );
      });

      it('should accept valid document paths', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ name: 'test-doc', fields: {} }),
        } as Response);

        await expect(secureApi.getDocument('books/book123')).resolves.toEqual({
          name: 'test-doc',
          fields: {},
        });

        expect(mockFetch).toHaveBeenCalledWith(
          'https://firestore.googleapis.com/v1/projects/test-project-id/databases/(default)/documents/books/book123',
          expect.objectContaining({ method: 'GET' }),
        );
      });

      it('should accept valid nested document paths', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ name: 'test-doc', fields: {} }),
        } as Response);

        await expect(
          secureApi.getDocument('books/book123/reviews/review456'),
        ).resolves.toEqual({ name: 'test-doc', fields: {} });

        expect(mockFetch).toHaveBeenCalledWith(
          'https://firestore.googleapis.com/v1/projects/test-project-id/databases/(default)/documents/books/book123/reviews/review456',
          expect.objectContaining({ method: 'GET' }),
        );
      });
    });

    describe('URL encoding security', () => {
      it('should properly encode special characters in project ID', () => {
        const specialProjectConfig = {
          apiKey: 'test-api-key',
          projectId: 'test-project@special#chars',
        };

        const specialApi = new FirebaseRestApi(
          specialProjectConfig,
          undefined,
          mockFetch,
          mockLogger,
        );

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ documents: [] }),
        } as Response);

        return specialApi.getCollection('books').then(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            'https://firestore.googleapis.com/v1/projects/test-project%40special%23chars/databases/(default)/documents/books',
            expect.objectContaining({ method: 'GET' }),
          );
        });
      });
    });
  });
});
