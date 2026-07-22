# KTW — Kids Dress Store

Online store for kids' dresses (Lehanga, Kurthi, Mom-and-Daughter sets). Admin manages
vendors/products/orders; customers browse without login, then register/login (phone number
as username) to buy via Razorpay.

## Stack
- **Frontend**: React 19 + Vite, Bootstrap 5 (+ bootstrap-icons), react-router-dom, axios, react-quill-new (rich text), react-i18next (English/Telugu/Tamil/Hindi UI, storefront only — see `specs/06-i18n.md`)
- **Backend**: Python 3.13 + FastAPI, SQLAlchemy 2.0 (pyodbc), python-jose (JWT), passlib+bcrypt
- **Database**: MS SQL Server, local default instance, Windows Authentication, database `KidsWare`
- **Payments**: Razorpay (test-mode keys)
- **WhatsApp**: `wa.me` deep link, no API approval required

## Repo layout
```
backend/app/       FastAPI app (routers, models, schemas, auth, services)
backend/scripts/   create_admin.py, seed_reference_data.py
frontend/src/      React app (pages/admin, pages/user, components, context, api)
database/schema.sql  Full DDL for the KidsWare database
specs/             Per-area requirement specs
```

## Running locally

Backend (from `backend/`):
```
python -m venv venv
./venv/Scripts/pip install -r requirements.txt
cp .env.example .env   # adjust if needed
./venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

Frontend (from `frontend/`):
```
npm install
cp .env.example .env   # set VITE_RAZORPAY_KEY_ID, VITE_WHATSAPP_NUMBER, etc.
npm run dev
```
Vite dev server proxies `/api` and `/uploads` to `http://127.0.0.1:8000` (see `vite.config.js`), so no CORS setup is needed in dev.

First-time DB setup:
```
sqlcmd -S localhost -E -i database/schema.sql
cd backend && ./venv/Scripts/python scripts/seed_reference_data.py
./venv/Scripts/python scripts/create_admin.py --phone <phone> --password <password> --email <email>
```

## Conventions
- SQL Server table/column names are PascalCase (matches the original spec); SQLAlchemy models mirror that exactly. Two spec typos were corrected: `Model.ModelName` (spec said `VendorName`) and `ProductPrice.StockCount` (spec said `StocuCount`) — see comments in `database/schema.sql`.
- API request/response bodies use camelCase (Pydantic schemas in `backend/app/schemas`).
- Every registered user gets `Role='User'` by default; the only way to create an `Admin` is `backend/scripts/create_admin.py`.
- Uploaded files are saved under `backend/app/uploads/{SizeChartsUpload,dressuploads}` and served at `/uploads/...`; only the relative URL is stored in the DB.
- Product images use a soft-delete pattern (`ProductImage.Status = 'Y'/'N'`) rather than hard deletes, so admin edits are reversible.
- Buy Now / payments are gated behind `VITE_ENABLE_BUY_NOW` (frontend) and `ENABLE_BUY_NOW` (backend) env flags since they require real Razorpay keys to function end-to-end.
