import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { initializeAndGetFirebaseClient } from '../../services/firebase';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import type { FirebaseConfig } from '../../interfaces/firebaseInterface';

// Mock Firebase modules
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(),
  getApp: jest.fn(),
}));

const mockInitializeApp = initializeApp as jest.MockedFunction<
  typeof initializeApp
>;
const mockGetApps = getApps as jest.MockedFunction<typeof getApps>;
const mockGetApp = getApp as jest.MockedFunction<typeof getApp>;

describe('Firebase Client Service', () => {
  const mockFirebaseConfig: FirebaseConfig = {
    apiKey: 'test-api-key',
    authDomain: 'test-auth-domain',
    projectId: 'test-project-id',
    storageBucket: 'test-storage-bucket',
    messagingSenderId: 'test-messaging-sender-id',
    appId: 'test-app-id',
  };

  const mockFirebaseApp = { name: 'test-app' } as unknown as FirebaseApp;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeAndGetFirebaseClient', () => {
    it('should initialize Firebase app when no apps exist', () => {
      mockGetApps.mockReturnValue([]);
      mockInitializeApp.mockReturnValue(mockFirebaseApp);

      const result = initializeAndGetFirebaseClient(mockFirebaseConfig);

      expect(mockGetApps).toHaveBeenCalledTimes(1);
      expect(mockInitializeApp).toHaveBeenCalledWith(mockFirebaseConfig);
      expect(mockGetApp).not.toHaveBeenCalled();
      expect(result).toBe(mockFirebaseApp);
    });

    it('should return existing Firebase app when apps already exist', () => {
      mockGetApps.mockReturnValue([mockFirebaseApp]);
      mockGetApp.mockReturnValue(mockFirebaseApp);

      const result = initializeAndGetFirebaseClient(mockFirebaseConfig);

      expect(mockGetApps).toHaveBeenCalledTimes(1);
      expect(mockInitializeApp).not.toHaveBeenCalled();
      expect(mockGetApp).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockFirebaseApp);
    });

    it('should handle Firebase config with all required properties', () => {
      mockGetApps.mockReturnValue([]);
      mockInitializeApp.mockReturnValue(mockFirebaseApp);

      const result = initializeAndGetFirebaseClient(mockFirebaseConfig);

      expect(mockInitializeApp).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        authDomain: 'test-auth-domain',
        projectId: 'test-project-id',
        storageBucket: 'test-storage-bucket',
        messagingSenderId: 'test-messaging-sender-id',
        appId: 'test-app-id',
      });
      expect(result).toBe(mockFirebaseApp);
    });
  });
});
