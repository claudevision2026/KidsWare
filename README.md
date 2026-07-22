# KTW — Kids Dress Store

A full-stack online store for kids' dresses: React + Bootstrap frontend, Python FastAPI backend,
MS SQL Server database. Admin manages vendors/products/orders; customers register (phone number
as username), browse, and buy via Razorpay.

## Prerequisites
- Node.js 20+
- Python 3.11+
- MS SQL Server (local instance, Windows Authentication) with `ODBC Driver 18 for SQL Server` installed
- A Razorpay account (test-mode keys are enough for local testing)

## 1. Create the database

```
sqlcmd -S localhost -E -i database/schema.sql
```

This creates the `KidsWare` database and all tables (`Users`, `Vendors`, `Model`, `Product`,
`ProductPrice`, `ProductImage`, `Orders`).

## 2. Backend setup

```
cd backend
python -m venv venv
./venv/Scripts/pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` if your SQL Server instance/driver differs from the defaults, and fill in:
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — from Razorpay Dashboard → Settings → API Keys (test mode)
- `WHATSAPP_NUMBER` / `WHATSAPP_MESSAGE_TEMPLATE` — the number that receives WhatsApp enquiries

Seed reference data (Vendors: Harini, SM; Models: Lehanga, Kurthi, MonAndDaughter) and create the
first admin account:

```
./venv/Scripts/python scripts/seed_reference_data.py
./venv/Scripts/python scripts/create_admin.py --phone 9999999999 --password YourAdminPass123 --email admin@ktw.com
```

Run the API:

```
./venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

API docs available at `http://127.0.0.1:8000/docs`.

## 3. Frontend setup

```
cd frontend
npm install
cp .env.example .env
```

Edit `.env`:
- `VITE_RAZORPAY_KEY_ID` — same test-mode Key ID as the backend
- `VITE_ENABLE_BUY_NOW` — set to `false` to hide the Buy Now button if payments aren't configured yet
- `VITE_WHATSAPP_NUMBER` / `VITE_WHATSAPP_MESSAGE_TEMPLATE`

Run the dev server:

```
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` and `/uploads` to the backend on
port 8000, so both must be running together.

## Roles
- Every self-registered user is `Role='User'` by default.
- Admins can only be created via `backend/scripts/create_admin.py` (run again with the same phone
  number to promote an existing user to Admin).

## Payment gateway (Razorpay)
1. Sign up at razorpay.com and get your **test-mode** Key ID + Key Secret from Settings → API Keys.
2. Put them in `backend/.env` (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) and `frontend/.env`
   (`VITE_RAZORPAY_KEY_ID`).
3. Buy Now → age-group selection → Razorpay Checkout → backend verifies the payment signature and
   writes a row to `Orders`. Test-mode keys let you complete the full flow without moving real money.

## WhatsApp
No API approval is required — the "WhatsApp" button opens a `wa.me/<number>?text=...` deep link
prefilled with the configured message + the product's Instagram URL.

## Project structure
See [CLAUDE.md](CLAUDE.md) for the full repo layout and conventions, and [specs/](specs/) for the
detailed requirements broken out by area.
