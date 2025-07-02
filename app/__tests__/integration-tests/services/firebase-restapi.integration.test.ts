/**
 * Firebase REST API Integration Tests
 *
 * Tests the getCollection() method with various search options against real Firestore.
 * These tests verify that the search options are correctly converted to Firestore REST API
 * queries and return expected results.
 *
 * Run with: npm run test:integration
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.dev.vars' });
import { describe, it, expect, beforeAll } from '@jest/globals';
import { createFirebaseRestApi } from '../../../services/firebase-restapi';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Mock server environment for testing
const mockServerEnv = {
  FIREBASE_CONFIG: process.env.FIREBASE_CONFIG,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
};

// Mock logger that sends output to null (suppresses console output during tests)
const mockLogger = {
  error: () => {},
  warn: () => {},
  info: () => {},
  debug: () => {},
};

// Load test data from books.json
const booksJsonPath = resolve(__dirname, '../../test-data/books.json');
const testBooks: Array<Record<string, unknown>> = JSON.parse(
  readFileSync(booksJsonPath, 'utf-8'),
);

describe('FirebaseRestApi Integration Tests', () => {
  let firebaseApi: Awaited<ReturnType<typeof createFirebaseRestApi>>;
  const testCollectionName = 'test-books-integration';

  beforeAll(async () => {
    if (!mockServerEnv.FIREBASE_CONFIG || !mockServerEnv.FIREBASE_PROJECT_ID) {
      throw new Error(
        'FIREBASE_CONFIG and FIREBASE_PROJECT_ID environment variables are required for integration tests',
      );
    }
    firebaseApi = await createFirebaseRestApi(
      mockServerEnv,
      undefined,
      undefined,
      mockLogger,
    );
  });

  describe('getCollection with search options', () => {
    it('should return all documents when no search options provided', async () => {
      const results = await firebaseApi.getCollection(testCollectionName);
      expect(results).toHaveLength(testBooks.length);
      expect(results.map((book) => book.title as string)).toEqual(
        expect.arrayContaining(testBooks.map((book) => book.title)),
      );
    });

    it('should filter by simple where clause (string equality)', async () => {
      const results = await firebaseApi.getCollection(testCollectionName, {
        where: [{ field: 'author', operator: '==', value: 'J.R.R. Tolkien' }],
      });
      expect(results).toHaveLength(2);
      expect(results.every((book) => book.author === 'J.R.R. Tolkien')).toBe(
        true,
      );
      expect(results.map((book) => book.title as string)).toContain(
        'The Lord of the Rings',
      );
      expect(results.map((book) => book.title as string)).toContain(
        'The Hobbit',
      );
    });

    it('should filter by numeric comparison (greater than)', async () => {
      const results = await firebaseApi.getCollection(testCollectionName, {
        where: [{ field: 'year', operator: '>', value: 1950 }],
      });
      expect(results).toHaveLength(2);
      expect(results.every((book) => (book.year as number) > 1950)).toBe(true);
      expect(results.map((book) => book.title as string)).toContain(
        'To Kill a Mockingbird',
      );
      expect(results.map((book) => book.title as string)).toContain(
        'The Lord of the Rings',
      );
    });

    it('should filter by boolean field', async () => {
      const results = await firebaseApi.getCollection(testCollectionName, {
        where: [{ field: 'available', operator: '==', value: true }],
      });
      expect(results).toHaveLength(4);
      expect(results.every((book) => book.available === true)).toBe(true);
    });

    it('should filter by array contains', async () => {
      const results = await firebaseApi.getCollection(testCollectionName, {
        where: [
          { field: 'tags', operator: 'array-contains', value: 'fantasy' },
        ],
      });
      expect(results).toHaveLength(2);
      expect(
        results.every((book) => (book.tags as string[]).includes('fantasy')),
      ).toBe(true);
      expect(results.map((book) => book.title as string)).toContain(
        'The Lord of the Rings',
      );
      expect(results.map((book) => book.title as string)).toContain(
        'The Hobbit',
      );
    });

    it('should filter by array contains any', async () => {
      const results = await firebaseApi.getCollection(testCollectionName, {
        where: [
          {
            field: 'tags',
            operator: 'array-contains-any',
            value: ['fantasy', 'fiction'],
          },
        ],
      });
      expect(results).toHaveLength(5);
      const titles = results.map((book) => book.title as string);
      expect(titles).toContain('The Lord of the Rings');
      expect(titles).toContain('The Hobbit');
      expect(titles).toContain('To Kill a Mockingbird');
      expect(titles).toContain('1984');
      expect(titles).toContain('The Great Gatsby');
    });

    it('should filter by in operator', async () => {
      const results = await firebaseApi.getCollection(testCollectionName, {
        where: [
          { field: 'genre', operator: 'in', value: ['fantasy', 'fiction'] },
        ],
      });
      expect(results).toHaveLength(4);
      const genres = results.map((book) => book.genre as string);
      expect(genres).toContain('fantasy');
      expect(genres).toContain('fiction');
    });

    it('should handle composite filter with AND', async () => {
      const results = await firebaseApi.getCollection(testCollectionName, {
        compositeFilter: {
          op: 'AND',
          filters: [
            { field: 'author', operator: '==', value: 'J.R.R. Tolkien' },
            { field: 'available', operator: '==', value: true },
          ],
        },
      });
      expect(results).toHaveLength(2);
      expect(
        results.every(
          (book) => book.author === 'J.R.R. Tolkien' && book.available === true,
        ),
      ).toBe(true);
    });

    it('should handle composite filter with OR', async () => {
      const results = await firebaseApi.getCollection(testCollectionName, {
        compositeFilter: {
          op: 'OR',
          filters: [
            { field: 'author', operator: '==', value: 'J.R.R. Tolkien' },
            { field: 'author', operator: '==', value: 'Jane Austen' },
          ],
        },
      });
      expect(results).toHaveLength(3);
      const authors = results.map((book) => book.author as string);
      expect(authors).toContain('J.R.R. Tolkien');
      expect(authors).toContain('Jane Austen');
    });

    it('should order results by field (ascending)', async () => {
      const results = await firebaseApi.getCollection(testCollectionName, {
        orderBy: [{ field: 'year', direction: 'asc' }],
      });
      expect(results).toHaveLength(testBooks.length);
      const years = results.map((book) => book.year as number);
      expect(years).toEqual([...years].sort((a, b) => a - b));
    });

    it('should order results by field (descending)', async () => {
      const results = await firebaseApi.getCollection(testCollectionName, {
        orderBy: [{ field: 'year', direction: 'desc' }],
      });
      expect(results).toHaveLength(testBooks.length);
      const years = results.map((book) => book.year as number);
      expect(years).toEqual([...years].sort((a, b) => b - a));
    });

    it('should limit number of results', async () => {
      const results = await firebaseApi.getCollection(testCollectionName, {
        limit: 2,
      });
      expect(results).toHaveLength(2);
    });

    it('should select specific fields only', async () => {
      const results = await firebaseApi.getCollection(testCollectionName, {
        select: ['title', 'author', 'year'],
      });
      expect(results).toHaveLength(testBooks.length);
      results.forEach((book) => {
        expect(book).toHaveProperty('title');
        expect(book).toHaveProperty('author');
        expect(book).toHaveProperty('year');
        expect(book).not.toHaveProperty('price');
        expect(book).not.toHaveProperty('tags');
      });
    });

    it('should combine multiple search options', async () => {
      const results = await firebaseApi.getCollection(testCollectionName, {
        where: [{ field: 'available', operator: '==', value: true }],
        orderBy: [{ field: 'rating', direction: 'desc' }],
        limit: 2,
        select: ['title', 'rating'],
      });
      expect(results).toHaveLength(2);
      results.forEach((book) => {
        expect(book).toHaveProperty('title');
        expect(book).toHaveProperty('rating');
        expect(book).not.toHaveProperty('author');
        expect(book).not.toHaveProperty('available');
      });
      const ratings = results.map((book) => book.rating as number);
      expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
    });
  });

  describe('Error handling', () => {
    it('should handle invalid field names gracefully', async () => {
      const results = await firebaseApi.getCollection(testCollectionName, {
        where: [{ field: 'nonexistent_field', operator: '==', value: 'test' }],
      });
      expect(results).toEqual([]);
    });

    it('should handle invalid operator gracefully', async () => {
      await expect(
        firebaseApi.getCollection(testCollectionName, {
          where: [
            {
              field: 'title',
              operator: 'invalid_operator' as never,
              value: 'test',
            },
          ],
        }),
      ).rejects.toThrow();
    });

    it('should handle empty collection gracefully', async () => {
      await expect(
        firebaseApi.getCollection('nonexistent-collection'),
      ).rejects.toThrow('Missing or insufficient permissions');
    });
  });
});
