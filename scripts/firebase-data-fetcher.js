#!/usr/bin/env node

/* eslint-env node */
import { config } from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import process from 'process';

// Load environment variables
config({ path: '.dev.vars' });

/**
 * Generic Firebase Firestore Data Fetcher using Admin SDK
 *
 * This script uses Firebase Admin SDK to bypass Firestore security rules
 * and fetch data directly from collections for debugging and development.
 *
 * Required Environment Variables:
 * - FIREBASE_PROJECT_ID: Your Firebase project ID
 * - FIREBASE_SERVICE_ACCOUNT_KEY: Service account key JSON (as string)
 *
 * Usage:
 * node scripts/firebase-data-fetcher.js <collection> [options]
 *
 * Examples:
 * node scripts/firebase-data-fetcher.js books
 * node scripts/firebase-data-fetcher.js books --limit 5
 * node scripts/firebase-data-fetcher.js books --doc book-1
 * node scripts/firebase-data-fetcher.js books --where "author,==,Harper Lee"
 * node scripts/firebase-data-fetcher.js books --orderBy createdAt --limit 10
 * node scripts/firebase-data-fetcher.js books --all
 * node scripts/firebase-data-fetcher.js books --preview 10
 */

// Load environment variables
config({ path: '.dev.vars' });

class FirebaseDataFetcher {
  constructor() {
    this.app = null;
    this.db = null;
  }

  async initialize() {
    try {
      console.log('🔧 Initializing Firebase Admin SDK...');

      // Check if Firebase Admin is already initialized
      if (getApps().length === 0) {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        if (!projectId) {
          throw new Error('FIREBASE_PROJECT_ID environment variable is required');
        }

        if (!serviceAccountKey) {
          throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required');
        }

        // Parse the service account key
        let serviceAccount;
        try {
          serviceAccount = JSON.parse(serviceAccountKey);
        } catch (error) {
          throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY must be valid JSON');
        }

        const adminConfig = {
          credential: cert(serviceAccount),
          projectId: projectId,
        };

        initializeApp(adminConfig);
      }

      this.db = getFirestore();
      console.log('📋 Config check:');
      console.log('- Project ID:', process.env.FIREBASE_PROJECT_ID);
      console.log('✅ Firebase Admin SDK initialized successfully\n');

    } catch (error) {
      console.error('❌ Firebase initialization failed:', error.message);
      process.exit(1);
    }
  }

  async fetchCollection(collectionName, options = {}) {
    try {
      console.log(`📚 Fetching from collection: ${collectionName}`);

      let queryRef = this.db.collection(collectionName);

      // Apply query constraints using Admin SDK syntax
      if (options.where) {
        const [field, operator, value] = options.where.split(',');
        queryRef = queryRef.where(field.trim(), operator.trim(), value.trim());
        console.log(`📍 Filter: ${field} ${operator} ${value}`);
      }

      if (options.orderBy) {
        queryRef = queryRef.orderBy(options.orderBy);
        console.log(`📊 Order by: ${options.orderBy}`);
      }

      if (options.limit) {
        queryRef = queryRef.limit(parseInt(options.limit));
        console.log(`🔢 Limit: ${options.limit}`);
      }

      const snapshot = await queryRef.get();

      console.log(`✅ Found ${snapshot.size} documents\n`);

      // Display results
      let count = 0;
      const displayLimit = options.preview ? parseInt(options.preview) : 3;

      snapshot.forEach((docSnap) => {
        if (count < displayLimit || options.all) {
          const data = docSnap.data();
          console.log(`📄 Document ${count + 1}:`);
          console.log(`   ID: ${docSnap.id}`);
          console.log(`   Data:`, JSON.stringify(data, null, 4));
          console.log('');
        }
        count++;
      });

      if (snapshot.size > displayLimit && !options.all) {
        console.log(`   ... and ${snapshot.size - displayLimit} more documents`);
        console.log(`   Use --all to see all documents or --preview N to see more`);
      }

      return snapshot;

    } catch (error) {
      console.error('❌ Collection fetch failed:', error.message);
      throw error;
    }
  }

  async fetchDocument(collectionName, docId) {
    try {
      console.log(`📄 Fetching document: ${collectionName}/${docId}`);

      const docRef = this.db.collection(collectionName).doc(docId);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        console.log('✅ Document found\n');
        console.log(`📄 Document ID: ${docSnap.id}`);
        console.log(`📋 Document data:`, JSON.stringify(docSnap.data(), null, 2));
        return docSnap;
      } else {
        console.log('❌ Document not found');
        return null;
      }

    } catch (error) {
      console.error('❌ Document fetch failed:', error.message);
      throw error;
    }
  }

  async listCollections() {
    console.log('📚 Available collections:');
    console.log('   Note: Firestore doesn\'t provide collection listing.');
    console.log('   Common collections in this project: books');
    console.log('   Use: node scripts/firebase-data-fetcher.js <collection-name>');
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
🔥 Firebase Data Fetcher (Admin SDK)
====================================

Uses Firebase Admin SDK to bypass security rules for development/debugging.

Required Environment Variables:
- FIREBASE_PROJECT_ID
- FIREBASE_SERVICE_ACCOUNT_KEY

Usage: node scripts/firebase-data-fetcher.js <collection> [options]

Commands:
  <collection>              Fetch all documents from collection
  <collection> --doc <id>   Fetch specific document by ID

Options:
  --limit <number>          Limit number of documents returned
  --where <field,op,value>  Filter documents (e.g., "name,==,John")
  --orderBy <field>         Order documents by field
  --preview <number>        Number of documents to preview (default: 3)
  --all                     Show all documents (no preview limit)

Examples:
  node scripts/firebase-data-fetcher.js books
  node scripts/firebase-data-fetcher.js books --limit 5
  node scripts/firebase-data-fetcher.js books --doc book-1
  node scripts/firebase-data-fetcher.js books --where "author,==,Harper Lee"
  node scripts/firebase-data-fetcher.js books --orderBy createdAt --limit 10
  node scripts/firebase-data-fetcher.js books --all
`);
    process.exit(0);
  }

  const options = {
    collection: args[0]
  };

  for (let i = 1; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case '--doc':
        options.docId = value;
        break;
      case '--limit':
        options.limit = value;
        break;
      case '--where':
        options.where = value;
        break;
      case '--orderBy':
        options.orderBy = value;
        break;
      case '--preview':
        options.preview = value;
        break;
      case '--all':
        options.all = true;
        i--; // No value needed for this flag
        break;
      default:
        console.warn(`Unknown flag: ${flag}`);
    }
  }

  return options;
}

// Main execution
async function main() {
  try {
    const options = parseArgs();
    const fetcher = new FirebaseDataFetcher();

    await fetcher.initialize();

    if (options.docId) {
      await fetcher.fetchDocument(options.collection, options.docId);
    } else {
      await fetcher.fetchCollection(options.collection, options);
    }

    console.log('\n🎉 Operation completed successfully!');

  } catch (error) {
    console.error('\n❌ Operation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { FirebaseDataFetcher };
