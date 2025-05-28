# remix-cloudflare-starter

## Introduction

This project is a modern web application template built with Remix and Cloudflare Pages. It's designed to be a starting point for building full-stack applications that require server-side functionality. Unlike traditional frontend hosting solutions, Cloudflare Pages with Remix supports server-side "actions" and API routes, making it ideal for applications that need both client and server-side capabilities.

The template includes a comprehensive tech stack and follows best practices for development, deployment, and maintenance. It features a responsive UI built with Tailwind CSS and DaisyUI, theme switching capabilities, and a well-structured project organization.

## Getting Started

### Option 1: Clone the Repository
If you're cloning this repository directly:

1. Clone the repository:
   ```bash
   # Get the repository URL from the GitHub page
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the site.

### Option 2: Create a New Project
If you want to create a new project from scratch using this template:

1. Run the setup script:
   ```bash
   ./new-project-remix-cloudflare.sh my-project-name
   ```

2. Follow the prompts to create your project.

The site includes a demo page showcasing various DaisyUI components, theme switching functionality, and a responsive layout. Feel free to explore the code and start customizing it for your needs.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare Pages
npm run deploy

# Start production server
npm run start

# Lint code
npm run lint

# Format code
npm run format

# Type checking
npm run typecheck
```

## Technology Stack

### Core Technologies
- **Remix**: Full-stack web framework for building modern web applications
- **Cloudflare Pages**: Global edge network for hosting and deployment
- **TypeScript**: Type-safe JavaScript for better development experience
- **React 18**: Latest version of React for building user interfaces

### Styling & UI
- **Tailwind CSS v4**: Utility-first CSS framework for rapid UI development
- **DaisyUI v5**: Component library built on top of Tailwind CSS
- **tw-animate-css**: Animation library for Tailwind CSS
- **PostCSS**: Tool for transforming CSS with JavaScript
- **Autoprefixer**: PostCSS plugin to parse CSS and add vendor prefixes

### Development Tools
- **ESLint**: Static code analysis tool
- **Prettier**: Code formatter
- **EditorConfig**: Maintain consistent coding styles
- **TypeScript**: Static type checking
- **Wrangler**: Cloudflare Workers CLI tool

### Features
- Fast development with Vite-based bundling
- Type safety with TypeScript
- Rapid UI development with Tailwind CSS and DaisyUI
- Modern React patterns and best practices
- Global edge deployment with Cloudflare Pages
- Theme switching (light/dark/system)
- Responsive design
- Component-based architecture
- Code quality tools (ESLint, Prettier)
- Development hot reloading

## Project Structure
```
remix-cloudflare-starter/
├── app/
│   ├── components/    # Reusable UI components
│   ├── lib/          # Utility functions and shared logic
│   ├── routes/       # Application routes
│   └── styles/       # Global styles and CSS
├── public/           # Static assets
└── ...config files
```

## Deployment to Cloudflare Pages

### Method 1: Using Wrangler CLI (Recommended)
The project is configured to use Wrangler for direct deployment:

1. Make sure you're logged in to Wrangler:
   ```bash
   npx wrangler login
   ```

2. Deploy your project:
   ```bash
   npm run deploy
   ```

This will build and deploy your site directly to Cloudflare Pages.

### Method 2: Using Cloudflare Dashboard
Alternatively, you can deploy through the Cloudflare Dashboard:

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Log in to the Cloudflare dashboard (https://dash.cloudflare.com)
3. Go to Pages > Create a project
4. Connect your Git repository
5. Configure your build settings:
   - Build command: `npm run build`
   - Build output directory: `public`
   - Node.js version: 18 (or later)
6. Click "Save and Deploy"

Your site will be automatically deployed and available at `https://<project-name>.pages.dev`. Cloudflare Pages will automatically deploy new changes when you push to your repository.

## Next Steps

### Development
- Set up testing framework (Jest/Vitest)
- Add error boundary components
- Implement loading states
- Add form validation
- Set up API routes

### Performance
- Implement code splitting
- Add performance monitoring
- Optimize bundle size
- Add caching strategies

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

