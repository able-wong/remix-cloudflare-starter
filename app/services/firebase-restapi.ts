/**
 * Firebase REST API Service
 * This module provides server-side Firebase functionality using the Firebase REST API.
 * It's designed to work in Cloudflare Workers environment where Firebase Admin SDK
 * might not be compatible.
 *
 * Required Configuration:
 * - apiKey: Firebase Web API Key (from Firebase Console)
 * - projectId: Firebase Project ID
 *
 * How to get the required configuration:
 * 1. Go to Firebase Console (https://console.firebase.google.com)
 * 2. Select your project
 * 3. Go to Project Settings (gear icon) > General
 * 4. Scroll down to "Your apps" section
 * 5. Click on the web app (</>) icon
 *    - If no web app exists, create one by clicking "Add app" and selecting web
 * 6. Copy the apiKey and projectId values
 *
 * Usage Scenarios:
 * - Server-side Firebase operations in Cloudflare Workers
 * - Remix actions for handling form submissions and data mutations
 * - Token verification for authentication in Remix loaders and actions
 * - User profile updates through Remix form actions
 * - Any Firebase operations that need to be performed server-side
 *
 * Security Considerations:
 * - This service uses Firebase REST API which requires the Web API Key
 * - The API Key is safe to use in server-side code
 * - All operations require a valid Firebase ID token
 * - Token verification is performed before any user data operations
 *
 * Example Usage in Remix:
 * ```typescript
 * import { getServerEnv } from '~/utils/env';
 *
 * export async function action({ request, context }: ActionFunctionArgs) {
 *   const env = getServerEnv(context);
 *   const firebaseRestApi = new FirebaseRestApi({
 *     apiKey: JSON.parse(env.FIREBASE_CONFIG).apiKey,
 *     projectId: env.FIREBASE_PROJECT_ID
 *   });
 *
 *   // Get the ID token from the request
 *   const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
 *   if (!idToken) {
 *     throw new Error('No ID token provided');
 *   }
 *
 *   // Verify the token and get user ID
 *   const { uid } = await firebaseRestApi.verifyIdToken(idToken);
 *
 *   // Now you can use the verified uid for your business logic
 *   // For example, query/update user data in Firestore using REST API
 *
 *   return json({ success: true, userId: uid });
 * }
 * ```
 */

import { LoggerFactory, type Logger } from '~/utils/logger';

export type FetchFunction = typeof fetch;

interface FirebaseConfig {
  apiKey: string;
  projectId: string;
}

export class FirebaseRestApi {
  private fetchImpl: FetchFunction;
  private config: FirebaseConfig;
  private logger: Logger;
  private boundFetch: FetchFunction;

  constructor(
    config: FirebaseConfig,
    fetchImpl: FetchFunction = fetch,
    logger?: Logger,
  ) {
    this.config = config;
    this.fetchImpl = fetchImpl;
    this.logger =
      logger ||
      LoggerFactory.createLogger({
        service: 'firebase-restapi',
      });
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
