import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import CartItem, Order, Product, ProductPrice, User, UserAddress
from app.schemas import (
    CartCheckoutCreateOrderResponse,
    CartCheckoutVerifyRequest,
    CartCheckoutVerifyResponse,
    CartItemAddRequest,
    CartItemResponse,
    CartItemUpdateRequest,
    CartResponse,
)
from app.services import cart_service, razorpay_service
from app.services.cart_mapper import to_cart_response as _to_cart_response
from app.services.cart_mapper import to_response as _to_response
from app.services.order_mapper import to_response as _order_to_response

router = APIRouter(prefix="/api/cart", tags=["cart"])


def _stock_count(db: Session, product_id: int, age_group: str) -> int:
    price_row = (
        db.query(ProductPrice)
        .filter(ProductPrice.ProductID == product_id, ProductPrice.AgeGroup == age_group)
        .first()
    )
    return price_row.StockCount if price_row else 0


@router.get("", response_model=CartResponse)
def get_cart(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cart_items = (
        db.query(CartItem)
        .filter(CartItem.UserID == user.UserID)
        .order_by(CartItem.CreatedDate.desc())
        .all()
    )

    rows = []
    for cart_item in cart_items:
        product = db.query(Product).filter(Product.ProductID == cart_item.ProductID).first()
        product_name = product.ProductName if product else ""
        stock_count = _stock_count(db, cart_item.ProductID, cart_item.AgeGroup)
        rows.append((cart_item, product_name, stock_count))

    return _to_cart_response(rows)


@router.post("/items", response_model=CartItemResponse, status_code=201)
def add_cart_item(
    payload: CartItemAddRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cart_item = cart_service.add_item(db, user, payload)
    db.commit()
    db.refresh(cart_item)

    product = db.query(Product).filter(Product.ProductID == cart_item.ProductID).first()
    product_name = product.ProductName if product else ""
    stock_count = _stock_count(db, cart_item.ProductID, cart_item.AgeGroup)
    return _to_response(cart_item, product_name, stock_count)


@router.put("/items/{cart_item_id}")
def update_cart_item(
    cart_item_id: int,
    payload: CartItemUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cart_item = db.query(CartItem).filter(CartItem.CartItemID == cart_item_id).first()
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    if cart_item.UserID != user.UserID:
        raise HTTPException(status_code=403, detail="Not your cart item")

    updated = cart_service.set_quantity(db, cart_item, payload.quantity)
    if updated is None:
        db.commit()
        return Response(status_code=204)

    db.commit()
    db.refresh(updated)

    product = db.query(Product).filter(Product.ProductID == updated.ProductID).first()
    product_name = product.ProductName if product else ""
    stock_count = _stock_count(db, updated.ProductID, updated.AgeGroup)
    return _to_response(updated, product_name, stock_count)


@router.delete("/items/{cart_item_id}", status_code=204)
def delete_cart_item(
    cart_item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cart_item = db.query(CartItem).filter(CartItem.CartItemID == cart_item_id).first()
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    if cart_item.UserID != user.UserID:
        raise HTTPException(status_code=403, detail="Not your cart item")

    db.delete(cart_item)
    db.commit()


@router.post("/checkout/create-order", response_model=CartCheckoutCreateOrderResponse)
def create_cart_checkout_order(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not settings.enable_buy_now:
        raise HTTPException(status_code=403, detail="Buy Now is currently disabled")

    cart_items = db.query(CartItem).filter(CartItem.UserID == user.UserID).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    total = sum(float(item.Price) * item.Quantity for item in cart_items)

    razorpay_order = razorpay_service.create_order(
        amount_rupees=total, receipt=f"cart-{user.UserID}"
    )

    return CartCheckoutCreateOrderResponse(
        razorpayOrderId=razorpay_order["id"],
        amount=razorpay_order["amount"],
        currency=razorpay_order["currency"],
        keyId=settings.razorpay_key_id,
    )


@router.post("/checkout/verify", response_model=CartCheckoutVerifyResponse)
def verify_cart_checkout(
    payload: CartCheckoutVerifyRequest,
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

    address = (
        db.query(UserAddress)
        .filter(UserAddress.UserAddressID == payload.userAddressId)
        .first()
    )
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    if address.UserID != user.UserID:
        raise HTTPException(status_code=403, detail="Not your address")

    cart_items = db.query(CartItem).filter(CartItem.UserID == user.UserID).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    purchase_date = datetime.datetime.utcnow()
    orders = []
    for item in cart_items:
        product = db.query(Product).filter(Product.ProductID == item.ProductID).first()
        order = Order(
            ProductID=item.ProductID,
            PhoneNumber=user.PhoneNumber,
            Age=item.AgeGroup,
            Price=item.Price,
            Quantity=item.Quantity,
            TransactionID=payload.razorpay_payment_id,
            PurchaseDate=purchase_date,
            VendorID=product.VendorID,
            ModelID=product.ModelID,
            UserAddressID=address.UserAddressID,
        )
        db.add(order)
        orders.append(order)
        db.delete(item)

    db.commit()
    for order in orders:
        db.refresh(order)

    return CartCheckoutVerifyResponse(orders=[_order_to_response(o) for o in orders])
