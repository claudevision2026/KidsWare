# Spec: Authentication & Roles

## Requirements
- Registration form: phone number (used as username), password, confirm password, email address.
- Login form: phone number + password.
- Two roles: `Admin`, `User`.
- Every self-registered user defaults to `Role = 'User'`.
- Admin accounts are never created through the UI — only via `backend/scripts/create_admin.py`.

## Implementation
- `Users` table: `UserID, PhoneNumber (unique), PasswordHash, Email (nullable), TempPassword
  (nullable), Role, CreatedDate`. `Email` is nullable because admin-created users (see
  `05-user-addresses.md`) have none at creation time.
- Passwords hashed with bcrypt (`passlib`); the one deliberate exception is `TempPassword`, which
  holds the plaintext of an admin-generated temporary password until the customer changes it (see
  below) — everywhere else, plaintext passwords are never stored or logged.
- `POST /api/auth/register` — validates `confirmPassword == password` and phone uniqueness, hashes
  the password, inserts with `Role='User'`, returns a JWT.
- `POST /api/auth/login` — verifies password, returns a JWT (`sub` = phone number, `role`, `userId`).
- `GET /api/auth/me` — returns the current user from the JWT.
- `POST /api/auth/change-password` — verifies the current password, sets a new hash, and clears
  `TempPassword` back to `NULL`. Used by the Profile page (`frontend/src/pages/user/Profile.jsx`);
  no JWT/session changes needed since the token doesn't embed the password hash.
- Frontend: `AuthContext` (`frontend/src/context/AuthContext.jsx`) stores the JWT + role in
  `localStorage`; `apiClient` (`frontend/src/api/client.js`) attaches `Authorization: Bearer <token>`
  to every request.
- Route guards: `ProtectedRoute` (any logged-in user) and `AdminRoute` (`Role='Admin'` only) in
  `frontend/src/components/ProtectedRoute.jsx`.
- Backend role gating: `require_admin` dependency (`backend/app/auth/__init__.py`) returns 403 for
  non-admins.

## Creating the first Admin
```
cd backend
./venv/Scripts/python scripts/create_admin.py --phone 9999999999 --password YourAdminPass123 --email admin@ktw.com
```
Re-running with an existing phone number promotes that user to Admin and resets their password.
