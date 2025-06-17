/**
 * IMPORTANT: When adding new environment variables to this file, make sure to:
 * 1. Add them to the appropriate interface (ClientEnv or ServerEnv)
 * 2. Add them to the requiredVars array in getServerEnv if they are required
 * 3. Add them to the envVars object in vite.config.ts to make them available in development
 * 4. Update the .dev.vars file with the new variables
 */

import type { FirebaseConfig } from '~/interface/firebaseInterface';

// Frontend environment variables (safe to expose)
export interface ClientEnv {
  FIREBASE_CONFIG: FirebaseConfig;
}

// Server-side environment variables
export interface ServerEnv {
  FIREBASE_CONFIG: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
}

type ClientEnvKey = 'FIREBASE_CONFIG';
type ServerEnvKey = keyof ServerEnv;

interface CloudflareContext {
  cloudflare?: {
    env?: Partial<Record<ClientEnvKey | ServerEnvKey, string>>;
  };
  env?: Partial<Record<ClientEnvKey | ServerEnvKey, string>>;
}

/**
 * Get environment variables for client-side usage
 * Only returns safe-to-expose variables
 *
 * Environment Variable Priority:
 * 1. Cloudflare Pages Production (context.cloudflare.env)
 * 2. Wrangler Development (context.env)
 * 3. Vite Development (process.env)
 *
 * Required Environment Variables:
 * - FIREBASE_CONFIG: JSON string containing Firebase configuration
 * - PAYPAL_CLIENT_ID: PayPal client ID for client-side integration
 *
 * Example .env file:
 * ```
 * FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}
 * PAYPAL_CLIENT_ID=your-paypal-client-id
 * ```
 */
export function getClientEnv(context: CloudflareContext): ClientEnv {
  const getEnvVar = (key: ClientEnvKey): string | undefined => {
    return (
      context?.cloudflare?.env?.[key] || // Cloudflare Pages production
      context?.env?.[key] || // Wrangler development
      (typeof process !== 'undefined' ? process.env[key] : undefined) // Vite development
    );
  };

  const firebaseConfig = getEnvVar('FIREBASE_CONFIG');
  if (!firebaseConfig) {
    throw new Error(
      'FIREBASE_CONFIG environment variable is not set. Please ensure it is configured in your environment.',
    );
  }
}

/**
 * Get environment variables for server-side usage
 * Includes all environment variables
 *
 * Environment Variable Priority:
 * 1. Cloudflare Pages Production (context.cloudflare.env)
 * 2. Wrangler Development (context.env)
 * 3. Vite Development (process.env)
 *
 * Required Environment Variables:
 * - API_URL: URL of the API endpoint
 */
export function getServerEnv(context: CloudflareContext): ServerEnv {
  const getEnvVar = (key: ServerEnvKey): string | undefined => {
    return (
      context?.cloudflare?.env?.[key] || // Cloudflare Pages production
      context?.env?.[key] || // Wrangler development
      (typeof process !== 'undefined' ? process.env[key] : undefined) // Vite development
    );
  };

  const requiredVars: ServerEnvKey[] = [
    'FIREBASE_CONFIG',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
  ];

  const missingVars = requiredVars.filter((key) => !getEnvVar(key));
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(
        ', ',
      )}. Please ensure they are configured in your environment.`,
    );
  }

  return {
    FIREBASE_CONFIG: getEnvVar('FIREBASE_CONFIG')!,
    FIREBASE_PROJECT_ID: getEnvVar('FIREBASE_PROJECT_ID')!,
    FIREBASE_CLIENT_EMAIL: getEnvVar('FIREBASE_CLIENT_EMAIL')!,
  };
}
