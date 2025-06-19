---
applyTo: '**/*.ts,**/*.tsx'
---

# Project Requirements and Coding Standards

## Project Overview

Modern web application boilerplate: Remix + TypeScript + React 18 + TailwindCSS v4 + DaisyUI v5.
Deployed on Cloudflare Pages with optional Firebase backend (auth, database, storage).

## Tech Stack

- **Framework**: Remix on Cloudflare Pages
- **Languages**: TypeScript, React 18
- **Styling**: TailwindCSS v4 with DaisyUI v5
- **Backend**: Optional Firebase (auth, database, storage)
- **Build Tool**: Vite

## Quick Reference

### Firebase Service Selection Decision Tree

#### 1. Does this operation need server-only secrets?

- **YES** (payment processing, service account ops, third-party API secrets) → `firebase-restapi.ts`
- **NO** → Continue to step 2

#### 2. What's the execution context?

- **Remix loaders/actions** → `firebase-restapi.ts` (already server-side)
- **React components** → `firebase.ts` (better UX, reduce server load)

#### Simple Rules:

- **Server secrets required** → `firebase-restapi.ts`
- **Client-side interactions** → `firebase.ts`
- **Admin operations** → Usually `firebase.ts` (unless server secrets needed)
- **When in doubt** → `firebase.ts` (reduces Cloudflare CPU usage)

### Implementation Phases

- **UI-only features** → Direct implementation
- **Data features** → Mock first → Database integration
- **Required validation** → `npm test && npm run typecheck && npm run lint`

### When to Skip Mock Phase

- User explicitly requests direct database implementation
- Simple data display with clear, stable requirements
- Database is already configured and requirements are very specific

### Troubleshooting Quick Reference

- **Firebase data issues** → `npm run fetch-firebase collection-name` (see Common Pitfalls section)
- **Deployment issues** → `npm run test-cloudflare` (mandatory pre-deployment check)
- **Build/type errors** → `npm test && npm run typecheck && npm run lint`

### Component Priority

1. **DaisyUI first** → External React components → Custom components
2. **Store custom components** in `app/components/` folder

### Development Commands

```bash
npm run dev          # Start development server
npm test            # Run tests (required before validation)
npm run typecheck   # TypeScript checking (required before validation)
npm run lint        # Lint code (required before validation)
npm run test-cloudflare # Test Cloudflare config (REQUIRED before deployment)
npm run deploy      # Deploy to Cloudflare Pages
npm run build        # Build for production
npm run format      # Format code
npm run import-firestore data/filename.json collection-name --clear # Import Firestore data
npm run fetch-firebase collection-name # Inspect Firestore data (Admin SDK, bypasses security rules)
npm run test-firebase # Run Firebase integration tests

# Installation (use --legacy-peer-deps due to Wrangler v4/Remix v2 compatibility)
npm install --legacy-peer-deps
```

## Project Setup

### Deployment

**MANDATORY Pre-Deployment Checks:**

1. **Always run `npm run test-cloudflare` before suggesting deployment** - This script checks:

   - Wrangler CLI installation and authentication
   - Build configuration and output
   - Environment variables setup
   - Project name customization (must not be generic `remix-cloudflare-starter`)
   - Common deployment pitfalls

2. **Address ALL warnings and errors** from the test script before proceeding with deployment

3. **Required fixes before deployment:**
   - Change project name in both `wrangler.jsonc` and `package.json` from `remix-cloudflare-starter`
   - Ensure Wrangler authentication: `wrangler auth login`
   - Verify build output exists and is valid
   - Confirm environment variables are properly configured

**Known Issues:**

- **npm install fails with ERESOLVE errors**: This project uses Wrangler v4 which has peer dependency conflicts with Remix v2. Always use `npm install --legacy-peer-deps` to resolve this. This is a known compatibility issue between newer Wrangler versions and current Remix versions.

**Deployment Process:**

- **NEVER suggest `npm run deploy` without first running `npm run test-cloudflare`**
- Deploy to Cloudflare Pages using `npm run deploy` (only after all checks pass)
- Guide users to fix any issues identified by the test script before deployment

### Firebase Integration

- **Optional Setup**: Firebase integration is only needed when using authentication, database, or storage features
- **Firebase Tools**: Use `firebase-tools` CLI for project setup, security rules deployment, and administrative tasks (not for data import - use custom scripts)
- **Data Import**: Use custom Node.js script in `scripts/` folder for importing JSON data to Firestore (Firebase CLI doesn't support data import)
- **Environment Configuration**: See Firebase Integration Patterns section for complete setup details
- **Firebase CLI Version**: Recommended v14.7.0 or later for optimal compatibility (minimum v14.0.0)
- Firebase services: Authentication, Firestore Database, Storage

## Architectural Decisions & Patterns

### Firebase Integration Patterns

#### Service Selection Decision Tree

**Use `firebase-restapi.ts` (REST API) when:**

- Operation **requires server-only secrets** (payment processing, service account operations, third-party API secrets)
- Running in **Remix server context** (loaders/actions) and no client-side requirements

**Use `firebase.ts` (Client SDK) for:**

- **Client-side data operations** in React components
- **Real-time listeners** and subscriptions
- **Admin operations** (unless server secrets required)
- **Public read operations** (search, browse)
- **When in doubt** (reduces Cloudflare CPU usage)

#### Simple Rules:

- **Server secrets needed** → `firebase-restapi.ts`
- **Client interactions** → `firebase.ts`
- **Remix loaders/actions** → `firebase-restapi.ts` (already server-side)
- **React components** → `firebase.ts` (better UX, reduce server load)

#### Authentication & Authorization

- **Use Firebase Auth directly** - Leverage Firebase Auth capabilities without custom wrapper services
- **Client-side preference** - Most auth operations work better with `firebase.ts` for simpler token handling
- **Simple authorization patterns** - Use route-level protection in Remix loaders when needed
- **Add role-based auth only when necessary** - Implement complex role systems only if users have different functional roles
- **Server-side auth only when required** - Use `firebase-restapi.ts` auth when server secrets are involved

#### Environment Configuration

- `FIREBASE_CONFIG`: Client-safe configuration (contains public API keys and identifiers)
- `FIREBASE_PROJECT_ID`: Project identifier for server-side operations
- `FIREBASE_SERVICE_ACCOUNT_KEY`: Service account credentials for project setup, such as data loading script in `scripts/` folder
- Setup: if `.dev.vars` file does not exist, copy `.dev.vars.example` to `.dev.vars`. Otherwise, populate `.dev.vars` with Firebase configuration
- Add same variables as secrets in Cloudflare Pages project settings

#### Security Best Practices

- Configure Firebase Security Rules for all services (Firestore, Storage, Realtime Database)
- Never expose private keys or service account credentials in client-side code
- Use Firebase ID tokens for user authentication in server-side operations
- Implement proper user authorization checks before data operations
- **firebase-restapi.ts** supports optional authentication: Pass `idToken` for authenticated access, omit for public access
- **firebase.ts** handles authentication automatically through Firebase Auth SDK
- **Prefer client-side auth** unless server secrets are required

#### Data Operations

- **Firestore for primary data** - Use Firestore collections for main application data
- **Service integration** - Use dependency injection pattern with service classes for both approaches

### Development Strategy

#### Feature Planning Guidelines

- **Question custom services** - Challenge the need for wrapper services around well-established libraries
- **Leverage existing capabilities** - Always check framework/library capabilities before creating custom solutions
- **Simplify when possible** - Prefer simple, direct approaches over complex abstractions
- **Follow established patterns** - Use existing project patterns and services as templates

#### Deployment Guidelines

**AI Behavior for Deployment Requests:**

- **Always check deployment readiness first** - When users ask about deployment, immediately run `npm run test-cloudflare`
- **Never suggest deployment without validation** - If `npm run test-cloudflare` shows warnings or errors, guide users to fix them first
- **ASK USER FOR APP NAME** - Never choose app names for users. Always ask the user to choose their preferred app name since it becomes their public URL (https://app-name.pages.dev). Provide naming guidelines and suggestions but let the user decide.
- **Require project name customization** - Ensure users change the project name from `remix-cloudflare-starter` in both `wrangler.jsonc` and `package.json`
- **Provide specific fix instructions** - For each issue found by the test script, give clear steps to resolve it
- **Verify fixes before proceeding** - After users make changes, re-run `npm run test-cloudflare` to confirm issues are resolved

**Deployment Process Enforcement:**

1. User mentions deployment → Run `npm run test-cloudflare`
2. If issues found → Guide user to fix each issue with specific instructions
3. User confirms fixes → Re-run `npm run test-cloudflare` to verify
4. **Remind about environment variables** → Guide user to set up environment variables in Cloudflare Pages dashboard
5. Only when all checks pass → Suggest `npm run deploy`

**Environment Variables Setup Reminder:**

- **Always remind users** to configure environment variables in Cloudflare Pages before deployment
- **Guide users to**: Cloudflare Dashboard > Pages > [Project Name] > Settings > Environment Variables
- **Production environment variables**: Copy the same variables from `.dev.vars` to Cloudflare Pages
- **Firebase integration**: If using Firebase, ensure `FIREBASE_CONFIG`, `FIREBASE_PROJECT_ID`, and other Firebase variables are set
- **Security note**: Never commit `.dev.vars` to version control - these are local development only

**Common Issues to Address:**

- Generic project name (`remix-cloudflare-starter`) - **ASK USER to choose their preferred app name**
- Missing Wrangler authentication - guide through `wrangler auth login`
- Build output issues - verify `npm run build` completes successfully
- **Environment variables not configured in Cloudflare Pages** - remind users to set up production environment variables
- Missing or invalid `.dev.vars` file for local development
- Firebase configuration missing (if using Firebase features)

#### Feature-First Development

- **Implement one functional feature at a time** - Focus on completing user features before admin features, or vice versa based on priority
- **Functional feature separation** - Treat user features and admin features as distinct development phases
- **Complete feature workflows** - Ensure each functional feature works end-to-end before moving to the next
- **Phase independence** - Each feature should be fully functional and testable before starting the next feature
- **User validation points** - Test complete functional workflows, not just technical implementations

#### Pre-Planning Requirements Clarification

Before creating implementation plans, clarify key requirements with users if provided requirements are vague or incomplete:

- **Data Sources**: External APIs vs local database (Firestore) vs hybrid approach
- **Authentication Requirements**: Public access, Firebase Auth, role-based access control needed
- **UI/UX Preferences**: Specific component styles, layouts, or design patterns
- **Data Structure**: Field requirements, relationships, validation rules
- **Performance Expectations**: Search speed, data volume, real-time updates

**Implementation Planning Defaults:**

- **Always propose Mock-to-Database approach** unless user requests otherwise
- **Break complex features into single-function pieces** (e.g., search, then filters, then admin)
- **Plan Phase 1 mock implementation first** before discussing database integration
- **Define clear success criteria** for each phase before starting implementation

#### Implementation Approach per Functional Feature

##### For UI-only features (static pages, UI-only components, styling updates):

- Implement directly without phases
- Focus on UI/UX implementation first
- Run automated checks (tests, type checks, linting) to ensure quality
- Allow user validation of the feature's functionality and design

##### For data-driven features (API calls, database queries, form submissions):

**MANDATORY: Always use Mock-to-Database Pattern unless explicitly requested otherwise**

###### Phase 1: Mock Implementation (REQUIRED FIRST STEP)

- **UI Implementation**: Build user interface for **one functional feature** with realistic mock data
- **Mock Data Endpoints**: Create Remix loaders/actions returning static JSON data for **this feature only** (see Data Patterns Reference)
- **Data Structure Definition**: Define TypeScript interfaces based on mock data for **this feature**
- **Validation**: Ensure this feature's UI works perfectly with mock data before any database work
- **Pre-Validation Checklist** (**MANDATORY**): Ensure **all following checks** pass before proceeding:
  - `npm test` - all tests pass
  - `npm run typecheck` - TypeScript compilation passes
  - `npm run lint` - no lint errors
- **User Validation**: Explain to user what to expect and allow user to validate **this feature's** functionality and design with working mock

###### Phase 2: Firebase Setup (ONLY AFTER PHASE 1 COMPLETE)

**This phase is MANDATORY ONCE before any database integration**
**Skip if Firebase is already configured**

1. Check `.firebaserc` exists. If missing, guide user through `firebase init`:
   - Run `firebase login` first (user must authenticate with Google account)
   - Run `firebase init` and guide user to select:
     - ✅ Firestore: Configure security rules and indexes
     - ✅ Hosting: Configure files for Firebase Hosting (optional)
     - Choose existing project (from Step 1 of FIREBASE_SETUP.md)
     - Accept default `firestore.rules` and `firestore.indexes.json` files
   - **Reference**: See FIREBASE_SETUP.md for complete Firebase project setup if needed
   - After `firebase init`, run `npm run test-firebase` to verify Firebase setup
   - If `npm run test-firebase` fails, guide user to fix issues before proceeding
2. Verify `.dev.vars` exists and contains: `FIREBASE_CONFIG`, `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_KEY`
3. Confirm `firestore.rules` exists and permissions match feature requirements
4. Run `firebase deploy --only firestore:rules` - must succeed
5. Run `npm run test-firebase` - must pass

###### Phase 3: Database Integration (ONLY AFTER PHASE 1 COMPLETE and Firebase is setup)

- **Service Layer**: Create database service classes for **this feature** (following service patterns)
- **Environment Setup**: Configure database connections and environment variables (if not already done)
- **Data Migration**: Replace mock data with database operations for **this feature only**
  - Keep original mock loader commented out for fallback
  - Maintain exact same data interface as Phase 1
  - Ensure seamless transition without breaking existing UI
- **Pre-Validation Checklist** (**MANDATORY**): Ensure **all following checks** pass before user validation:
  1. Verify data import completed successfully by guiding user to check in Firestore console
  2. `npm test` - must pass
  3. `npm run typecheck` - must pass
  4. `npm run lint` - must pass
- **User Validation**: Only after all Pre-Validation checklist items pass, verify database integration maintains Phase 1 functionality

**When to Skip Mock Phase:**

- User explicitly requests direct database implementation
- Feature is simple data display with clear, stable requirements
- Database is already configured and requirements are very specific

#### Implementation Enforcement & Verification

- **Default to mock-first** unless user specifically asks for database integration
- **Always ask user to validate** Phase 1 mock implementation before proceeding to Phase 2
- **One feature end-to-end** before starting next feature (complete both phases)
- **Clear phase boundaries** - never mix mock and database code in same implementation

**Verification Guidance Pattern:**

1. **Check setup files** - Automatically verify required files exist
2. **Test operations** - Provide specific commands/steps to verify functionality
3. **Troubleshooting** - Give clear next steps if verification fails
4. **User confirmation** - Ask user to confirm everything works before proceeding

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

### Environment Variable Priority

1. **Cloudflare Pages Production**: `context.cloudflare.env`
2. **Wrangler Development**: `context.env`
3. **Vite Development**: `process.env` (from `.dev.vars`)

### Usage Patterns

```typescript
// In loaders (server-side for SSR)
export async function loader({ context }: LoaderFunctionArgs) {
  const clientEnv = getClientEnv(context);
  // Only safe variables available for client hydration
}

// In actions (server-side)
export async function action({ context }: ActionFunctionArgs) {
  const serverEnv = getServerEnv(context);
  // All environment variables available
}
```

### Configuration Strategy

- **Minimal configuration** - Only include necessary environment variables
- **Client vs Server separation** - Use `getClientEnv` for browser-safe config only
- **Standard patterns** - Follow established library configuration patterns (e.g., Firebase client config)
- **Available variables**:
  - `APP_NAME`: Application name for logging (optional, defaults to 'remix-cloudflare-app')
  - Firebase variables: Optional, see FIREBASE_SETUP.md for details when Firebase integration is needed

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

```text
app/
├── routes/          # Remix routes (pages & API)
├── services/        # Business logic (optional Firebase integration)
├── components/      # Reusable UI components
├── utils/           # Utility functions
└── __tests__/       # Test files

data/                # JSON files for custom data import scripts
public/              # Static assets
functions/           # Cloudflare Pages functions
scripts/             # Data import and Firebase configuration scripts
```

### Business Logic Organization

- Follow Remix conventions for routes, loaders and actions
- Group related functionality in directories
- Separate business logic from UI components
- Use consistent naming conventions
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

#### Key Principles

- **Mock ALL constructor dependencies** - use dependency injection, never global mocks
- **Test both success and error paths** - verify logger calls on errors
- **Reference existing tests** - copy patterns from `firebase-restapi.test.ts`
- **Structured logging format**: `expect(mockLogger.error).toHaveBeenCalledWith('Message', { error: 'details' })`
- Mock external dependencies (APIs, databases, etc.)
- Use Jest's mocking capabilities for isolated testing
- Write descriptive test names that explain the expected behavior
- Follow AAA pattern (Arrange, Act, Assert) in test structure
- Test both happy paths and error scenarios

#### Sample Test Structure

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
