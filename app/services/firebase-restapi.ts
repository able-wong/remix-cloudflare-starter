/**
 * Firebase REST API Service
 *
 * This module provides server-side Firebase functionality using the Firebase REST API.
 * It's designed to work in Cloudflare Workers environment where Firebase Admin SDK
 * might not be compatible.
 *
 * DESIGN PRINCIPLES:
 * - Collection-agnostic: Works with any Firestore collection
 * - Data-structure flexible: Supports any document field types
 * - Environment-aware: Automatically configures from environment variables
 * - Authentication-optional: Supports both public and authenticated operations
 * - Error-resilient: Comprehensive error handling and logging
 *
 * CONFIGURATION:
 * - apiKey: Firebase Web API Key (from Firebase Console)
 * - projectId: Firebase Project ID
 *
 * Get configuration from Firebase Console:
 * 1. Go to Firebase Console (https://console.firebase.google.com)
 * 2. Select your project > Project Settings > General
 * 3. Scroll to "Your apps" section, click web app icon (</>)
 * 4. Copy the apiKey and projectId values
 *
 * USAGE PATTERNS:
 *
 * 1. AUTHENTICATED ACCESS:
 * ```typescript
 * import { createFirebaseRestApi } from '~/services/firebase-restapi';
 * import { getServerEnv } from '~/utils/env';
 *
 * export async function action({ request, context }: ActionFunctionArgs) {
 *   const serverEnv = getServerEnv(context);
 *   const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
 *
 *   if (!idToken) {
 *     throw new Error('Authentication required');
 *   }
 *
 *   const firebaseApi = await createFirebaseRestApi(serverEnv, idToken);
 *   // Token automatically validated, ready to use
 *
 *   const userBooks = await firebaseApi.getCollection('user-books');
 *   const uid = firebaseApi.getUid(); // Get the validated user ID
 *
 *   return json({ success: true, userId: uid, books: userBooks });
 * }
 * ```
 *
 * 2. PUBLIC ACCESS (No Authentication):
 * ```typescript
 * export async function loader({ context }: LoaderFunctionArgs) {
 *   const serverEnv = getServerEnv(context);
 *
 *   // No idToken needed for public access
 *   const firebaseApi = await createFirebaseRestApi(serverEnv);
 *
 *   // Access public collections (controlled by Firebase Security Rules)
 *   const publicBooks = await firebaseApi.getCollection('public-books');
 *
 *   // All CRUD operations support public access when Firestore rules allow
 *   const newBook = await firebaseApi.createDocument('books', bookData);
 *   const updatedBook = await firebaseApi.updateDocument('books/book123', updateData);
 *   await firebaseApi.deleteDocument('books/book456');
 *
 *   return json({ books: publicBooks });
 * }
 * ```
 *
 * 3. SERVICE LAYER INTEGRATION:
 * ```typescript
 * class BookService {
 *   constructor(private firebaseApi: FirebaseRestApi) {}
 *
 *   async getAllBooks() {
 *     const response = await this.firebaseApi.getCollection('books');
 *     return response.documents?.map(doc => this.mapToBook(doc)) || [];
 *   }
 * }
 * ```
 *
 * FIRESTORE DATA STRUCTURE:
 * The API automatically handles Firestore's field type format:
 * - Strings: { stringValue: "text" }
 * - Numbers: { integerValue: "123" } or { doubleValue: 45.67 }
 * - Booleans: { booleanValue: true }
 * - Arrays: { arrayValue: { values: [...] } }
 * - Timestamps: { timestampValue: "2023-01-01T00:00:00Z" }
 *
 * SECURITY CONSIDERATIONS:
 * - Firebase Web API Key is safe to use in server-side code
 * - Authentication is optional - use for public vs authenticated operations
 * - Firebase Security Rules control access to collections and documents
 * - Token verification is performed automatically when idToken is provided
 * - URL construction is secured against path traversal and injection attacks
 * - All input parameters are validated and sanitized before use
 * - Built-in protection against common URL-based security vulnerabilities
 */

import { LoggerFactory, type Logger } from '~/utils/logger';

export type FetchFunction = typeof fetch;

interface FirebaseConfig {
  apiKey: string;
  projectId: string;
}

export interface FirestoreValue {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  arrayValue?: {
    values: FirestoreValue[];
  };
}

export interface FirestoreDocument {
  name: string;
  fields: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

export interface FirestoreCollectionResponse {
  documents?: FirestoreDocument[];
  nextPageToken?: string;
}

export class FirebaseRestApi {
  private fetchImpl: FetchFunction;
  private config: FirebaseConfig;
  private logger: Logger;
  private boundFetch: FetchFunction;
  private idToken?: string;
  private uid: string;

  constructor(
    config: FirebaseConfig,
    idToken?: string,
    fetchImpl: FetchFunction = fetch,
    logger?: Logger,
  ) {
    // Validate Firebase configuration
    if (!config) {
      throw new Error(
        'Firebase configuration is required. Please ensure FIREBASE_CONFIG and FIREBASE_PROJECT_ID environment variables are set.',
      );
    }

    if (!config.apiKey || !config.projectId) {
      throw new Error(
        'Firebase configuration is incomplete. Both apiKey and projectId are required.',
      );
    }

    this.config = config;
    this.fetchImpl = fetchImpl;
    this.logger =
      logger ||
      LoggerFactory.createLogger({
        service: 'firebase-restapi',
      });
    // Bind fetch to global context for Cloudflare Workers
    this.boundFetch = fetchImpl.bind(globalThis);

    // Store the idToken for later validation
    this.idToken = idToken;
    this.uid = ''; // Will be set after validation
  }

  /**
   * Validates the ID token provided in the constructor.
   * This method should be called after construction to ensure the token is valid.
   * Only validates if a token was provided.
   * @returns Promise<void> - Resolves if token is valid, throws error if invalid
   */
  async validateIdToken(): Promise<void> {
    if (!this.idToken) {
      return; // Skip validation for public access
    }
    await this.verifyAndSetIdToken(this.idToken);
  }

  /**
   * Gets the validated user ID
   * @returns string - The user ID from the validated token
   * @throws Error - If token hasn't been validated yet
   */
  getUid(): string {
    if (!this.uid) {
      throw new Error(
        'ID token has not been validated yet. Call validateIdToken() first.',
      );
    }
    return this.uid;
  }

  /**
   * VERIFY FIREBASE ID TOKEN AND SET UID
   *
   * Verifies a Firebase ID token and sets the authenticated user's UID internally.
   * This method is essential for implementing authentication in server-side operations.
   *
   * @param idToken - The Firebase ID token to verify (obtained from client-side Firebase Auth)
   * @returns Promise<void> - Resolves when token is verified and UID is set
   *
   * @throws Error - If token is invalid, expired, or verification fails
   */
  async verifyAndSetIdToken(idToken: string): Promise<void> {
    const response = await this.boundFetch(
      this.buildAuthUrl('getAccountInfo'),
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

    // Set the uid internally
    this.uid = data.users[0].localId;
  }

  /**
   * GET ALL DOCUMENTS FROM COLLECTION
   *
   * Retrieves all documents from a specified Firestore collection.
   * This is the most commonly used method for reading data.
   * Supports both public and authenticated access based on Firebase Security Rules.
   *
   * @param collectionName - Name of the Firestore collection (e.g., 'books', 'users', 'orders')
   * @returns Promise<FirestoreCollectionResponse> - Object containing documents array and optional pagination token
   *
   * @throws Error - If collection access fails or Firebase Security Rules deny access
   */
  async getCollection(
    collectionName: string,
  ): Promise<FirestoreCollectionResponse> {
    const headers = this.prepareHeaders(false); // Public access allowed

    const response = await this.boundFetch(
      this.buildFirestoreUrl(collectionName, true),
      {
        method: 'GET',
        headers,
      },
    );

    if (!response.ok) {
      const error = await response.json();
      this.logger.error('Failed to get collection', {
        error: JSON.stringify(error),
        collectionName,
        action: 'get_collection',
      });
      throw new Error(`Failed to get collection: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  /**
   * GET SINGLE DOCUMENT
   *
   * Retrieves a specific document from Firestore using its document path.
   * Ideal for fetching individual records by ID.
   * Supports both public and authenticated access based on Firebase Security Rules.
   *
   * @param documentPath - Full path to the document (e.g., 'books/book123', 'users/user456')
   * @returns Promise<FirestoreDocument> - The requested document with all its fields
   *
   * @throws Error - If document doesn't exist, access is denied, or path is invalid
   */
  async getDocument(documentPath: string): Promise<FirestoreDocument> {
    const headers = this.prepareHeaders(false); // Public access allowed

    const response = await this.boundFetch(
      this.buildFirestoreUrl(documentPath, false),
      {
        method: 'GET',
        headers,
      },
    );

    if (!response.ok) {
      const error = await response.json();
      this.logger.error('Failed to get document', {
        error: JSON.stringify(error),
        documentPath,
        action: 'get_document',
      });
      throw new Error(`Failed to get document: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  /**
   * CREATE NEW DOCUMENT
   *
   * Creates a new document in the specified Firestore collection.
   * Requires authentication - ID token must be provided during construction.
   *
   * @param collectionName - Name of the collection to create document in
   * @param data - Document data in Firestore format (with field types)
   * @returns Promise<FirestoreDocument> - The created document with generated ID and timestamps
   *
   * @throws Error - If authentication fails, validation fails, or creation is denied
   */
  async createDocument(
    collectionName: string,
    data: Partial<FirestoreDocument>,
  ): Promise<FirestoreDocument> {
    const headers = this.prepareHeaders(false); // Public access allowed (when Firestore rules permit)

    const response = await this.boundFetch(
      this.buildFirestoreUrl(collectionName, true),
      {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      this.logger.error('Failed to create document', {
        error: JSON.stringify(error),
        collectionName,
        action: 'create_document',
      });
      throw new Error(`Failed to create document: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  /**
   * UPDATE EXISTING DOCUMENT
   *
   * Updates specific fields in an existing Firestore document.
   * Only updates the fields provided - other fields remain unchanged.
   * Supports both public and authenticated access based on Firebase Security Rules.
   *
   * @param documentPath - Full path to the document (e.g., 'books/book123')
   * @param data - Partial document data with only fields to update
   * @returns Promise<FirestoreDocument> - The updated document with new updateTime
   *
   * @throws Error - If document doesn't exist, access is denied, or update is denied
   */
  async updateDocument(
    documentPath: string,
    data: Partial<FirestoreDocument>,
  ): Promise<FirestoreDocument> {
    const headers = this.prepareHeaders(false); // Public access allowed (when Firestore rules permit)

    const response = await this.boundFetch(
      this.buildFirestoreUrl(documentPath, false),
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      this.logger.error('Failed to update document', {
        error: JSON.stringify(error),
        documentPath,
        action: 'update_document',
      });
      throw new Error(`Failed to update document: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  /**
   * DELETE DOCUMENT
   *
   * Delete a document from Firestore.
   * Supports both public and authenticated access based on Firebase Security Rules.
   *
   * @param documentPath - Full path to the document (e.g., 'books/book123')
   * @throws Error - If document doesn't exist, access is denied, or deletion is denied
   */
  async deleteDocument(documentPath: string): Promise<void> {
    const headers = this.prepareHeaders(false); // Public access allowed (when Firestore rules permit)

    const response = await this.boundFetch(
      this.buildFirestoreUrl(documentPath, false),
      {
        method: 'DELETE',
        headers,
      },
    );

    if (!response.ok) {
      const error = await response.json();
      this.logger.error('Failed to delete document', {
        error: JSON.stringify(error),
        documentPath,
        action: 'delete_document',
      });
      throw new Error(`Failed to delete document: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Validates and sanitizes collection names to prevent path traversal attacks
   * @param collectionName - The collection name to validate
   * @returns string - The validated collection name
   * @throws Error - If collection name contains invalid characters
   */
  private validateCollectionName(collectionName: string): string {
    if (!collectionName || typeof collectionName !== 'string') {
      throw new Error('Collection name must be a non-empty string');
    }

    // Remove leading/trailing whitespace
    const trimmed = collectionName.trim();

    if (trimmed.length === 0) {
      throw new Error('Collection name cannot be empty');
    }

    // Check for path traversal attempts
    if (trimmed.includes('..') || trimmed.includes('/')) {
      throw new Error(
        'Collection name cannot contain path separators or traversal sequences',
      );
    }

    // Check for URL-unsafe characters that could cause injection
    if (
      trimmed.includes('?') ||
      trimmed.includes('#') ||
      trimmed.includes('&')
    ) {
      throw new Error(
        'Collection name cannot contain URL query or fragment characters',
      );
    }

    // Check for control characters
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
      throw new Error('Collection name cannot contain control characters');
    }

    return trimmed;
  }

  /**
   * Validates and sanitizes document paths to prevent path traversal attacks
   * @param documentPath - The document path to validate (e.g., 'collection/docId' or 'collection/subcollection/docId')
   * @returns string - The validated document path
   * @throws Error - If document path contains invalid characters or patterns
   */
  private validateDocumentPath(documentPath: string): string {
    if (!documentPath || typeof documentPath !== 'string') {
      throw new Error('Document path must be a non-empty string');
    }

    // Remove leading/trailing whitespace
    const trimmed = documentPath.trim();

    if (trimmed.length === 0) {
      throw new Error('Document path cannot be empty');
    }

    // Check for path traversal attempts
    if (trimmed.includes('..')) {
      throw new Error('Document path cannot contain path traversal sequences');
    }

    // Check for URL-unsafe characters that could cause injection
    if (
      trimmed.includes('?') ||
      trimmed.includes('#') ||
      trimmed.includes('&')
    ) {
      throw new Error(
        'Document path cannot contain URL query or fragment characters',
      );
    }

    // Check for control characters
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
      throw new Error('Document path cannot contain control characters');
    }

    // Validate path structure: should be collection/doc or collection/doc/subcol/doc etc.
    const pathParts = trimmed.split('/');
    if (pathParts.length < 2 || pathParts.length % 2 !== 0) {
      throw new Error(
        'Document path must follow the pattern: collection/document[/subcollection/subdocument]...',
      );
    }

    // Ensure no empty parts
    if (pathParts.some((part) => part.trim().length === 0)) {
      throw new Error('Document path cannot contain empty segments');
    }

    return trimmed;
  }

  /**
   * Securely constructs Firebase Auth API URLs
   * @param endpoint - The API endpoint (e.g., 'getAccountInfo')
   * @returns string - The securely constructed URL
   */
  private buildAuthUrl(endpoint: string): string {
    const baseUrl =
      'https://www.googleapis.com/identitytoolkit/v3/relyingparty/';
    const url = new URL(endpoint, baseUrl);
    url.searchParams.set('key', this.config.apiKey);
    return url.toString();
  }

  /**
   * Securely constructs Firestore API URLs
   * @param path - The Firestore path (collection name or document path)
   * @param isCollection - Whether this is a collection (true) or document (false) URL
   * @returns string - The securely constructed URL
   */
  private buildFirestoreUrl(
    path: string,
    isCollection: boolean = true,
  ): string {
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      this.config.projectId,
    )}/databases/(default)/documents/`;

    if (isCollection) {
      const validPath = this.validateCollectionName(path);
      const url = new URL(validPath, baseUrl);
      return url.toString();
    } else {
      const validPath = this.validateDocumentPath(path);
      const url = new URL(validPath, baseUrl);
      return url.toString();
    }
  }

  /**
   * Internal method to set the UID after token validation
   * Used by the factory function to set private properties
   */
  private setUid(uid: string): void {
    this.uid = uid;
  }

  /**
   * Prepares headers for Firebase API requests
   * Adds Authorization header only if idToken is provided
   * @param requireAuth - If true, throws error when no idToken is available
   * @returns Headers object for fetch request
   */
  private prepareHeaders(requireAuth: boolean = false): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.idToken) {
      headers.Authorization = `Bearer ${this.idToken}`;
    } else if (requireAuth) {
      throw new Error(
        'Authentication required. ID token must be provided for this operation.',
      );
    }

    return headers;
  }
}

/**
 * Helper function to create FirebaseRestApi instance from server environment variables with automatic token validation
 * @param serverEnv - Server environment variables from getServerEnv()
 * @param idToken - Firebase ID token for authentication
 * @param fetchImpl - Optional fetch implementation
 * @param logger - Optional logger instance
 * @returns Promise<FirebaseRestApi> - Initialized Firebase REST API instance
 * @throws Error if required Firebase environment variables are not available
 */
export async function createFirebaseRestApi(
  serverEnv: { FIREBASE_CONFIG?: string; FIREBASE_PROJECT_ID?: string },
  idToken?: string,
  fetchImpl?: FetchFunction,
  logger?: Logger,
): Promise<FirebaseRestApi> {
  if (!serverEnv.FIREBASE_CONFIG) {
    throw new Error(
      'FIREBASE_CONFIG environment variable is not set. Please ensure it is configured for Firebase functionality.',
    );
  }

  if (!serverEnv.FIREBASE_PROJECT_ID) {
    throw new Error(
      'FIREBASE_PROJECT_ID environment variable is not set. Please ensure it is configured for Firebase functionality.',
    );
  }

  let firebaseConfig: { apiKey: string };
  try {
    firebaseConfig = JSON.parse(serverEnv.FIREBASE_CONFIG);
  } catch {
    throw new Error(
      'FIREBASE_CONFIG environment variable contains invalid JSON. Please ensure it is properly formatted.',
    );
  }

  if (!firebaseConfig.apiKey) {
    throw new Error('FIREBASE_CONFIG is missing required apiKey property.');
  }

  const instance = new FirebaseRestApi(
    {
      apiKey: firebaseConfig.apiKey,
      projectId: serverEnv.FIREBASE_PROJECT_ID,
    },
    idToken,
    fetchImpl,
    logger,
  );

  // Validate token if provided
  if (idToken) {
    await instance.verifyAndSetIdToken(idToken);
  }

  return instance;
}
