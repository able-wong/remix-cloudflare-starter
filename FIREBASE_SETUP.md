# Firebase Setup Guide for Remix Cloudflare Starter

**📖 Prerequisites**: Please complete the [README.md](./README.md) setup first, including installing dependencies and basic project setup.

This guide provides **detailed Firebase configuration instructions** to supplement the main README setup. The README covers basic Firebase integration - this guide provides the complete step-by-step process.

## 🔗 How This Relates to README.md

- **[README.md](./README.md)**: General project setup, basic Firebase mention, quick start
- **This guide**: Detailed Firebase configuration, security rules, testing, troubleshooting
- **Use together**: Complete README setup first → Follow this guide for Firebase specifics

## 🎯 What This Guide Covers

By following this guide, you'll configure:

- ✅ Firebase project with required services
- ✅ Client-side Firebase configuration
- ✅ Server-side Firebase Admin SDK
- ✅ Environment variables setup
- ✅ Firestore security rules
- ✅ Data import capabilities

## 📋 Before You Start

Ensure you have completed from README.md:

- ✅ Node.js 18+ installed and project dependencies: `npm install`
- ✅ Project cloned and basic setup complete
- ✅ Google account for Firebase Console access

**New requirement for this guide:**

- **jq** (JSON processor) - installation instructions below

**📌 Notes about Firebase CLI**:

- The Firebase CLI is primarily used for deploying security rules and project management
- For data import, this project uses custom Node.js scripts in the `scripts/` folder, as Firebase CLI doesn't provide direct JSON data import capabilities
- **Version Requirement**: This guide and testing script were developed with Firebase CLI v14.7.0. While older versions (v14.0.0+) should work, upgrading to v14.7.0 or later is recommended for optimal compatibility
- The configuration test script will automatically check your Firebase CLI version and provide upgrade recommendations if needed

## 🚀 Step 1: Create Firebase Project

1. **Go to Firebase Console**: <https://console.firebase.google.com>
2. **Create a new project**:
   - Click "Create a project"
   - Project name: Choose a meaningful name for your app
   - Enable/disable Google Analytics as preferred
   - Choose your country/region

## 🔧 Step 2: Enable Firebase Services

### Authentication Setup (Optional)

1. Go to **Authentication** → **Sign-in method**
2. Enable your preferred sign-in methods:
   - **Email/Password** (most common)
   - **Google**, **GitHub**, etc. (as needed)
3. Save the changes

### Firestore Database Setup

1. Go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (we'll update security rules later)
4. Select a location closest to your users (e.g., `us-central1`, `europe-west1`)

### Storage Setup (Optional)

1. Go to **Storage**
2. Click **Get started**
3. Start in test mode
4. Choose the same location as your Firestore database

## 📱 Step 3: Get Client Configuration

1. Go to **Project Settings** (gear icon in left sidebar)
2. Scroll to **Your apps** section
3. Click **Add app** → **Web app** (`</>` icon)
4. Register app:
   - App nickname: Choose a descriptive name
   - Firebase Hosting setup is optional
5. **Copy the Firebase config object**

Example config (yours will have different values):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## 🔑 Step 4: Generate Service Account Key

For the data import script and server-side operations, you need to create a service account:

1. **Go to Project Settings** → **Service Accounts** tab
2. **Scroll down** to the "Firebase Admin SDK" section
3. **Select Node.js** (if not already selected)
4. **Click "Generate new private key"**
5. **Read the warning** about keeping the key secure
6. **Click "Generate key"** in the confirmation dialog
7. **Save the downloaded JSON file** in a secure location
   - ⚠️ **Important**: This file contains sensitive credentials
   - ❌ **Never commit this file to version control**
   - 📁 **Suggested**: Save as `firebase-service-account.json` in your project root (already in .gitignore)

### 🔒 Security Notes

- This key provides **full administrative access** to your Firebase project
- Store it securely and never share it publicly
- If compromised, revoke it immediately and generate a new one
- For production, consider using more restrictive service accounts

## 🛠 Step 5: Install jq (JSON Processing Tool)

**Why needed**: To convert the service account JSON file to a single-line string for environment variables.

### macOS

```bash
brew install jq
```

### Fedora/RHEL/CentOS

```bash
sudo dnf install jq
```

### Ubuntu/Debian

```bash
sudo apt install jq
```

### Verify installation

```bash
jq --version
```

## ⚙️ Step 6: Configure Environment Variables

**📝 Reference**: This builds on the environment setup mentioned in [README.md](./README.md).

1. **Copy the example environment file**:

   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. **Convert service account JSON to single line**:

   ```bash
   # Replace 'firebase-service-account.json' with your actual filename
   jq -c . firebase-service-account.json
   ```

   **Expected output**: A long single-line JSON string starting with `{"type":"service_account",...}`

3. **Update `.dev.vars` file** with your actual values:

   **📝 Example `.dev.vars` file:**

   ```bash
   # Application Configuration
   APP_NAME="my-awesome-app"

   # Firebase Client Configuration (from Step 3)
   FIREBASE_CONFIG={"apiKey":"AIzaSyC...","authDomain":"my-project.firebaseapp.com","projectId":"my-project-id","storageBucket":"my-project.appspot.com","messagingSenderId":"123456789","appId":"1:123456789:web:abcdef"}

   # Firebase Server-side Configuration
   FIREBASE_PROJECT_ID="my-project-id"

   # Firebase Admin SDK Configuration (from jq command output)
   FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"my-project-id","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xyz@my-project.iam.gserviceaccount.com",...}
   ```

   **🔍 Key Points:**
   - Replace `my-project-id` with your actual Firebase project ID
   - Replace `my-awesome-app` with your preferred app name
   - Ensure `FIREBASE_CONFIG` and `FIREBASE_SERVICE_ACCOUNT_KEY` are single lines
   - The `project_id` in the service account key should match `FIREBASE_PROJECT_ID`

## ✅ Step 7: Test Firebase Configuration

**🎯 This is the most important step!** Test your configuration before proceeding.

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Run the configuration test**:

   ```bash
   npm run test-firebase
   ```

3. **Expected successful output**:

   ```
   🔥 Firebase Configuration Test
   ========================================
   Testing Firebase environment variables and configuration...
   ℹ️  This script was tested with Firebase CLI v14.7.0
      If you encounter issues, consider upgrading to v14.7.0 or later

   🔍 Testing Environment Variables...
   ✅ Found required variable: FIREBASE_PROJECT_ID
   ✅ Found required variable: FIREBASE_SERVICE_ACCOUNT_KEY
   ✅ Found required variable: FIREBASE_CONFIG
   ✅ Found optional variable: APP_NAME

   🔍 Testing Firebase Client Configuration...
   ✅ FIREBASE_CONFIG contains all required fields
   ✅ Project IDs are consistent between FIREBASE_CONFIG and FIREBASE_PROJECT_ID

   🔍 Testing Firebase Admin SDK Configuration...
   ✅ FIREBASE_SERVICE_ACCOUNT_KEY contains all required fields
   ✅ Service account type is valid
   ✅ Project IDs are consistent between service account and FIREBASE_PROJECT_ID
   ✅ Private key format appears valid

   🔍 Testing Firebase Project Files...
   ✅ .firebaserc configuration is valid and matches FIREBASE_PROJECT_ID
   ✅ firebase.json includes Firestore configuration
   ✅ Firestore rules file found: firestore.rules
   ✅ Firestore indexes file found: firestore.indexes.json
   ✅ firestore.rules file appears to be valid

   🔍 Testing Firebase CLI Setup...
   ✅ Firebase CLI is installed: 14.7.0
   ✅ Firebase CLI version matches tested version 14.7.0 - optimal compatibility
   ✅ Firebase CLI authenticated as: your-email@example.com
   ✅ Firebase CLI project matches FIREBASE_PROJECT_ID: your-project-id

   🔍 Testing Firebase Deployment Readiness...
   ✅ Firestore rules syntax is valid (dry-run deployment passed)
   ✅ Firebase deployment appears ready (rules validation passed)
   ✅ Firebase CLI can access project list - authentication is working

   🔍 Testing Firebase Admin SDK Initialization...
   ✅ Firebase Admin SDK initialized successfully

   🔍 Testing Firestore Connection...
   ✅ Firestore connection successful
   ✅ Firestore write permissions confirmed
   ✅ Test document cleanup successful

   📊 Configuration Test Summary
   ==================================================
   ✅ Successes: 26
   ⚠️  Warnings: 0
   ❌ Errors: 0

   🎉 All tests passed! Your Firebase configuration is ready to use.
   ```

4. **If you see errors**:
   - ❌ **Don't proceed** until all errors are fixed
   - 📖 Check the troubleshooting section below
   - 🔄 Run the test again after making fixes

   **Common fixes:**
   - Verify `.dev.vars` file exists in project root
   - Check that JSON strings are properly formatted (no line breaks)
   - Ensure project IDs match across all configurations   **What the test covers:**

   The Firebase configuration test performs comprehensive validation including:

   - ✅ **Environment Variables**: Checks all required Firebase configuration variables
   - ✅ **JSON Validation**: Ensures Firebase configurations are properly formatted
   - ✅ **Project Consistency**: Verifies project IDs match across all configurations
   - ✅ **File Structure**: Confirms Firebase project files (.firebaserc, firebase.json, etc.) exist and are valid
   - ✅ **CLI Version**: Checks Firebase CLI version and provides upgrade recommendations
   - ✅ **Authentication**: Verifies Firebase CLI is authenticated and has proper permissions
   - ✅ **Deployment Readiness**: Tests that Firebase rules can be deployed successfully
   - ✅ **SDK Initialization**: Confirms Firebase Admin SDK can connect to your project
   - ✅ **Database Connectivity**: Tests Firestore read/write operations and permissions

## ✅ Step 8: Test Data Import Script

1. **Ensure dependencies are installed**:

   ```bash
   npm install
   ```

2. **Test with sample data**:

   ```bash
   npm run import-firestore data/sample-users.json users
   ```

3. **Verify in Firebase Console**:
   - Go to Firestore Database
   - Check that the `users` collection was created with sample data

## 🔒 Step 9: Configure Security Rules

### Firestore Rules

Replace the default rules in Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public read access, authenticated write access
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Admin-only collections (optional)
    match /admin/{document=**} {
      allow read, write: if request.auth != null &&
        request.auth.token.email in ['admin@yourdomain.com'];
    }
  }
}
```

### Storage Rules (if using Firebase Storage)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 🌐 Step 10: Deploy to Cloudflare Pages (Production)

When ready for production:

1. **Set environment variables in Cloudflare Pages**:
   - Go to your Cloudflare Pages project dashboard
   - Settings → Environment Variables
   - Add the same variables from `.dev.vars`:
     - `APP_NAME`
     - `FIREBASE_CONFIG`
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_SERVICE_ACCOUNT_KEY`

2. **Update Firebase Security Rules**:
   - Change from test mode to production rules
   - Add your domain to authorized domains in Authentication settings

## 🧪 Step 11: Test Your Setup

1. **Start development server**:

   ```bash
   npm run dev
   ```

2. **Test Firebase configuration**:

   ```bash
   npm run test-firebase
   ```

3. **Test data import**:

   ```bash
   # Import sample data
   npm run import-firestore data/sample-users.json users

   # Clear and import
   npm run import-firestore data/sample-users.json users --clear
   ```

4. **Check Firebase connection**:
   - Open browser developer console
   - Look for Firebase initialization messages
   - Test authentication (if implemented)
   - Verify Firestore read/write operations

## �️ Data Management

### Firebase Configuration Testing

Verify your Firebase setup is correct:

```bash
# Test all Firebase configuration
npm run test-firebase
```

This validates:

- Environment variables are present and correctly formatted
- Firebase client and admin configurations
- Firestore connectivity and permissions

### Firestore Data Import

Import JSON data into Firestore collections using the built-in script:

```bash
# Import sample data
npm run import-firestore data/sample-users.json users

# Clear existing data and import
npm run import-firestore data/sample-users.json users --clear

# Direct script usage
node scripts/import-firestore-data.js data/sample-users.json users --clear
```

**JSON Format Expected:**

```json
[
  {
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30,
    "active": true
  },
  {
    "name": "Jane Smith",
    "email": "jane@example.com",
    "age": 28,
    "active": false
  }
]
```

**Features:**

- ✅ Auto-generated document IDs
- ✅ Batch processing for large datasets
- ✅ Optional collection clearing
- ✅ Import timestamp tracking
- ✅ Error handling and progress reporting

## �🔧 Troubleshooting

### Common Configuration Issues

**"FIREBASE_PROJECT_ID environment variable is required"**

- Ensure your `.dev.vars` file contains the correct project ID
- Verify the file is in the project root directory

**"FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required"**

- Make sure you've added the service account JSON to `.dev.vars`
- Verify the JSON is properly formatted as a single line

**"FIREBASE_SERVICE_ACCOUNT_KEY must be valid JSON"**

- Check that the service account key JSON is valid
- Ensure there are no line breaks or extra characters
- Use `jq -c . firebase-service-account.json` to format correctly

**"Failed to initialize Firebase Admin SDK"**

- Verify your service account key has the correct permissions
- Ensure the project ID in the service account key matches your Firebase project
- Check that the service account key contains all required fields

**"Permission denied" errors**

- Verify your Firestore security rules allow the operations
- Check that authentication is working if rules require it
- Ensure the service account has proper permissions
- For data import: Verify the service account has Firestore write access

**Firebase connection issues**

- Verify `FIREBASE_CONFIG` is valid JSON
- Check that all required services are enabled in Firebase Console
- Ensure your domain is authorized (for production)
- Test with the configuration script: `npm run test-firebase`

### Data Import Issues

**"File not found"**

- Use absolute or relative paths from the project root
- Check that the JSON file exists and is readable
- Verify the file extension is `.json`

**"Invalid JSON format"**

- Ensure the JSON file contains a valid array of objects
- Check for trailing commas or syntax errors
- Use a JSON validator to verify the file structure

**Batch processing failures**

- The script will continue processing even if individual batches fail
- Check the detailed error logs for specific issues
- Large datasets are automatically split into batches of 500 documents

### Getting Help

1. Check Firebase Console for error messages
2. Look at browser developer console for client-side errors
3. Verify all environment variables are correctly formatted
4. Ensure Firebase project services are enabled
5. Check `scripts/README.md` for detailed import script help

## ✅ Final Setup Verification

Before considering your setup complete, verify these checkpoints:

### 🔍 Configuration Checklist

- [ ] **Firebase project created** and services enabled
- [ ] **Service account key downloaded** and stored securely
- [ ] **`.dev.vars` file created** with all required variables
- [ ] **`npm run test-firebase` passes** with no errors
- [ ] **Sample data import works**: `npm run import-firestore data/sample-users.json users`
- [ ] **Firebase Console shows** your test data in Firestore

### 🧪 Quick Validation Commands

```bash
# 1. Test Firebase configuration
npm run test-firebase

# 2. Test data import
npm run import-firestore data/sample-users.json users

# 3. Verify in browser (development server)
npm run dev
# Open http://localhost:5173 and check browser console for Firebase messages
```

### 🎯 Success Indicators

✅ **You're ready to proceed if:**

- Configuration test shows "🎉 All tests passed!"
- Data import creates documents in Firestore
- No Firebase-related errors in browser console
- You can see imported data in Firebase Console

❌ **Need to troubleshoot if:**

- Any test failures in configuration test
- Permission denied errors during data import
- Firebase connection errors in browser console

## 🎉 Next Steps

After completing this setup:

1. ✅ **Firebase backend ready**
2. **Customize authentication flow** (if needed)
3. **Design your data structure** and create JSON files
4. **Import your data** using the import script
5. **Build your application features**
6. **Deploy to production**

## 📖 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)

---

**🚀 Ready to build something amazing?** Your Firebase backend is now configured and ready to power your Remix application!
