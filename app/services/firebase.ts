/**
 * Firebase client initialization service
 * This module handles the initialization of Firebase client SDK and provides
 * a singleton instance of the Firebase app.
 *
 * Required Environment Variable:
 * - FIREBASE_CONFIG: A JSON string containing the Firebase configuration object
 *   Example: {"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}
 *
 * How to get FIREBASE_CONFIG:
 * 1. Go to Firebase Console (https://console.firebase.google.com)
 * 2. Select your project
 * 3. Go to Project Settings (gear icon) > General
 * 4. Scroll down to "Your apps" section
 * 5. Click on the web app (</>) icon
 *    - If no web app exists, create one by clicking "Add app" and selecting web
 * 6. Copy the firebaseConfig object values
 * 7. Set this as your FIREBASE_CONFIG environment variable
 *
 * Usage Scenarios:
 * - Client-side Firebase operations (Authentication, Firestore reads, Storage uploads)
 * - Real-time database operations
 * - Cloud Messaging
 * - Analytics
 *
 * Security Considerations:
 * - The firebaseConfig used here contains public API keys and project identifiers
 * - These keys are safe to be exposed in client-side code
 * - Security is enforced through Firebase Security Rules in the Firebase Console
 * - Always configure appropriate security rules for:
 *   - Firestore Database
 *   - Realtime Database
 *   - Storage
 *   - Authentication
 *
 * Example Usage in Remix:
 * ```typescript
 * import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
 * import { getClientEnv } from '~/utils/env';
 *
 * // In your route loader
 * export async function loader({ context }: LoaderFunctionArgs) {
 *   const env = getClientEnv(context);
 *   return { FIREBASE_CONFIG: env.FIREBASE_CONFIG };
 * }
 *
 * // In your component
 * export default function YourComponent() {
 *   const { FIREBASE_CONFIG } = useLoaderData<typeof loader>();
 *   const app = initializeAndGetFirebaseClient(FIREBASE_CONFIG);
 *   // ... use Firebase services like Auth, Firestore, Storage
 * }
 * ```
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import type { FirebaseConfig } from '~/interfaces/firebaseInterface';

/**
 * Initializes Firebase client SDK and returns a singleton instance
 * @param firebaseConfig - Firebase configuration object containing API keys and project settings.
 *                        This config is safe to be publicly shared as it only contains public identifiers.
 * @returns FirebaseApp instance - either a new initialized app or existing app instance
 * @throws Error if firebaseConfig is null, undefined, or missing required properties
 */
export function initializeAndGetFirebaseClient(
  firebaseConfig: FirebaseConfig | null | undefined,
): FirebaseApp {
  if (!firebaseConfig) {
    throw new Error(
      'Firebase configuration is not available. Please ensure FIREBASE_CONFIG environment variable is set with a valid Firebase configuration object.',
    );
  }

  // Validate required Firebase config properties
  const requiredProps = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];
  const missingProps = requiredProps.filter(
    (prop) => !firebaseConfig[prop as keyof FirebaseConfig],
  );

  if (missingProps.length > 0) {
    throw new Error(
      `Firebase configuration is missing required properties: ${missingProps.join(
        ', ',
      )}. Please ensure your FIREBASE_CONFIG is complete.`,
    );
  }

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

  return app;
}
