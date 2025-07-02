# Remix Cloudflare Starter

A modern full-stack web application boilerplate featuring **Remix** and **Cloudflare Pages** with optional **Firebase** integration. Get from zero to production-ready application in minutes.

> 🚨 **First Step**: After cloning, change the project name from `remix-cloudflare-starter` to something unique in both `wrangler.jsonc` and `package.json` before deploying!

## 🚀 What You Get

- **Full-stack capabilities** with Remix server actions and loaders
- **Global edge deployment** on Cloudflare Pages
- **Optional Firebase integration** for authentication, database, and storage
- **Modern UI** with TailwindCSS v4 + DaisyUI v5
- **Type safety** with TypeScript
- **Testing setup** with Jest
- **Development tools** configured and ready

## 🎯 Next Steps

1. **Customize the UI** - Edit components in `app/components/`
2. **Add routes** - Create new files in `app/routes/`
3. **Business logic** - Add services in `app/services/`
4. **Add tests** - Create tests in `app/__tests__/`
5. **Setup Firebase** (optional) - See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for complete configuration

## Prerequisites

- **Node.js 18+**
- **npm**
- **Wrangler CLI**: `npm install -g wrangler`

## ⚡ Quick Start

```bash
# 1. Clone and install
git clone <your-repo-url>
cd remix-cloudflare-starter

# Install dependencies (use --legacy-peer-deps due to Wrangler v4/Remix v2 compatibility)
npm install --legacy-peer-deps

# 2. Customize project name (IMPORTANT!)
# Update project name in the following files:
# - wrangler.jsonc (change "name" field)
# - package.json (change "name" field)

# 3. Start development
npm run dev
```

> 💡 **Important**: Change the project name from `remix-cloudflare-starter` to something unique for your project. This name will become part of your deployment URL: `your-project-name.pages.dev`

Open [http://localhost:5173](http://localhost:5173) to see your app running!

## 🛠 Setup Guide

### 1. Cloudflare Pages Deployment

1. **Customize Project Name (Required):**

   **⚠️ Before deploying, you MUST change the project name from the generic `remix-cloudflare-starter`:**

   ```bash
   # Edit wrangler.jsonc
   # Change: "name": "remix-cloudflare-starter"
   # To: "name": "your-chosen-app-name"

   # Edit package.json
   # Change: "name": "remix-cloudflare-starter"
   # To: "name": "your-chosen-app-name"
   ```

   > 💡 **Name Examples**: `bookfinder-hub`, `literaly-search`, `my-portfolio`, `company-website`. Pick something that represents your project!

2. **Create Cloudflare Pages Project:**

   - Go to [Cloudflare Pages](https://dash.cloudflare.com/pages)
   - Create new project with the same name you used above
   - Or let Wrangler create it automatically on first deployment

3. **Configure Deployment:**

   ```bash
   # Login to Cloudflare
   wrangler auth login

   # Verify your project name is updated
   npm run test-cloudflare
   ```

4. **Deploy:**

   ```bash
   npm run deploy
   ```

### 2. Firebase Integration (Optional)

**Firebase provides authentication, database, and storage services.**

> 📖 **Complete Setup Guide**: For Firebase configuration, see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

If you don't need Firebase, you can skip this step and use the application as a static Remix app on Cloudflare Pages.

## 🔧 Development Commands

```bash
# Development
npm run dev             # Start development server
npm run build           # Build for production
npm run deploy          # Deploy to Cloudflare Pages

# Testing & Quality
npm test               # Run tests
npm run lint           # Lint code
npm run format         # Format code
npm run typecheck      # TypeScript checking

# Configuration Testing
npm run test-cloudflare # Test Cloudflare setup and deployment readiness
npm run test-firebase   # Test Firebase configuration (if using Firebase)

# Firebase Data Management (if using Firebase)
npm run fetch-firebase  # Generic Firebase data fetcher
npm run import-firestore # Import JSON data to Firestore
```

---

## 🔬 Running Integration Tests

To run the Firestore integration tests, follow these steps **after cloning the project**:

1. **Set up Firebase**

   - Follow the detailed instructions in [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) to:
     - Create a Firebase project
     - Enable Firestore
     - Set up authentication (optional)
     - Generate and configure environment variables

2. **Initialize Firebase in your project**

   - Run `firebase init` if you haven't already.
   - **Important:** When prompted, **do not overwrite** your existing `firestore.rules` and `firestore.indexes.json` files. Choose "No" to keep the existing files.

3. **Deploy Firestore Rules and Indexes**

   - Deploy your security rules and indexes to Firestore:

     ```sh
     firebase deploy --only firestore:rules
     firebase deploy --only firestore:indexes
     ```

4. **Import Test Data**

   - Import the test data into Firestore using the provided script:

     ```sh
     node scripts/import-firestore-data.js app/__tests__/test-data/books.json test-books-integration --clear
     ```

5. **Configure Environment Variables**

   - Copy the example environment file and fill in your Firebase credentials:

     ```sh
     cp .dev.vars.example .dev.vars
     ```

   - Edit `.dev.vars` and set the values for:
     - `FIREBASE_CONFIG`
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_SERVICE_ACCOUNT_KEY`
   - See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for details on obtaining these values.

6. **Run Integration Tests**
   - Your environment is now ready! Run the integration tests:

     ```sh
     npx jest app/integration-tests/services/firebase-restapi.integration.test.ts
     ```

---

## 📁 Project Structure

```text
app/
├── routes/          # Remix routes (pages & API)
├── services/        # Business logic (includes optional Firebase integration)
├── components/      # Reusable UI components
├── utils/           # Utility functions
└── __tests__/       # Test files

public/              # Static assets
functions/           # Cloudflare Pages functions
```

## 🔍 Tech Stack

- **Framework:** Remix on Cloudflare Pages
- **Frontend:** React 18, TypeScript, TailwindCSS v4, DaisyUI v5
- **Backend:** Optional Firebase (Auth, Firestore, Storage)
- **Build:** Vite
- **Testing:** Jest
- **Deployment:** Cloudflare Pages with global edge network

## ✅ Verify Your Setup

### Before Deployment

Run the configuration test to ensure everything is ready:

```bash
npm run test-cloudflare
```

This will check:

- ✅ Project name has been customized (not using generic `remix-cloudflare-starter`)
- ✅ Wrangler authentication
- ✅ Build process works
- ✅ Deployment readiness

### Firebase Configuration (Optional)

If you're using Firebase services, test your Firebase setup:

```bash
npm run test-firebase
```

This will check:

- ✅ Environment variables are properly configured
- ✅ Firebase configuration JSON is valid
- ✅ Service account credentials work
- ✅ Firestore database connection
- ✅ Authentication setup

### After Deployment

After deployment, verify:

- ✅ Site loads at `https://your-project-name.pages.dev`
- ✅ Development server works: `npm run dev`
- ✅ Tests pass: `npm test`
- ✅ Firebase connection (if enabled)

## 🚨 Troubleshooting

**Dependency Installation:**

- **npm install fails with ERESOLVE errors**: This project uses Wrangler v4 which has peer dependency conflicts with Remix v2. Use `npm install --legacy-peer-deps` to resolve this. This is a known compatibility issue between newer Wrangler versions and current Remix versions.

**Deployment Issues:**

- **Project name conflicts**: If you get deployment errors, ensure you've changed the project name from `remix-cloudflare-starter` to something unique
- **Authentication issues**: Ensure Wrangler is authenticated: `wrangler auth login`
- **Configuration problems**: Check project name matches in both `wrangler.jsonc` and `package.json`
- **Diagnosis tool**: Run `npm run test-cloudflare` to identify and fix deployment issues

**Development Issues:**

- **Dependency issues**: Clear cache: `rm -rf node_modules package-lock.json && npm install`
- **Version compatibility**: Check Node.js version: `node --version` (should be 18+)

**Firebase Issues:**

- **Configuration problems**: Run `npm run test-firebase` to diagnose Firebase setup issues
- **Environment variables**: Ensure `.dev.vars` exists and contains all required Firebase variables
- **Service account**: Verify `FIREBASE_SERVICE_ACCOUNT_KEY` is valid JSON
- **Complete guide**: See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed Firebase troubleshooting

## 📚 Resources

- [Remix Documentation](https://remix.run/docs)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [TailwindCSS](https://tailwindcss.com/docs)
- [DaisyUI Components](https://daisyui.com/components/)
- [Firebase Setup Guide](./FIREBASE_SETUP.md) (optional)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

---

**Ready to build something amazing?** Start with `npm run dev` and see your app come to life! 🎉
