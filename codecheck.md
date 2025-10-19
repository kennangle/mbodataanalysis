# Code Quality Check

Run comprehensive code quality checks including ESLint, TypeScript type checking, and other validations.

## Quick Start

```bash
# Run all checks
npx prettier --check . && npx eslint . --ext .js,.jsx,.ts,.tsx && npm run check

# Or run individually:
npx prettier --check .                        # Prettier formatting check
npx eslint . --ext .js,.jsx,.ts,.tsx          # ESLint checks
npm run check                                  # TypeScript type checking
```

## Auto-Fix All Issues

```bash
# Format with Prettier + Fix ESLint issues
npx prettier --write . && npx eslint . --ext .js,.jsx,.ts,.tsx --fix
```

## What Gets Checked

### 1. Prettier (Code Formatting)
- Consistent code formatting
- Automatic semicolons, quotes, indentation
- Line width enforcement (100 chars)
- Trailing commas
- Arrow function parentheses

**Configuration:** `.prettierrc`

### 2. ESLint (Code Quality & Best Practices)
- TypeScript code quality
- React best practices
- React Hooks rules
- Unused variables and imports
- Code formatting issues

**Files checked:**
- `client/**/*.{ts,tsx}` - Frontend React/TypeScript
- `server/**/*.{ts,tsx}` - Backend TypeScript
- `shared/**/*.{ts,tsx}` - Shared types

**Ignored:**
- `node_modules/`
- `dist/`
- `build/`
- Config files

### 3. TypeScript Type Checking
- Type errors
- Missing type definitions
- Type compatibility issues
- Strict type checking

## Running the Checks

### Check Everything (Recommended)
```bash
# Run Prettier, ESLint, and TypeScript checks
npx prettier --check . && npx eslint . --ext .js,.jsx,.ts,.tsx && npm run check
```

### Prettier Only
```bash
# Check formatting
npx prettier --check .

# Auto-format all files
npx prettier --write .

# Format specific files
npx prettier --write "client/src/**/*.{ts,tsx}"
```

### ESLint Only
```bash
# Check for issues
npx eslint . --ext .js,.jsx,.ts,.tsx

# Auto-fix issues
npx eslint . --ext .js,.jsx,.ts,.tsx --fix
```

### TypeScript Only
```bash
npm run check
# or
npx tsc --noEmit
```

### Fix Everything (Auto-fix)
```bash
# Format with Prettier, then fix ESLint issues
npx prettier --write . && npx eslint . --ext .js,.jsx,.ts,.tsx --fix
```

## Common Issues & Fixes

### Issue: "React is not in scope"
**Fix:** Already configured - React imports are not required in this project

### Issue: Unused variables
**Fix:** Prefix with underscore: `_unusedVar` or remove if truly unused

### Issue: TypeScript `any` type
**Fix:** Use proper types or interfaces instead of `any`

### Issue: Missing dependencies
**Fix:** 
```bash
npm install
```

## Configuration Files

- **Prettier:** `.prettierrc` - Code formatting rules
- **ESLint:** `eslint.config.js` - Code quality rules (integrated with Prettier)
- **TypeScript:** `tsconfig.json` - Type checking configuration
- **Ignore Files:** `.prettierignore` - Files to skip formatting

## Recommended Workflow

### Before Committing Code
```bash
# 1. Format all files
npx prettier --write .

# 2. Fix linting issues
npx eslint . --ext .js,.jsx,.ts,.tsx --fix

# 3. Check types
npm run check
```

### Quick Quality Check
```bash
# Check everything without fixing
npx prettier --check . && npx eslint . --ext .js,.jsx,.ts,.tsx && npm run check
```

## Pre-commit Checks (Recommended)

For production environments, consider running these checks before commits:

```bash
# In your terminal before committing
npm run lint && npm run check
```

## Current ESLint Rules

### Warnings
- `@typescript-eslint/no-explicit-any` - Avoid using `any` type
- `@typescript-eslint/no-unused-vars` - Remove unused variables (except `_prefixed`)

### Disabled
- `react/react-in-jsx-scope` - React import not required
- `no-console` - Console logs allowed

## Exit Codes

- **0** - All checks passed ✓
- **1** - Errors found ✗

## Quick Troubleshooting

### ESLint Not Found
```bash
npm install
```

### Too Many Warnings
Focus on errors first:
```bash
npx eslint . --ext .js,.jsx,.ts,.tsx --quiet
```

### TypeScript Errors
Check your `tsconfig.json` and ensure all dependencies are installed:
```bash
npm install
npm run check
```
