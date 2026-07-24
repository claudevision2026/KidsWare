from app.models import Order
from app.schemas import OrderGroupResponse, OrderResponse
from app.services.address_mapper import to_response as _address_to_response


def to_response(order: Order) -> OrderResponse:
    return OrderResponse(
        orderId=order.OrderID,
        productId=order.ProductID,
        productName=order.product.ProductName,
        phoneNumber=order.PhoneNumber,
        age=order.Age,
        price=float(order.Price) if order.Price is not None else None,
        transactionId=order.TransactionID,
        purchaseDate=order.PurchaseDate,
        vendorId=order.VendorID,
        modelId=order.ModelID,
        courierVendor=order.CourierVendor,
        trackingId=order.TrackingID,
        trackingUrl=order.TrackingURL,
        createdDate=order.CreatedDate,
        quantity=order.Quantity,
        userAddressId=order.UserAddressID,
        address=_address_to_response(order.address) if order.address is not None else None,
    )


def to_grouped_response(orders: list[Order]) -> list[OrderGroupResponse]:
    """Group orders that share a non-null TransactionID into one response entry.

    Rows with a NULL TransactionID, or a TransactionID not shared by any other
    row in `orders`, remain their own single-item group. `orders` is expected
    to already be sorted (e.g. by CreatedDate desc); the output preserves the
    relative order in which each group was first encountered.
    """
    groups: list[list[Order]] = []
    group_by_transaction_id: dict[str, list[Order]] = {}

    for order in orders:
        transaction_id = order.TransactionID
        if transaction_id is not None and transaction_id in group_by_transaction_id:
            group_by_transaction_id[transaction_id].append(order)
        else:
            group = [order]
            groups.append(group)
            if transaction_id is not None:
                group_by_transaction_id[transaction_id] = group

    result: list[OrderGroupResponse] = []
    for group in groups:
        first = group[0]
        total = sum(
            float(o.Price) * o.Quantity for o in group if o.Price is not None
        )
        result.append(
            OrderGroupResponse(
                transactionId=first.TransactionID,
                purchaseDate=first.PurchaseDate,
                total=total,
                items=[to_response(o) for o in group],
            )
        )
    return result
