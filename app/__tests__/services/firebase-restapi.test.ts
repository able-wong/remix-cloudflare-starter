import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  FirebaseRestApi,
  createFirebaseRestApi,
  convertToFirestoreDocument,
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
      ).resolves.toEqual({ id: 'test-doc' });

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
      ).resolves.toEqual({ id: 'test-doc' });

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

        await expect(secureApi.getCollection('books')).resolves.toEqual([]);

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
          id: 'test-doc',
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
        ).resolves.toEqual({ id: 'test-doc' });

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

describe('Firestore Data Conversion Utilities', () => {
  describe('convertToFirestoreDocument', () => {
    it('should convert simple primitive types correctly', () => {
      const input = {
        title: 'Test Book',
        year: 2023,
        isAvailable: true,
        description: null,
      };

      const result = convertToFirestoreDocument(input);

      expect(result).toEqual({
        fields: {
          title: { stringValue: 'Test Book' },
          year: { integerValue: '2023' },
          isAvailable: { booleanValue: true },
          description: { nullValue: null },
        },
      });
    });

    it('should handle arrays correctly', () => {
      const input = {
        tags: ['fiction', 'drama'],
        ratings: [4.5, 3, 5],
        flags: [true, false, true],
      };

      const result = convertToFirestoreDocument(input);

      expect(result).toEqual({
        fields: {
          tags: {
            arrayValue: {
              values: [{ stringValue: 'fiction' }, { stringValue: 'drama' }],
            },
          },
          ratings: {
            arrayValue: {
              values: [
                { doubleValue: 4.5 },
                { integerValue: '3' },
                { integerValue: '5' },
              ],
            },
          },
          flags: {
            arrayValue: {
              values: [
                { booleanValue: true },
                { booleanValue: false },
                { booleanValue: true },
              ],
            },
          },
        },
      });
    });

    it('should handle Date objects correctly', () => {
      const testDate = new Date('2023-12-01T10:30:00.000Z');
      const input = {
        createdAt: testDate,
        updatedAt: testDate,
      };

      const result = convertToFirestoreDocument(input);

      expect(result).toEqual({
        fields: {
          createdAt: { timestampValue: '2023-12-01T10:30:00.000Z' },
          updatedAt: { timestampValue: '2023-12-01T10:30:00.000Z' },
        },
      });
    });

    it('should handle nested objects correctly', () => {
      const input = {
        author: {
          name: 'Jane Doe',
          age: 42,
          isActive: true,
        },
        metadata: {
          source: 'library',
          categories: ['fiction', 'bestseller'],
        },
      };

      const result = convertToFirestoreDocument(input);

      expect(result).toEqual({
        fields: {
          author: {
            mapValue: {
              fields: {
                name: { stringValue: 'Jane Doe' },
                age: { integerValue: '42' },
                isActive: { booleanValue: true },
              },
            },
          },
          metadata: {
            mapValue: {
              fields: {
                source: { stringValue: 'library' },
                categories: {
                  arrayValue: {
                    values: [
                      { stringValue: 'fiction' },
                      { stringValue: 'bestseller' },
                    ],
                  },
                },
              },
            },
          },
        },
      });
    });

    it('should handle complex nested structures', () => {
      const input = {
        book: {
          title: 'Complex Book',
          authors: [
            { name: 'Author 1', books: ['Book A', 'Book B'] },
            { name: 'Author 2', books: ['Book C'] },
          ],
          publishInfo: {
            year: 2023,
            publisher: 'Test Publisher',
            editions: [
              { format: 'hardcover', price: 29.99 },
              { format: 'paperback', price: 19.99 },
            ],
          },
        },
      };

      const result = convertToFirestoreDocument(input);

      expect(result.fields?.book).toEqual({
        mapValue: {
          fields: {
            title: { stringValue: 'Complex Book' },
            authors: {
              arrayValue: {
                values: [
                  {
                    mapValue: {
                      fields: {
                        name: { stringValue: 'Author 1' },
                        books: {
                          arrayValue: {
                            values: [
                              { stringValue: 'Book A' },
                              { stringValue: 'Book B' },
                            ],
                          },
                        },
                      },
                    },
                  },
                  {
                    mapValue: {
                      fields: {
                        name: { stringValue: 'Author 2' },
                        books: {
                          arrayValue: {
                            values: [{ stringValue: 'Book C' }],
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
            publishInfo: {
              mapValue: {
                fields: {
                  year: { integerValue: '2023' },
                  publisher: { stringValue: 'Test Publisher' },
                  editions: {
                    arrayValue: {
                      values: [
                        {
                          mapValue: {
                            fields: {
                              format: { stringValue: 'hardcover' },
                              price: { doubleValue: 29.99 },
                            },
                          },
                        },
                        {
                          mapValue: {
                            fields: {
                              format: { stringValue: 'paperback' },
                              price: { doubleValue: 19.99 },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    it('should handle edge cases gracefully', () => {
      const input = {
        emptyString: '',
        zero: 0,
        negativeNumber: -42,
        floatingPoint: 3.14159,
        emptyArray: [],
        emptyObject: {},
        undefined: undefined,
        null: null,
      };

      const result = convertToFirestoreDocument(input);

      expect(result).toEqual({
        fields: {
          emptyString: { stringValue: '' },
          zero: { integerValue: '0' },
          negativeNumber: { integerValue: '-42' },
          floatingPoint: { doubleValue: 3.14159 },
          emptyArray: { arrayValue: { values: [] } },
          emptyObject: { mapValue: { fields: {} } },
          undefined: { nullValue: null },
          null: { nullValue: null },
        },
      });
    });

    it('should handle special string characters', () => {
      const input = {
        unicodeText: 'Hello 世界 🚀',
        specialChars: 'Line1\nLine2\tTabbed "Quoted" \'Single\'',
        jsonLike: '{"key": "value"}',
      };

      const result = convertToFirestoreDocument(input);

      expect(result).toEqual({
        fields: {
          unicodeText: { stringValue: 'Hello 世界 🚀' },
          specialChars: {
            stringValue: 'Line1\nLine2\tTabbed "Quoted" \'Single\'',
          },
          jsonLike: { stringValue: '{"key": "value"}' },
        },
      });
    });

    it('should handle unsupported types with fallback', () => {
      const input = {
        symbol: Symbol('test'),
        functionValue: () => 'test',
        regexValue: /test/g,
      };

      const result = convertToFirestoreDocument(input);

      expect(result.fields?.symbol).toEqual({
        stringValue: 'unsupported_type',
      });
      expect(result.fields?.functionValue).toEqual({
        stringValue: 'unsupported_type',
      });
      // Regex objects are treated as objects with empty fields
      expect(result.fields?.regexValue).toEqual({ mapValue: { fields: {} } });
    });

    it('should handle large numbers correctly', () => {
      const input = {
        maxSafeInteger: Number.MAX_SAFE_INTEGER,
        minSafeInteger: Number.MIN_SAFE_INTEGER,
        largeFloat: 1.7976931348623157e308,
        smallFloat: 5e-324,
        normalFloat: 3.14159,
      };

      const result = convertToFirestoreDocument(input);

      expect(result).toEqual({
        fields: {
          maxSafeInteger: { integerValue: Number.MAX_SAFE_INTEGER.toString() },
          minSafeInteger: { integerValue: Number.MIN_SAFE_INTEGER.toString() },
          // Very large numbers in scientific notation are treated as integers
          largeFloat: { integerValue: '1.7976931348623157e+308' },
          smallFloat: { doubleValue: 5e-324 },
          normalFloat: { doubleValue: 3.14159 },
        },
      });
    });
  });
});

describe('Automatic Data Conversion Integration', () => {
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
    api = new FirebaseRestApi(mockConfig, undefined, mockFetch, mockLogger);
  });

  describe('createDocument with auto-conversion', () => {
    it('should automatically convert plain JavaScript objects', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          name: 'projects/test/databases/(default)/documents/books/book123',
          fields: {
            title: { stringValue: 'Test Book' },
            year: { integerValue: '2023' },
          },
          createTime: '2023-01-01T00:00:00Z',
          updateTime: '2023-01-01T00:00:00Z',
        }),
      } as Response;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const bookData = { title: 'Test Book', year: 2023 };
      const result = await api.createDocument('books', bookData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://firestore.googleapis.com/v1/projects/test-project-id/databases/(default)/documents/books',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            fields: {
              title: { stringValue: 'Test Book' },
              year: { integerValue: '2023' },
            },
          }),
        }),
      );

      // Now returns plain JS object with converted values
      expect(result.title).toEqual('Test Book');
      expect(result.year).toEqual(2023);
      expect(result.id).toEqual('book123');
    });

    it('should handle pre-converted Firestore format (backward compatibility)', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          name: 'projects/test/databases/(default)/documents/books/book123',
          fields: {
            title: { stringValue: 'Test Book' },
          },
        }),
      } as Response;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const firestoreData = {
        fields: {
          title: { stringValue: 'Test Book' },
        },
      };

      await api.createDocument('books', firestoreData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(firestoreData),
        }),
      );
    });
  });

  describe('updateDocument with auto-conversion', () => {
    it('should automatically convert plain JavaScript objects', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          name: 'projects/test/databases/(default)/documents/books/book123',
          fields: {
            title: { stringValue: 'Updated Book' },
            year: { integerValue: '2024' },
          },
          updateTime: '2023-01-01T00:00:00Z',
        }),
      } as Response;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const updateData = { title: 'Updated Book', year: 2024 };
      await api.updateDocument('books/book123', updateData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            fields: {
              title: { stringValue: 'Updated Book' },
              year: { integerValue: '2024' },
            },
          }),
        }),
      );
    });
  });

  describe('data conversion edge cases', () => {
    it('should handle null and undefined values in conversion', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          name: 'projects/test/databases/(default)/documents/books/book123',
          fields: {
            title: { stringValue: 'Test' },
            description: { nullValue: null },
          },
        }),
      } as Response;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const data = { title: 'Test', description: null, notIncluded: undefined };
      await api.createDocument('books', data);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            fields: {
              title: { stringValue: 'Test' },
              description: { nullValue: null },
              notIncluded: { nullValue: null },
            },
          }),
        }),
      );
    });

    it('should handle empty collections gracefully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({}), // Empty response - no documents
      } as Response;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getCollection('empty-collection');

      expect(result).toEqual([]);
    });
  });
});
