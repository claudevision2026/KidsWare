---
name: run-ktw
description: Build, run, and drive the KTW kids-dress store (FastAPI backend + React/Vite frontend + MS SQL Server). Use when asked to start KTW, run the backend or frontend dev servers, take a screenshot of a page, or click through an admin/customer flow (login, orders, products).
---

Full-stack web app: FastAPI backend (port 8000) + React/Vite frontend (port 5173+) + local
MS SQL Server (`KidsWare` DB, Windows Auth). Start both servers, then drive the frontend with
the Playwright driver at `.claude/skills/run-ktw/driver.mjs` (there is no `chromium-cli` binary
on this Windows box, so this driver replaces it — same idea, scripted commands piped to a
headless-Chromium runner). All paths below are relative to the repo root (`d:\KPTW\KTW`).

## Prerequisites

Already satisfied on this machine — nothing to install:
- `backend/venv/` exists with all of `requirements.txt` installed.
- `frontend/node_modules/` exists (`npm install` already run).
- SQL Server (`MSSQLSERVER` service) is running locally with the `KidsWare` database created
  and seeded (`database/schema.sql` + `backend/scripts/seed_reference_data.py`).
- `backend/.env` and `frontend/.env` already exist (copied from `.env.example`).
- The driver's own Playwright install lives in this skill directory (see below) — it is
  **not** a dependency of `frontend/package.json`, so it doesn't touch the real project.

If any of those are missing, follow the "Running locally" section in the root `CLAUDE.md`.

One-time driver setup (already done, listed for reference):
```bash
cd .claude/skills/run-ktw
npm install                       # installs playwright into this folder only
npx playwright install chromium   # downloads the headless browser binary
```

## Run (agent path)

### 1. Start the backend
```bash
cd backend
./venv/Scripts/python -m uvicorn app.main:app --port 8000 > uvicorn.log 2>&1 &
disown
```
Poll until it's up (don't fixed-sleep):
```bash
timeout 30 bash -c 'until curl -sf http://127.0.0.1:8000/docs >/dev/null; do sleep 1; done'
```

### 2. Start the frontend
```bash
cd frontend
npm run dev > vite.log 2>&1 &
disown
```
Vite auto-increments past occupied ports (5173, 5174, …) — **read the real port from the log**,
don't assume 5173:
```bash
timeout 30 bash -c 'until grep -q "Local:" frontend/vite.log 2>/dev/null; do sleep 1; done'
grep "Local:" frontend/vite.log   # e.g. "Local:   http://localhost:5175/"
```

### 3. Drive it
```bash
cd .claude/skills/run-ktw
BASE_URL=http://localhost:<port-from-step-2> node driver.mjs smoke.txt
```
`smoke.txt` logs in as the test admin, opens `/admin/orders`, and clicks Edit — the exact
flow added in this session. Script format (one command per line, `#` comments allowed):

| command | what it does |
|---|---|
| `nav <path-or-url>` | goes to `<path>` (relative paths are joined with `$BASE_URL`) |
| `wait-for <css-selector>` | waits for a selector to be visible |
| `wait-for-text <text>` | waits for text to appear anywhere on the page |
| `click <css-selector>` | clicks the first match |
| `fill <css-selector> <value>` | types into a React-controlled input (goes through Playwright's real input pipeline — `eval el.value=...` does NOT fire React's `onChange`) |
| `press <key>` | e.g. `press Enter` |
| `screenshot <name>` | saves full-page PNG to `screenshots/<name>.png` in this dir |
| `console-errors` | prints any `console.error`/uncaught-exception text captured so far |

Write a new `.txt` script for a different flow and run it the same way — reuse `smoke.txt`
as the template for auth + navigation.

### 4. Stop the servers
`$!` from a backgrounded bash job is **not** the real Windows PID (git-bash job PIDs and
Windows process PIDs are different numbers on this box) — look the PID up by port, and kill
the whole tree in one shot (`uvicorn` on this machine spawns a `multiprocessing` child, e.g.
for bcrypt's backend probe, that outlives a plain `taskkill` on just the parent and keeps the
socket open):
```bash
netstat -ano | grep ":8000" | grep LISTENING     # note the PID in the last column
taskkill //PID <pid> //T //F

netstat -ano | grep ":<vite-port>" | grep LISTENING
taskkill //PID <pid> //T //F
```

## Test admin account

A dedicated test admin was created for driving the app (does **not** touch whatever real
admin account(s) already exist in the DB):
```
phone:    9000000001
password: TestAdmin@123
```
Re-create it any time with:
```bash
cd backend
./venv/Scripts/python scripts/create_admin.py --phone 9000000001 --password TestAdmin@123 --email test-admin@ktw.local
```

## Run (human path)

```bash
cd backend  && ./venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev
```
Opens on `http://localhost:5173` (or next free port) with hot reload. `Ctrl-C` to stop —
same multiprocessing-child caveat applies if you background it instead of running in the
foreground.

## Test

No backend test suite exists yet (`backend/**/test_*.py` — none found). Frontend has a
linter only:
```bash
cd frontend && npm run lint
```
Currently passes with one pre-existing warning (`AuthContext.jsx` fast-refresh export
warning) — not something this skill introduced.

---

## Gotchas

- **Use `localhost`, not `127.0.0.1`, for the frontend.** Vite binds `localhost` which
  resolves to `[::1]` (IPv6-only) on this machine — `curl http://127.0.0.1:5175` hangs/fails
  even though the server is up. The FastAPI backend is the opposite: uvicorn binds IPv4
  `127.0.0.1` by default, so `curl http://127.0.0.1:8000` works fine there. Don't assume
  either one — check both.
- **Two Vite dev servers are often already running** on 5173/5174 — this looks like a
  developer's own `npm run dev` sessions left open (e.g. the admin-orders page is normally
  reached at `:5174` in this project). Don't kill unfamiliar listeners on those ports without
  checking first; just let `npm run dev` auto-increment to the next free port and read the
  real port from the log.
- **`taskkill //PID <pid> //F` without `//T` can leave the app still serving.** uvicorn on
  this machine forks a `multiprocessing.spawn_main` child (own `python.exe`, `ParentProcessId`
  = the uvicorn PID) that inherits the listening socket handle. Killing only the parent
  leaves the child holding the port open and still answering requests. Always add `//T`.
- **Don't overwrite the existing seeded `Admin` account's password** just to get a login —
  `create_admin.py` promotes-in-place if the phone already exists. Create a separate test
  admin (a fresh phone number) instead, as done here.
- **React controlled inputs**: the driver's `fill` command uses Playwright's `page.fill()`,
  which dispatches real input events. Don't try to shortcut with `eval el.value = '...'` —
  it won't trigger React's `onChange` and the form state won't update.
