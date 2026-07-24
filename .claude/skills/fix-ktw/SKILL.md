---
name: fix-ktw
description: Auto-fix issues found by build-ktw — ESLint/Prettier for frontend, Black/Ruff for backend, React hook dependencies. Installs dev dependencies, applies fixes, and reports changes. Use after build-ktw reports warnings, or standalone to clean up code.
---

`fix-ktw` is a companion to `build-ktw`. It auto-fixes common linting, formatting, and React hook
issues that the build pipeline identifies. Fixes are applied in-place; run `build-ktw` afterward
to verify.

## Prerequisites

- Python 3.13+ with venv in `backend/`
- Node.js 18+ with npm installed
- Dependencies installed: `backend/requirements.txt`, `frontend/package.json`
- Dev tools will be installed automatically if missing

## Fix Steps

### 1. Install Dev Dependencies

```bash
# Backend dev tools
cd backend
./venv/Scripts/pip install black==24.1.1 ruff==0.2.1

# Frontend dev tools
cd ../frontend
npm install --save-dev eslint-plugin-react-hooks prettier
```

### 2. Backend (Python/FastAPI)

```bash
cd backend

# Format code with Black (auto-fix)
./venv/Scripts/black app/ scripts/

# Lint and auto-fix with Ruff
./venv/Scripts/ruff check app/ scripts/ --fix

# Show summary of changes
git diff app/ scripts/ --stat
```

### 3. Frontend (React/Vite)

```bash
cd frontend

# ESLint auto-fix (fixes auto-fixable warnings)
npx eslint src/ --fix --report-unused-disable-directives

# Prettier format (if script exists)
npm run format  [if available]

# Show summary of changes
git diff src/ --stat
```

### 4. Manual Fixes (if needed)

Some ESLint warnings require manual fixes:

- **`exhaustive-deps`** (React hooks): Add missing dependencies to useEffect/useMemo/useCallback
  - Example: if `t` (i18n) is used in effect but not in dependency array, add it
  - Files: `ProductDetails.jsx:34`, `Home.jsx:16`

- **`only-export-components`**: Separate constants/functions into their own files
  - Example: extract `CART_CONSTANTS` from `CartContext.jsx` to `constants/cart.js`
  - Files: `CartContext.jsx:37`, `AuthContext.jsx:61`

### 5. Summary

Report:
- ✅ Number of files formatted (Black)
- ✅ Number of files fixed (Ruff, ESLint)
- ⚠️ Any remaining warnings that require manual fixes
- 📊 Total changes applied (lines, files)

## When to use

- **After build-ktw reports warnings**: run `/fix-ktw` to auto-fix and reformat
- **Before committing**: use together as `/build-ktw` → review → `/fix-ktw` → `/build-ktw` again
- **Standalone**: when you want to clean up code formatting across the project

## Exit codes

- `0`: All fixes applied successfully
- `1`: Some warnings remain (manual fixes needed)
- `2`: Dev tools failed to install

## Notes

- Auto-fixes are applied directly to files (no preview) — use `git diff` to review
- Some React hook warnings cannot be auto-fixed and require manual inspection
- Always run `build-ktw` after `/fix-ktw` to confirm all issues are resolved
- If a fix introduces new issues, revert with `git checkout -- <file>` and debug
