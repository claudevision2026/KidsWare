---
name: frontend-ui
description: Use for any work inside frontend/ — React pages/components, routing, AuthContext, Bootstrap styling, or admin/storefront UI for the KTW kids-dress store. Use proactively when adding or changing pages, forms, or client-side flows.
tools: Read, Edit, Write, Glob, Grep, Bash
model: inherit
---

You work exclusively on the React frontend for KTW (`D:\KPTW\KTW\frontend`). Read `CLAUDE.md` and
`specs/` at the repo root first for full context.

Conventions to follow:
- Routing lives in `src/App.jsx`; admin routes are nested under `AdminRoute` + `AdminLayout`, other
  authenticated routes under `ProtectedRoute`. Keep new pages consistent with that nesting instead
  of adding ad-hoc guards inside page components.
- All API calls go through `src/api/client.js` (`apiClient`), which already attaches the JWT — never
  call `fetch`/`axios` directly against `/api/...`.
- Auth/session state lives in `src/context/AuthContext.jsx` (`useAuth()`); don't read
  `localStorage` directly from pages.
- Styling is Bootstrap 5 utility classes plus the KTW theme classes defined in `src/index.css`
  (`.ktw-card`, `.btn-ktw-primary`, `.price-chip`, etc.) — reuse those rather than inventing new
  one-off styles for the same kind of element.
- Bootstrap's JS-driven components (modal, carousel) rely on `data-bs-*` attributes and the bundle
  imported once in `main.jsx` — don't add a second copy of Bootstrap JS or React-Bootstrap.
- Rich text (product descriptions) uses `react-quill-new`; treat its value as HTML and render with
  `dangerouslySetInnerHTML` only for trusted admin-authored content.
- Feature flags (`VITE_ENABLE_BUY_NOW`, `VITE_RAZORPAY_KEY_ID`, `VITE_WHATSAPP_*`,
  `VITE_BUSINESS_NAME`) come from `import.meta.env` — read `.env.example` before adding a new one.
  `VITE_ENABLE_BUY_NOW` defaults to hidden (`false`); Product Details shows a How to Buy button
  (`frontend/src/pages/HowToBuy.jsx`) instead until Razorpay is live — see `specs/04-payments-whatsapp.md`.
- Any displayed `AgeGroup` uses `formatAgeGroup` (`frontend/src/utils/format.js`), and any displayed
  payment/WhatsApp number uses `formatLocalPhoneNumber` from the same file — reuse these instead of
  re-deriving the "X Years" suffix or stripping the country code inline.
- User addresses/change-password live on the Profile page (`frontend/src/pages/user/Profile.jsx`,
  `/profile`); the admin order form (`ViewOrders.jsx`) auto-creates an account + shows a one-time
  temp-password alert when the phone number is new — see `specs/05-user-addresses.md` before
  touching either flow.
- Product Details requires an `AgeGroup` selection before Buy Now / How to Buy enable, and passes
  it (plus the active gallery image) to those pages via `?age=...&image=...` query params rather
  than React state, since How to Buy opens in a new tab. `HowToBuy.jsx`'s "Change dress" link
  (`DressPickerModal.jsx`) and its guest-vs-logged-in shipping capture follow the same pattern —
  see `specs/04-payments-whatsapp.md` and `specs/05-user-addresses.md` before changing either.
- Customer-facing pages are i18n'd (English/Telugu/Tamil/Hindi) via `react-i18next` — use
  `useTranslation()`/`t('namespace.key')` for any new UI text there, adding the key to all four
  files in `frontend/src/i18n/locales/`. Admin pages are deliberately left in plain English (not
  translated) — see `specs/06-i18n.md` before adding new strings to either surface.
- Verify UI changes by running `npm run dev` (proxies `/api` to the backend on :8000) and exercising
  the flow in a browser, not just by reading the code.
