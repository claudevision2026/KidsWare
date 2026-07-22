import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import Order, Product, ProductPrice, User
from app.schemas import (
    CreatePaymentOrderRequest,
    CreatePaymentOrderResponse,
    OrderResponse,
    VerifyPaymentRequest,
)
from app.services import razorpay_service
from app.services.order_mapper import to_response as _to_response

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/create-order", response_model=CreatePaymentOrderResponse)
def create_payment_order(
    payload: CreatePaymentOrderRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not settings.enable_buy_now:
        raise HTTPException(status_code=403, detail="Buy Now is currently disabled")

    product = db.query(Product).filter(Product.ProductID == payload.productId).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    price_row = (
        db.query(ProductPrice)
        .filter(ProductPrice.ProductID == payload.productId, ProductPrice.AgeGroup == payload.ageGroup)
        .first()
    )
    if not price_row:
        raise HTTPException(status_code=404, detail="Price not found for the selected age group")

    razorpay_order = razorpay_service.create_order(
        amount_rupees=float(price_row.Price), receipt=f"product{payload.productId}-{user.UserID}"
    )

    return CreatePaymentOrderResponse(
        razorpayOrderId=razorpay_order["id"],
        amount=razorpay_order["amount"],
        currency=razorpay_order["currency"],
        keyId=settings.razorpay_key_id,
        productId=payload.productId,
        ageGroup=payload.ageGroup,
    )


@router.post("/verify", response_model=OrderResponse)
def verify_payment(
    payload: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    is_valid = razorpay_service.verify_payment_signature(
        {
            "razorpay_order_id": payload.razorpay_order_id,
            "razorpay_payment_id": payload.razorpay_payment_id,
            "razorpay_signature": payload.razorpay_signature,
        }
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail="Payment signature verification failed")

    product = db.query(Product).filter(Product.ProductID == payload.productId).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    order = Order(
        ProductID=payload.productId,
        PhoneNumber=user.PhoneNumber,
        Age=payload.ageGroup,
        Price=payload.price,
        TransactionID=payload.razorpay_payment_id,
        PurchaseDate=datetime.datetime.utcnow(),
        VendorID=product.VendorID,
        ModelID=product.ModelID,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return _to_response(order)
