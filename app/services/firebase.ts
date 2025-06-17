/**
 * Firebase client initialization service
 * This module handles the initialization of Firebase client SDK and provides
 * a singleton instance of the Firebase app.
 *
 * Note: This is a client-side Firebase initialization. The firebaseConfig used here
 * is safe to be publicly shared as it only contains public API keys and project identifiers.
 * For more information about Firebase config security, see:
 * https://firebase.google.com/docs/projects/api-keys#api-keys-and-security
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import type { FirebaseConfig } from '~/interface/firebaseInterface';

/**
 * Initializes Firebase client SDK and returns a singleton instance
 * @param firebaseConfig - Firebase configuration object containing API keys and project settings.
 *                        This config is safe to be publicly shared as it only contains public identifiers.
 * @returns FirebaseApp instance - either a new initialized app or existing app instance
 */
export function initializeAndGetFirebaseClient(
  firebaseConfig: FirebaseConfig,
): FirebaseApp {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

  return app;
}
