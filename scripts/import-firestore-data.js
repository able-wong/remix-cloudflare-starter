#!/usr/bin/env node

/**
 * Firestore Data Import Script
 *
 * Imports JSON data into a Firestore collection using Firebase Admin SDK.
 *
 * Usage:
 *   node scripts/import-firestore-data.js <json-file-path> <collection-name> [--clear]
 *
 * Options:
 *   --clear    Delete all existing documents in the collection before importing
 *
 * Example:
 *   node scripts/import-firestore-data.js data/users.json users --clear
 *
 * JSON Format Expected:
 *   [
 *     { "name": "John", "email": "john@example.com" },
 *     { "name": "Jane", "email": "jane@example.com" }
 *   ]
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import process from 'process';
import { config } from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Load environment variables from .dev.vars
config({ path: '.dev.vars' });

class FirestoreImporter {
  constructor() {
    this.db = null;
    this.batchSize = 500; // Firestore batch limit
  }

  /**
   * Initialize Firebase Admin SDK
   */
  async initialize() {
    try {
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
      console.log('✅ Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
      process.exit(1);
    }
  }

  /**
   * Validate and parse JSON file
   */
  loadJsonData(filePath) {
    try {
      const absolutePath = resolve(filePath);

      if (!existsSync(absolutePath)) {
        throw new Error(`File not found: ${absolutePath}`);
      }

      const fileContent = readFileSync(absolutePath, 'utf8');
      const jsonData = JSON.parse(fileContent);

      if (!Array.isArray(jsonData)) {
        throw new Error('JSON file must contain an array of objects');
      }

      if (jsonData.length === 0) {
        throw new Error('JSON file contains an empty array');
      }

      // Validate that all items are objects
      for (let i = 0; i < jsonData.length; i++) {
        if (typeof jsonData[i] !== 'object' || jsonData[i] === null) {
          throw new Error(`Item at index ${i} is not a valid object`);
        }
      }

      console.log(`✅ Loaded ${jsonData.length} records from ${filePath}`);
      return jsonData;
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error('❌ Invalid JSON format:', error.message);
      } else {
        console.error('❌ Failed to load JSON file:', error.message);
      }
      process.exit(1);
    }
  }

  /**
   * Clear all documents in a collection
   */
  async clearCollection(collectionName) {
    try {
      console.log(`🗑️  Clearing existing documents in collection "${collectionName}"...`);

      const collectionRef = this.db.collection(collectionName);
      const snapshot = await collectionRef.get();

      if (snapshot.empty) {
        console.log('📭 Collection is already empty');
        return;
      }

      const batch = this.db.batch();
      let batchCount = 0;
      let totalDeleted = 0;

      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        batchCount++;
        totalDeleted++;

        // Commit batch when it reaches the limit
        if (batchCount >= this.batchSize) {
          await batch.commit();
          console.log(`🗑️  Deleted ${totalDeleted} documents so far...`);
          batchCount = 0;
        }
      }

      // Commit remaining deletions
      if (batchCount > 0) {
        await batch.commit();
      }

      console.log(`✅ Successfully cleared ${totalDeleted} documents from "${collectionName}"`);
    } catch (error) {
      console.error('❌ Failed to clear collection:', error.message);
      throw error;
    }
  }

  /**
   * Import data to Firestore collection in batches
   */
  async importData(data, collectionName) {
    try {
      console.log(`📤 Importing ${data.length} documents to collection "${collectionName}"...`);

      const collectionRef = this.db.collection(collectionName);
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      // Process data in batches
      for (let i = 0; i < data.length; i += this.batchSize) {
        const batch = this.db.batch();
        const batchData = data.slice(i, i + this.batchSize);
        const batchNumber = Math.floor(i / this.batchSize) + 1;
        const totalBatches = Math.ceil(data.length / this.batchSize);

        console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batchData.length} documents)...`);

        try {
          // Add documents to batch with auto-generated IDs
          for (const item of batchData) {
            const docRef = collectionRef.doc(); // Auto-generate document ID
            batch.set(docRef, {
              ...item,
              importedAt: new Date(), // Add import timestamp
            });
          }

          // Commit the batch
          await batch.commit();
          successCount += batchData.length;
          console.log(`✅ Batch ${batchNumber} completed successfully`);
        } catch (error) {
          errorCount += batchData.length;
          const errorMsg = `Batch ${batchNumber} failed: ${error.message}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      // Summary
      console.log('\n📊 Import Summary:');
      console.log(`✅ Successfully imported: ${successCount} documents`);

      if (errorCount > 0) {
        console.log(`❌ Failed to import: ${errorCount} documents`);
        console.log('\n📝 Error Details:');
        errors.forEach(error => console.log(`   • ${error}`));
      }

      if (successCount === 0) {
        throw new Error('No documents were imported successfully');
      }

      console.log(`\n🎉 Import completed! Check your Firestore console for collection "${collectionName}"`);
    } catch (error) {
      console.error('❌ Import failed:', error.message);
      throw error;
    }
  }

  /**
   * Main import process
   */
  async run(filePath, collectionName, shouldClear = false) {
    try {
      await this.initialize();

      const data = this.loadJsonData(filePath);

      if (shouldClear) {
        await this.clearCollection(collectionName);
      }

      await this.importData(data, collectionName);

      console.log('\n🚀 All operations completed successfully!');
      process.exit(0);
    } catch (error) {
      console.error('\n💥 Import process failed:', error.message);
      process.exit(1);
    }
  }
}

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node scripts/import-firestore-data.js <json-file-path> <collection-name> [--clear]');
    console.log('');
    console.log('Arguments:');
    console.log('  json-file-path    Path to the JSON file containing data to import');
    console.log('  collection-name   Name of the Firestore collection');
    console.log('');
    console.log('Options:');
    console.log('  --clear          Delete all existing documents in the collection before importing');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/import-firestore-data.js data/users.json users --clear');
    process.exit(1);
  }

  const filePath = args[0];
  const collectionName = args[1];
  const shouldClear = args.includes('--clear');

  return { filePath, collectionName, shouldClear };
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const { filePath, collectionName, shouldClear } = parseArguments();

  console.log('🔥 Firestore Data Import Tool');
  console.log('============================');
  console.log(`📁 File: ${filePath}`);
  console.log(`📂 Collection: ${collectionName}`);
  console.log(`🗑️  Clear existing: ${shouldClear ? 'Yes' : 'No'}`);
  console.log('');

  const importer = new FirestoreImporter();
  importer.run(filePath, collectionName, shouldClear);
}

export default FirestoreImporter;
