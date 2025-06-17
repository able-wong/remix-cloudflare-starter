---
applyTo: '**/*.ts,**/*.tsx'
---

# Project Requirements and Coding Standards

## Project Overview

Modern web application boilerplate: Remix + TypeScript + React 18 + TailwindCSS v4 + DaisyUI v5.
Deployed on Cloudflare Pages with Firebase backend (auth, database, storage).

## Tech Stack

- **Framework**: Remix on Cloudflare Pages
- **Languages**: TypeScript, React 18
- **Styling**: TailwindCSS v4 with DaisyUI v5
- **Backend**: Firebase (auth, database, storage)
- **Build Tool**: Vite

## Project Setup

### Deployment

- Deploy to Cloudflare Pages using `npm run deploy`
- Update `name` field in `wrangler.jsonc` with your Pages application name
- Requires Wrangler CLI authentication: `wrangler auth login`

### Firebase Integration

- **Environment Setup**: Before working on Firebase code, verify FIREBASE environment variables exist in `.dev.vars`. If missing, guide users through Firebase project setup and configuration retrieval.
- **Firebase Tools**: Use `firebase-tools` CLI for project setup, database seeding, and administrative tasks (not part of application code)
- **Optional Setup**: Firebase integration is only needed when using authentication, database, or storage features
- Environment variables: Copy `.dev.vars.example` to `.dev.vars` and populate Firebase configuration
- Add same variables as secrets in Cloudflare Pages project settings
- Firebase services: Authentication, Firestore Database, Storage

## Environment Variables

### Environment Context Handling

- Use `app/utils/env.ts` for environment variable access
- **Client Environment** (`getClientEnv`): Safe variables exposed to browser (loaders)
- **Server Environment** (`getServerEnv`): All variables for server-side operations (actions)

### Environment Variable Priority

1. **Cloudflare Pages Production**: `context.cloudflare.env`
2. **Wrangler Development**: `context.env`
3. **Vite Development**: `process.env` (from `.dev.vars`)

### Usage Patterns

```typescript
// In loaders (client-side)
export async function loader({ context }: LoaderFunctionArgs) {
  const clientEnv = getClientEnv(context);
  // Only safe variables available
}

// In actions (server-side)
export async function action({ context }: ActionFunctionArgs) {
  const serverEnv = getServerEnv(context);
  // All environment variables available
}
```

### Environment Configuration Strategy

- **Minimal configuration** - Only include necessary environment variables
- **Client vs Server separation** - Use `getClientEnv` for browser-safe config only
- **Standard patterns** - Follow established library configuration patterns (e.g., Firebase client config)
- **Available variables**:
  - `APP_NAME`: Application name for logging (optional, defaults to 'remix-cloudflare-app')
  - `FIREBASE_CONFIG`: Client-safe Firebase configuration (optional, only needed for Firebase features)
  - `FIREBASE_PROJECT_ID`: Server-side Firebase project identifier (optional, only needed for Firebase features)

## React Best Practices

### Component Architecture

- Use functional components with hooks (no class components)
- Implement proper component composition
- Follow React 18 best practices
- Create reusable components when possible
- Keep components small and focused on a single responsibility

### Hooks and State Management

- Prefer React's built-in hooks over external state management for most cases
- Use `useState` for simple component-level state
- Leverage Remix's built-in data loading/mutations where possible
- Avoid introducing external state management unless necessary

### Common Hook Patterns

- `useState`: Component state management
- `useEffect`: Side effects (API calls, subscriptions, DOM mutations)
- `useContext`: Access shared context values
- `useCallback`: Memoize functions for performance optimization
- `useMemo`: Memoize computed values
- `useRef`: DOM element references or persistent values

### Custom Hooks

- Extract reusable stateful logic into custom hooks
- Name custom hooks with "use" prefix
- Keep custom hooks focused and testable

## Code Organization

- Follow Remix conventions for routes, loaders and actions
- Group related functionality in directories
- Separate business logic from UI components
- Use consistent naming conventions

### Route Structure and Templates

- **`app/routes/_index.tsx` is a demo/template file** - This file contains a comprehensive showcase of DaisyUI components, theme switching, and styling patterns. It should be replaced or heavily modified when starting a new project.
- The demo page includes examples of:
  - Theme switching functionality
  - DaisyUI component usage (cards, alerts, buttons, navbar)
  - TailwindCSS utility patterns
  - Responsive design implementation
- Use this file as a reference for component patterns and styling approaches, then replace with your actual application content

### Business Logic Organization

- Place all business logic in the `app/services/` folder
- Create service classes with clear interfaces and single responsibilities
- Use dependency injection patterns for better testability and modularity
- Keep services framework-agnostic when possible
- Use constructor default parameters to provide sensible defaults for dependencies
- Use lazy initialization for default instances to avoid module-level instantiation
- Prefer per-request service instances in Remix loaders/actions when possible

### Service Layer Best Practices

- Design services as classes or modules with clear public APIs
- Implement proper error handling and validation
- Use TypeScript interfaces to define service contracts
- Make services easily mockable for testing
- Follow SOLID principles for maintainable code

## Testing Strategy

### Test Coverage Requirements

- All code in the `app/services/` folder must be covered by tests
- Use Jest as the primary testing framework
- Place tests in `app/__tests__/` directory, mirroring the service structure
- Aim for high test coverage on business logic

### Testing Best Practices

- Write unit tests for service classes using dependency injection
- Mock external dependencies (APIs, databases, etc.)
- Use Jest's mocking capabilities for isolated testing
- Write descriptive test names that explain the expected behavior
- Follow AAA pattern (Arrange, Act, Assert) in test structure
- Test both happy paths and error scenarios

## Styling Approach

- Use Tailwind utility classes directly in components
- Follow responsive design principles
- Create theme variables for consistent design

### Component Selection Priority

1. **DaisyUI first**: Use DaisyUI components for common UI elements (including loading states, skeletons, form controls)
2. **External React components**: If DaisyUI doesn't have what you need
3. **Custom components**: Create from scratch and store in `app/components/` folder

## Performance Considerations

- Optimize for edge deployment on Cloudflare
- Implement proper code splitting
- Minimize client-side JavaScript
- Follow Remix data loading patterns

## Architectural Decisions & Patterns

### Authentication & Authorization

- **Use Firebase Auth directly** - Leverage Firebase Auth capabilities without custom wrapper services
- **Simple authorization patterns** - Use route-level protection in Remix loaders
- **Add role-based auth only when necessary** - Implement complex role systems only if users have different functional roles
- **Prefer simple checks** - Email-based admin checks or basic user properties over complex authorization layers

### Data Operations Patterns

- **Firestore for primary data** - Use Firestore collections for main application data
- **Client-side Firebase SDK** - For real-time features and client-side operations
- **Server-side operations** - Use existing `firebase-restapi.ts` pattern for server operations
- **Search implementation** - Use Firestore queries with proper indexing when possible

### Firebase Integration Patterns

- **Environment Configuration**:

  - `FIREBASE_CONFIG`: Client-safe configuration (contains public API keys and identifiers)
  - `FIREBASE_PROJECT_ID`: Project identifier for server-side operations

- **Service Usage**:

  - **Client-side operations**: Use `firebase.ts` service with `initializeAndGetFirebaseClient()`
  - **Server-side operations**: Use `firebase-restapi.ts` service for Cloudflare Workers compatibility
  - **Token verification**: Always verify Firebase ID tokens in server-side operations
  - **Error handling**: Implement proper error handling for all Firebase operations

- **Security Best Practices**:

  - Configure Firebase Security Rules for all services (Firestore, Storage, Realtime Database)
  - Never expose private keys or service account credentials in client-side code
  - Use Firebase ID tokens for user authentication in server-side operations
  - Implement proper user authorization checks before data operations

- **Development Workflow**:
  1. **Environment Check**: Verify `.dev.vars` contains required FIREBASE variables before proceeding with Firebase-related work
  2. **Firebase Project Setup**: If variables missing, help users create Firebase project at console.firebase.google.com and obtain configuration from Project Settings → General → Your apps
  3. **Use firebase-tools**: Install (`npm install -g firebase-tools`) for project setup, database seeding, security rules deployment, and administrative tasks (separate from app code)
  4. Set up Firebase Security Rules before deploying
  5. Test authentication flows in development
  6. Verify server-side token validation works correctly
  7. Test Firebase operations with proper error handling

### Feature Planning Guidelines

- **Question custom services** - Challenge the need for wrapper services around well-established libraries
- **Leverage existing capabilities** - Always check framework/library capabilities before creating custom solutions
- **Simplify when possible** - Prefer simple, direct approaches over complex abstractions
- **Follow established patterns** - Use existing project patterns and services as templates

## Project Structure

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

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run deploy       # Deploy to Cloudflare Pages
npm test            # Run tests
npm run lint        # Lint code
npm run format      # Format code
npm run typecheck   # TypeScript checking
```
