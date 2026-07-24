---
name: build-ktw
description: Build and validate the KTW kids-dress store — backend (lint, format, type-check), frontend (lint, build), and database schema. Runs on local dev environment; reports errors clearly. Use when asked to build, lint, format, or validate the app before committing.
---

KTW is a FastAPI + React + MS SQL Server stack. The build pipeline validates code quality,
formatting, type safety, and dependencies across backend and frontend before changes are committed
to the repository.

## Prerequisites

- Python 3.13+ with venv activated in `backend/`
- Node.js 18+ with npm installed
- MS SQL Server local instance with `KidsWare` database
- Dependencies installed: `backend/requirements.txt`, `frontend/package.json`

## Build Steps

### 1. Backend (Python/FastAPI)

```bash
cd backend

# Install dependencies (if needed)
./venv/Scripts/pip install -r requirements.txt

# Format code (Black)
./venv/Scripts/black app/ scripts/

# Lint (Ruff)
./venv/Scripts/ruff check app/ scripts/ --fix

# Type checking (Pyright or mypy if configured)
# ./venv/Scripts/pyright app/  [optional, if installed]

# Database schema validation (check schema.sql syntax)
# Can be validated by running: sqlcmd -S localhost -E -i database/schema.sql (dry-run)
```

### 2. Frontend (React/Vite)

```bash
cd frontend

# Install dependencies (if needed)
npm install

# Format code (Prettier, if configured)
npm run format  [optional, if script exists]

# Lint (ESLint)
npm run lint

# Build for production (catches build errors early)
npm run build

# Type checking (if using TypeScript or JSDoc type-checking)
# npm run type-check  [optional, if configured]
```

### 3. Summary

Report results for:
- ✅ Backend format (Black)
- ✅ Backend lint (Ruff)
- ✅ Frontend lint (ESLint)
- ✅ Frontend build (Vite)
- ⚠️ Any warnings or errors with file paths and line numbers
- 📊 Total issues found, if any

## When to use

- **Before committing**: `build-ktw` to catch lint/format issues locally
- **After pulling changes**: validate the branch is buildable
- **In CI/CD pipelines**: script this skill's commands into your pipeline

## Exit codes

- `0`: All checks passed
- `1`: Lint/format errors found (details printed)
- `2`: Dependencies missing or build failed (details printed)

## Notes

- Format changes are applied automatically (Black, Ruff --fix)
- Frontend lint errors must be fixed manually unless auto-fixable
- Database schema is checked syntactically but not validated against a running instance
  (that's a deployment step)
- This skill does **not** run tests; use `run-ktw` for functional/integration testing
