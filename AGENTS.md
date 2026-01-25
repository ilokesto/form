# AGENTS.md - Sicilian Development Guide

## Communication Language

**IMPORTANT**: Always communicate with the user in Korean (한국어).

---

## Project Overview

**Sicilian** is a React form management library that uses Context API for global state management. It provides a controlled-component approach as an alternative to ref-based libraries like react-hook-form. The library supports runtime validation with zod, yup, and superstruct.

**Tech Stack**: TypeScript, React (>=18.0.0), Node.js  
**Package**: `@ilokesto/sicilian`  
**Architecture**: Class-based OOP with Builder and Chain of Responsibility patterns

---

## Build & Development Commands

### Build
```bash
npm run build        # Clean dist/ and compile TypeScript
```
- Removes `dist/` directory completely
- Compiles TypeScript to ESNext modules
- Generates type declarations in `dist/`
- No bundler used - pure TypeScript compiler

### Testing
⚠️ **No test suite present** - No test runner configured. Changes cannot be verified with automated tests.

### Linting
⚠️ **No lint command** - ESLint is configured (`@typescript-eslint/*`, `eslint-plugin-react`) but no npm script exists. Run manually if needed:
```bash
npx eslint src/
```

### Running Single Files
Not applicable - this is a library, not an application.

---

## Code Style & Conventions

### File Naming
- **Source files**: camelCase for utilities (`getObjByKeys.ts`), PascalCase for classes/components (`CreateForm.ts`, `SicilianProvider.tsx`)
- **Type files**: PascalCase matching domain (`Store.ts`, `State.ts`, `Validate.ts`)
- **CLI files**: lowercase for commands (`generate.ts`, `help.ts`)

### Import Organization

**Order** (strictly followed):
1. External libraries (`react`, `@ilokesto/*`)
2. Internal type imports (using `type` keyword)
3. Internal class/function imports
4. Relative imports from parent directories (`../`)
5. Relative imports from same directory (`./`)

**Patterns**:
```typescript
// ALWAYS use 'type' keyword for type-only imports
import type { InitState, IStore, ExtractKeys } from "../type";
import type { FormEvent } from "react";
import { Store } from "./Store";
```

- Use `type` imports whenever importing only types/interfaces
- Relative imports only (no path aliases configured)
- Group by source: external → types → implementations

### TypeScript Usage

**Strict Mode**: Enabled
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`

**Type vs Interface**:
- Prefer `type` for public APIs and complex unions
- Use `interface` for class contracts (prefixed with `I`)
  ```typescript
  export interface IStore<T> { /* ... */ }
  export class Store<T> implements IStore<T> { /* ... */ }
  ```

**Naming**:
- Interfaces: `IInterfaceName` (e.g., `IRegister`, `IStore`, `IValidate`)
- Types: Descriptive names (e.g., `InitState`, `ExtractKeys`, `SicilianEvent`)
- Generics: `T` for primary type parameter, descriptive for specific cases

**Generic Constraints**:
```typescript
// ALWAYS constrain with InitState for form-related generics
export class CreateForm<T extends InitState> { /* ... */ }
```

**Type Safety**:
- ✅ Use type guards (`isNumber`, `isArray`) for runtime checks
- ✅ Use type predicates: `(thing: X | Y): thing is X`
- ❌ NEVER use `any`, `@ts-ignore`, or `@ts-expect-error`
- Use utility types: `Partial<T>`, `ExtractKeys<T>`

### Class & OOP Patterns

**Private Fields**:
```typescript
// Standard: Use 'private' keyword for TypeScript-only privacy
private store: T
private callbacks = new Set<() => void>();
private registerOnChange: IRegisterOnChange

// Avoid: # syntax unless runtime security is critical
// (Testing, debugging, and tooling work better with 'private' keyword)
```

**Current Strategy**: All private fields use `private` keyword consistently for better maintainability and testing compatibility.

**Builder Pattern**: Used extensively for complex object construction
```typescript
new RegisterBuilder(name, value, ...)
  .setRegisterOnChange(...)
  .setRegisterOnFocus(...)
  .build()
```

**Template Method Pattern**: Used in `HandleSubmitTemplateMethod` for shared validation logic

**Chain of Responsibility**: Used in validation handlers (`HandlerChain`, `HandlerFactory`)

### Function & Variable Naming

**Classes**: PascalCase (`CreateForm`, `Store`, `RegisterBuilder`)  
**Functions/Methods**: camelCase (`doValidate`, `getStore`, `handleSubmit`)  
**Constants**: camelCase (no SCREAMING_CASE used)  
**Private methods**: No special prefix, rely on `private` keyword

**Arrow Functions**:
```typescript
// Use arrow functions for class methods to preserve 'this' context
public getStore = () => this.store
public setStore = (nextState: Partial<T>) => { /* ... */ }
```

### Error Handling

**Pattern**: Try-catch with console.error
```typescript
try {
  await this.fn(formState, e);
  this.clearFormOn?.includes("submit") ? this.clearForm() : null;
} catch (err) {
  console.error(err);
}
```

- ✅ Catch errors in async operations
- ✅ Log to console for debugging
- ❌ Do NOT throw errors to end users
- ❌ Do NOT use empty catch blocks

**CLI Error Handling**:
```typescript
if (!filePathArg) {
  console.error('Error: File path is required after the -g flag.');
  showHelp();
  return;
}
```

### React Patterns

**Hooks**:
- Use `useMemo` for stable object references
  ```typescript
  export const useForm = <T extends InitState>(initObject?: InitObject<T>) =>
    useMemo(() => new CreateForm(initObject), []);
  ```
- Use `useEffect` for initialization side effects (in `Register` class)
- Use `useSyncExternalStore` for external store subscriptions (`SyncState`)

**Components**:
- Functional components only (no class components)
- Export components directly: `export const SicilianProvider`

### Comments & Documentation

**Minimal Comments**: Code is self-documenting through descriptive names  
**Only Comment When**:
- CLI messages for user-facing output
- Complex business logic (rare in this codebase)
- No inline Korean comments found - use English only

---

## Architecture Patterns

### Store Pattern
Custom implementation using pub-sub:
```typescript
class Store<T> {
  private store: T
  private callbacks = new Set<() => void>();
  
  getStore = () => this.store
  setStore = (nextState: Partial<T>) => { /* notify subscribers */ }
  subscribe = (cb: () => void) => { /* ... */ }
}
```

### Builder Pattern
Used for complex objects with many optional parameters:
- `RegisterBuilder` - builds `Register` instances
- `HandleSubmitBuilder` - builds submit handlers

### Dependency Injection
Constructor injection used throughout:
```typescript
constructor(
  private store: IStore<T>,
  private ErrorObjStore: IStore<Validator<T>>,
  // ...
) { }
```

---

## Module Organization

```
src/
├── core/           # Core classes (CreateForm, Store, useForm hook, Provider)
├── funcs/          # Feature implementations
│   ├── handleSubmit/   # Form submission logic
│   ├── register/       # Input registration logic
│   ├── validate/       # Validation logic (Chain of Responsibility)
│   └── resolver/       # External validator integrations (zod, yup, superstruct)
├── type/           # TypeScript type definitions
├── utils/          # Helper functions and type guards
└── cli/            # CLI tool for code generation
```

**Export Strategy**:
- Re-export from `type/index.ts` for type barrel exports
- Named exports only (no default exports)
- Public API exposed through `src/index.ts`

---

## Working with External Validators

**Resolver Pattern**:
```typescript
import { zodResolver } from '@ilokesto/sicilian/resolver/zod';
import { yupResolver } from '@ilokesto/sicilian/resolver/yup';
import { ssResolver } from '@ilokesto/sicilian/resolver/superstruct';
```

- All resolvers use `@ilokesto/common-resolver` package
- Peer dependencies (optional): `zod`, `yup`, `superstruct`

---

## CLI Tool

**Usage**:
```bash
sicilian -g <file-path>           # Generate with destructured snippet (default)
sicilian -g <file-path> -o        # Generate with object snippet
sicilian -h                       # Show help
```

**Files**:
- Entry: `dist/cli/index.js` (marked as bin in package.json)
- Templates: `cli/templates/codeSnippets.ts`

---

## Common Pitfalls

1. **Forgetting `type` imports**: Always use `import type` for types
2. **Missing generic constraints**: Use `T extends InitState` for form generics
3. **Breaking export paths**: Package has specific export paths (`.`, `./provider`, `./useForm`, `./resolver/*`)
4. **Module resolution**: Uses `bundler` strategy - ensure compatibility
5. **Private field access**: Don't confuse `#field` (truly private) with `private field` (TS only)

---

## Pre-Commit Checklist

- [ ] Run `npm run build` - must succeed with no errors
- [ ] Check for unused imports (enabled in tsconfig)
- [ ] Verify type-only imports use `import type`
- [ ] Ensure no `any`, `@ts-ignore`, or type suppression
- [ ] Follow import ordering convention
- [ ] Class interfaces prefixed with `I`
- [ ] Arrow functions for class methods that need `this` binding

---

## Package.json Scripts Summary

| Command | Description |
|---------|-------------|
| `build` | Clean dist and compile TypeScript |

**No other scripts available** - consider adding:
- `lint` - Run ESLint
- `test` - Run tests (when test suite added)
- `dev` - Watch mode for development
