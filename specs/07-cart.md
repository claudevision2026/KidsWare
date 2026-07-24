# Spec: Shopping Cart

## Why
Today the only purchase path is single-item: Buy Now (`03-storefront-orders.md`) sells exactly one
`Product`/`AgeGroup` at a time, and neither it nor the interim How to Buy flow (`04-payments-whatsapp.md`)
lets a customer collect several dresses and pay once. This closes that gap: a customer can add
multiple dresses (each with its own age group and photo) to a cart, check out with a single shipping
address, and later see the full basket — items and total price — in their order history. It reuses
`UserAddress` (`05-user-addresses.md`) rather than inventing a second address mechanism, and reuses
the existing Razorpay / interim-WhatsApp split (`04-payments-whatsapp.md`) rather than a third payment
path.

Cart requires login, matching the existing Buy Now gate (`ProtectedRoute`, `frontend/src/pages/BuyNow.jsx`)
rather than a guest/localStorage cart merged on login — one fewer state-sync mechanism in a codebase
that doesn't have one anywhere else yet. Add to Cart therefore redirects to `/login` exactly like Buy
Now does today when `!isAuthenticated`.

## `CartItem` table
```
CartItem (
    CartItemID   INT IDENTITY PK,
    UserID       INT NOT NULL FK -> Users(UserID),
    ProductID    INT NOT NULL FK -> Product(ProductID),
    AgeGroup     NVARCHAR(50) NOT NULL,      -- matches ProductPrice.AgeGroup
    ImageURL     NVARCHAR(500) NULL,         -- selected dress photo (ProductImage.ImageURL), snapshot
    Price        DECIMAL(10,2) NOT NULL,     -- ProductPrice.Price snapshot at add-time
    Quantity     INT NOT NULL DEFAULT 1,
    CreatedDate  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UNIQUE (UserID, ProductID, AgeGroup)
)
```
`Price` is snapshotted at add-time (not re-read live) so an admin editing `ProductPrice.Price` later
doesn't silently change what's already in someone's cart — the same reasoning `Orders.Price` already
uses. `ImageURL` is likewise a snapshot: if the admin soft-deletes that `ProductImage` row later
(`Status='N'`), the cart line still shows what the customer picked. The `UNIQUE (UserID, ProductID,
AgeGroup)` constraint means adding the same dress+age twice increments `Quantity` server-side instead
of creating a duplicate row — enforced in `cart_service.add_item` (`ON CONFLICT`-style upsert via a
`SELECT ... FOR UPDATE`-equivalent read-then-update, consistent with SQLAlchemy/pyodbc patterns
already used in `address_service.py`).

## `Orders` table change
Add nullable `Quantity INT NOT NULL DEFAULT 1` (guarded `COL_LENGTH` upgrade block in
`database/schema.sql`, same pattern as the existing `UserAddressID` upgrade block). Every existing
single-item flow (Buy Now, admin manual entry) is unaffected — it simply always writes `Quantity=1`,
same as today's implicit behavior. `Orders.Price` continues to mean **unit price**; line total is
`Price * Quantity`. No other schema change is needed to group a checkout's multiple `Orders` rows —
they share the same `TransactionID` when created together (see Checkout below), and grouping never
depended on a new column.

## Add to Cart (Product Details)
`frontend/src/pages/ProductDetails.jsx` gains an "Add to Cart" button alongside the existing
WhatsApp / View on Insta / Buy Now / How to Buy buttons. Reuses the same age+image selection gate
already on the page (`03-storefront-orders.md`'s "Both an `AgeGroup` and a gallery image selection
are required" rule, including the single-image-product exemption) — clicking without a selection
`preventDefault()`s and shows the same `productDetails.selectAgeAndImage` message, no new validation
copy needed.

- Not logged in: `navigate('/login?redirect=/products/{id}')` (mirrors `ProtectedRoute`'s existing
  redirect-back convention rather than inventing a second one).
- Logged in: `POST /api/cart/items {productId, ageGroup, imageUrl}` (`backend/app/routers/cart.py`,
  new). Backend re-reads `ProductPrice` server-side for the snapshot `Price` — the client never sends
  a price, so a tampered request can't set an arbitrary cart price. Success shows a toast/badge update
  (cart icon in `Navbar.jsx` gets an item-count badge, `GET /api/cart` count) rather than navigating
  away, so a customer can keep browsing and adding more dresses.

## Cart page (`frontend/src/pages/user/Cart.jsx`, route `/cart`, under `UserLayout`)
`GET /api/cart` returns each `CartItem` joined with current `Product.ProductName` and current
`ProductPrice.StockCount` (for an out-of-stock warning) — but **not** current price, since price is
always the snapshot. One row per cart line: thumbnail (`ImageURL`), product name, age group, unit
price, a quantity stepper (`PUT /api/cart/items/{cartItemId} {quantity}` — `quantity=0` deletes the
line rather than requiring a separate call), line total, and a remove button
(`DELETE /api/cart/items/{cartItemId}`). Running total shown below the list. Empty cart shows a
"browse dresses" prompt linking `/`. `Navbar.jsx` "Cart" link (new, next to "My Orders", same
`isAuthenticated && !isAdmin` gate) shows the same item count badge as the Add to Cart toast.

## Cart Checkout (`frontend/src/pages/user/CartCheckout.jsx`, route `/cart/checkout`)
Shipping-address capture is the logged-in branch already built for How to Buy
(`05-user-addresses.md`): `GET /api/users/me/addresses` rendered as full-detail radio cards, "use a
different address" reveals the existing new-address form (`POST /api/users/me/addresses`). No guest
branch needed here (cart requires login). This is also the **first** flow in the app to combine
address capture with an actual payment/order-creation step — Buy Now takes payment but never asks for
an address (`Orders.UserAddressID` stays `NULL` on every Razorpay-verified order today); How to Buy
asks for an address but never creates an `Orders` row itself. Cart Checkout closes that gap for
multi-item purchases; **fixing Buy Now's missing address capture is out of scope for this feature.**

Two paths, matching the existing `ENABLE_BUY_NOW` gate:

**`VITE_ENABLE_BUY_NOW=true` (Razorpay):**
1. `POST /api/cart/checkout/create-order` (new, `backend/app/routers/cart.py`) — backend loads the
   caller's `CartItem` rows, sums `Price * Quantity`, creates **one** Razorpay order for that total via
   `razorpay_service.create_order` (same service Buy Now already uses).
2. Razorpay Checkout opens client-side (same `checkout.js` load as `BuyNow.jsx`).
3. On success: `POST /api/cart/checkout/verify {razorpay_order_id, razorpay_payment_id,
   razorpay_signature, userAddressId}` — backend re-verifies the HMAC signature
   (`razorpay_service.verify_payment_signature`, same helper as `/api/payments/verify`), then in one
   transaction: inserts one `Orders` row **per `CartItem`** (`ProductID`, `Age=AgeGroup`,
   `Price`, `Quantity`, `TransactionID=razorpay_payment_id` — shared across every row so they're one
   checkout — `UserAddressID`, `PurchaseDate=now`, `VendorID`/`ModelID` from the product), deletes the
   now-purchased `CartItem` rows, commits once. Response mirrors `/api/admin/orders`'s wrapped shape
   where useful: `{ orders: OrderResponse[] }`.

**`VITE_ENABLE_BUY_NOW=false` (default, interim):**
No payment or `Orders` row is created client-side, consistent with How to Buy today — the admin still
enters orders manually after receiving payment. The page shows the itemized cart + total + selected
address, a WhatsApp button (`WhatsAppButton`-style deep link, extended to list every cart line —
product name, age, qty, price — plus the total and the chosen address, so the admin has full context
without re-asking, same rationale as How to Buy's prefilled message) and the same disabled
"Coming soon" Razorpay-styled button as How to Buy. The cart is **not** cleared automatically here —
there's no confirmed order yet, only a WhatsApp handoff — so the customer can still see what they
asked to buy if they revisit `/cart`; they (or the admin, once entered) clear lines manually.

## Order history — grouping (`frontend/src/pages/user/MyOrders.jsx`, `GET /api/orders/my`)
Orders sharing a non-null `TransactionID` (i.e. everything created by Cart Checkout's Razorpay path)
render as a single card: all line items (thumbnail, product name, age, quantity, unit price, line
total) plus a computed grand total (`SUM(Price * Quantity)` across the group) and the shared
`PurchaseDate`/address. Orders with a `NULL` `TransactionID` (manual admin entries, interim-flow
orders) or a `TransactionID` not shared with any other row keep rendering as today's flat single-row
line — no behavior change for existing data, since grouping is pure response-shaping in
`backend/app/services/order_mapper.py` (extended, not replaced) and requires no new column.

## Backend summary
New `backend/app/routers/cart.py` (all endpoints require login via `get_current_user`, same as
`BuyNow`'s `/api/payments/*`):
- `GET /api/cart` — list current user's cart lines + running total.
- `POST /api/cart/items` — add (or increment) a line; body `{productId, ageGroup, imageUrl}`.
- `PUT /api/cart/items/{cartItemId}` — set quantity (`0` deletes); 403 if the line isn't the caller's.
- `DELETE /api/cart/items/{cartItemId}` — remove a line; same ownership check.
- `POST /api/cart/checkout/create-order` — Razorpay path step 1 (403s if `ENABLE_BUY_NOW` is false,
  same guard `POST /api/payments/create-order` already uses).
- `POST /api/cart/checkout/verify` — Razorpay path step 3, creates the grouped `Orders` rows.

New `backend/app/services/cart_service.py` (upsert-on-add, ownership checks, total calculation) —
mirrors how `address_service.py` centralizes the default-flip logic rather than duplicating it across
routers.

## Migration notes
`database/schema.sql` gains the `CartItem` `CREATE TABLE` block and the guarded `Orders.Quantity`
upgrade block (`COL_LENGTH('dbo.Orders', 'Quantity') IS NULL`), following the same re-runnable
upgrade-block convention as the existing `UserAddressID`/`TempPassword` additions.

## Explicit non-goals (this iteration)
- Fixing Buy Now's missing `UserAddressID` capture (noted above) — separate concern, not blocking.
- Stock decrement on purchase — no existing flow (Buy Now included) decrements `ProductPrice.StockCount`
  today; Cart Checkout doesn't introduce it either, to avoid a half-applied inventory system.
- Guest/localStorage cart — see "Why" above.
- Cart quantity limits / max-per-age stock enforcement beyond the existing out-of-stock *display*
  warning — no flow in this app currently blocks a purchase on stock count, so Cart Checkout doesn't
  either.
