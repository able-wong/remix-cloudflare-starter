import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { initializeAndGetFirebaseClient } from '../../../services/firebase';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import type { FirebaseConfig } from '../../../interfaces/firebaseInterface';

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

    it('should throw error when firebaseConfig is null', () => {
      expect(() => initializeAndGetFirebaseClient(null)).toThrow(
        'Firebase configuration is not available. Please ensure FIREBASE_CONFIG environment variable is set with a valid Firebase configuration object.',
      );
    });

    it('should throw error when firebaseConfig is undefined', () => {
      expect(() => initializeAndGetFirebaseClient(undefined)).toThrow(
        'Firebase configuration is not available. Please ensure FIREBASE_CONFIG environment variable is set with a valid Firebase configuration object.',
      );
    });

    it('should throw error when firebaseConfig is missing required properties', () => {
      const incompleteConfig = {
        apiKey: 'test-api-key',
        // Missing other required properties
      } as unknown as FirebaseConfig;

      expect(() => initializeAndGetFirebaseClient(incompleteConfig)).toThrow(
        'Firebase configuration is missing required properties: authDomain, projectId, storageBucket, messagingSenderId, appId. Please ensure your FIREBASE_CONFIG is complete.',
      );
    });

    it('should throw error when firebaseConfig is missing some properties', () => {
      const incompleteConfig = {
        apiKey: 'test-api-key',
        authDomain: 'test-auth-domain',
        projectId: 'test-project-id',
        // Missing storageBucket, messagingSenderId, appId
      } as unknown as FirebaseConfig;

      expect(() => initializeAndGetFirebaseClient(incompleteConfig)).toThrow(
        'Firebase configuration is missing required properties: storageBucket, messagingSenderId, appId. Please ensure your FIREBASE_CONFIG is complete.',
      );
    });
  });
});
