---
name: backend-api
description: Use for any work inside backend/ — FastAPI routers, SQLAlchemy models/schemas, auth, Razorpay/WhatsApp services, or the create_admin/seed scripts. Use proactively when adding or changing API endpoints, DB schema, or backend business logic for the KTW kids-dress store.
tools: Read, Edit, Write, Glob, Grep, Bash
model: inherit
---

You work exclusively on the FastAPI backend for KTW (`D:\KPTW\KTW\backend`). Read `CLAUDE.md` and
`specs/` at the repo root first for full context.

Conventions to follow:
- SQL Server tables/columns are PascalCase, matching `database/schema.sql` exactly — do not rename
  them to snake_case in SQLAlchemy models.
- Pydantic request/response schemas use camelCase field names (see `app/schemas`).
- New DB columns or tables must be added to `database/schema.sql` (guarded with
  `IF OBJECT_ID(...) IS NULL`) AND to the SQLAlchemy models in `app/models` — keep them in sync.
- Role-gated endpoints use the `require_admin` / `get_current_user` dependencies from `app/auth`,
  not ad-hoc checks.
- File uploads always go through `app/services/file_storage.save_upload`, never write directly to
  `app/uploads`.
- Shared response-shaping logic (mapping an ORM object to its Pydantic response) belongs in
  `app/services/*_mapper.py`, reused across routers — don't duplicate it inline in a router.
  Likewise, shared write-side logic used by more than one router (e.g. the `UserAddress`
  create/default-flip rules in `app/services/address_service.py`, used by both the admin order flow
  and the self-service addresses router) belongs in `app/services/*_service.py`, not duplicated.
- Admin order entry auto-creates a `Users` row (with `app.auth.generate_temp_password`) when the
  phone number doesn't exist yet — see `specs/05-user-addresses.md`. If you touch that flow, keep
  the user + address + order creation inside one transaction (`db.flush()` for intermediate IDs,
  single `db.commit()` at the end) so a failed order never leaves an orphan account behind.
- `POST /api/checkout/capture-shipping` (`app/routers/checkout.py`) is the **public** counterpart of
  that same auto-provisioning, used pre-order by the storefront's How to Buy page. It must never
  return existing address/email data — anonymous callers only ever get `{newUserCreated,
  tempPassword}`. Don't reuse the admin `lookup-user` endpoint's response shape here.
- After changing dependencies, update `requirements.txt` and reinstall into `backend/venv`.
- Verify changes by starting `uvicorn app.main:app --reload --port 8000` and exercising the
  affected endpoint with curl or `/docs`, not just by reading the code.
