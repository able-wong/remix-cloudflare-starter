# Remix Cloudflare Firebase Starter

A modern full-stack web application boilerplate featuring **Remix**, **Cloudflare Pages**, and **Firebase** integration. Get from zero to production-ready application in minutes.

## 🚀 What You Get

- **Full-stack capabilities** with Remix server actions and loaders
- **Global edge deployment** on Cloudflare Pages
- **Firebase integration** for authentication, database, and storage
- **Modern UI** with TailwindCSS v4 + DaisyUI v5
- **Type safety** with TypeScript
- **Testing setup** with Jest
- **Development tools** configured and ready

## 📋 Prerequisites

- **Node.js 18+**
- **npm**
- **Wrangler CLI**: `npm install -g wrangler`
- **Firebase CLI** (optional): `npm install -g firebase-tools` - Only needed if using Firebase features

## ⚡ Quick Start

```bash
# 1. Clone and install
git clone <your-repo-url>
cd remix-cloudflare-starter
npm install

# 2. Start development
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to see your app running!

## 🛠 Setup Guide

### 1. Cloudflare Pages Deployment

1. **Create Cloudflare Pages Project:**
   - Go to [Cloudflare Pages](https://dash.cloudflare.com/pages)
   - Create new project with a meaningful name (becomes your URL: `your-name.pages.dev`)

2. **Configure Deployment:**

   ```bash
   # Login to Cloudflare
   wrangler auth login

   # Update project name in wrangler.jsonc
   # Change "name" field to match your Pages project name
   ```

3. **Deploy:**

   ```bash
   npm run deploy
   ```

### 2. Firebase Integration (Optional)

**Only needed if you want authentication, database, or storage.**

1. **Create Firebase Project:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create new project
   - Enable services you need:
     - **Authentication** → Configure sign-in methods
     - **Firestore Database** → Create database
     - **Storage** → Set up storage bucket

2. **Configure Environment Variables:**

   ```bash
   # Copy template
   cp .dev.vars.example .dev.vars

   # Edit .dev.vars with your Firebase config
   # Get values from Firebase Project Settings → General → Your apps
   ```

3. **Add to Cloudflare Pages:**
   - Go to your Pages project → Settings → Environment variables
   - Add all variables from `.dev.vars` as production secrets

## 🔧 Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run deploy       # Deploy to Cloudflare Pages
npm test            # Run tests
npm run lint        # Lint code
npm run format      # Format code
npm run typecheck   # TypeScript checking
```

## 📁 Project Structure

```text
app/
├── routes/          # Remix routes (pages & API)
├── services/        # Business logic & Firebase integration
├── components/      # Reusable UI components
├── utils/           # Utility functions
└── __tests__/       # Test files

public/              # Static assets
functions/           # Cloudflare Pages functions
```

## 🔍 Tech Stack

- **Framework:** Remix on Cloudflare Pages
- **Frontend:** React 18, TypeScript, TailwindCSS v4, DaisyUI v5
- **Backend:** Firebase (Auth, Firestore, Storage)
- **Build:** Vite
- **Testing:** Jest
- **Deployment:** Cloudflare Pages with global edge network

## ✅ Verify Your Setup

After deployment, check:

- ✅ Site loads at `https://your-project-name.pages.dev`
- ✅ Development server works: `npm run dev`
- ✅ Tests pass: `npm test`
- ✅ Firebase connection (if enabled)

## 🚨 Troubleshooting

**Deployment Issues:**

- Ensure Wrangler is authenticated: `wrangler auth login`
- Check project name matches in `wrangler.jsonc`

**Firebase Issues:**

- Verify environment variables are set in both `.dev.vars` and Cloudflare Pages
- Check Firebase project permissions and API keys

**Development Issues:**

- Clear cache: `rm -rf node_modules package-lock.json && npm install`
- Check Node.js version: `node --version` (should be 18+)

## 🎯 Next Steps

1. **Customize the UI** - Edit components in `app/components/`
2. **Add routes** - Create new files in `app/routes/`
3. **Business logic** - Add services in `app/services/`
4. **Configure Firebase** - Set up authentication and database rules
5. **Add tests** - Create tests in `app/__tests__/`

## 📚 Resources

- [Remix Documentation](https://remix.run/docs)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [TailwindCSS](https://tailwindcss.com/docs)
- [DaisyUI Components](https://daisyui.com/components/)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

---

**Ready to build something amazing?** Start with `npm run dev` and see your app come to life! 🎉
