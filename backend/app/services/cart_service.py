"""Shared CartItem add/quantity logic.

Mirrors how `address_service.py` centralizes UserAddress create/default-flip
rules rather than duplicating them in the router: this module does the DB
mutations and business rules, `cart_mapper.py` builds the response DTO, and
ownership checks (404/403) stay in `app.routers.cart`.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import CartItem, Product, ProductPrice, User
from app.schemas import CartItemAddRequest


def add_item(db: Session, user: User, payload: CartItemAddRequest) -> CartItem:
    product = db.query(Product).filter(Product.ProductID == payload.productId).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    price_row = (
        db.query(ProductPrice)
        .filter(
            ProductPrice.ProductID == payload.productId,
            ProductPrice.AgeGroup == payload.ageGroup,
        )
        .first()
    )
    if not price_row:
        raise HTTPException(status_code=404, detail="Price not found for the selected age group")

    existing = (
        db.query(CartItem)
        .filter(
            CartItem.UserID == user.UserID,
            CartItem.ProductID == payload.productId,
            CartItem.AgeGroup == payload.ageGroup,
        )
        .first()
    )
    if existing:
        existing.Quantity += 1
        if payload.imageUrl is not None:
            existing.ImageURL = payload.imageUrl
        db.flush()
        return existing

    cart_item = CartItem(
        UserID=user.UserID,
        ProductID=payload.productId,
        AgeGroup=payload.ageGroup,
        ImageURL=payload.imageUrl,
        Price=price_row.Price,
        Quantity=1,
    )
    db.add(cart_item)
    db.flush()
    return cart_item


def set_quantity(db: Session, cart_item: CartItem, quantity: int) -> CartItem | None:
    if quantity == 0:
        db.delete(cart_item)
        return None

    cart_item.Quantity = quantity
    return cart_item
