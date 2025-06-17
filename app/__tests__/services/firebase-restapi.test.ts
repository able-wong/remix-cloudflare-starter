import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FirebaseRestApi } from '../../services/firebase-restapi';

describe('FirebaseRestApi', () => {
  const mockConfig = {
    apiKey: 'test-api-key',
    projectId: 'test-project-id',
  };

  const mockLogger = {
    error: jest.fn(),
  };

  const mockFetch = jest.fn();

  let api: FirebaseRestApi;

  beforeEach(() => {
    jest.clearAllMocks();
    api = new FirebaseRestApi(mockConfig, mockFetch as any, mockLogger);
  });

  describe('verifyIdToken', () => {
    it('should verify ID token successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          users: [{ localId: 'test-user-id' }],
        }),
      };
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
      };
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
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(api.verifyIdToken('test-token')).rejects.toThrow(
        'No user found for the provided token',
      );
    });
  });
});
