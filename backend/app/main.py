from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import (
    addresses,
    admin_products,
    admin_users,
    auth,
    cart,
    checkout,
    orders,
    payments,
    products,
    reference_data,
)

app = FastAPI(title="KTW - Kids Dress Store API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount(settings.upload_base_url, StaticFiles(directory=settings.upload_base_dir), name="uploads")

app.include_router(auth.router)
app.include_router(reference_data.router)
app.include_router(admin_products.router)
app.include_router(admin_users.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(orders.admin_router)
app.include_router(addresses.router)
app.include_router(cart.router)
app.include_router(checkout.router)
app.include_router(payments.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
