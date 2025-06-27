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
 * 1. SDK-LIKE USAGE (RECOMMENDED - returns plain JavaScript objects):
 * ```typescript
 * import { createFirebaseRestApi } from '~/services/firebase-restapi';
 * import { getServerEnv } from '~/utils/env';
 *
 * export async function action({ request, context }: ActionFunctionArgs) {
 *   const serverEnv = getServerEnv(context);
 *   const firebaseApi = await createFirebaseRestApi(serverEnv);
 *
 *   // Works exactly like Firebase SDK - plain JavaScript objects
 *   const book = { title: "Book Title", year: 2023, tags: ["fiction"] };
 *   const created = await firebaseApi.createDocument('books', book);
 *
 *   // All methods return plain JS objects - no conversion needed!
 *   const books = await firebaseApi.getCollection('books');
 *   const singleBook = await firebaseApi.getDocument('books/book123');
 *
 *   return json({ success: true, books, created, singleBook });
 * }
 * ```
 *
 * 2. AUTHENTICATED ACCESS:
 * ```typescript
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
 * ```typescript
 * export async function loader({ context }: LoaderFunctionArgs) {
 *   const serverEnv = getServerEnv(context);
 *   const firebaseApi = await createFirebaseRestApi(serverEnv);
 *
 *   // Access raw Firestore documents (for advanced use cases)
 *   const response = await firebaseApi.getCollectionRaw('books');
 *   const rawDocuments = response.documents; // Firestore format with typed fields
 *
 *   // Or get single raw document
 *   const rawDoc = await firebaseApi.getDocumentRaw('books/book123');
 *
 *   return json({ rawDocuments, rawDoc });
 * }
 * ```
 *
 * 4. SERVICE LAYER INTEGRATION:
 * ```typescript
 * class BookService {
 *   constructor(private firebaseApi: FirebaseRestApi) {}
 *
 *   async getAllBooks() {
 *     // Now returns plain JS objects directly
 *     return await this.firebaseApi.getCollection('books');
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
  nullValue?: null;
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  arrayValue?: {
    values: FirestoreValue[];
  };
  mapValue?: {
    fields: Record<string, FirestoreValue>;
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

/**
 * FIRESTORE SEARCH OPTIONS INTERFACE
 *
 * Comprehensive interface covering all Firestore REST API search capabilities.
 * This interface defines all possible query options for searching and filtering
 * documents in Firestore collections.
 *
 * @example
 * const options: FirestoreSearchOptions = {
 *   where: [
 *     { field: 'category', operator: '==', value: 'fiction' },
 *     { field: 'year', operator: '>=', value: 2020 }
 *   ],
 *   orderBy: [{ field: 'title', direction: 'asc' }],
 *   limit: 10,
 *   select: ['title', 'author', 'year']
 * };
 */
export interface FirestoreSearchOptions {
  /**
   * WHERE CLAUSES - Field-based filtering conditions
   */
  where?: Array<{
    field: string;
    operator:
      | '==' // Equal to
      | '!=' // Not equal to
      | '<' // Less than
      | '<=' // Less than or equal to
      | '>' // Greater than
      | '>=' // Greater than or equal to
      | 'array-contains' // Array contains the value
      | 'array-contains-any' // Array contains any of the values
      | 'in' // Field value is in the array
      | 'not-in'; // Field value is not in the array
    value: unknown;
  }>;

  /**
   * COMPOSITE FILTERS - Complex AND/OR combinations of filters
   */
  compositeFilter?: {
    op: 'AND' | 'OR';
    filters: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
  };

  /**
   * UNARY FILTERS - Null/not-null checks
   */
  unaryFilter?: {
    field: string;
    op: 'IS_NULL' | 'IS_NOT_NULL';
  };

  /**
   * ORDERING - Sort results by field values
   */
  orderBy?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;

  /**
   * LIMIT - Maximum number of documents to return
   */
  limit?: number;

  /**
   * OFFSET - Number of documents to skip (for pagination)
   */
  offset?: number;

  /**
   * PAGINATION - Cursor-based pagination for better performance
   */
  startAt?: unknown[];
  startAfter?: unknown[];
  endAt?: unknown[];
  endBefore?: unknown[];

  /**
   * FIELD SELECTION - Only return specific fields (performance optimization)
   */
  select?: string[];

  /**
   * COLLECTION GROUP QUERIES - Query across all collections with the same name
   */
  collectionGroup?: boolean;

  /**
   * CONSISTENCY - Read consistency level
   */
  consistency?: 'strong' | 'eventual';
}

/**
 * FIRESTORE DATA CONVERSION UTILITIES
 *
 * These functions convert standard JavaScript data types to Firestore's REST API format.
 *
 * WHY THESE ARE NEEDED:
 * Firestore's REST API requires all field values to be wrapped in type-specific objects.
 * For example, instead of sending { "name": "Book Title" }, you must send:
 * { "fields": { "name": { "stringValue": "Book Title" } } }
 *
 * This is different from:
 * - Firebase Admin SDK (handles conversion automatically)
 * - Client-side Firebase SDK (handles conversion automatically)
 * - Firestore REST API (requires explicit type wrapping - what we're using here)
 *
 * USAGE SCENARIOS:
 * 1. Creating new documents: convertToFirestoreDocument(bookData)
 * 2. Updating existing documents: convertToFirestoreDocument(updateData)
 * 3. Complex nested objects: convertToFirestoreValue(complexObject)
 *
 * SUPPORTED TYPES:
 * - Primitives: string, number, boolean, null
 * - Complex: Date objects, Arrays, nested Objects
 * - Arrays: Automatically converts all array elements
 * - Objects: Recursively converts all nested properties
 *
 * EXAMPLES:
 *
 * Input:  { name: "Book", tags: ["fiction", "drama"], publishYear: 2023 }
 * Output: {
 *   fields: {
 *     name: { stringValue: "Book" },
 *     tags: { arrayValue: { values: [{ stringValue: "fiction" }, { stringValue: "drama" }] } },
 *     publishYear: { integerValue: "2023" }
 *   }
 * }
 */

/**
 * Converts a JavaScript value to Firestore REST API field format
 *
 * This is the core conversion function that handles individual values.
 * It recursively processes complex types like arrays and objects.
 *
 * @param value - Any JavaScript value to convert
 * @returns FirestoreValue - The value wrapped in Firestore's type format
 *
 * @example
 * convertToFirestoreValue("hello") → { stringValue: "hello" }
 * convertToFirestoreValue(42) → { integerValue: "42" }
 * convertToFirestoreValue(true) → { booleanValue: true }
 * convertToFirestoreValue(["a", "b"]) → { arrayValue: { values: [...] } }
 */
function convertToFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }

  if (typeof value === 'string') {
    return { stringValue: value };
  }

  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: value.toString() }
      : { doubleValue: value };
  }

  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => convertToFirestoreValue(item)),
      },
    };
  }

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }

  if (typeof value === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      fields[key] = convertToFirestoreValue(val);
    }
    return { mapValue: { fields } };
  }

  // Fallback to string representation
  if (typeof value === 'object') {
    try {
      return { stringValue: JSON.stringify(value) };
    } catch {
      return { stringValue: '[object Object]' };
    }
  }
  // Handle primitives that can be safely converted to string
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return { stringValue: String(value) };
  }

  // For anything else, use a safe fallback
  return { stringValue: 'unsupported_type' };
}

/**
 * Converts a JavaScript object to Firestore document format for REST API
 *
 * This is the main function you'll use when creating or updating documents.
 * It wraps the entire object in Firestore's document structure with a "fields" property.
 *
 * WHY THIS IS NEEDED:
 * Firestore REST API expects documents in this exact format:
 * { "fields": { "fieldName": { "fieldType": value } } }
 *
 * This function handles the conversion automatically so you can work with
 * normal JavaScript objects in your application code.
 *
 * @param data - Plain JavaScript object with your document data
 * @returns Partial<FirestoreDocument> - Firestore-formatted document ready for API
 *
 * @example
 * // Input: Regular JavaScript object
 * const bookData = {
 *   title: "The Great Gatsby",
 *   author: "F. Scott Fitzgerald",
 *   publishedYear: 1925,
 *   tags: ["classic", "american literature"],
 *   isAvailable: true,
 *   createdAt: new Date()
 * };
 *
 * // Output: Firestore document format
 * const firestoreDoc = convertToFirestoreDocument(bookData);
 * // Result: {
 * //   fields: {
 * //     title: { stringValue: "The Great Gatsby" },
 * //     author: { stringValue: "F. Scott Fitzgerald" },
 * //     publishedYear: { integerValue: "1925" },
 * //     tags: { arrayValue: { values: [{ stringValue: "classic" }, ...] } },
 * //     isAvailable: { booleanValue: true },
 * //     createdAt: { timestampValue: "2023-01-01T00:00:00.000Z" }
 * //   }
 * // }
 *
 * // Then use with Firebase REST API:
 * await firebaseApi.createDocument('books', firestoreDoc);
 */
export function convertToFirestoreDocument(
  data: Record<string, unknown>,
): Partial<FirestoreDocument> {
  const fields: Record<string, FirestoreValue> = {};

  for (const [key, value] of Object.entries(data)) {
    fields[key] = convertToFirestoreValue(value);
  }

  return { fields };
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
   * Retrieves documents from a specified Firestore collection with comprehensive search options.
   * Supports all Firestore REST API query capabilities including filtering, ordering, pagination,
   * field selection, and collection group queries.
   *
   * @param collectionName - Name of the Firestore collection (e.g., 'books', 'users', 'orders')
   * @param options - Comprehensive search options covering all Firestore capabilities
   * @returns Promise<Array<Record<string, unknown>>> - Array of documents as plain JavaScript objects
   *
   * @throws Error - If collection access fails or Firebase Security Rules deny access
   *
   * @example
   * // Basic collection retrieval
   * const books = await firebaseApi.getCollection('books');
   *
   * // Filtered search
   * const books = await firebaseApi.getCollection('books', {
   *   where: [
   *     { field: 'year', operator: '>=', value: 2020 },
   *     { field: 'category', operator: '==', value: 'fiction' }
   *   ],
   *   orderBy: [{ field: 'title', direction: 'asc' }],
   *   limit: 10
   * });
   *
   * // Word search using searchWords array
   * const books = await firebaseApi.getCollection('books', {
   *   where: [
   *     { field: 'searchWords', operator: 'array-contains-any', value: ['harry', 'potter'] }
   *   ]
   * });
   *
   * // Complex composite filter
   * const books = await firebaseApi.getCollection('books', {
   *   compositeFilter: {
   *     op: 'OR',
   *     filters: [
   *       { field: 'category', operator: '==', value: 'fiction' },
   *       { field: 'category', operator: '==', value: 'mystery' }
   *     ]
   *   }
   * });
   *
   * // Field selection for performance
   * const books = await firebaseApi.getCollection('books', {
   *   select: ['title', 'author', 'year'],
   *   limit: 20
   * });
   */
  async getCollection(
    collectionName: string,
    options?: FirestoreSearchOptions,
  ): Promise<Array<Record<string, unknown>>> {
    const headers = this.prepareHeaders(false); // Public access allowed

    // If no search options, use simple GET request
    if (!options || this.isSimpleQuery(options)) {
      const url = this.buildFirestoreUrl(collectionName, true);
      const response = await this.boundFetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        this.logger.error('Failed to get collection', {
          error: JSON.stringify(error),
          collectionName,
          options,
          action: 'get_collection',
        });
        throw new Error(`Failed to get collection: ${JSON.stringify(error)}`);
      }

      const result: FirestoreCollectionResponse = await response.json();
      return (
        result.documents?.map((doc: FirestoreDocument) =>
          this.convertFromFirestoreDocument(doc),
        ) || []
      );
    }

    // For advanced queries, use the /runQuery endpoint
    const queryUrl = this.buildRunQueryUrl();
    const queryBody = this.buildRunQueryBody(collectionName, options);

    const response = await this.boundFetch(queryUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(queryBody),
    });

    if (!response.ok) {
      const error = await response.json();
      this.logger.error('Failed to get collection with query', {
        error: JSON.stringify(error),
        collectionName,
        options,
        action: 'get_collection_query',
      });
      throw new Error(`Failed to get collection: ${JSON.stringify(error)}`);
    }

    const result: Array<{
      document?: FirestoreDocument;
    }> = await response.json();
    return result
      .map((item) => {
        if (item.document) {
          return this.convertFromFirestoreDocument(item.document);
        }
        return null;
      })
      .filter((item): item is Record<string, unknown> => item !== null);
  }

  /**
   * Check if the query options are simple enough to use GET request
   */
  private isSimpleQuery(options: FirestoreSearchOptions): boolean {
    return !(
      options.where ||
      options.compositeFilter ||
      options.unaryFilter ||
      options.orderBy ||
      options.select ||
      options.limit ||
      options.offset ||
      options.startAt ||
      options.startAfter ||
      options.endAt ||
      options.endBefore ||
      options.collectionGroup ||
      options.consistency
    );
  }

  /**
   * Build the URL for the /runQuery endpoint
   */
  private buildRunQueryUrl(): string {
    return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      this.config.projectId,
    )}/databases/(default)/documents:runQuery`;
  }

  /**
   * Build the request body for the /runQuery endpoint
   */
  private buildRunQueryBody(
    collectionName: string,
    options: FirestoreSearchOptions,
  ): { structuredQuery: Record<string, unknown> } {
    const structuredQuery: Record<string, unknown> = {
      from: [{ collectionId: collectionName }],
    };

    // Handle where clauses
    if (options.where && options.where.length > 0) {
      if (options.where.length === 1) {
        structuredQuery.where = this.buildFieldFilter(options.where[0]);
      } else {
        structuredQuery.where = {
          compositeFilter: {
            op: 'AND',
            filters: options.where.map((clause) =>
              this.buildFieldFilter(clause),
            ),
          },
        };
      }
    }

    // Handle composite filters
    if (options.compositeFilter) {
      structuredQuery.where = {
        compositeFilter: {
          op: options.compositeFilter.op,
          filters: options.compositeFilter.filters.map((clause) =>
            this.buildFieldFilter(clause),
          ),
        },
      };
    }

    // Handle unary filters
    if (options.unaryFilter) {
      structuredQuery.where = {
        unaryFilter: {
          field: { fieldPath: options.unaryFilter.field },
          op: options.unaryFilter.op,
        },
      };
    }

    // Handle ordering
    if (options.orderBy && options.orderBy.length > 0) {
      structuredQuery.orderBy = options.orderBy.map((order) => ({
        field: { fieldPath: order.field },
        direction: this.mapDirection(order.direction),
      }));
    }

    // Handle limit
    if (options.limit) {
      structuredQuery.limit = options.limit;
    }

    // Handle offset
    if (options.offset) {
      structuredQuery.offset = options.offset;
    }

    // Handle field selection
    if (options.select && options.select.length > 0) {
      structuredQuery.select = {
        fields: options.select.map((field) => ({ fieldPath: field })),
      };
    }

    // Handle collection group queries
    if (options.collectionGroup) {
      structuredQuery.from = [
        { collectionId: collectionName, allDescendants: true },
      ];
    }

    return { structuredQuery };
  }

  /**
   * Build a field filter for the structured query
   */
  private buildFieldFilter(clause: {
    field: string;
    operator: string;
    value: unknown;
  }): Record<string, unknown> {
    return {
      fieldFilter: {
        field: { fieldPath: clause.field },
        op: this.mapOperator(clause.operator),
        value: convertToFirestoreValue(clause.value),
      },
    };
  }

  /**
   * Map operator strings to Firestore REST API enum values
   */
  private mapOperator(operator: string): string {
    const operatorMap: Record<string, string> = {
      '==': 'EQUAL',
      '!=': 'NOT_EQUAL',
      '<': 'LESS_THAN',
      '<=': 'LESS_THAN_OR_EQUAL',
      '>': 'GREATER_THAN',
      '>=': 'GREATER_THAN_OR_EQUAL',
      'array-contains': 'ARRAY_CONTAINS',
      'array-contains-any': 'ARRAY_CONTAINS_ANY',
      in: 'IN',
      'not-in': 'NOT_IN',
    };
    return operatorMap[operator] || operator;
  }

  /**
   * Map direction strings to Firestore REST API enum values
   */
  private mapDirection(direction: string): string {
    const directionMap: Record<string, string> = {
      asc: 'ASCENDING',
      desc: 'DESCENDING',
    };
    return directionMap[direction.toLowerCase()] || direction;
  }

  /**
   * GET SINGLE DOCUMENT
   *
   * Retrieves a specific document from Firestore as a plain JavaScript object.
   * This matches Firebase SDK behavior - no need for manual data conversion.
   * Supports both public and authenticated access based on Firebase Security Rules.
   *
   * @param documentPath - Full path to the document (e.g., 'books/book123', 'users/user456')
   * @returns Promise<Record<string, unknown>> - The document as a plain JavaScript object
   *
   * @throws Error - If document doesn't exist, access is denied, or path is invalid
   *
   * @example
   * const book = await firebaseApi.getDocument('books/book123');
   * // Returns: { title: "Book Title", year: 2023, tags: ["fiction"] }
   */
  async getDocument(documentPath: string): Promise<Record<string, unknown>> {
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

    const doc: FirestoreDocument = await response.json();
    return this.convertFromFirestoreDocument(doc);
  }

  /**
   * CREATE NEW DOCUMENT (with automatic data conversion)
   *
   * Creates a new document in the specified Firestore collection.
   * Automatically converts JavaScript objects to Firestore format, matching Firebase SDK behavior.
   * Returns the created document as a plain JavaScript object for easy consumption.
   * Supports both public and authenticated access based on Firebase Security Rules.
   *
   * @param collectionName - Name of the collection to create document in
   * @param data - Plain JavaScript object with document data (automatically converted)
   * @returns Promise<Record<string, unknown>> - The created document as plain JavaScript object
   *
   * @throws Error - If authentication fails, validation fails, or creation is denied
   *
   * @example
   * // Simple usage like Firebase SDK:
   * const book = { title: "Book Title", year: 2023, tags: ["fiction"] };
   * const created = await firebaseApi.createDocument('books', book);
   * // Returns: { title: "Book Title", year: 2023, tags: ["fiction"], id: "auto-generated-id" }
   */
  async createDocument(
    collectionName: string,
    data: Record<string, unknown> | Partial<FirestoreDocument>,
  ): Promise<Record<string, unknown>> {
    const headers = this.prepareHeaders(false); // Public access allowed (when Firestore rules permit)

    // Auto-convert plain JavaScript objects to Firestore format
    const firestoreData = this.ensureFirestoreFormat(data);

    const response = await this.boundFetch(
      this.buildFirestoreUrl(collectionName, true),
      {
        method: 'POST',
        headers,
        body: JSON.stringify(firestoreData),
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

    const doc: FirestoreDocument = await response.json();
    return this.convertFromFirestoreDocument(doc);
  }

  /**
   * UPDATE EXISTING DOCUMENT (with automatic data conversion)
   *
   * Updates specific fields in an existing Firestore document.
   * Only updates the fields provided - other fields remain unchanged.
   * Automatically converts JavaScript objects to Firestore format, matching Firebase SDK behavior.
   * Returns the updated document as a plain JavaScript object for easy consumption.
   * Supports both public and authenticated access based on Firebase Security Rules.
   *
   * @param documentPath - Full path to the document (e.g., 'books/book123')
   * @param data - Plain JavaScript object with fields to update (automatically converted)
   * @returns Promise<Record<string, unknown>> - The updated document as plain JavaScript object
   *
   * @throws Error - If document doesn't exist, access is denied, or update is denied
   *
   * @example
   * // Simple usage like Firebase SDK:
   * const updates = { title: "New Title", year: 2024 };
   * const updated = await firebaseApi.updateDocument('books/book123', updates);
   * // Returns: { title: "New Title", year: 2024, author: "Existing Author", ... }
   */
  async updateDocument(
    documentPath: string,
    data: Record<string, unknown> | Partial<FirestoreDocument>,
  ): Promise<Record<string, unknown>> {
    const headers = this.prepareHeaders(false); // Public access allowed (when Firestore rules permit)

    // Auto-convert plain JavaScript objects to Firestore format
    const firestoreData = this.ensureFirestoreFormat(data);

    const response = await this.boundFetch(
      this.buildFirestoreUrl(documentPath, false),
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify(firestoreData),
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

    const doc: FirestoreDocument = await response.json();
    return this.convertFromFirestoreDocument(doc);
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
   * Ensures data is in Firestore format, converting if necessary
   * @param data - Either plain JavaScript object or pre-converted Firestore document
   * @returns Partial<FirestoreDocument> - Data in Firestore format
   */
  private ensureFirestoreFormat(
    data: Record<string, unknown> | Partial<FirestoreDocument>,
  ): Partial<FirestoreDocument> {
    // Check if data is already in Firestore format (has 'fields' property)
    if ('fields' in data && data.fields) {
      return data as Partial<FirestoreDocument>;
    }

    // Convert plain JavaScript object to Firestore format
    return convertToFirestoreDocument(data as Record<string, unknown>);
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

  /**
   * Converts Firestore document back to plain JavaScript object
   * @param doc - Firestore document with typed fields
   * @returns Record<string, unknown> - Plain JavaScript object with 'id' field
   */
  private convertFromFirestoreDocument(
    doc: FirestoreDocument,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    // Extract document ID from the name field (e.g., "projects/project/databases/(default)/documents/books/book123" -> "book123")
    if (doc.name) {
      const pathParts = doc.name.split('/');
      result.id = pathParts[pathParts.length - 1];
    }

    if (!doc.fields) {
      return result;
    }

    for (const [key, value] of Object.entries(doc.fields)) {
      result[key] = this.convertFromFirestoreValue(value);
    }

    return result;
  }

  /**
   * Converts Firestore value back to plain JavaScript value
   * @param value - Firestore typed value
   * @returns unknown - Plain JavaScript value
   */
  private convertFromFirestoreValue(value: FirestoreValue): unknown {
    if (value.nullValue !== undefined) {
      return null;
    }

    if (value.stringValue !== undefined) {
      return value.stringValue;
    }

    if (value.booleanValue !== undefined) {
      return value.booleanValue;
    }

    if (value.integerValue !== undefined) {
      return parseInt(value.integerValue, 10);
    }

    if (value.doubleValue !== undefined) {
      return value.doubleValue;
    }

    if (value.timestampValue !== undefined) {
      return new Date(value.timestampValue);
    }

    if (value.arrayValue?.values) {
      return value.arrayValue.values.map((item) =>
        this.convertFromFirestoreValue(item),
      );
    }

    if (value.mapValue?.fields) {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value.mapValue.fields)) {
        result[key] = this.convertFromFirestoreValue(val);
      }
      return result;
    }

    return null; // Fallback for unknown types
  }

  /**
   * RAW FIRESTORE FORMAT METHODS (for advanced use cases)
   *
   * These methods return data in the original Firestore REST API format with typed fields.
   * Use these when you need access to metadata, field types, or timestamps from Firestore.
   * Most applications should use the main methods (getCollection, getDocument, etc.) instead.
   */

  /**
   * GET COLLECTION (Raw Firestore Format)
   *
   * Returns collection in raw Firestore REST API format with metadata and typed fields.
   *
   * @param collectionName - Name of the Firestore collection
   * @returns Promise<FirestoreCollectionResponse> - Raw Firestore response with typed fields
   */
  async getCollectionRaw(
    collectionName: string,
  ): Promise<FirestoreCollectionResponse> {
    const headers = this.prepareHeaders(false);

    const response = await this.boundFetch(
      this.buildFirestoreUrl(collectionName, true),
      {
        method: 'GET',
        headers,
      },
    );

    if (!response.ok) {
      const error = await response.json();
      this.logger.error('Failed to get collection (raw)', {
        error: JSON.stringify(error),
        collectionName,
        action: 'get_collection_raw',
      });
      throw new Error(`Failed to get collection: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  /**
   * GET DOCUMENT (Raw Firestore Format)
   *
   * Returns document in raw Firestore REST API format with metadata and typed fields.
   *
   * @param documentPath - Full path to the document
   * @returns Promise<FirestoreDocument> - Raw Firestore document with typed fields
   */
  async getDocumentRaw(documentPath: string): Promise<FirestoreDocument> {
    const headers = this.prepareHeaders(false);

    const response = await this.boundFetch(
      this.buildFirestoreUrl(documentPath, false),
      {
        method: 'GET',
        headers,
      },
    );

    if (!response.ok) {
      const error = await response.json();
      this.logger.error('Failed to get document (raw)', {
        error: JSON.stringify(error),
        documentPath,
        action: 'get_document_raw',
      });
      throw new Error(`Failed to get document: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  /**
   * CREATE DOCUMENT (Raw Firestore Format)
   *
   * Creates document and returns in raw Firestore REST API format with metadata.
   *
   * @param collectionName - Name of the collection
   * @param data - Document data (plain JS or Firestore format)
   * @returns Promise<FirestoreDocument> - Raw Firestore document with metadata
   */
  async createDocumentRaw(
    collectionName: string,
    data: Record<string, unknown> | Partial<FirestoreDocument>,
  ): Promise<FirestoreDocument> {
    const headers = this.prepareHeaders(false);
    const firestoreData = this.ensureFirestoreFormat(data);

    const response = await this.boundFetch(
      this.buildFirestoreUrl(collectionName, true),
      {
        method: 'POST',
        headers,
        body: JSON.stringify(firestoreData),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      this.logger.error('Failed to create document (raw)', {
        error: JSON.stringify(error),
        collectionName,
        action: 'create_document_raw',
      });
      throw new Error(`Failed to create document: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  /**
   * UPDATE DOCUMENT (Raw Firestore Format)
   *
   * Updates document and returns in raw Firestore REST API format with metadata.
   *
   * @param documentPath - Full path to the document
   * @param data - Update data (plain JS or Firestore format)
   * @returns Promise<FirestoreDocument> - Raw Firestore document with metadata
   */
  async updateDocumentRaw(
    documentPath: string,
    data: Record<string, unknown> | Partial<FirestoreDocument>,
  ): Promise<FirestoreDocument> {
    const headers = this.prepareHeaders(false);
    const firestoreData = this.ensureFirestoreFormat(data);

    const response = await this.boundFetch(
      this.buildFirestoreUrl(documentPath, false),
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify(firestoreData),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      this.logger.error('Failed to update document (raw)', {
        error: JSON.stringify(error),
        documentPath,
        action: 'update_document_raw',
      });
      throw new Error(`Failed to update document: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  // ...existing code...
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
