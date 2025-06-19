---
applyTo: '**/*.ts,**/*.tsx'
---

# AI Behavior Guide

## Project Overview

Modern web application boilerplate: Remix + TypeScript + React 18 + TailwindCSS v4 + DaisyUI v5.
Deployed on Cloudflare Pages with optional Firebase backend (auth, database, storage).

## Tech Stack

- **Framework**: Remix on Cloudflare Pages
- **Languages**: TypeScript, React 18
- **Styling**: TailwindCSS v4 with DaisyUI v5
- **Backend**: Optional Firebase (auth, database, storage)
- **Build Tool**: Vite

## Core Development Protocol

**MANDATORY FIRST STEP: Always clarify requirements before any implementation**

When a user requests a feature:

1. **Stop and Ask Questions** - Never start coding immediately
2. **Present options with trade-offs** - Help users understand their choices
3. **Confirm understanding** - Summarize requirements back to user
4. **Get explicit approval** - Wait for "yes, proceed" before starting

**Required Clarification Questions:**

- **Data Sources**: External APIs vs local database (Firestore) vs hybrid approach?
- **Authentication**: Public access, Firebase Auth, role-based access control needed?
- **UI/UX**: Specific component styles, layouts, or design patterns?
- **Data Structure**: What fields are required? Any relationships or validation rules?
- **Performance Expectations**: Search speed requirements, expected data volume, real-time updates needed?
- **User Flow**: Who will use this feature and how? Complete workflow?

**Examples of Required Clarification:**

- "Build a blog" → What content management approach? Admin interface needed? User comments? SEO requirements?
- "Add authentication" → What login methods? User roles? Registration flow? Password reset?
- "Create a dashboard" → What data to display? Real-time updates? User-specific or global data?

**Implementation Planning Defaults:**

- **Always propose Mock-to-Database approach** unless user requests otherwise
- **Break complex features into single-function pieces** (e.g., search, then filters, then admin)
- **Plan Phase 1 mock implementation first** before discussing database integration
- **Define clear success criteria** for each phase before starting implementation

## Quick Reference

### Firebase Service Selection & Patterns

**Context-Based Selection (Only consideration needed):**

- **Remix loaders/actions** → `firebase-restapi.ts` (server-side)
- **React components** → `firebase.ts` (client-side)
- **Authentication** → Always `firebase.ts` (client-side only)

**Examples:**

- Admin book CRUD in loaders → `firebase-restapi.ts`
- Real-time search in components → `firebase.ts`
- User login/logout → `firebase.ts`

**Key Patterns:**

- **Authentication**: Always client-side with Firebase SDK, never server-side auth
  - Use `signInWithEmailAndPassword()` for login - never custom auth flows
  - Firebase manages auth state automatically after successful login
- **Token Passing**: When using `firebase-restapi.ts`, idToken MUST be passed from frontend to loaders/actions
  - Get idToken client-side: `await user.getIdToken()`
  - Pass via form data or headers to server-side operations
  - Never assume server-side has automatic access to auth state
- **Environment Setup**: Run `npm run test-firebase` first to determine what needs fixing
  - NEVER overwrite existing `.dev.vars` - always check its content first
  - Guide user to fix specific missing/invalid variables based on test results
- **Security**: Configure Firestore security rules, never expose private keys client-side
- **Data Operations**: Use Firestore for primary data with dependency injection pattern

### Implementation Phases

- **UI-only features** → Direct implementation
- **Data features** → Mock first → Database integration (mandatory approach)
- **Required validation** → `npm test && npm run typecheck && npm run lint`

**Mock-to-Database Protocol:**

1. **Phase 1**: UI + realistic mock data + TypeScript interfaces + validation
2. **Phase 2**: Firebase setup (if not already configured)
3. **Phase 3**: Replace mock with database, keep same interfaces
4. **Always validate each phase** before proceeding to next

**Post-Implementation Validation (All Features):**

- Run validation: `npm test && npm run typecheck && npm run lint`
- **Explain to user what was implemented** and ask them to validate requirements are met correctly
- For data features after Phase 3: **Propose deployment to Cloudflare** and follow Deployment Protocol

### When to Skip Mock Phase

- User explicitly requests direct database implementation
- Simple data display with clear, stable requirements
- Database is already configured and requirements are very specific

### Deployment Protocol

**MANDATORY: Always run `npm run test-cloudflare` before any deployment**

**AI Behavior for Deployment Requests:**

1. User mentions deployment → Run `npm run test-cloudflare`
2. If issues found → Guide user to fix each issue with specific instructions
3. User confirms fixes → Re-run `npm run test-cloudflare` to verify
4. **ASK USER FOR APP NAME** - Never choose app names (becomes public URL: https://app-name.pages.dev)
5. Remind about environment variables in Cloudflare Pages dashboard
6. Only when all checks pass → Suggest `npm run deploy`

**Pre-Deployment Checklist:**

- Change project name from `remix-cloudflare-starter` in `wrangler.jsonc` and `package.json`
- Ensure Wrangler authentication: `wrangler auth login`
- Configure environment variables in Cloudflare Pages dashboard
- Verify `npm run build` completes successfully

### Troubleshooting Quick Reference

- **Firebase data issues** → `npm run fetch-firebase collection-name` (see Common Pitfalls section)
- **Deployment issues** → `npm run test-cloudflare` (mandatory pre-deployment check)
- **Build/type errors** → `npm test && npm run typecheck && npm run lint`

### Component Priority

1. **DaisyUI first** → External React components → Custom components
2. **Store custom components** in `app/components/` folder

### Essential Commands

- `npm run dev` - Start development server
- `npm test && npm run typecheck && npm run lint` - Required validation
- `npm run test-cloudflare` - REQUIRED before deployment
- `npm run test-firebase` - Diagnose Firebase issues
- `npm run fetch-firebase collection-name` - Inspect Firestore data
- `npm run deploy` - Deploy to Cloudflare Pages

## Project Setup

### Firebase Integration (Optional)

Firebase provides authentication, database, and storage. Only needed when using these features.

**Setup Commands:**

- `npm run test-firebase` - **ALWAYS run first** to diagnose what needs fixing
- `npm run fetch-firebase collection-name` - Inspect Firestore data
- Use custom scripts in `scripts/` folder for data import (Firebase CLI doesn't support data import)

**Environment Variables Approach:**

- **NEVER overwrite existing `.dev.vars`** - always check content first
- Run `npm run test-firebase` to identify missing/invalid variables
- Guide user to fix specific issues based on test results
- Required variables: `FIREBASE_CONFIG`, `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_KEY`

## Development Strategy

### Feature Planning Guidelines

- **Question custom services** - Challenge the need for wrapper services around well-established libraries
- **Leverage existing capabilities** - Always check framework/library capabilities before creating custom solutions
- **Simplify when possible** - Prefer simple, direct approaches over complex abstractions
- **Follow established patterns** - Use existing project patterns and services as templates

### Feature-First Development

- **Implement one functional feature at a time** - Focus on completing user features before admin features, or vice versa based on priority
- **Functional feature separation** - Treat user features and admin features as distinct development phases
- **Complete feature workflows** - Ensure each functional feature works end-to-end before moving to the next
- **Phase independence** - Each feature should be fully functional and testable before starting the next feature
- **User validation points** - Test complete functional workflows, not just technical implementations

### Implementation Approach per Functional Feature

#### For UI-only features (static pages, UI-only components, styling updates):

- Implement directly without phases
- Focus on UI/UX implementation first
- Follow Post-Implementation Validation (see Quick Reference)

#### For data-driven features (API calls, database queries, form submissions):

**Follow Mock-to-Database Protocol (see Quick Reference for phases)**

**Phase 1 Details:**

- Build UI for one functional feature with realistic mock data
- Create Remix loaders/actions returning static JSON
- Define TypeScript interfaces based on mock data
- Follow Post-Implementation Validation (see Quick Reference)

**Phase 2 Details:**

- Run `npm run test-firebase` to diagnose what needs fixing
- If `.firebaserc` missing, guide user through `firebase init`:
  - Select "Firestore: Configure security rules and indexes"
  - Choose existing project or create new one
  - Accept default `firestore.rules` and `firestore.indexes.json` files
- Fix any missing environment variables identified by test
- Deploy security rules: `firebase deploy --only firestore:rules`
- Re-run `npm run test-firebase` until it passes

**Phase 3 Details:**

- Create database service classes following service patterns
- Replace mock data with database operations
- Import test data: `npm run import-firestore data/filename.json collection-name`
- Verify data exists: `npm run fetch-firebase collection-name`
- Keep original mock loader commented out for fallback
- Follow Post-Implementation Validation (see Quick Reference)

#### Implementation Enforcement

- **Default to mock-first** unless user specifically asks for database integration
- **Always ask user to validate** Phase 1 mock implementation before proceeding to Phase 2
- **One feature end-to-end** before starting next feature (complete all phases)
- **Clear phase boundaries** - never mix mock and database code in same implementation

**When to Skip Mock Phase:**

- User explicitly requests direct database implementation
- Simple data display with clear, stable requirements
- Database is already configured and requirements are very specific

### External Service Recommendations

When features require capabilities beyond the current tech stack, recommend these external services:

#### Email Services

- **Transactional Email**: Recommend **Brevo** (generous free tier, reliable API)
- **Newsletter/Marketing**: Recommend **Brevo** or **Mailchimp**

#### File Storage & Media

- **File Uploads**: Use **Firebase Storage** (if Firebase already configured) or **Cloudflare R2**
- **Image Processing**: Recommend **Cloudinary** (free tier available)

#### Communication

- **SMS/Text Messages**: Recommend **Twilio** (reliable API, pay-per-use)
- **Push Notifications**: Recommend **Firebase Cloud Messaging** (if Firebase configured)

#### External Service Implementation Pattern

- **Use dependency injection pattern** - Accept a `fetch` function in service constructor for testability (following existing `FirebaseRestApi` pattern)
- **Create service classes** with clear interfaces and proper error handling
- **Implement mock-first approach** - Mock API responses during Phase 1 UI development
- **Add comprehensive testing** - Test both success and error scenarios with mocked fetch

**Service Selection Guidelines:**

- **Prioritize free tiers** for proof-of-concept implementations
- **Choose services with good API documentation** and TypeScript support
- **Prefer services that integrate well** with Cloudflare/Firebase ecosystem

## Environment Variables & Configuration

### Environment Context Handling

- Use `app/utils/env.ts` for environment variable access
- **Client Environment** (`getClientEnv`): Safe variables exposed to browser (loaders)
- **Server Environment** (`getServerEnv`): All variables for server-side operations (actions)

### Environment Variables & Configuration

- Use `app/utils/env.ts` for environment variable access
- **Client Environment** (`getClientEnv`): Safe variables exposed to browser (loaders)
- **Server Environment** (`getServerEnv`): All variables for server-side operations (actions)
- **Available variables**: `APP_NAME` (optional), Firebase variables (when needed)

## React & Component Architecture

### Component Best Practices

- Use functional components with hooks (no class components)
- Implement proper component composition
- Follow React 18 best practices
- Create reusable components when possible
- Keep components small and focused on a single responsibility

### Component Selection Priority

1. **DaisyUI first**: Use DaisyUI components for common UI elements (including loading states, skeletons, form controls)
2. **External React components**: If DaisyUI doesn't have what you need
3. **Custom components**: Create from scratch and store in `app/components/` folder

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

### Route Structure and Templates

- **`app/routes/_index.tsx` is a demo/template file** - This file contains a comprehensive showcase of DaisyUI components, theme switching, and styling patterns. It should be replaced or heavily modified when starting a new project.
- The demo page includes examples of:
  - Theme switching functionality
  - DaisyUI component usage (cards, alerts, buttons, navbar)
  - TailwindCSS utility patterns
  - Responsive design implementation
- Use this file as a reference for component patterns and styling approaches, then replace with your actual application content

## Code Organization & Architecture

### Project Structure

- `app/routes/` - Remix routes (pages & API)
- `app/services/` - Business logic (optional Firebase integration)
- `app/components/` - Reusable UI components
- `app/utils/` - Utility functions
- `app/__tests__/` - Test files

### Business Logic Organization

- Follow Remix conventions for routes, loaders and actions
- Place all business logic in the `app/services/` folder
- Create service classes with clear interfaces and single responsibilities
- **Use dependency injection patterns** for better testability and modularity
- **Use lazy initialization** for default instances to avoid module-level instantiation
- **Prefer per-request service instances** in Remix loaders/actions when possible
- **REQUIRED: Document service context** - All Firebase services must include header comments specifying usage context

## Data Patterns Reference

### Phase 1: Mock Data Creation

- **Location**: Return static data in Remix loaders or create files in `data/mock/` directory
- **Data Quality**: Include realistic volume, variety (empty/long/special characters), relationships, and error scenarios
- **Structure**: Define TypeScript interfaces based on mock data first, use predictable IDs that won't conflict with database auto-generation
- **Storage**: For large datasets, use separate mock files; for simple data, return directly in loaders

### Phase 2: Database Seeding

- **File Structure**: Create JSON files in `data/` directory matching Firestore collection hierarchy
- **Import Process**: Use custom import script: `npm run import-firestore data/filename.json collection-name --clear`
- **Data Verification**: Check Firestore console and test with actual database queries, not just mock fallback
- **Quality Standards**: Ensure realistic production scenarios, edge cases, sufficient volume for pagination/search testing

## Testing Strategy

### Test Coverage Requirements

#### Mandatory Test Coverage

- **Business Logic**: All code in `app/services/` must be covered by tests
- **Pure Utilities**: Environment handling (`env.ts`), logging (`logger.ts`), data processing, validation functions in `app/utils/`

#### Optional Test Coverage

- **React Utilities**: Hooks, React-specific helpers, component utilities, theme helpers in `app/utils/`
- **Simple Type Definitions**: Interfaces and type-only files

#### Testing Classification Guidelines

- **Test Required**: Functions that process data, make external calls, handle business logic, or have complex conditional logic
- **Test Optional**: React hooks, component helpers, simple getters/setters, theme utilities, or UI-only utilities that are difficult to test in isolation

#### General Testing Requirements

- Use Jest as the primary testing framework
- Place tests in `app/__tests__/` directory, mirroring the service structure
- Aim for high test coverage on business logic

### Testing Best Practices

- **Mock ALL constructor dependencies** - use dependency injection, never global mocks
- **Mock external dependencies** - APIs, databases, fetch functions, etc.
- **Test both success and error paths** - verify logger calls on errors
- **Reference existing tests** - copy patterns from `firebase-restapi.test.ts`
- **Structured logging format**: `expect(mockLogger.error).toHaveBeenCalledWith('Message', { error: 'details' })`
- Use Jest as the primary testing framework
- Place tests in `app/__tests__/` directory, mirroring the service structure

**Required Test Structure for Dependency Injection:**

```typescript
// Always start with
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock all dependencies
const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};
const mockApi = { method: jest.fn() } as unknown as jest.Mocked<ApiType>;

// Standard structure
describe('ServiceName', () => {
  let service: ServiceName;
  beforeEach(() => {
    jest.clearAllMocks();
    service = new ServiceName(mockApi, mockLogger);
  });
});
```

## Styling & UI Components

### Styling Approach

- Use Tailwind utility classes directly in components
- Follow responsive design principles
- Create theme variables for consistent design

### DaisyUI Form Alignment

For proper form layout and alignment, DaisyUI requires specific class combinations:

- **Form containers**: Use `form-control w-full` for proper spacing and alignment
- **Input elements**: Always include `w-full` class: `input input-bordered w-full`
- **Structure pattern**: `<div className="form-control w-full"><input className="input input-bordered w-full">`
- **Common issue**: Missing `w-full` classes cause left-aligned, narrow form elements

## Performance Considerations

- Optimize for edge deployment on Cloudflare
- Implement proper code splitting
- Minimize client-side JavaScript
- Follow Remix data loading patterns

## Common Implementation Pitfalls & Solutions

### TypeScript ESLint: Unused Error Variables

- **Issue**: `@typescript-eslint/no-unused-vars` error when catching exceptions but not using the error variable
- **Solution**: Use `} catch {` instead of `} catch (error) {` when error is not needed
- **When error needed**: Only include error parameter if actually using it for logging or re-throwing

### Theme Toggle Hydration

- **Issue**: SSR/client theme state mismatch causes hydration warnings
- **Root Cause**: Server renders with default theme, client may have different theme stored
- **Solution**: Use `useState(null)` initially, set theme in `useEffect` after client hydration
- **Pattern**: Always defer theme-dependent rendering until client-side
- **Code Example**: Check `theme === null` and show loading state until hydration complete

### Firebase Auth in Forms

- **Issue**: ID tokens are async but forms submit synchronously, causing 401 Unauthorized errors
- **Root Cause**: Form submission happens before ID token retrieval completes
- **Solution**: `event.preventDefault()` → `await getIdToken()` → set hidden field → `form.submit()`
- **Critical**: Never rely on synchronous token access in form handlers
- **Pattern**: Always use async token retrieval with manual form submission

### Firebase Data Issues

- **Issue**: Firestore queries return unexpected results or access denied errors
- **Solution**: Use `npm run fetch-firebase collection-name` to inspect actual Firestore data
