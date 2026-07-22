# Spec: User Addresses, Admin Order Auto-Provisioning, Change Password

## Why
Admin order entry only had a raw phone number and no link to a real customer account, and no
shipping address was captured anywhere. This closes both gaps: an unknown phone number gets a real
account automatically, and orders record which saved address they ship to.

## `UserAddress` table
`UserAddress (UserAddressID, UserID FK -> Users, RecipientName, RecipientPhone, AddressLine1,
AddressLine2, City, State, PinCode, IsDefault, CreatedDate)`. A user can have multiple addresses;
`RecipientName`/`RecipientPhone` are optional since a dress sometimes ships to someone other than
the account holder. `Orders.UserAddressID` is a nullable FK to it — existing orders predate this
column and simply have no address.

Default-flip rules (implemented once in `backend/app/services/address_service.py`, reused by both
the self-service address router and the admin order flow rather than duplicated): a user's very
first address is always forced `IsDefault=True` regardless of what was submitted; setting a new
default clears the previous one first (`clear_existing_default`).

## Admin order entry auto-provisioning (`POST /api/admin/orders`)
`backend/app/routers/orders.py::create_order` looks up `Users` by the submitted `phoneNumber`:
- **Not found**: generates a temp password (`app.auth.generate_temp_password`, `secrets`-based,
  excludes visually-ambiguous characters since admins relay it by hand), creates the `User` with
  `Email=None`, `Role='User'`, the bcrypt hash in `PasswordHash`, and the plaintext in the new
  `Users.TempPassword` column (intentional — the admin needs to read it once to relay it to the
  customer via WhatsApp/SMS). The user, the resolved address, and the order are all created in one
  transaction (`db.flush()` for intermediate IDs, single `db.commit()`) so a failed order doesn't
  leave an orphan account behind.
- **Found**: no account changes; the admin picks one of the customer's saved addresses or enters a
  new one (which gets saved to that account going forward).

`GET /api/admin/orders/lookup-user?phoneNumber=` (admin-only) drives the frontend picker — returns
`exists` plus the user's addresses (default first) if found.

Request body gains `userAddressId` (ship to an existing saved address) XOR `newAddress` (ship to a
new one, also saved) — never both; validated in both the Pydantic schema and the router's
`_resolve_address` helper, which also 403s if a `userAddressId` doesn't belong to that phone
number's user. `POST /api/admin/orders` returns `{ order, newUserCreated, tempPassword }` (the only
endpoint with this wrapped shape — `PUT` keeps returning a flat `OrderResponse`) so the frontend can
show a one-time temp-password alert. `PUT /api/admin/orders/{id}` accepts the same address fields
for symmetry but does **not** auto-create a user on a phone mismatch — it 400s instead, since
auto-provisioning only makes sense on first entry, not corrections.

## Admin Users page
`GET /api/admin/users` (admin-only, `backend/app/routers/admin_users.py`) lists every user with
their `tempPassword` (null once they've changed it) and a computed `hasOrders` flag (any `Orders`
row with that `PhoneNumber`) — `frontend/src/pages/admin/ViewUsers.jsx` (`/admin/users`) — so the
admin can look the password back up if they miss the one-time alert on the order form. Each row has
a "View Orders" link, enabled only when `hasOrders` is true, linking to
`/admin/orders?phoneNumber=<phone>`; `ViewOrders.jsx` reads that query param via `useSearchParams`
to pre-fill its existing client-side search box, reusing the same OR-match filter described in
`03-storefront-orders.md` rather than adding a second filtering mechanism.

## Guest checkout shipping capture (`POST /api/checkout/capture-shipping`)
`backend/app/routers/checkout.py` — a **public** (no-auth) endpoint used by the storefront's How to
Buy page (`04-payments-whatsapp.md`) to pre-save a shipping address before any order exists, so the
admin's later `create_order` step already finds the account/address ready. It reuses the exact same
auto-provisioning (`generate_temp_password`/`hash_password`) and `address_service.create_address`
logic as `create_order` above, but is **not** the same code path and deliberately has a narrower
response: `{ newUserCreated, tempPassword }` only — never an address list or email, unlike the
admin-only `lookup-user` endpoint. This is intentional: `lookup-user` requires `require_admin`, a
trusted caller; `capture-shipping` is reachable by any anonymous visitor, so if it echoed back an
existing account's saved addresses, anyone who happened to know (or guess) a phone number could
read a stranger's home address. A guest submitting a phone number that already has an account
still succeeds — the new address just gets attached to that existing account — but the account's
prior data is never returned. Full address visibility only ever happens for the authenticated owner
(via `GET /api/users/me/addresses`, on this page when logged in or on `Profile.jsx`).

## Customer self-service (`frontend/src/pages/user/Profile.jsx`, route `/profile`)
- **My Details**: `Users.FirstName`/`LastName` (nullable) hold the customer's name. Captured as
  "Customer First/Last Name" fields on the admin Add Order form (sets them on account creation, or
  updates them on an existing account if the admin fills them in on a later order — see
  `_resolve_address`'s sibling logic in `create_order`/`update_order`), and separately editable via
  `GET/PUT /api/auth/me` (`UpdateNameRequest`) on the Profile page. Also shown as a combined "Name"
  column on the Admin Users page and returned by `GET /api/admin/orders/lookup-user` so the order
  form can prefill an existing customer's name.
- **Addresses**: `GET/POST /api/users/me/addresses`, `PUT/DELETE /api/users/me/addresses/{id}`
  (`backend/app/routers/addresses.py`), all ownership-checked (403 on mismatch). Deleting an address
  still referenced by an `Order` 409s instead of raising a raw `IntegrityError`.
- **Change password**: `POST /api/auth/change-password` (`ChangePasswordRequest`) verifies the
  current password, sets a new hash, and clears `Users.TempPassword` back to `NULL` — the natural
  point where an admin-issued temp password gets replaced by one the customer actually knows. No JWT
  changes needed; the token doesn't embed the password hash, so the existing session stays valid.

## Migration notes
`Users.Email` is now nullable (admin-created users have none) and `Users.TempPassword` is new —
`database/schema.sql` updates the `CREATE TABLE` for fresh installs and adds guarded upgrade blocks
(`COL_LENGTH`/`sys.columns.is_nullable` checks) for pre-existing dev databases, re-runnable safely.
