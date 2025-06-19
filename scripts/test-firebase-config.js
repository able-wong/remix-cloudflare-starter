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
import { readFileSync, existsSync } from 'fs';

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
   * Test Firebase project configuration files
   */
  testFirebaseProjectFiles() {
    console.log('\n🔍 Testing Firebase Project Files...');

    // Check .firebaserc
    const firebaseRcPath = '.firebaserc';
    if (!existsSync(firebaseRcPath)) {
      this.addError('.firebaserc file not found - run "firebase init" to create it');
      this.addError('Firebase deployment will fail without .firebaserc');
    } else {
      try {
        const firebaseRcContent = readFileSync(firebaseRcPath, 'utf-8');
        const firebaseRc = JSON.parse(firebaseRcContent);

        if (!firebaseRc.projects) {
          this.addError('.firebaserc missing "projects" configuration');
        } else if (!firebaseRc.projects.default) {
          this.addError('.firebaserc missing "default" project configuration');
        } else {
          const defaultProject = firebaseRc.projects.default;
          const envProjectId = process.env.FIREBASE_PROJECT_ID;

          if (defaultProject !== envProjectId) {
            this.addWarning(`Project ID mismatch: .firebaserc default project (${defaultProject}) != FIREBASE_PROJECT_ID (${envProjectId})`);
            this.addWarning('Consider running "firebase use ' + envProjectId + '" to sync project settings');
          } else {
            this.addSuccess('.firebaserc configuration is valid and matches FIREBASE_PROJECT_ID');
          }
        }
      } catch (error) {
        this.addError(`.firebaserc is not valid JSON: ${error.message}`);
      }
    }

    // Check firebase.json
    const firebaseJsonPath = 'firebase.json';
    if (!existsSync(firebaseJsonPath)) {
      this.addWarning('firebase.json file not found - some Firebase features may not be configured');
    } else {
      try {
        const firebaseJsonContent = readFileSync(firebaseJsonPath, 'utf-8');
        const firebaseJson = JSON.parse(firebaseJsonContent);

        // Check for common configurations
        if (firebaseJson.firestore) {
          this.addSuccess('firebase.json includes Firestore configuration');

          // Check firestore rules
          const rulesFile = firebaseJson.firestore.rules || 'firestore.rules';
          if (!existsSync(rulesFile)) {
            this.addError(`Firestore rules file not found: ${rulesFile}`);
          } else {
            this.addSuccess(`Firestore rules file found: ${rulesFile}`);
          }

          // Check firestore indexes
          const indexesFile = firebaseJson.firestore.indexes || 'firestore.indexes.json';
          if (!existsSync(indexesFile)) {
            this.addWarning(`Firestore indexes file not found: ${indexesFile}`);
          } else {
            this.addSuccess(`Firestore indexes file found: ${indexesFile}`);
          }
        } else {
          this.addWarning('firebase.json does not include Firestore configuration');
        }

        if (firebaseJson.hosting) {
          this.addSuccess('firebase.json includes Hosting configuration');
        }

        if (firebaseJson.functions) {
          this.addSuccess('firebase.json includes Functions configuration');
        }

      } catch (error) {
        this.addError(`firebase.json is not valid JSON: ${error.message}`);
      }
    }

    // Check firestore.rules specifically
    const firestoreRulesPath = 'firestore.rules';
    if (existsSync(firestoreRulesPath)) {
      try {
        const rulesContent = readFileSync(firestoreRulesPath, 'utf-8');

        // Basic validation of rules content
        if (rulesContent.includes('rules_version =') && rulesContent.includes('service cloud.firestore')) {
          this.addSuccess('firestore.rules file appears to be valid');

          // Check for overly permissive rules
          if (rulesContent.includes('allow read, write: if true')) {
            this.addWarning('Firestore rules are completely open (allow read, write: if true) - consider restricting access');
          } else if (rulesContent.includes('allow read, write: if request.auth != null')) {
            this.addSuccess('Firestore rules require authentication - good security practice');
          }
        } else {
          this.addError('firestore.rules file appears to be malformed');
        }
      } catch (error) {
        this.addError(`Error reading firestore.rules: ${error.message}`);
      }
    }
  }

  /**
   * Test Firebase CLI availability and authentication
   */
  async testFirebaseCLI() {
    console.log('\n🔍 Testing Firebase CLI Setup...');

    try {
      // Test if Firebase CLI is installed - using robust helper
      const versionResult = await this._safeExecSync('firebase --version', { timeout: 5000 });

      if (versionResult.success) {
        const versionOutput = versionResult.output.trim();
        this.addSuccess(`Firebase CLI is installed: ${versionOutput}`);

        // Parse version and check for compatibility
        this._checkFirebaseCLIVersion(versionOutput);
      } else {
        this.addError('Firebase CLI is not installed - run "npm install -g firebase-tools"');
        return false;
      }

      // Test if user is authenticated - using robust helper methods
      const authResult = await this._safeExecSync('firebase auth:list', { timeout: 10000 });

      if (authResult.success && this._containsEmail(authResult.output)) {
        // Try to extract email using our robust helper
        const emailMatch = authResult.output.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
          this.addSuccess(`Firebase CLI authenticated as: ${emailMatch[1]}`);
        } else {
          this.addSuccess('Firebase CLI is authenticated');
        }
      } else {
        // Try alternative authentication check using robust helper
        const projectsResult = await this._safeExecSync('firebase projects:list', { timeout: 10000 });

        if (projectsResult.success) {
          this.addSuccess('Firebase CLI is authenticated (verified via projects list)');
        } else {
          this.addError('Firebase CLI is not authenticated - run "firebase login"');
          return false;
        }
      }

      // Test if current project is set and matches environment - using robust helpers
      const projectResult = await this._safeExecSync('firebase use', { timeout: 10000 });

      if (projectResult.success) {
        const activeProject = this._extractProjectId(projectResult.output);

        if (activeProject) {
          const envProjectId = process.env.FIREBASE_PROJECT_ID;

          if (activeProject !== envProjectId) {
            this.addWarning(`Firebase CLI project (${activeProject}) != FIREBASE_PROJECT_ID (${envProjectId})`);
            this.addWarning(`Run "firebase use ${envProjectId}" to switch projects`);
          } else {
            this.addSuccess(`Firebase CLI project matches FIREBASE_PROJECT_ID: ${activeProject}`);
          }
        } else {
          // If we can't parse the project, but the command succeeded, check for common patterns
          if (this._containsAny(projectResult.output, ['No active project', 'not set'])) {
            this.addError('No active Firebase project set - run "firebase use <project-id>"');
            return false;
          } else {
            this.addWarning('Could not parse Firebase project from CLI output, but project appears to be set');
            console.log(`Debug: Full Firebase use output:\n${projectResult.output}`);
          }
        }
      } else {
        // If command failed, check for common error patterns
        if (this._containsAny(projectResult.error, ['not been initialized', '.firebaserc'])) {
          this.addWarning('Firebase project not initialized - run "firebase init" first');
        } else {
          this.addError('Failed to check Firebase CLI project settings - ensure .firebaserc exists');
        }
      }

      return true;
    } catch (error) {
      this.addError(`Firebase CLI test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Test Firebase deployment readiness
   */
  async testDeploymentReadiness() {
    console.log('\n🔍 Testing Firebase Deployment Readiness...');

    // Check if all required files exist
    const requiredFiles = ['.firebaserc'];

    let hasRequiredFiles = true;
    requiredFiles.forEach(file => {
      if (!existsSync(file)) {
        this.addError(`Required deployment file missing: ${file}`);
        hasRequiredFiles = false;
      }
    });

    if (!hasRequiredFiles) {
      this.addError('Cannot test deployment - missing required files');
      this.addError('Run "firebase init" to set up Firebase project files');
      return false;
    }

    try {
      // Test dry run of firestore rules deployment if rules exist
      if (existsSync('firestore.rules')) {
        // Try to validate rules using dry-run deployment with robust helper
        const deployResult = await this._safeExecSync('firebase deploy --only firestore:rules --dry-run', { timeout: 30000 });

        if (deployResult.success && this._containsAny(deployResult.output, ['compiled successfully', 'deployment prepared', 'rules successfully compiled'])) {
          this.addSuccess('Firestore rules syntax is valid (dry-run deployment passed)');
          this.addSuccess('Firebase deployment appears ready (rules validation passed)');
        } else if (deployResult.success) {
          this.addWarning('Firestore rules dry-run completed but success status unclear');
        } else {
          // Parse the error to provide better feedback using our robust helpers
          if (this._containsAny(deployResult.error, ['compilation errors', 'syntax error'])) {
            this.addError('Firestore rules have compilation errors - check firestore.rules syntax');
          } else if (this._containsAny(deployResult.error, ['authentication', 'not authenticated'])) {
            this.addWarning('Could not validate Firestore rules - ensure Firebase CLI is authenticated');
          } else {
            this.addWarning('Could not validate Firestore rules - deployment dry-run failed');
            this.addWarning('Run "firebase deploy --only firestore:rules --dry-run" manually to check');
          }
        }
      } else {
        this.addWarning('No firestore.rules file found - deployment will skip Firestore rules');
      }

      // Check if we can list projects (basic auth test) using robust helper
      const projectsListResult = await this._safeExecSync('firebase projects:list --json', { timeout: 15000 });

      if (projectsListResult.success) {
        this.addSuccess('Firebase CLI can access project list - authentication is working');
      } else {
        this.addError('Firebase CLI authentication issue - run "firebase login"');
        return false;
      }

      return true;
    } catch (error) {
      this.addError(`Deployment readiness test failed: ${error.message}`);
      return false;
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
   * Helper method to check if text contains any of the given strings (case-insensitive)
   * More robust than single includes() checks
   */
  _containsAny(text, searchTerms) {
    if (!text || !Array.isArray(searchTerms)) return false;

    const lowerText = text.toLowerCase();
    return searchTerms.some(term => {
      try {
        return lowerText.includes(term.toLowerCase());
      } catch {
        return false;
      }
    });
  }

  /**
   * Helper method to detect email in output (more robust than regex)
   */
  _containsEmail(text) {
    if (!text) return false;

    // Multiple fallback methods to detect email
    const methods = [
      () => text.includes('@') && text.includes('.com'),
      () => text.includes('@') && text.includes('.') && text.length > 5,
      () => /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text)
    ];

    return methods.some(method => {
      try {
        return method();
      } catch {
        return false;
      }
    });
  }

  /**
   * Robust project ID extraction with multiple fallback methods
   */
  _extractProjectId(output) {
    if (!output) return null;

    // Method 1: Try standard patterns with increased flexibility
    const patterns = [
      /Active Project:\s*([a-z0-9-]+)/i,
      /Active project:\s*([a-z0-9-]+)/i,
      /\*\s*default\s*\(([a-z0-9-]+)\)/i,
      /currently using:\s*([a-z0-9-]+)/i
    ];

    for (const pattern of patterns) {
      try {
        const match = output.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      } catch (e) {
        // Continue to next pattern
      }
    }

    // Method 2: Look for Firebase project ID pattern in any line
    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Firebase project IDs: lowercase, hyphens, numbers, 6-30 chars
      if (/^[a-z0-9][a-z0-9-]{4,28}[a-z0-9]$/.test(trimmed)) {
        return trimmed;
      }
    }

    // Method 3: Try to extract from parentheses
    try {
      const parenMatch = output.match(/\(([a-z0-9-]+)\)/);
      if (parenMatch && parenMatch[1] && parenMatch[1].includes('-')) {
        return parenMatch[1];
      }
    } catch (e) {
      // Ignore parsing errors
    }

    return null;
  }

  /**
   * Robust CLI command execution with better error handling
   */
  async _safeExecSync(command, options = {}) {
    try {
      const { execSync } = await import('child_process');

      const defaultOptions = {
        encoding: 'utf-8',
        timeout: 15000,  // Increased default timeout
        stdio: 'pipe'
      };

      const result = execSync(command, { ...defaultOptions, ...options });
      return {
        success: true,
        output: result,
        error: null
      };
    } catch (error) {
      // Return error object with normalized properties
      return {
        success: false,
        output: null,
        error: error.message || error.toString(),
        code: error.status || error.code || 1
      };
    }
  }

  /**
   * Check Firebase CLI version and provide upgrade recommendations
   */
  _checkFirebaseCLIVersion(versionOutput) {
    try {
      // Extract version number from output like "14.7.0" or "firebase-tools@14.7.0"
      const versionMatch = versionOutput.match(/(\d+)\.(\d+)\.(\d+)/);

      if (!versionMatch) {
        this.addWarning('Could not parse Firebase CLI version - compatibility unknown');
        return;
      }

      const [, majorStr, minorStr, patchStr] = versionMatch;
      const major = parseInt(majorStr, 10);
      const minor = parseInt(minorStr, 10);
      const patch = parseInt(patchStr, 10);

      // Define minimum recommended version (14.0.0)
      const minMajor = 14;
      const minMinor = 0;
      const minPatch = 0;

      // Define tested version for reference
      const testedVersion = '14.7.0';

      // Check if version is below minimum recommended
      if (major < minMajor || (major === minMajor && minor < minMinor) ||
          (major === minMajor && minor === minMinor && patch < minPatch)) {
        this.addWarning(`Firebase CLI version ${major}.${minor}.${patch} is below recommended minimum v${minMajor}.${minMinor}.${minPatch}`);
        this.addWarning('Consider upgrading: npm install -g firebase-tools@latest');
        this.addWarning('Older versions may have compatibility issues with this script');
      } else if (major > 14 || (major === 14 && minor > 7) || (major === 14 && minor === 7 && patch > 0)) {
        // Newer version than tested
        this.addSuccess(`Firebase CLI version ${major}.${minor}.${patch} is newer than tested version ${testedVersion}`);
        this.addSuccess('This should work fine, but report any issues you encounter');
      } else if (major === 14 && minor === 7 && patch === 0) {
        // Exact tested version
        this.addSuccess(`Firebase CLI version matches tested version ${testedVersion} - optimal compatibility`);
      } else {
        // Different but acceptable version
        this.addSuccess(`Firebase CLI version ${major}.${minor}.${patch} is compatible (tested with ${testedVersion})`);
      }

    } catch (error) {
      this.addWarning(`Error checking Firebase CLI version: ${error.message}`);
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🔥 Firebase Configuration Test');
    console.log('========================================');
    console.log('Testing Firebase environment variables and configuration...');
    console.log('ℹ️  This script was tested with Firebase CLI v14.7.0');
    console.log('   If you encounter issues, consider upgrading to v14.7.0 or later\n');

    // Test environment and configuration
    this.testEnvironmentVariables();
    this.testFirebaseConfig();
    this.testFirebaseAdminConfig();

    // Test Firebase project files and CLI
    this.testFirebaseProjectFiles();
    await this.testFirebaseCLI();
    await this.testDeploymentReadiness();

    // Test Firebase services
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
