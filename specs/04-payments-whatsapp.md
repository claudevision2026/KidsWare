# Spec: Payments (Razorpay) & WhatsApp

## Why Razorpay
Chosen as the standard India-first gateway: supports cards/UPI/netbanking via a single Checkout
SDK, and has a simple test-mode for full end-to-end testing without moving real money.

## What's needed from the store owner
1. Sign up at razorpay.com.
2. Settings → API Keys → generate a **test-mode** Key ID + Key Secret (switch to live-mode keys only
   once ready to accept real payments).
3. Backend `.env`: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
4. Frontend `.env`: `VITE_RAZORPAY_KEY_ID` (the Key ID only — the secret never goes to the frontend).

## Flow
1. User selects an `AgeGroup` on the Buy Now page → `POST /api/payments/create-order`
   (`backend/app/routers/payments.py`): backend looks up the `ProductPrice` row, creates a Razorpay
   order via `razorpay_service.create_order`, and returns the Razorpay order id + the public Key ID.
2. Frontend loads `checkout.js` and opens Razorpay Checkout with that order id
   (`frontend/src/pages/BuyNow.jsx`).
3. On success, the frontend calls `POST /api/payments/verify` with the Razorpay response fields.
   The backend verifies the HMAC-SHA256 signature (`razorpay_service.verify_payment_signature`)
   before inserting a row into `Orders` with `TransactionID = razorpay_payment_id`.
4. The whole flow is gated behind `ENABLE_BUY_NOW` (backend) / `VITE_ENABLE_BUY_NOW` (frontend),
   which **defaults to hidden** (`false`) until real Razorpay keys are configured — set it to `true`
   to switch the storefront back to the Razorpay Buy Now flow.

## Interim manual payment flow (How to Buy)
While `VITE_ENABLE_BUY_NOW=false`, Product Details shows a **How to Buy** button instead of Buy Now
(disabled until an `AgeGroup` is picked — see `03-storefront-orders.md`), opening
`frontend/src/pages/HowToBuy.jsx` (route `/how-to-buy/:productId?age=...&image=...`) in a new tab.

- **Order summary**: the chosen dress image, `AgeGroup`, and price, read from the `age`/`image`
  query params (falls back to no age/price shown if the page is opened directly without them). A
  **"Change dress"** link opens `frontend/src/components/DressPickerModal.jsx`, scoped to the
  **current** `productId` only (`GET /api/products/{id}`, not the catalog) — it lets the buyer pick
  a different photo/age of the *same* dress they're already looking at, never a different product.
  A click-through image gallery, an `AgeGroup` dropdown, and an "Update" button — picking an
  image/age doesn't select anything by itself, only "Update" does, calling `navigate()` to
  `/how-to-buy/{productId}?age=...&image=...` and closing the modal, which the page's own
  param-driven fetch effect then picks up.
- **Shipping capture**: the business name (`VITE_BUSINESS_NAME`, default `KidsTrendyware`) and the
  WhatsApp/payment number with the country code stripped (`formatLocalPhoneNumber`) are shown so the
  buyer can verify who they're paying, then:
  - Logged in: phone comes from the session; `GET /api/users/me/addresses` — saved addresses render
    as full-detail radio cards (not a dropdown — every field visible), plus "use a different
    address" to add a new one via the existing `POST /api/users/me/addresses`.
  - Not logged in: a phone number field plus a new-address form, submitted to
    `POST /api/checkout/capture-shipping` (`backend/app/routers/checkout.py`) — see
    `05-user-addresses.md` for why this **never** shows a guest their (or a stranger's) existing
    saved addresses, and always just adds a fresh one.
- **Two payment options**, both settling to the **same** `VITE_WHATSAPP_NUMBER`:
  1. Pay via PhonePe / Google Pay directly to that number, then message on WhatsApp (`wa.me`
     deep link, prefilled with product name, age, price, phone, and the shipping address just
     entered/selected, so the admin has full context without re-asking) to share the screenshot.
  2. A static, Razorpay-styled "Pay ₹{amount} securely with Razorpay" button — visibly disabled with
     a "Coming soon" badge, no real integration; a placeholder for switching to the real Razorpay
     flow above once `VITE_ENABLE_BUY_NOW=true`.

There is no QR-code payment option anymore (dropped in favor of just the two above); the
`frontend/public/qr-code/` upload convention from an earlier iteration is unused but left in place.

## WhatsApp
No official WhatsApp Business API integration (which requires Meta business verification) — instead
uses the `wa.me` deep link scheme, which needs no approval:
```
https://wa.me/{WHATSAPP_NUMBER}?text={encodeURIComponent(message)}
```
where `message` = `WHATSAPP_MESSAGE_TEMPLATE` + product name + the product's Instagram URL. Both
values are environment-configurable (`WHATSAPP_NUMBER`, `WHATSAPP_MESSAGE_TEMPLATE`), so the number
receiving enquiries can be changed without a code deploy.
