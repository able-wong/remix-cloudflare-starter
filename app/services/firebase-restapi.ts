/**
 * Firebase REST API Service
 *
 * This service is primarily used in Remix actions (server-side) to interact with Firebase services,
 * particularly Firestore. It provides methods to verify Firebase ID tokens and perform
 * authenticated operations against Firebase REST APIs.
 *
 * Usage in Remix actions:
 * 1. Frontend should send the Firebase ID token in the Authorization header:
 *    ```typescript
 *    const token = await user.getIdToken();
 *    const response = await fetch('/api/endpoint', {
 *      headers: {
 *        Authorization: `Bearer ${token}`,
 *      },
 *    });
 *    ```
 *
 * 2. In the Remix action, extract and verify the token:
 *    ```typescript
 *    const authHeader = request.headers.get('Authorization');
 *    const idToken = authHeader?.split('Bearer ')[1];
 *    const { uid } = await firebaseRestApi.verifyIdToken(idToken);
 *    ```
 *
 * 3. Use the verified token to make authenticated requests to Firebase services
 *
 * Note: This implementation uses REST APIs instead of the Firebase Admin SDK
 * to ensure compatibility with Cloudflare Workers environment.
 */

import { logger as defaultLogger } from '~/utils/logger';

export type FetchFunction = typeof fetch;

interface FirebaseConfig {
  apiKey: string;
  projectId: string;
}

// Define a logger interface to make it easier to mock
interface Logger {
  error: (
    message: string,
    options?: { [key: string]: string | number | boolean | undefined },
  ) => void;
  // Add other logger methods if needed
}

export class FirebaseRestApi {
  private fetchImpl: FetchFunction;
  private config: FirebaseConfig;
  private logger: Logger;
  private boundFetch: FetchFunction;

  constructor(
    config: FirebaseConfig,
    fetchImpl: FetchFunction = fetch,
    logger: Logger = defaultLogger,
  ) {
    this.config = config;
    this.fetchImpl = fetchImpl;
    this.logger = logger;
    // Bind fetch to global context for Cloudflare Workers
    this.boundFetch = fetchImpl.bind(globalThis);
  }

  /**
   * Verify Firebase ID token using Firebase REST API
   * @param idToken - The Firebase ID token to verify
   * @returns Object containing the user ID
   */
  async verifyIdToken(idToken: string): Promise<{ uid: string }> {
    const response = await this.boundFetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      },
    );

    const responseData = await response.json();

    if (!response.ok) {
      this.logger.error('Firebase token verification failed', {
        status: response.status,
        statusText: response.statusText,
        responseData: JSON.stringify(responseData),
        action: 'verify_token',
      });
      throw new Error(
        `Failed to verify ID token: ${JSON.stringify(responseData)}`,
      );
    }

    const data = responseData as { users: Array<{ localId: string }> };
    if (!data.users || data.users.length === 0) {
      throw new Error('No user found for the provided token');
    }

    return { uid: data.users[0].localId };
  }

  /**
   * Example of how to update user profile using Firebase REST API
   * This is commented out as it's app-specific but serves as an example
   * @param userId - The user ID to update
   * @param idToken - The Firebase ID token for authentication
   */
  /*
  async updateUserProfile(userId: string, idToken: string): Promise<void> {
    const response = await this.boundFetch(
      `https://firestore.googleapis.com/v1/projects/${this.config.projectId}/databases/(default)/documents/user_profiles/${userId}?updateMask.fieldPaths=isFullVersion&updateMask.fieldPaths=updatedAt`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fields: {
            isFullVersion: { booleanValue: true },
            updatedAt: { timestampValue: new Date().toISOString() },
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      this.logger.error('Failed to update user profile', {
        error: JSON.stringify(error),
        action: 'update_profile',
      });
      throw new Error(
        `Failed to update user profile: ${JSON.stringify(error)}`,
      );
    }
  }
  */
}
