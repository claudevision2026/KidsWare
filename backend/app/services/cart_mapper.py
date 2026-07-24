from app.models import CartItem
from app.schemas import CartItemResponse, CartResponse


def to_response(cart_item: CartItem, product_name: str, stock_count: int) -> CartItemResponse:
    return CartItemResponse(
        cartItemId=cart_item.CartItemID,
        productId=cart_item.ProductID,
        productName=product_name,
        ageGroup=cart_item.AgeGroup,
        imageUrl=cart_item.ImageURL,
        price=float(cart_item.Price),
        quantity=cart_item.Quantity,
        lineTotal=float(cart_item.Price) * cart_item.Quantity,
        stockCount=stock_count,
        createdDate=cart_item.CreatedDate,
    )


def to_cart_response(rows: list[tuple[CartItem, str, int]]) -> CartResponse:
    items = [to_response(cart_item, product_name, stock_count) for cart_item, product_name, stock_count in rows]
    total = sum(item.lineTotal for item in items)
    return CartResponse(items=items, total=total)
