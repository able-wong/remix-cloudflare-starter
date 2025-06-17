/**
 * IMPORTANT: When adding new environment variables to this file, make sure to:
 * 1. Add them to the appropriate interface (ClientEnv or ServerEnv)
 * 2. Add them to the requiredVars array in getServerEnv if they are required
 * 3. Add them to the envVars object in vite.config.ts to make them available in development
 * 4. Update the .dev.vars file with the new variables
 */

import type { FirebaseConfig } from '~/interfaces/firebaseInterface';

// Frontend environment variables (safe to expose)
export interface ClientEnv {
  FIREBASE_CONFIG: FirebaseConfig;
  APP_NAME: string;
}

// Server-side environment variables
export interface ServerEnv {
  FIREBASE_CONFIG: string;
  FIREBASE_PROJECT_ID: string;
}

type ClientEnvKey = 'FIREBASE_CONFIG' | 'APP_NAME';
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
 *
 * Optional Environment Variables:
 * - APP_NAME: Application name used for logging (defaults to 'remix-cloudflare-app')
 *
 * Example .env file:
 * ```
 * FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}
 * APP_NAME=my-awesome-app
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

  let parsedFirebaseConfig: FirebaseConfig;
  try {
    parsedFirebaseConfig = JSON.parse(firebaseConfig);
  } catch (error) {
    throw new Error(
      'FIREBASE_CONFIG environment variable contains invalid JSON. Please ensure it is properly formatted.',
    );
  }

  return {
    FIREBASE_CONFIG: parsedFirebaseConfig,
    APP_NAME: getEnvVar('APP_NAME') || 'remix-cloudflare-app',
  };
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
 * - FIREBASE_CONFIG: JSON string containing Firebase configuration
 * - FIREBASE_PROJECT_ID: Firebase Project ID
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
  };
}
