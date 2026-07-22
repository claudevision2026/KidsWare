# Spec: Storefront & Orders

## Public / logged-in Home (`frontend/src/pages/Home.jsx`)
- Default (unauthenticated) page: card grid of the latest products (`GET /api/products/latest`),
  each card showing an image carousel, "View More" (→ Product Details), "View on Insta" (opens
  `Product.InstaURL` in a new tab), and a WhatsApp button.
- After login (non-admin user): same page, but wrapped in `UserLayout` with a left menu
  (New / My Orders), "New" selected by default — see `App.jsx`'s `HomeRoute`.

## Product Details (`frontend/src/pages/ProductDetails.jsx`)
`GET /api/products/{id}` returns all active images, size chart, prices, dispatch time, description,
and Instagram URL. Prices are shown per `AgeGroup` as clickable chips (`{ageGroup} Years: ₹{price}`,
`formatAgeGroup` in `frontend/src/utils/format.js` — same formatting reused on the admin View
Products page and Buy Now so the "Years" suffix stays consistent everywhere an `AgeGroup` is
displayed, except the admin edit inputs which keep the raw value like `0-3`).

Both an `AgeGroup` and a gallery image selection are required before Buy Now / How to Buy will
proceed — but the buttons stay visually enabled at all times (no `disabled` graying-out); clicking
without a selection just `preventDefault()`s the navigation and shows a `productDetails
.selectAgeAndImage` validation message instead. Image selection is only enforced when there's more
than one photo to choose from (a single-image product has nothing to pick, so it's treated as
already satisfied). Once both are set, the button carries them forward as `?age=...&image=...`
query params — since How to Buy opens in a new tab, this is how the selection travels there (see
below); `BuyNow.jsx` reads the same `age` param to preselect its own radio group.
Buttons: WhatsApp (see below), View on Insta, and either Buy Now (when
`VITE_ENABLE_BUY_NOW=true`) or How to Buy (default, see `04-payments-whatsapp.md`).

## WhatsApp button
No WhatsApp Business API integration — uses a `wa.me` deep link:
`https://wa.me/{WHATSAPP_NUMBER}?text={encodeURIComponent(template + productName + instaUrl)}`.
Configured via `WHATSAPP_NUMBER` / `WHATSAPP_MESSAGE_TEMPLATE` env vars (backend `.env` for
reference, frontend `.env` as `VITE_WHATSAPP_NUMBER` / `VITE_WHATSAPP_MESSAGE_TEMPLATE` since the
link is built client-side). See `frontend/src/components/WhatsAppButton.jsx`.

## Buy Now / My Orders
- Buy Now (`frontend/src/pages/BuyNow.jsx`, requires login) — radio buttons for `AgeGroup` sourced
  from `ProductPrice`; price is read statically from the selected row. See `04-payments-whatsapp.md`
  for the Razorpay flow.
- My Orders (`frontend/src/pages/user/MyOrders.jsx`) — `GET /api/orders/my` returns all `Orders`
  rows whose `PhoneNumber` matches the logged-in user.

## Orders table
`Orders (OrderID, ProductID, PhoneNumber, Age, Price, TransactionID, PurchaseDate, VendorID,
ModelID, CourierVendor, TrackingID, TrackingURL, UserAddressID, CreatedDate)`. `PhoneNumber` is what
links an order to a buyer (spec's `curiousvendors` corrected to `CourierVendor`). `UserAddressID` is
a nullable FK to `UserAddress` recording which saved shipping address the order used — see
`05-user-addresses.md` for how it's captured and resolved.

## Admin — View Orders (`frontend/src/pages/admin/ViewOrders.jsx`)
Orders are entered manually by admin for now (no separate checkout capture step besides the
Razorpay-verified flow). The page has:
- A manual entry form covering every `Orders` column (product picked from a dropdown rather than a
  raw ID for usability), plus a Shipping Address section: on phone-number blur it looks up whether
  that phone already has an account and, if so, lets the admin pick a saved address or enter a
  different one; if the phone number is new, a `User` account is auto-created and the address is
  saved as its first (default) one — see `05-user-addresses.md` for the full flow, including the
  one-time temp-password alert shown when a new account is created.
- A grid of all orders (now with an Address column), with a single search box that filters
  client-side across product name, phone number, transaction ID, tracking ID, and courier vendor
  (matches if any one field contains the search text — an OR match, not requiring every field to
  match).
- `POST /api/admin/orders` / `PUT /api/admin/orders/{id}` in `backend/app/routers/orders.py`.
  `GET /api/admin/orders` also accepts an optional `phoneNumber` query param server-side, though the
  admin UI currently does its own client-side filtering instead of using it.
