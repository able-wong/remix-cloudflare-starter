---
applyTo: '**/*.ts,**/*.tsx'
---

# AI Behavior Guide

## Tech Stack

- **Framework**: Remix on Cloudflare Pages
- **Languages**: TypeScript, React 18
- **Styling**: TailwindCSS v4 with DaisyUI v5
- **Backend**: Optional Firebase (auth, database, storage), Vercel AI for AI features
- **Testing**: Jest for unit tests, integration tests in `app/__tests__/integration-tests/`
- **Build Tool**: Vite

## Core Development Protocol

**MANDATORY: Always clarify requirements before implementation**

1. **Stop and Ask Questions** - Never start coding immediately
2. **Present options with trade-offs** - Help users understand choices
3. **Confirm understanding** - Summarize requirements back to user
4. **Get explicit approval** - Wait for "yes, proceed" before starting

**Key Questions**: Data sources? Authentication needs? UI/UX requirements? Data structure? User workflow?

## Quick Reference

### Firebase Service Selection & Patterns

**Key Patterns (Mandatory):**

- **Authentication**: Always client-side with Firebase SDK, never server-side auth
  - Use `signInWithEmailAndPassword()` for login - never custom auth flows
  - Firebase manages auth state automatically after successful login
- **Token Passing to Remix loaders/actions**: When using `firebase-restapi.ts`, idToken MUST be passed from frontend to loaders/actions
  - Get idToken client-side: `await user.getIdToken()`
  - Pass via form data or headers to server-side operations
  - Never assume server-side has automatic access to auth state
- **Auth Implementation**: Only use `onAuthStateChanged`, never `getCurrentUser()` - always check loading state before redirects to prevent loops
- **Auth Debugging**: Verify `console.log(useLoaderData().ENV.FIREBASE_CONFIG)` exists, check `onAuthStateChanged` fires, use `useNavigate()` never `window.location`
- **Auth Setup Verification**: Always run `npm run test-firebase` to verify Auth is enabled - guide user to enable in Firebase Console if test fails
- **Environment Setup**: Run `npm run test-firebase` first to determine what needs fixing
  - NEVER overwrite existing `.dev.vars` - always check its content first
  - Guide user to fix specific missing/invalid variables based on test results
- **Security**: Configure Firestore security rules, never expose private keys client-side
- **Data Operations**: Use Firestore for primary data with dependency injection pattern

### Implementation Phases

- **UI-only features** → Direct implementation
- **Data features** → Mock first → Database integration (mandatory approach)
- **Required validation** → `npm test && npm run typecheck && npm run lint`

**3-Phase Protocol:**

1. **Phase 1**: UI + mock data + TypeScript interfaces
2. **Phase 2**: Firebase setup (if needed)
3. **Phase 3**: Replace mock with database operations

- **Detailed steps**: See Development Strategy section below
- For data features after Phase 3: **Propose deployment to Cloudflare** and follow Deployment Protocol

### Deployment Protocol

**MANDATORY: Always run `npm run test-cloudflare` before any deployment**

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

- **Implement one functional feature at a time** - Focus on completing user features
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
- Run validation: follow Post-Implementation Validation

**Phase 2 Details:**

- Run `npm run test-firebase` to diagnose what needs fixing
- If `.firebaserc` missing, guide user through `firebase init`:
  - Select "Firestore: Configure security rules and indexes"
  - Choose existing project or create new one
  - Accept default `firestore.rules` and `firestore.indexes.json` files
- Fix any missing environment variables identified by test
- Update `firestore.rules` and `firestore.indexes.json` according to project requirements
- Deploy security rules and indexes: `firebase deploy --only firestore:rules,firestore:indexes`
- Re-run `npm run test-firebase` until it passes

**Phase 3 Details:**

- Create database service classes following service patterns
- Replace mock data with database operations
- Import test data: `npm run import-firestore data/filename.json collection-name`
- Verify data exists: `npm run fetch-firebase collection-name`
- Keep original mock loader commented out for fallback
- Run validation: follow Post-Implementation Validation

**Post-Implementation Validation**

- **Explain to user what was implemented** and ask them to validate requirements are met correctly
- For data features after Phase 3: **Propose deployment to Cloudflare** and follow Deployment Protocol

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

**Email**: Brevo (transactional/marketing), Mailchimp | **Storage**: Firebase Storage, Cloudflare R2 | **Media**: Cloudinary
**Communication**: Twilio (SMS), Firebase Cloud Messaging (push notifications)

**Implementation**: Use dependency injection, create service classes, mock-first approach, prioritize free tiers

## Environment Variables & Configuration

### Environment Context Handling

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

### Component Selection Priority

1. **DaisyUI first**: Use DaisyUI components for common UI elements (including loading states, skeletons, form controls)
2. **External React components**: If DaisyUI doesn't have what you need
3. **Custom components**: Create from scratch and store in `app/components/` folder

### Hooks and State Management

- Prefer React's built-in hooks over external state management for most cases
- Use `useState` for simple component-level state
- Leverage Remix's built-in data loading/mutations where possible
- Avoid introducing external state management unless necessary

### Custom Hooks

- Extract reusable stateful logic into custom hooks
- Name custom hooks with "use" prefix
- Keep custom hooks focused and testable

### Route Structure and Templates

- **`app/routes/_index.tsx` is a demo/template file** - This file contains a comprehensive showcase of DaisyUI components, theme switching, and styling patterns.
- Use this file as a reference for component patterns and styling approaches, then replace with your actual application content

## Code Organization & Architecture

### Project Structure

- `app/routes/` (pages & API)
- `app/services/` (business logic)
- `app/components/` (UI)
- `app/utils/` (utilities)
- `app/__tests__/` (tests)

### Business Logic

- Place all business logic in the `app/services/` folder
- Follow Remix conventions for routes, loaders and actions
- Create service classes with clear interfaces and single responsibilities
- Use dependency injection patterns
- **Use lazy initialization** for default instances to avoid module-level instantiation
- **Prefer per-request service instances** in Remix loaders/actions when possible
- Data access should be through service classes, not direct database calls
- **REQUIRED: Document service context** - All Firebase services must include header comments specifying usage context

## Data Patterns Reference

### Service Abstraction Pattern

- **Create service classes** for all data operations - never return static data directly in loaders
- **Mock services** implement same interface as database services for easy switching
- **Location**: `app/services/` with clear constructor dependencies and TypeScript interfaces

### Mock Data (Phase 1)

- **Quality**: Realistic volume, variety (empty/long/special), relationships, error scenarios | **IDs**: Predictable format to avoid database conflicts
- **Storage**: Separate files in `data/mock/` or service class constants

### Database Setup (Phase 2)

- **Seeding**: JSON files in `data/` → `npm run import-firestore data/filename.json collection-name --clear`
- **Verification**: Firestore console + actual queries (not mock fallback)

## Testing Strategy

### Test Coverage Requirements

#### Mandatory Test Coverage

- **Business Logic**: All code in `app/services/` must be covered by tests
- **Pure Utilities**: Environment handling (`env.ts`), logging (`logger.ts`), data processing, validation functions in `app/utils/`

**Optional**: React utilities, hooks, theme helpers, simple type definitions

### Testing Best Practices

- **Mock ALL constructor dependencies** - use dependency injection, never global mocks
- **Mock external dependencies** - APIs, databases, fetch functions
- **Test both success and error paths** - verify logger calls on errors
- **Reference existing tests** - copy patterns from `firebase-restapi.test.ts`
- **Structured logging format**: `expect(mockLogger.error).toHaveBeenCalledWith('Message', { error: 'details' })`
- Use Jest as the primary testing framework
- Place tests in `app/__tests__/` directory, mirroring the service structure

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
- Follow Remix data loading patterns

## Common Implementation Pitfalls & Solutions

### TypeScript ESLint: Unused Error Variables

- **Issue**: `@typescript-eslint/no-unused-vars` error when catching exceptions but not using the error variable
- **Solution**: Use `} catch {` instead of `} catch (error) {` when error is not needed

### Theme Toggle Hydration

- **Issue**: SSR/client theme state mismatch causes hydration warnings
- **Solution**: Use `useState(null)` initially, set theme in `useEffect` after client hydration
- **Pattern**: Check `theme === null` and show loading state until hydration complete

### Firebase Auth in Forms

- **Issue**: ID tokens are async but forms submit synchronously, causing 401 Unauthorized errors
- **Solution**: `event.preventDefault()` → `await getIdToken()` → set hidden field → `form.submit()`
- **Critical**: Never rely on synchronous token access in form handlers

### Firebase Data Issues

- **Issue**: Firestore queries return unexpected results or access denied errors
- **Solution**: Use `npm run fetch-firebase collection-name` to inspect actual Firestore data
