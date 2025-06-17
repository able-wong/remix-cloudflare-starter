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

- Environment variables: Copy `.dev.vars.example` to `.dev.vars` and populate
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

1. **DaisyUI first**: Use DaisyUI components for common UI elements
2. **External React components**: If DaisyUI doesn't have what you need
3. **Custom components**: Create from scratch and store in `app/components/` folder

## Performance Considerations

- Optimize for edge deployment on Cloudflare
- Implement proper code splitting
- Minimize client-side JavaScript
- Follow Remix data loading patterns

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
