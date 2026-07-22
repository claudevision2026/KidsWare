# Spec: Admin — Products

## Left menu
Admin pages live under `frontend/src/pages/admin/`, wrapped by `AdminLayout.jsx` (left nav):
New Product, View Products, View Orders.

## Master/reference tables
- `Vendors (VendorID, VendorName, Status)` — seeded with Harini, SM.
- `Model (ModelID, ModelName, Status)` — seeded with Lehanga, Kurthi, MonAndDaughter.
  (Spec listed this table's name column as `VendorName` by copy-paste; corrected to `ModelName`.)
- Seeding script: `backend/scripts/seed_reference_data.py`.

## Product tables
- `Product (ProductID, VendorID, ProductName, ModelID, CreatedDate, Dispatch, Description, SizeChartURL, InstaURL)`
- `ProductPrice (ProductPriceID, ProductID, AgeGroup, Price, StockCount, CreatedDate)` — multiple
  rows per product (one per age group). Spec's `StocuCount` corrected to `StockCount`.
- `ProductImage (ProductImageID, ProductID, ImageURL, Status)` — multiple dress images per product;
  `Status` is `'Y'`/`'N'` and used as a **soft delete** so admin edits are reversible.

## New Product page (`pages/admin/NewProduct.jsx`)
- Product Name (text), Vendor (dropdown), Model (dropdown).
- Description: rich text (react-quill-new) — stores HTML, supports emoji via the OS emoji picker.
- Dispatch: numeric input (days).
- Size chart: single image upload → saved to `backend/app/uploads/SizeChartsUpload/`, URL stored on
  `Product.SizeChartURL`.
- Instagram URL: text box.
- Prices: repeatable rows (Age Group + Price + Stock Count), add/remove rows client-side, submitted
  as a JSON array and expanded into `ProductPrice` rows server-side.
- Dress images: multi-file upload → saved to `backend/app/uploads/dressuploads/`, one `ProductImage`
  row per file (`Status='Y'`).
- Submits as `multipart/form-data` to `POST /api/admin/products` (admin-only).

## View Products page (`pages/admin/ViewProducts.jsx`)
- Search box above the grid filters the product list client-side (case-insensitive, OR match) by
  product name, vendor name, or model name.
- Grid: first active image, Product Name, Vendor, Model, "View Size Chart" (opens a Bootstrap modal
  with the size chart image), "View More" button.
- "View More" expands an auto-scrolling detail panel below the row: dress image thumbnails (clicking
  a thumbnail jumps the carousel below to that image, via Bootstrap `data-bs-slide-to`), an image
  carousel (all active images), size chart, description (rendered HTML), vendor/model, Instagram URL
  (rendered as a link opening in a new tab), and all prices as horizontal chips.
- Edit mode (Edit → Save/Cancel): core fields become editable; each dress image gets a delete button
  (soft-deletes via `PATCH /api/admin/products/images/{id}/status?status=N`) plus an "Add Images"
  uploader; the size chart has a "Replace" uploader; price rows are individually editable/removable
  with an "Add Price Row" button.
- Backend endpoints: `GET/PUT /api/admin/products/{id}`, `PUT .../sizechart`, `POST .../images`,
  `PATCH .../images/{id}/status`, `POST/PUT/DELETE .../prices[/{id}]` — all in
  `backend/app/routers/admin_products.py`.
