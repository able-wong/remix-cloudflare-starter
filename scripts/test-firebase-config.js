#!/usr/bin/env node

/**
 * Firebase Configuration Test Script
 *
 * Tests Firebase environment variables and configuration setup.
 * Validates both client-side and server-side Firebase configurations.
 *
 * Usage:
 *   node scripts/test-firebase-config.js
 *
 * This script will:
 * - Check if all required environment variables are present
 * - Va    console.log('📚 Additional Resources:');
    console.log('- Setup Guide: FIREBASE_SETUP.md');
    console.log('- Main README: README.md');
    console.log('- Firebase Console: https://console.firebase.google.com');te Firebase configuration JSON format
 * - Test Firebase Admin SDK initialization
 * - Verify Firestore connection
 * - Provide detailed feedback on any issues
 */

import process from 'process';
import { config } from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Load environment variables from .dev.vars
config({ path: '.dev.vars' });

class FirebaseConfigTester {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.successes = [];
  }

  /**
   * Add success message
   */
  addSuccess(message) {
    this.successes.push(message);
    console.log(`✅ ${message}`);
  }

  /**
   * Add warning message
   */
  addWarning(message) {
    this.warnings.push(message);
    console.log(`⚠️  ${message}`);
  }

  /**
   * Add error message
   */
  addError(message) {
    this.errors.push(message);
    console.log(`❌ ${message}`);
  }

  /**
   * Test environment variables presence
   */
  testEnvironmentVariables() {
    console.log('\n🔍 Testing Environment Variables...');

    // Required variables
    const requiredVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_SERVICE_ACCOUNT_KEY',
      'FIREBASE_CONFIG'
    ];

    // Optional variables
    const optionalVars = [
      'APP_NAME'
    ];

    // Check required variables
    requiredVars.forEach(varName => {
      const value = process.env[varName];
      if (!value) {
        this.addError(`Missing required environment variable: ${varName}`);
      } else {
        this.addSuccess(`Found required variable: ${varName}`);
      }
    });

    // Check optional variables
    optionalVars.forEach(varName => {
      const value = process.env[varName];
      if (!value) {
        this.addWarning(`Optional environment variable not set: ${varName}`);
      } else {
        this.addSuccess(`Found optional variable: ${varName}`);
      }
    });
  }

  /**
   * Test Firebase client configuration
   */
  testFirebaseConfig() {
    console.log('\n🔍 Testing Firebase Client Configuration...');

    const firebaseConfig = process.env.FIREBASE_CONFIG;

    if (!firebaseConfig) {
      this.addError('FIREBASE_CONFIG environment variable is missing');
      return;
    }

    try {
      const config = JSON.parse(firebaseConfig);

      // Check required fields
      const requiredFields = [
        'apiKey',
        'authDomain',
        'projectId',
        'storageBucket',
        'messagingSenderId',
        'appId'
      ];

      let missingFields = [];
      requiredFields.forEach(field => {
        if (!config[field]) {
          missingFields.push(field);
        }
      });

      if (missingFields.length > 0) {
        this.addError(`FIREBASE_CONFIG missing required fields: ${missingFields.join(', ')}`);
      } else {
        this.addSuccess('FIREBASE_CONFIG contains all required fields');
      }

      // Validate project ID consistency
      const projectIdFromConfig = config.projectId;
      const projectIdFromEnv = process.env.FIREBASE_PROJECT_ID;

      if (projectIdFromConfig !== projectIdFromEnv) {
        this.addError(`Project ID mismatch: FIREBASE_CONFIG.projectId (${projectIdFromConfig}) != FIREBASE_PROJECT_ID (${projectIdFromEnv})`);
      } else {
        this.addSuccess('Project IDs are consistent between FIREBASE_CONFIG and FIREBASE_PROJECT_ID');
      }

    } catch (error) {
      this.addError(`FIREBASE_CONFIG is not valid JSON: ${error.message}`);
    }
  }

  /**
   * Test Firebase Admin SDK configuration
   */
  testFirebaseAdminConfig() {
    console.log('\n🔍 Testing Firebase Admin SDK Configuration...');

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey) {
      this.addError('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing');
      return;
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountKey);

      // Check required fields
      const requiredFields = [
        'type',
        'project_id',
        'private_key_id',
        'private_key',
        'client_email',
        'client_id',
        'auth_uri',
        'token_uri'
      ];

      let missingFields = [];
      requiredFields.forEach(field => {
        if (!serviceAccount[field]) {
          missingFields.push(field);
        }
      });

      if (missingFields.length > 0) {
        this.addError(`FIREBASE_SERVICE_ACCOUNT_KEY missing required fields: ${missingFields.join(', ')}`);
      } else {
        this.addSuccess('FIREBASE_SERVICE_ACCOUNT_KEY contains all required fields');
      }

      // Validate service account type
      if (serviceAccount.type !== 'service_account') {
        this.addError(`Invalid service account type: ${serviceAccount.type} (expected: service_account)`);
      } else {
        this.addSuccess('Service account type is valid');
      }

      // Validate project ID consistency
      const projectIdFromServiceAccount = serviceAccount.project_id;
      const projectIdFromEnv = process.env.FIREBASE_PROJECT_ID;

      if (projectIdFromServiceAccount !== projectIdFromEnv) {
        this.addError(`Project ID mismatch: Service account project_id (${projectIdFromServiceAccount}) != FIREBASE_PROJECT_ID (${projectIdFromEnv})`);
      } else {
        this.addSuccess('Project IDs are consistent between service account and FIREBASE_PROJECT_ID');
      }

      // Validate private key format
      if (!serviceAccount.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
        this.addError('Private key does not appear to be in correct format (missing BEGIN marker)');
      } else {
        this.addSuccess('Private key format appears valid');
      }

    } catch (error) {
      this.addError(`FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON: ${error.message}`);
    }
  }

  /**
   * Test Firebase Admin SDK initialization
   */
  async testFirebaseAdminInitialization() {
    console.log('\n🔍 Testing Firebase Admin SDK Initialization...');

    if (this.errors.length > 0) {
      this.addWarning('Skipping Firebase Admin SDK initialization due to configuration errors');
      return;
    }

    try {
      // Clear any existing Firebase apps
      const apps = getApps();
      if (apps.length > 0) {
        this.addWarning('Firebase Admin SDK already initialized, using existing instance');
      }

      const projectId = process.env.FIREBASE_PROJECT_ID;
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      const serviceAccount = JSON.parse(serviceAccountKey);

      if (apps.length === 0) {
        const adminConfig = {
          credential: cert(serviceAccount),
          projectId: projectId,
        };

        initializeApp(adminConfig);
      }

      this.addSuccess('Firebase Admin SDK initialized successfully');
      return true;
    } catch (error) {
      this.addError(`Failed to initialize Firebase Admin SDK: ${error.message}`);
      return false;
    }
  }

  /**
   * Test Firestore connection
   */
  async testFirestoreConnection() {
    console.log('\n🔍 Testing Firestore Connection...');

    try {
      const db = getFirestore();

      // Try to read from a test collection (this should work even with restrictive rules)
      const testRef = db.collection('config-test').limit(1);
      await testRef.get();

      this.addSuccess('Firestore connection successful');

      // Test write permissions (this might fail with restrictive rules, which is expected)
      try {
        const testDoc = db.collection('config-test').doc('firebase-config-test');
        await testDoc.set({
          timestamp: new Date(),
          test: 'Firebase configuration test',
          source: 'test-firebase-config script'
        });

        this.addSuccess('Firestore write permissions confirmed');

        // Clean up test document
        await testDoc.delete();
        this.addSuccess('Test document cleanup successful');

      } catch (writeError) {
        if (writeError.code === 'permission-denied') {
          this.addWarning('Firestore write test failed due to security rules (this is expected in production)');
        } else {
          this.addError(`Firestore write test failed: ${writeError.message}`);
        }
      }

    } catch (error) {
      this.addError(`Firestore connection failed: ${error.message}`);
    }
  }

  /**
   * Generate summary report
   */
  generateSummary() {
    console.log('\n📊 Configuration Test Summary');
    console.log('='.repeat(50));

    console.log(`✅ Successes: ${this.successes.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`❌ Errors: ${this.errors.length}`);

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n🎉 All tests passed! Your Firebase configuration is ready to use.');
    } else if (this.errors.length === 0) {
      console.log('\n✅ Configuration is functional with minor warnings.');
    } else {
      console.log('\n💥 Configuration has errors that need to be fixed.');
      console.log('\n🔧 Next Steps:');
      console.log('1. Fix the errors listed above');
      console.log('2. Check your .dev.vars file');
      console.log('3. Verify your Firebase project settings');
      console.log('4. Run this test again');
    }

    return this.errors.length === 0;
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🔥 Firebase Configuration Test');
    console.log('========================================');
    console.log('Testing Firebase environment variables and configuration...\n');

    this.testEnvironmentVariables();
    this.testFirebaseConfig();
    this.testFirebaseAdminConfig();

    const adminInitialized = await this.testFirebaseAdminInitialization();
    if (adminInitialized) {
      await this.testFirestoreConnection();
    }

    const success = this.generateSummary();

    console.log('\n📚 Additional Resources:');
    console.log('- Setup Guide: FIREBASE_SETUP.md');
    console.log('- Main README: README.md');
    console.log('- Firebase Console: https://console.firebase.google.com');

    process.exit(success ? 0 : 1);
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new FirebaseConfigTester();
  tester.runAllTests().catch(error => {
    console.error('\n💥 Unexpected error during testing:', error.message);
    process.exit(1);
  });
}

export default FirebaseConfigTester;
